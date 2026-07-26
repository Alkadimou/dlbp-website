# .agents/skills/dlbp-browser-testing/scripts/test_pr_login_hide.py
import os
import sys
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:8080"
SCREENSHOT_DIR = "archive/screenshots"

def run_test():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 390, 'height': 844})

        print("Navigazione su /pr.html...")
        page.goto(f"{BASE_URL}/pr.html", wait_until="domcontentloaded")
        page.wait_for_timeout(500)

        # Pre-login check
        login_visible_before = page.eval_on_selector("#login-section", "el => getComputedStyle(el).display !== 'none'")
        print(f"Login section visibile prima dell'accesso: {login_visible_before}")

        # Fill PR code (e.g. demo PR code or test)
        pr_code_input = page.locator("#pr-code")
        login_btn = page.locator("#login-btn")
        if pr_code_input.is_visible():
            pr_code_input.fill("TEST")
            login_btn.click()
            page.wait_for_timeout(1000)

            # Check if login-section hides when dashboard opens or on valid auth
            page.screenshot(path=f"{SCREENSHOT_DIR}/pr_login_test.png")

        browser.close()

if __name__ == "__main__":
    run_test()
