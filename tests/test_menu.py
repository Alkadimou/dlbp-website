import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1280, 'height': 800})
        page = await context.new_page()

        print("Navigating to index.html...")
        await page.goto("http://127.0.0.1:8080/index.html")
        await page.wait_for_timeout(1000)
        
        await page.screenshot(path="screenshot_index_nav.png", full_page=False)
        print("Took screenshot: screenshot_index_nav.png")
        
        print("Clicking MENU button...")
        await page.click("#menu-btn")
        await page.wait_for_timeout(500)
        
        await page.screenshot(path="screenshot_menu_open.png", full_page=False)
        print("Took screenshot: screenshot_menu_open.png")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
