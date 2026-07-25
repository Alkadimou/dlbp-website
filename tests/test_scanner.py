from playwright.sync_api import sync_playwright

def test_scanner():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        def handle_console(msg):
            print(f"CONSOLE [{msg.type}]: {msg.text}")
        page.on("console", handle_console)
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))

        print("Navigating to scanner.html...")
        page.goto("http://127.0.0.1:8080/scanner.html")

        print("Filling scanner login...")
        page.wait_for_selector("#scanner-password", state="visible")
        page.fill("#scanner-password", "dlbpscan")
        page.click("#login-btn")

        print("Waiting for scanner section to be visible...")
        page.wait_for_selector("#scanner-section", state="visible")

        print("Waiting 3s for Firebase data to load...")
        page.wait_for_timeout(3000)

        counter_html = page.inner_html("#live-counter")
        print(f"\n--- LIVE COUNTER ---\n{counter_html}\n--------------------\n")

        browser.close()

if __name__ == "__main__":
    test_scanner()
