---
name: dlbp-design-system
description: Skill e prompt guida per il mantenimento del design system, regole grafiche, coerenza di layout atomico e regole di composizione di dlbp.art.
---

# Skill: Design System & Regole Grafiche di Composizione (dlbp.art)

Questa skill definisce in modo stringente le **regole di composizione estetica, atomica e di layout** per l'intero ecosistema web **`dlbp.art`**. 
Va consultata e applicata ogni volta che viene richiesta una modifica, una nuova funzionalità o un refactoring grafico.

---

## 🎨 1. Sfondo Fluito & Atmosfera (DA NON TOCCARE)
- **Sfondo Base**: Colore `#050508` con tre blob animati in movimento (`.fluid-background`): `#6366f1` (indaco), `#a855f7` (viola), `#ec4899` (rosa).
- **Overlay Rumore**: `.grain-overlay` con texture a grana fine e sfocatura.
- **Regola d'oro**: La struttura del background fluito e i suoi blob animati devono rimanere intatti al 100%.

---

## 📐 2. Allineamento Orizzontale & Griglia Coerente
- **Container Principale**: Ogni pagina usa `.page-container` e `.admin-container` con `max-width: 1200px` centrato e padding coerente.
- **Griglia KPI & Dashboard**: I box delle statistiche e dei contatori utilizzano sempre la griglia `.dashboard-grid` (`display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem;`).
- **Allineamento Flessibile**: Usare esclusivamente le utility classes Flexbox per disporre gli elementi:
  - `.flex-row-between` per intestazioni con titolo a sinistra e pulsante/azione a destra.
  - `.flex-row-center` per elementi centrati.
  - `.flex-row-left` per allineamento a sinistra.
  - `.gap-1`, `.gap-2` per le distanze.
  - `.w-100` per larghezza piena.

---

## 💎 3. Glassmorphism & Card Style
- **Schede & Modal**: Usare le classi `.event-card-item`, `.login-card`, `.kpi-box`.
  - Sfondo sfumato: `background: rgba(15, 15, 25, 0.75)` o `rgba(255, 255, 255, 0.03)`.
  - Effetto vetro: `backdrop-filter: blur(24px)`.
  - Bordo sottile: `border: 1px solid rgba(255, 255, 255, 0.12)`.
  - Raggio di curvatura: `border-radius: var(--radius-lg)` o `16px`.
- **Stato Visibile**: Tutte le schede statiche nelle pagine HTML (es. Admin, PR, Scanner) devono includere la classe `.visible` (es. `class="event-card-item visible"`) per evitare che rimangano trasparenti (`opacity: 0`).

---

## ✍️ 4. Tipografia & Gerarchia Visiva
- **Font Principale**: Sans-serif moderno (Inter / Outfit).
- **Font Monospaziale (Accent)**: `var(--font-mono)` per contatori KPI, codici PR, tag in maiuscolo e bottoni principali.
- **Gerarchia Testi**:
  - Titoli di sezione: maiuscoli, con `letter-spacing: 2px` o `3px` (`.tracking-wide`, `.tracking-wider`).
  - Colori testo: `--text-primary` (`#ffffff`), `--text-secondary` (`rgba(255,255,255,0.7)`), `--text-muted` (`rgba(255,255,255,0.5)`).

---

## 🚫 5. Zero Stili Inline & Classi Atomiche
- **Nessun `style="..."`**: È **tassativamente vietato** inserire attributi `style="..."` direttamente nel codice HTML.
- **Uso Classi Atomiche**: Qualsiasi margine, dimensione, allineamento o spaziatura deve utilizzare le classi atomiche da `css/styles.css`:
  - Margini: `.mb-0-5`, `.mb-1`, `.mb-1-5`, `.mb-2`, `.mt-1`, `.mt-2`, `.no-margin`.
  - Dimensioni Testo: `.text-xs`, `.text-sm`, `.text-lg`, `.text-xl`, `.text-2xl`.
  - Peso e Maiuscolo: `.font-bold`, `.uppercase`, `.font-mono`.
  - Input e Selezioni: `.custom-input`, `.custom-select`, `.submit-btn`.

---

## 👁️ 6. Gestione Stato & Visibilità JS
- **Cambio Stato Visibilità**: Mostrare e nascondere elementi **soltanto** tramite JavaScript utilizzando `.classList.add("hidden")` e `.classList.remove("hidden")`.
- **Divieto `.style.display`**: Non utilizzare mai `.style.display = "block"` o `"none"` nel codice JS per evitare rotture di layout Flex/Grid e conflitti di specificità.
- **Regola `.hidden` in CSS**: La classe `.hidden` possiede `display: none !important;` per garantire un cambio di stato infallibile.
- **Cache Busting**: Tutti i link CSS nelle pagine HTML includono il parametro versione (es. `href="css/styles.css?v=2"`).

---

## 📱 7. Responsive Design Coerente
- Breakpoint standard a `768px` e `600px`.
- Su mobile, le griglie `.dashboard-grid` ed i layout a colonne si dispongono in colonna singola mantenendo i margini laterali uniformi (`padding: 110px 1.2rem 3rem 1.2rem`).
