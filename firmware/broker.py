import asyncio
import json
import time
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
                print(f"NFC Tag ID: {data.get('id', '?')}")
                print(f"Timestamp: {data.get('timestamp', '?')}")
                await send_feedback(tapper_id)
            elif "event/boot" in topic:
                print("Device boot event")
            elif "event/tamper" in topic:
                print(f"Tamper state: {data.get('state', '?')}")
            elif "control/response" in topic:
                print(f"Control response: {data.get('result', '?')}")
            else:
                print(f"Data: {data}")

            print("-" * 50)

        except asyncio.TimeoutError:
            print("Waiting for message...")


async def send_feedback(tapper_id: str):
    client = MQTTClient(client_id="mac-feedback")
    await client.connect("mqtt://127.0.0.1:1883")
    topic = f"tapper/{tapper_id}/control/request"
    payload = json.dumps({
        "timestamp": int(time.time()),
        "id": 1,
        "visual": {"pattern": "p1/green"},
        "acoustic": {"pattern": "p1"}
    })
    await client.publish(topic, payload.encode(), qos=0)
    await client.disconnect()
    print(f"Feedback sent")


async def main():
    broker = Broker(BROKER_CONFIG)
    await broker.start()
    print("MQTT Broker started on port 1883")
    print("-" * 50)

    try:
        await run_listener()
    except KeyboardInterrupt:
        print("\nShutting down...")
    finally:
        await broker.shutdown()


if __name__ == "__main__":
    asyncio.run(main())