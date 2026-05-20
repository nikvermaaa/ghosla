import asyncio
import httpx

BASE = "http://localhost:8000"


async def main():
    print("Triggering session...")
    async with httpx.AsyncClient() as client:
        r = await client.post(f"{BASE}/session/complete", json={"name": "Test User"})
        print("Started:", r.json())

        print("Polling status every 5s...")
        for _ in range(20):
            await asyncio.sleep(5)
            s = await client.get(f"{BASE}/scan/status")
            status = s.json()["status"]
            print(f"  Status: {status}")
            if status == "complete":
                break

        r = await client.get(f"{BASE}/results")
        print("Results received:", len(r.json()["results"]), "properties")


asyncio.run(main())
