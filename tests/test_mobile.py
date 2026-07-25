import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        iphone_13 = p.devices['iPhone 13']
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(**iphone_13)
        page = await context.new_page()

        print("Navigating to index.html on Mobile Emulator...")
        await page.goto("http://127.0.0.1:8080/index.html")
        await page.wait_for_timeout(2000)
        
        await page.screenshot(path="screenshot_mobile.png", full_page=True)
        print("Took screenshot: screenshot_mobile.png")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
