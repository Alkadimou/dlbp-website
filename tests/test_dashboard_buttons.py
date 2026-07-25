import asyncio
from playwright.async_api import async_playwright

async def test_admin():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        print("Navigating to admin.html...")
        await page.goto("http://127.0.0.1:8081/admin.html")
        await page.wait_for_timeout(1000)
        
        print("Bypassing login visually...")
        await page.evaluate("""
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('dashboard-section').style.display = 'block';
            document.getElementById('app-main').style.maxWidth = '1200px';
        """)
        await page.wait_for_timeout(1000)

        # Ensure we're in the dashboard
        await page.screenshot(path="screenshot_dashboard_bypassed.png")
        print("Took screenshot: screenshot_dashboard_bypassed.png")
        
        # Test 1: + NUOVO
        print("\n--- Testing '+ NUOVO' ---")
        await page.click("#new-event-btn", force=True)
        await page.wait_for_timeout(1000)
        await page.screenshot(path="screenshot_dashboard_nuovo_open.png")
        
        settings_classes = await page.evaluate("document.getElementById('settings-modal').className")
        print(f"Settings Modal classes after + NUOVO: {settings_classes}")
        title = await page.evaluate("document.getElementById('settings-panel-title').textContent")
        print(f"Settings Title: {title}")
        
        # Close modal
        await page.click("#close-settings-btn", force=True)
        await page.wait_for_timeout(1000)
        settings_classes = await page.evaluate("document.getElementById('settings-modal').className")
        print(f"Settings Modal classes after close: {settings_classes}")
        
        # Test 2: MODIFICA
        print("\n--- Testing 'MODIFICA' ---")
        try:
            await page.click("#edit-event-btn", force=True)
            await page.wait_for_timeout(1000)
            await page.screenshot(path="screenshot_dashboard_modifica_open.png")
            settings_classes = await page.evaluate("document.getElementById('settings-modal').className")
            print(f"Settings Modal classes after MODIFICA: {settings_classes}")
            
            # Since it might have shown an alert "Nessun evento selezionato", let's check for the alert
            alert_active = await page.evaluate("document.getElementById('custom-modal-overlay') ? document.getElementById('custom-modal-overlay').className : 'none'")
            print(f"Custom alert overlay classes: {alert_active}")
            if "active" in alert_active:
                await page.click(".modal-close-btn", force=True)
                await page.wait_for_timeout(500)
        except Exception as e:
            print(f"MODIFICA failed: {e}")
        
        # Test 3: AREA PR
        print("\n--- Testing 'AREA PR' ---")
        await page.click("#manage-pr-btn", force=True)
        await page.wait_for_timeout(1000)
        await page.screenshot(path="screenshot_dashboard_pr_open.png")
        
        pr_classes = await page.evaluate("document.getElementById('pr-modal').className")
        print(f"PR Modal classes after AREA PR: {pr_classes}")
        
        # Close modal
        await page.click("#close-pr-btn", force=True)
        await page.wait_for_timeout(1000)
        pr_classes = await page.evaluate("document.getElementById('pr-modal').className")
        print(f"PR Modal classes after close: {pr_classes}")
        
        await browser.close()
        print("\nTests completed.")

if __name__ == "__main__":
    asyncio.run(test_admin())
