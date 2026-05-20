"""
Standalone test — opens 3 Chromium windows simultaneously, each searching
for 2 BHK in Electronic City. No server needed. Run: python3 test_windows.py
"""
import asyncio
import random

from playwright.async_api import async_playwright


async def _scroll(page, steps=5):
    for _ in range(steps):
        await page.mouse.wheel(0, random.randint(350, 650))
        await asyncio.sleep(random.uniform(0.7, 1.4))


async def run_site(name: str, url: str, search_term: str):
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=False,
            args=["--start-maximized"],
        )
        ctx = await browser.new_context(no_viewport=True)
        page = await ctx.new_page()
        try:
            print(f"[{name}] Opening {url}")
            await page.goto(url, timeout=30000)
            await asyncio.sleep(2)

            # Try common search input selectors
            for sel in [
                'input[placeholder*="Search"]',
                'input[placeholder*="City"]',
                'input[placeholder*="search"]',
                'input[type="search"]',
                'input[type="text"]',
            ]:
                try:
                    loc = page.locator(sel).first
                    if await loc.is_visible(timeout=2000):
                        await loc.click()
                        await asyncio.sleep(0.3)
                        for char in search_term:
                            await loc.type(char)
                            await asyncio.sleep(0.07)
                        await asyncio.sleep(0.5)
                        await page.keyboard.press("Enter")
                        print(f"[{name}] Searched: {search_term}")
                        break
                except Exception:
                    continue

            await asyncio.sleep(3)
            print(f"[{name}] Scrolling...")
            await _scroll(page, steps=6)

            # Click first visible listing card
            for sel in [
                '[class*="card"]',
                '[class*="listing"]',
                '[class*="property"]',
                '[class*="result"]',
                'article',
            ]:
                try:
                    cards = page.locator(sel)
                    count = await cards.count()
                    if count > 1:
                        await cards.nth(0).click(timeout=3000)
                        print(f"[{name}] Clicked listing 1")
                        await asyncio.sleep(2)
                        await _scroll(page, steps=3)
                        await page.go_back(timeout=10000)
                        await asyncio.sleep(1.5)
                        if count > 2:
                            await cards.nth(2).click(timeout=3000)
                            print(f"[{name}] Clicked listing 3")
                            await asyncio.sleep(2)
                            await _scroll(page, steps=3)
                        break
                except Exception:
                    continue

            print(f"[{name}] Done.")
            await asyncio.sleep(3)
        except Exception as e:
            print(f"[{name}] Error: {e}")
        finally:
            await ctx.close()
            await browser.close()


async def main():
    print("Launching 3 windows simultaneously...")
    await asyncio.gather(
        run_site("NoBroker",    "https://www.nobroker.in",     "2 BHK Electronic City Bangalore"),
        run_site("99Acres",     "https://www.99acres.com",     "2 BHK Electronic City Bangalore"),
        run_site("MagicBricks", "https://www.magicbricks.com", "2 BHK Electronic City Bangalore"),
    )
    print("All 3 done.")


asyncio.run(main())
