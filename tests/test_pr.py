import os
from playwright.sync_api import sync_playwright

def test_pr():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        def handle_console(msg):
            print(f"CONSOLE [{msg.type}]: {msg.text}")
        page.on("console", handle_console)
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))

        print("Navigating to pr.html...")
        page.goto("http://127.0.0.1:8080/pr.html")

        # Credentials of a staff account with role "pr" (never commit them)
        print("Filling PR login...")
        page.fill("#pr-email", os.environ["DLBP_PR_EMAIL"])
        page.fill("#pr-password", os.environ["DLBP_PR_PASSWORD"])
        page.click("#login-btn")

        print("Waiting 5s for PR dashboard to load...")
        page.wait_for_timeout(5000)

        welcome = page.inner_html("#pr-welcome")
        total = page.inner_html("#stat-total")
        approved = page.inner_html("#stat-approved")
        entered = page.inner_html("#stat-entered")

        print(f"\n--- PR DASHBOARD STATS ---")
        print(f"Welcome Title: {welcome}")
        print(f"Total: {total}")
        print(f"Approved: {approved}")
        print(f"Entered: {entered}")
        print(f"--------------------------\n")

        browser.close()

if __name__ == "__main__":
    test_pr()
