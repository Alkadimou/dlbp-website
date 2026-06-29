from playwright.sync_api import sync_playwright

def test_admin():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Capture console messages
        def handle_console(msg):
            print(f"CONSOLE [{msg.type}]: {msg.text}")
        
        page.on("console", handle_console)
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))

        print("Navigating to admin.html...")
        page.goto("http://127.0.0.1:8080/admin.html")

        print("Filling login...")
        page.fill("#admin-password", "Admin2024!")
        page.click("#login-btn")

        print("Waiting 3s for login...")
        page.wait_for_timeout(3000)

        print("Forcing modal open...")
        # Since the button might be hidden or whatever, just evaluate JS to open it:
        page.evaluate("""
            const modal = document.getElementById('pr-modal');
            if (modal) {
                modal.style.display = 'flex';
                modal.style.opacity = '1';
                modal.style.visibility = 'visible';
            }
            document.getElementById('manage-pr-btn').click();
        """)

        print("Waiting 5s for PR load...")
        page.wait_for_timeout(5000)

        # Print the HTML of the PR table body
        table_html = page.inner_html("#pr-table-body")
        print(f"\n--- PR TABLE HTML ---\n{table_html}\n---------------------\n")

        print("Forcing Add PR...")
        page.evaluate("""
            document.getElementById('pr-name-input').value = 'Test PR';
            document.getElementById('pr-code-input').value = 'testpr123';
            document.getElementById('add-pr-btn').click();
        """)

        print("Waiting 3s...")
        page.wait_for_timeout(3000)

        table_html = page.inner_html("#pr-table-body")
        print(f"\n--- PR TABLE HTML AFTER ADD ---\n{table_html}\n---------------------\n")

        browser.close()

if __name__ == "__main__":
    test_admin()
