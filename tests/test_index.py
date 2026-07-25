import asyncio
from playwright.async_api import async_playwright

async def take_screenshot():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        print("Navigating to index.html...")
        await page.goto("http://127.0.0.1:8080/index.html")
        await page.wait_for_timeout(2000)
        
        await page.screenshot(path="screenshot_index_top.png", full_page=False)
        print("Took screenshot: screenshot_index_top.png")

        # No more scrolling since we removed the events section from index.html
        
        await browser.close()
        print("\nTests completed.")

if __name__ == "__main__":
    asyncio.run(take_screenshot())
