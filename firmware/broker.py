import asyncio
import json
import logging
import os
import time
import aiohttp
from amqtt.broker import Broker
from amqtt.client import MQTTClient

# Surface amqtt's own logs — without these, broker/client stuck-state issues
# (zombie sessions, failed reconnects, take-over hangs) are completely silent.
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)
logging.getLogger("aiohttp.access").setLevel(logging.WARNING)

BROKER_CONFIG = {
    "listeners": {
        "default": {
            "type": "tcp",
            "bind": "0.0.0.0:1883",
            "max_connections": 64,
        }
    },
}

APP_URL = os.environ.get("APP_URL", "http://t14dkkpbqryh1ebt6urwvf2a.188.34.187.210.sslip.io")
SCAN_WEBHOOK_SECRET = os.environ.get("SCAN_WEBHOOK_SECRET", "some-random-secret")

TIMEOUT_SECONDS = 30
RECONNECT_AFTER_TIMEOUTS = 10  # reconnect after ~5 minutes of silence
MAX_PAYLOAD_BYTES = 4096
MAX_INFLIGHT_HANDLERS = 32

_http_session: aiohttp.ClientSession | None = None
_feedback_client: MQTTClient | None = None
_handler_semaphore = asyncio.Semaphore(MAX_INFLIGHT_HANDLERS)
_inflight_tasks: set[asyncio.Task] = set()


def _spawn(coro) -> None:
    # Keep a strong ref to the task so the GC doesn't collect a fire-and-forget mid-flight.
    task = asyncio.create_task(coro)
    _inflight_tasks.add(task)
    task.add_done_callback(_inflight_tasks.discard)


async def call_heartbeat_api(tapper_id: str) -> None:
    """POST /api/tappers/{id}/heartbeat — marks the tapper as online."""
    assert _http_session is not None
    url = f"{APP_URL}/api/tappers/{tapper_id}/heartbeat"
    headers = {"Authorization": f"Bearer {SCAN_WEBHOOK_SECRET}"}

    try:
        async with _http_session.post(url, headers=headers) as resp:
            if resp.status == 200:
                data = await resp.json()
                print(f"Heartbeat: status={data.get('status')}")
            else:
                text = await resp.text()
                print(f"Heartbeat API error {resp.status}: {text}")
    except Exception as e:
        print(f"Heartbeat API call failed: {e}")


async def call_scan_api(tapper_id: str, card_uid: str, timestamp: int) -> tuple[str, str]:
    """POST /api/scan and return (visual_pattern, acoustic_pattern).
    Falls back to red/p1 on any error so the tapper always gets a response."""
    assert _http_session is not None
    url = f"{APP_URL}/api/scan"
    payload = {"tapper_id": tapper_id, "card_uid": card_uid, "timestamp": int(timestamp)}
    headers = {"Authorization": f"Bearer {SCAN_WEBHOOK_SECRET}"}

    try:
        async with _http_session.post(url, json=payload, headers=headers) as resp:
            if resp.status == 200:
                data = await resp.json()
                visual = data.get("visual", "p1/red")
                acoustic = data.get("acoustic", "p1")
                print(f"API response: status={data.get('status')} visual={visual}")
                return visual, acoustic
            else:
                text = await resp.text()
                print(f"API error {resp.status}: {text}")
    except Exception as e:
        print(f"API call failed: {e}")

    return "p1/red", "p1"


async def handle_tag_event(tapper_id: str, card_uid: str, timestamp: int) -> None:
    # Runs as a background task so a slow backend doesn't block the MQTT inbox.
    async with _handler_semaphore:
        visual, acoustic = await call_scan_api(tapper_id, card_uid, timestamp)
        await call_heartbeat_api(tapper_id)
        await send_feedback(tapper_id, visual, acoustic)


async def handle_boot_event(tapper_id: str) -> None:
    async with _handler_semaphore:
        await call_heartbeat_api(tapper_id)


async def _build_listener() -> MQTTClient:
    client = MQTTClient(client_id="mac-listener")
    await client.connect("mqtt://127.0.0.1:1883")
    await client.subscribe([("#", 0)])
    return client


async def _drop_listener(client: MQTTClient | None) -> None:
    # amqtt's client.reconnect() short-circuits when its internal state machine
    # still believes it's connected — which is exactly the zombie state we're
    # trying to escape. Tear the client down and rebuild from scratch instead.
    if client is None:
        return
    try:
        await asyncio.wait_for(client.disconnect(), timeout=2)
    except Exception:
        pass


async def run_listener():
    await asyncio.sleep(2)
    client = await _build_listener()
    print("Listener connected")
    print("Listening on all topics")
    print("-" * 50)
    consecutive_timeouts = 0

    while True:
        try:
            try:
                message = await asyncio.wait_for(client.deliver_message(), timeout=TIMEOUT_SECONDS)
            except asyncio.TimeoutError:
                consecutive_timeouts += 1
                print(f"Waiting for message... ({consecutive_timeouts}/{RECONNECT_AFTER_TIMEOUTS})")
                if consecutive_timeouts >= RECONNECT_AFTER_TIMEOUTS:
                    print("Listener stale — rebuilding client")
                    await _drop_listener(client)
                    client = await _build_listener()
                    consecutive_timeouts = 0
                continue

            consecutive_timeouts = 0
            payload_bytes = message.publish_packet.payload.data
            if len(payload_bytes) > MAX_PAYLOAD_BYTES:
                topic = message.publish_packet.variable_header.topic_name
                print(f"Oversized payload on {topic} ({len(payload_bytes)} bytes) — skipped")
                continue

            topic = message.publish_packet.variable_header.topic_name
            try:
                payload_raw = payload_bytes.decode("utf-8")
            except UnicodeDecodeError:
                print(f"Non-UTF8 payload on {topic} — skipped")
                continue

            try:
                data = json.loads(payload_raw)
            except Exception:
                data = payload_raw

            print(f"\nTopic: {topic}")

            if "event/tag" in topic:
                tapper_id = topic.split("/")[1]
                card_uid = data.get("id", "") if isinstance(data, dict) else ""
                timestamp = data.get("timestamp", int(time.time())) if isinstance(data, dict) else int(time.time())
                print(f"NFC Tag ID: {card_uid}")
                print(f"Timestamp: {timestamp}")
                _spawn(handle_tag_event(tapper_id, card_uid, timestamp))
            elif "event/boot" in topic:
                tapper_id = topic.split("/")[1]
                print(f"Device boot event from {tapper_id}")
                _spawn(handle_boot_event(tapper_id))
            elif "event/tamper" in topic:
                print(f"Tamper state: {data.get('state', '?') if isinstance(data, dict) else '?'}")
            elif "control/request" in topic or "control/response" in topic:
                pass  # own feedback echo — ignore
            else:
                print(f"Data: {data}")

            print("-" * 50)

        except Exception as e:
            print(f"Listener error: {e} — rebuilding client")
            await _drop_listener(client)
            try:
                client = await _build_listener()
                consecutive_timeouts = 0
            except Exception as re:
                print(f"Listener rebuild failed: {re} — sleeping before retry")
                await asyncio.sleep(3)


async def send_feedback(tapper_id: str, visual: str, acoustic: str) -> None:
    global _feedback_client
    if _feedback_client is None:
        _feedback_client = MQTTClient(client_id="mac-feedback")
        await _feedback_client.connect("mqtt://127.0.0.1:1883")
    topic = f"tapper/{tapper_id}/control/request"
    payload = json.dumps({
        "timestamp": int(time.time()),
        "id": 1,
        "visual": {"pattern": visual},
        "acoustic": {"pattern": acoustic},
    })
    try:
        await _feedback_client.publish(topic, payload.encode(), qos=0)
        print(f"Feedback sent: visual={visual} acoustic={acoustic}")
    except Exception as e:
        print(f"Feedback error: {e} — reconnecting next call")
        try:
            await _feedback_client.disconnect()
        except Exception:
            pass
        _feedback_client = None


async def main():
    global _http_session, _feedback_client

    connector = aiohttp.TCPConnector(limit=20, limit_per_host=10, ttl_dns_cache=300)
    timeout = aiohttp.ClientTimeout(total=5)
    _http_session = aiohttp.ClientSession(connector=connector, timeout=timeout)

    broker = Broker(BROKER_CONFIG)
    await broker.start()
    print("MQTT Broker started on port 1883")
    print(f"Webhook target: {APP_URL}/api/scan")
    print("-" * 50)

    try:
        await run_listener()
    except (KeyboardInterrupt, asyncio.CancelledError):
        print("\nShutting down...")
    finally:
        if _inflight_tasks:
            try:
                await asyncio.wait_for(
                    asyncio.gather(*_inflight_tasks, return_exceptions=True),
                    timeout=5,
                )
            except asyncio.TimeoutError:
                print(f"Shutdown: {len(_inflight_tasks)} handler(s) still running, abandoning")
        if _feedback_client is not None:
            try:
                await _feedback_client.disconnect()
            except Exception:
                pass
            _feedback_client = None
        try:
            await _http_session.close()
        except Exception:
            pass
        # aiohttp graceful close — give the connector one loop tick to release sockets.
        await asyncio.sleep(0)
        await broker.shutdown()


if __name__ == "__main__":
    asyncio.run(main())
