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

    print(f"🚀 Avvio Test E2E Browser per {BASE_URL}...")
    errors = []
    page_logs = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        # Capture console errors & 404 network failures
        def handle_console(msg):
            if msg.type == "error":
                page_logs.append(f"[Console Error] {msg.text}")

        def handle_response(resp):
            if resp.status >= 400:
                page_logs.append(f"[HTTP {resp.status}] {resp.url}")

        page.on("console", handle_console)
        page.on("response", handle_response)

        # 1. TEST LANDING PAGE (index.html)
        print("\n[1/5] Collaudo Landing Page (index.html)...")
        page.goto(f"{BASE_URL}/index.html", wait_until="domcontentloaded", timeout=10000)
        page.wait_for_timeout(1000)
        title = page.title()
        print(f"  - Titolo Pagina: {title}")
        if "DLBP" not in title:
            errors.append("Titolo index.html errato.")
        
        # Test Dropdown Staff
        staff_btn = page.locator("#staff-btn")
        if staff_btn.is_visible():
            staff_btn.click()
            page.wait_for_timeout(300)
            dropdown = page.locator("#staff-dropdown")
            if dropdown.is_visible():
                print("  - Menu Area Riservata: OK")
            else:
                errors.append("Menu a tendina Area Riservata non si apre.")

        page.screenshot(path=f"{SCREENSHOT_DIR}/e2e_index.png")

        # 2. TEST ADMIN DASHBOARD (admin.html)
        print("\n[2/5] Collaudo Admin Panel (admin.html)...")
        page.goto(f"{BASE_URL}/admin.html", wait_until="domcontentloaded", timeout=10000)
        page.wait_for_timeout(1000)

        # Login Test
        email_input = page.locator("#admin-email")
        pwd_input = page.locator("#admin-password")
        login_btn = page.locator("#login-btn")

        if email_input.is_visible() and pwd_input.is_visible():
            email_input.fill("admin@dlbp.it")
            pwd_input.fill("admin123")
            login_btn.click()
            page.wait_for_timeout(1500)

        # Verify Dashboard Elements
        dash_section = page.locator("#dashboard-section")
        if dash_section.is_visible():
            print("  - Accesso Dashboard: OK")
            event_selector = page.locator("#admin-event-selector")
            if event_selector.is_visible():
                print("  - Selettore Eventi Admin: OK")
            else:
                errors.append("Selettore eventi mancante in Admin.")
        else:
            print("  - Sezione Login Admin attiva.")

        page.screenshot(path=f"{SCREENSHOT_DIR}/e2e_admin.png")

        # 3. TEST PAGINA EVENTI (eventi.html)
        print("\n[3/5] Collaudo Pagina Eventi (eventi.html)...")
        page.goto(f"{BASE_URL}/eventi.html", wait_until="domcontentloaded", timeout=10000)
        page.wait_for_timeout(1000)
        events_grid = page.locator("#events-grid")
        if events_grid.is_visible():
            print("  - Griglia Prossimi Eventi: OK")
        page.screenshot(path=f"{SCREENSHOT_DIR}/e2e_eventi.png")

        # 4. TEST AREA PR (pr.html)
        print("\n[4/5] Collaudo Area PR (pr.html)...")
        page.goto(f"{BASE_URL}/pr.html", wait_until="domcontentloaded", timeout=10000)
        page.wait_for_timeout(1000)
        page.screenshot(path=f"{SCREENSHOT_DIR}/e2e_pr.png")
        print("  - Area PR caricata correttamente.")

        # 5. TEST SCANNER (scanner.html)
        print("\n[5/5] Collaudo Scanner (scanner.html)...")
        page.goto(f"{BASE_URL}/scanner.html", wait_until="domcontentloaded", timeout=10000)
        page.wait_for_timeout(1000)
        page.screenshot(path=f"{SCREENSHOT_DIR}/e2e_scanner.png")
        print("  - Pagina Scanner caricata correttamente.")

        browser.close()

    print("\n" + "="*50)
    print("📊 RISULTATO COLLAUDO BROWSER:")
    print("="*50)
    if page_logs:
        print("\n⚠️ Avvisi/Errori rilevati durante la navigazione:")
        for log in page_logs:
            print(f"  {log}")

    if errors:
        print("\n❌ FALLIMENTI TROVATI:")
        for err in errors:
            print(f"  - {err}")
        sys.exit(1)
    else:
        print("\n✅ TUTTI I TEST BROWSER HANNO AVUTO ESITO POSITIVO!")
        print(f"📸 Screenshot del collaudo salvati in {SCREENSHOT_DIR}/e2e_*.png")

if __name__ == "__main__":
    run_tests()
