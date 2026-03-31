import asyncio
import json
import os
import time
import aiohttp
from amqtt.broker import Broker
from amqtt.client import MQTTClient

BROKER_CONFIG = {
    "listeners": {
        "default": {
            "type": "tcp",
            "bind": "0.0.0.0:1883",
        }
    },
}

APP_URL = os.environ.get("APP_URL", "http://localhost:3000")
SCAN_WEBHOOK_SECRET = os.environ.get("SCAN_WEBHOOK_SECRET", "some-random-secret")


async def call_heartbeat_api(tapper_id: str) -> None:
    """POST /api/tappers/{id}/heartbeat — marks the tapper as online."""
    url = f"{APP_URL}/api/tappers/{tapper_id}/heartbeat"
    headers = {"Authorization": f"Bearer {SCAN_WEBHOOK_SECRET}"}

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, timeout=aiohttp.ClientTimeout(total=5)) as resp:
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
    url = f"{APP_URL}/api/scan"
    payload = {"tapper_id": tapper_id, "card_uid": card_uid, "timestamp": int(timestamp)}
    headers = {"Authorization": f"Bearer {SCAN_WEBHOOK_SECRET}"}

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers, timeout=aiohttp.ClientTimeout(total=5)) as resp:
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


async def run_listener():
    await asyncio.sleep(2)
    client = MQTTClient(client_id="mac-listener")
    await client.connect("mqtt://127.0.0.1:1883")
    print("Listener connected")
    await client.subscribe([("#", 0)])
    print("Listening on all topics")
    print("-" * 50)

    while True:
        try:
            message = await asyncio.wait_for(client.deliver_message(), timeout=30)
            topic = message.publish_packet.variable_header.topic_name
            payload_raw = message.publish_packet.payload.data.decode("utf-8")

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
                visual, acoustic = await call_scan_api(tapper_id, card_uid, timestamp)
                await call_heartbeat_api(tapper_id)
                await send_feedback(tapper_id, visual, acoustic)
            elif "event/boot" in topic:
                tapper_id = topic.split("/")[1]
                print(f"Device boot event from {tapper_id}")
                await call_heartbeat_api(tapper_id)
            elif "event/tamper" in topic:
                print(f"Tamper state: {data.get('state', '?')}")
            elif "control/response" in topic:
                print(f"Control response: {data.get('result', '?')}")
            else:
                print(f"Data: {data}")

            print("-" * 50)

        except asyncio.TimeoutError:
            print("Waiting for message...")


async def send_feedback(tapper_id: str, visual: str, acoustic: str):
    client = MQTTClient(client_id="mac-feedback")
    await client.connect("mqtt://127.0.0.1:1883")
    topic = f"tapper/{tapper_id}/control/request"
    payload = json.dumps({
        "timestamp": int(time.time()),
        "id": 1,
        "visual": {"pattern": visual},
        "acoustic": {"pattern": acoustic},
    })
    await client.publish(topic, payload.encode(), qos=0)
    await client.disconnect()
    print(f"Feedback sent: visual={visual} acoustic={acoustic}")


async def main():
    broker = Broker(BROKER_CONFIG)
    await broker.start()
    print("MQTT Broker started on port 1883")
    print(f"Webhook target: {APP_URL}/api/scan")
    print("-" * 50)

    try:
        await run_listener()
    except KeyboardInterrupt:
        print("\nShutting down...")
    finally:
        await broker.shutdown()


if __name__ == "__main__":
    asyncio.run(main())
