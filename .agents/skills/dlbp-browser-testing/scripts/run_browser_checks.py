# .agents/skills/dlbp-browser-testing/scripts/run_browser_checks.py
import sys
import os
import time
import urllib.request
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:8080"
SCREENSHOT_DIR = "archive/screenshots"

os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def check_server():
    try:
        req = urllib.request.Request(BASE_URL)
        with urllib.request.urlopen(req) as resp:
            return resp.status == 200
    except Exception:
        return False

def run_tests():
    if not check_server():
        print(f"❌ SERVER NON ATTIVO su {BASE_URL}. Avvia il server prima di eseguire il test.")
        sys.exit(1)

    print(f"🚀 Avvio Test E2E Desktop & Mobile Browser per {BASE_URL}...")
    errors = []
    page_logs = []

    viewports = [
        {"name": "desktop", "width": 1280, "height": 800, "is_mobile": False},
        {"name": "mobile_iphone", "width": 390, "height": 844, "is_mobile": True},
        {"name": "mobile_small", "width": 360, "height": 640, "is_mobile": True}
    ]

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        for vp in viewports:
            vp_name = vp["name"]
            print(f"\n==================================================")
            print(f"📱 COLLAUDO VIEWPORT: {vp_name.upper()} ({vp['width']}x{vp['height']})")
            print(f"==================================================")

            context = browser.new_context(
                viewport={'width': vp['width'], 'height': vp['height']},
                is_mobile=vp['is_mobile'],
                has_touch=vp['is_mobile']
            )
            page = context.new_page()

            def handle_console(msg):
                if msg.type == "error":
                    page_logs.append(f"[{vp_name}] Console Error: {msg.text}")

            def handle_response(resp):
                if resp.status >= 400:
                    page_logs.append(f"[{vp_name}] HTTP {resp.status}: {resp.url}")

            page.on("console", handle_console)
            page.on("response", handle_response)

            # 1. LANDING PAGE (index.html)
            print(f"  [1/5] Testing index.html...")
            page.goto(f"{BASE_URL}/index.html", wait_until="domcontentloaded", timeout=10000)
            page.wait_for_timeout(500)
            
            # Check horizontal overflow on body
            overflow_width = page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
            if overflow_width > 5:
                errors.append(f"[{vp_name}] Horizontal overflow su index.html ({overflow_width}px)")

            staff_btn = page.locator("#staff-btn")
            if staff_btn.is_visible():
                staff_btn.click()
                page.wait_for_timeout(300)

            page.screenshot(path=f"{SCREENSHOT_DIR}/{vp_name}_index.png")

            # 2. ADMIN PANEL (admin.html)
            print(f"  [2/5] Testing admin.html...")
            page.goto(f"{BASE_URL}/admin.html", wait_until="domcontentloaded", timeout=10000)
            page.wait_for_timeout(500)
            
            overflow_width = page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
            if overflow_width > 5:
                errors.append(f"[{vp_name}] Horizontal overflow su admin.html ({overflow_width}px)")

            page.screenshot(path=f"{SCREENSHOT_DIR}/{vp_name}_admin.png")

            # 3. PAGINA EVENTI (eventi.html)
            print(f"  [3/5] Testing eventi.html...")
            page.goto(f"{BASE_URL}/eventi.html", wait_until="domcontentloaded", timeout=10000)
            page.wait_for_timeout(500)
            page.screenshot(path=f"{SCREENSHOT_DIR}/{vp_name}_eventi.png")

            # 4. AREA PR (pr.html)
            print(f"  [4/5] Testing pr.html...")
            page.goto(f"{BASE_URL}/pr.html", wait_until="domcontentloaded", timeout=10000)
            page.wait_for_timeout(500)
            page.screenshot(path=f"{SCREENSHOT_DIR}/{vp_name}_pr.png")

            # 5. SCANNER (scanner.html)
            print(f"  [5/5] Testing scanner.html...")
            page.goto(f"{BASE_URL}/scanner.html", wait_until="domcontentloaded", timeout=10000)
            page.wait_for_timeout(500)
            page.screenshot(path=f"{SCREENSHOT_DIR}/{vp_name}_scanner.png")

            context.close()

        browser.close()

    print("\n" + "="*50)
    print("📊 RISULTATO COLLAUDO DESKTOP & MOBILE:")
    print("="*50)
    if page_logs:
        print("\n⚠️ Avvisi/Errori rilevati durante la navigazione:")
        for log in set(page_logs):
            print(f"  {log}")

    if errors:
        print("\n❌ CRITICITÀ/OVERFLOW TROVATI SU MOBILE:")
        for err in errors:
            print(f"  - {err}")
        sys.exit(1)
    else:
        print("\n✅ TUTTI I TEST DESKTOP E MOBILE HANNO AVUTO ESITO POSITIVO!")
        print(f"📸 Screenshot salvati in {SCREENSHOT_DIR}/mobile_*.png")

if __name__ == "__main__":
    run_tests()
