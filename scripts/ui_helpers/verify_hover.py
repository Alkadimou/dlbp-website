from playwright.sync_api import sync_playwright

def verify():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8080/admin.html")
        
        # Wait 3 seconds for animations to fully complete
        page.wait_for_timeout(3000)
        
        # Get transform before hover
        transform_before = page.evaluate("window.getComputedStyle(document.getElementById('login-section')).transform")
        print("Transform before hover:", transform_before)
        
        # Hover over login-section
        page.hover("#login-section")
        page.wait_for_timeout(1000)
        
        # Get transform after hover
        transform_after = page.evaluate("window.getComputedStyle(document.getElementById('login-section')).transform")
        print("Transform after hover:", transform_after)
        
        browser.close()

if __name__ == "__main__":
    verify()
