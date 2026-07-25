from playwright.sync_api import sync_playwright

def test_admin_counter():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        def handle_console(msg):
            print(f"CONSOLE [{msg.type}]: {msg.text}")
        page.on("console", handle_console)
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))

        print("Navigating to admin.html...")
        page.goto("http://127.0.0.1:8080/admin.html")

        print("Filling admin login...")
        page.fill("#admin-email", "admin@dlbp.it")
        page.fill("#admin-password", "admin2024!")
        page.click("#login-btn")

        print("Waiting 3s for Firebase data to load...")
        page.wait_for_timeout(3000)
        
        page.screenshot(path="screenshot_admin.png")

        # Force a wait for the element to be visible
        try:
            page.wait_for_selector("#admin-live-counter", state="visible", timeout=5000)
        except Exception as e:
            print("Element not visible!", e)

        counter_html = page.inner_html("#admin-live-counter")
        print(f"\n--- ADMIN LIVE COUNTER ---\n{counter_html}\n--------------------\n")
        
        table_html = page.inner_html("#users-tbody")
        print(f"\n--- ADMIN TABLE ---\n{table_html[:200]}\n--------------------\n")

        browser.close()

if __name__ == "__main__":
    test_admin_counter()
