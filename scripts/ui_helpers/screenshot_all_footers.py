from playwright.sync_api import sync_playwright
import time

def take_screenshots():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        # Screenshot index.html
        print("Taking screenshot of index.html")
        page.goto('http://localhost:8080/')
        time.sleep(1)
        # Scroll to bottom
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(1)
        page.screenshot(path='screenshot_footer_index.png')

        # Screenshot eventi.html
        print("Taking screenshot of eventi.html")
        page.goto('http://localhost:8080/eventi')
        time.sleep(1)
        # Scroll to bottom
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(1)
        page.screenshot(path='screenshot_footer_eventi.png')

        # Screenshot admin.html
        print("Taking screenshot of admin.html")
        page.goto('http://localhost:8080/admin')
        time.sleep(1)
        # Scroll to bottom
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(1)
        page.screenshot(path='screenshot_footer_admin.png')

        browser.close()

if __name__ == '__main__':
    take_screenshots()
