---
name: dlbp-browser-testing
description: Skill per l'emulazione browser ed il collaudo E2E/regressione automatizzato di dlbp.art ad ogni modifica strutturale del sito.
---

# Skill: Collaudo Browser Automatizzato & Regressione E2E (dlbp.art)

Questa skill automatizza l'emulazione di un browser reale (tramite Playwright in Chromium Headless) per verificare l'integrità funzionale e grafica di tutte le pagine del sito **`dlbp.art`** dopo ogni modifica al codice sorgente.

---

## 🎯 Quando Usare Questa Skill
- Dopo qualsiasi modifica alle pagine HTML (`index.html`, `admin.html`, `event.html`, `eventi.html`, `pr.html`, `scanner.html`).
- Dopo modifiche ai moduli JavaScript (`js/*.js`) o ai fogli di stile CSS (`css/*.css`).
- Per rilevare automaticamente errori di sintassi JS in console, risorse 404 mancanti o rotture del layout.

---

## 🛠️ Come Eseguire il Collaudo Browser

### Passo 1: Verificare che il Server Locale sia attivo
Assicurati che il server HTTP sia in esecuzione sulla porta 8080:
```bash
python3 -m http.server 8080
```

### Passo 2: Eseguire la Suite di Test Playwright
Esegui lo script di test browser automatizzato:
```bash
python3 .agents/skills/dlbp-browser-testing/scripts/run_browser_checks.py
```

---

## 📊 Controlli Automatizzati Eseguiti

1. **`index.html` (Landing Page)**:
   - Caricamento pagina e verifica titolo DLBP.
   - Apertura e chiusura dinamica del menu a tendina "AREA RISERVATA".
   - Controllo caricamento loghi e CSS.
   - Screenshot: `archive/screenshots/e2e_index.png`.

2. **`admin.html` (Dashboard Amministratore)**:
   - Simulazione autenticazione ed accesso dashboard.
   - Verifica visibilità del selettore eventi, KPI e tabelle.
   - Screenshot: `archive/screenshots/e2e_admin.png`.

3. **`eventi.html` (Elenco Eventi)**:
   - Controllo griglia prossimi eventi ed eventi passati.
   - Screenshot: `archive/screenshots/e2e_eventi.png`.

4. **`pr.html` (Area PR) & `scanner.html` (Scanner Check-in)**:
   - Verifica rendering interfaccia e campi form.
   - Screenshot: `archive/screenshots/e2e_pr.png` e `e2e_scanner.png`.

5. **Intercettazione Errori**:
   - Rileva automaticamente tutti i log d'errore in console e gli stati HTTP 400/404/500 delle chiamate di rete.
