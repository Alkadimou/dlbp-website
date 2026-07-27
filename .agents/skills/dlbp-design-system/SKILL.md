---
name: dlbp-design-system
description: Skill e prompt guida per il mantenimento del design system, regole grafiche, composizione di header, footer, tabelle, bottoni, input, griglie, glassmorphism e regole mobile di dlbp.art.
---

# Skill: Design System & Regole Grafiche di Composizione (dlbp.art)

Questa skill definisce in modo stringente **TUTTE le regole di composizione estetica, atomica e di layout** per l'intero ecosistema web **`dlbp.art`**. 
Va consultata e applicata integralmente ogni volta che viene richiesta una modifica, una nuova funzionalità o un refactoring grafico.

---

## 🎨 1. Sfondo Fluido & Atmosfera (DA NON TOCCARE)
- **Sfondo Base**: Colore `#050508` con tre blob animati in movimento (`.fluid-background`): `#6366f1` (indaco), `#a855f7` (viola), `#ec4899` (rosa).
- **Overlay Rumore**: `.grain-overlay` con texture a grana fine e sfocatura.
- **Regola d'oro**: La struttura del background fluido e i suoi blob animati devono rimanere intatti al 100%.

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

## 🧭 5. Header & Navigazione Globale (`.main-nav` / `.global-nav`)
- **Fissaggio & Trasparenza**: Posizione fissa in alto (`position: fixed; top: 0; left: 0; width: 100%; z-index: 1000`), sfocatura vetro `backdrop-filter: blur(15px)` e sfondo semi-trasparente `rgba(5, 5, 8, 0.85)`.
- **Layout Bilanciato**: Logo `.nav-logo` a sinistra (altezza/larghezza proporzionale `90px`), menu `.nav-right` a destra.
- **Dropdown "AREA RISERVATA"**:
  - Posizionamento assoluto con scheda vetro integrata (`.dropdown-content`).
  - Animazione di apparizione morbida e z-index elevato (`100`).
  - Indicatore di stato attivo con classe `.active`.
- **Mobile Header**: Riduzione del padding e mantenimento del logo ben visibile con allineamento flessibile centrato.

---

## 👣 6. Footer & Chiusura Pagina (`.site-footer`)
- **Bordo Separatore**: Linea superiore sottile `border-top: 1px solid rgba(255, 255, 255, 0.1)`.
- **Composizione Interne (`.footer-inner`)**:
  - Sinistra: Note di copyright `.footer-copy` (`font-size: 0.8rem; color: rgba(255, 255, 255, 0.4)`).
  - Centro/Destra: Logo `.footer-logo-img` (`70px`), link legali `.footer-links` e icone social `.social-bottom`.
- **Mobile Footer**: Su schermi `<= 768px`, gli elementi si impilano in colonna centrata con `gap: 1.5rem` ed allineamento al centro.

---

## 📊 7. Tabelle Dati (`.users-table`, `.pr-table`, `.table-responsive`)
- **Wrapper Tassativo**: Ogni tabella DEVE essere racchiusa dentro un contenitore `<div class="table-responsive">`.
- **Intestazioni (`th`)**: Testo in maiuscolo, font monospaziale (`var(--font-mono)`), colore muted `rgba(255, 255, 255, 0.5)`, spaziatura maiuscole `letter-spacing: 1.5px`.
- **Celle & Righe (`td`, `tr`)**:
  - Padding generoso `1.2rem 1rem`.
  - Effetto hover morbido sulle righe: `background: rgba(255, 255, 255, 0.06)`.
- **Badge di Stato**:
  - Approvato / Presente: `.status-approved` (bordo e testo verde neon con bagliore).
  - In Attesa: `.status-pending` (bordo e testo ambra).
  - Rifiutato / Non Presente: `.status-rejected` (bordo e testo rosso).
- **Mobile Responsive Table (Card View)**:
  - Su schermi `<= 768px`, la tabella si trasforma in una serie di schede vetro sovrapposte (`table-responsive` mobile view).
  - L'intestazione `thead` viene nascosta e le celle `td` usano il pseudo-elemento `::before` con attributo `data-label` per mostrare l'etichetta del campo a sinistra e il valore a destra.

---

## 🔘 8. Bottoni & Azioni (`.submit-btn`, `.btn-danger`, `.btn-success`, `.btn-secondary`)
- **Bottone Base (`.submit-btn`)**:
  - Altezza standard: `48px` (o min-height `48px`).
  - Tipografia: Font monospaziale (`var(--font-mono)`), `font-weight: 700`, testo maiuscolo, `letter-spacing: 2px`.
  - Bordo & Raggio: `border: 1px solid rgba(255, 255, 255, 0.2); border-radius: var(--radius-md)`.
  - Transizione & Hover: micro-effetto scala `transform: translateY(-2px)`, bagliore ombra `box-shadow: 0 0 15px rgba(255, 255, 255, 0.15)`.
- **Varianti Colore**:
  - Danger (`.btn-danger`): Bordo e testo rosso/cremesino, hover con bagliore rosso.
  - Success (`.btn-success`): Bordo e testo verde smeraldo, hover con bagliore verde.
  - Secondary (`.btn-secondary`): Bordo grigio opaco con trasparenza elegante.
- **Utility Modifiers**: `.text-xs` (`padding: 0.4rem 0.8rem`), `.no-margin`, `.w-100`.

---

## 📝 9. Caselle di Testo & Form (`.custom-input`, `.custom-select`)
- **Stile Base**:
  - Altezza `48px`, padding `0.8rem 1rem`.
  - Sfondo vetro: `background: rgba(255, 255, 255, 0.04)`.
  - Bordo: `1px solid rgba(255, 255, 255, 0.15)`, raggio `var(--radius-md)`.
- **Tipografia**: `var(--font-mono)`, `font-size: 0.85rem`, `letter-spacing: 2px`, colore `#ffffff`.
- **Placeholder**: `color: rgba(255, 255, 255, 0.3)` in maiuscolo.
- **Stato di Focus (`:focus`)**:
  - Bordo più luminoso `rgba(255, 255, 255, 0.4)`.
  - Sfondo leggermente schiarito `rgba(255, 255, 255, 0.08)`.
  - Bagliore sottile: `box-shadow: 0 0 15px rgba(255, 255, 255, 0.1)`.

---

## 📱 10. Ridimensionamento Mobile & Touch Targets
- **Target Tattili (Touch Targets)**: Tutti i pulsanti, input e link cliccabili devono avere un'area di tocco minima di **`44px x 44px`** per garantire la perfetta usabilità da smartphone.
- **Padding Contenitore Mobile**: Su schermi `<= 768px`, il padding superiore dei container passa a `110px` per evitare che la nav fissa copra i contenuti, mentre il padding laterale si regola a `1.2rem`.
- **Adattamento Layout**: Tutti i flex container passano da allineamento orizzontale a verticale (`flex-direction: column` o `flex-wrap: wrap`).

---

## 🚫 11. Zero Stili Inline, Visibilità JS & Classi Atomiche (TASSATIVO)
- **Nessun `style="..."`**: È **tassativamente vietato** inserire attributi `style="..."` direttamente nel codice HTML.
- **Uso Classi Atomiche**: Usare solo classi da `css/styles.css` (`.mb-1`, `.mb-2`, `.text-xs`, `.text-xl`, `.font-mono`, `.w-100`, `.flex-1`, ecc.).
- **Gestione Visibilità JS**: Mostrare/nascondere elementi **esclusivamente** con `.classList.add("hidden")` e `.classList.remove("hidden")`.
- **Regola `.hidden`**: La classe `.hidden` possiede `display: none !important;` per garantire un cambio di stato infallibile.
- **Parametro Versione**: Mantenere `href="css/styles.css?v=10"` per il bypass della cache.

---

## 🧪 12. Collaudo Empirico Tassativo tramite Emulatore Browser (Playwright)
- **Verifica e Test Autonomi Obbligatori**: Per **ogni singola modifica estetica, di layout, di footer, di header o di ridimensionamento mobile**, è **tassativamente obbligatorio** eseguire test con l'emulatore browser (Playwright Headless Chromium) e uno script di misurazione numerica delle coordinate/bounding box ($X, Y, width, height$).
- **Iterazione all'Infinito fino al Goal**: L'agente DEVE eseguire i test dell'emulatore browser in autonomia, analizzare le discrepanze numeriche o i difetti visivi ed applicare correzioni successive in un ciclo continuo ("loop di correzione autonoma") fino al completo e perfetto raggiungimento del goal senza fermarsi a stime approssimative.

---

## 🧠 13. Auto-Aggiornamento Dinamico delle Skill & Prevenzione Errori (TASSATIVO)
- **Evoluzione Continua del Design System**: Ad ogni nuova modifica, soluzione di bug, decisione architetturale o introduzione di pattern (es. dipendenze CDN come FontAwesome, layout Flexbox unificati, gestione altezze bottoni a `48px`, `table-responsive`, bypass cache `?v=N`), l'agente **DEVE aggiornare ed espandere automaticamente** sia `SKILL.md` che `prompt_regole_grafiche.txt`.
- **Prevenzione Errore & Contratto tra Pagine**: Ogni nuova regola o funzione aggiunta deve essere codificata per impedire errori futuri e garantire che TUTTE le 6 pagine del sito (`index.html`, `eventi.html`, `admin.html`, `pr.html`, `scanner.html`, `event.html`) mantengano una **totale ed infrangibile coerenza stilistica, logica di sviluppo e zero-regressione**.


