import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from automations.scripts.platform_scan import run_nobroker


async def main():
    print("Launching single NoBroker window...")
    result = await run_nobroker({})
    print("Done. Result:", result)


asyncio.run(main())
