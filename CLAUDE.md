# DLBP Website

Sito statico (HTML/CSS/JS vanilla) pubblicato con GitHub Pages su https://dlbp.art dal branch `main`.
Dati su Firebase (progetto `dlbp-website`, piano gratuito Spark): Firestore + Authentication. Email con EmailJS.

## Struttura
- Mappa completa di pagine, cartelle e collezioni nel `README.md`.
- JavaScript: moduli ES senza build. `js/core/` contiene il codice condiviso (Firebase, login staff, email, modali...); `js/pages/` ha un file d'ingresso per pagina; il pannello admin è diviso per sezione in `js/pages/admin/`, con lo stato condiviso in `state.js`.
- Pagine pubbliche: `index.html` ed `eventi.html` (`js/pages/home.js`), `event.html` (registrazione, `js/pages/event.js`).
- Pagine staff: `admin.html` (`js/pages/admin/main.js`), `scanner.html` (`js/pages/scanner.js`), `pr.html` (`js/pages/pr.js`).
- Firestore si importa sempre da `js/core/firebase.js`, mai direttamente da gstatic, così la versione dell'SDK resta una sola.
- GitHub Pages pubblica solo `*.html`, `css/`, `js/`, `assets/`, `manifest.json`, `CNAME` (vedi `.github/workflows/static.yml`): un nuovo file o cartella del sito va aggiunto lì.
- Regole di sicurezza: `firestore.rules`. I ruoli dello staff sono in `staff/{email in minuscolo}` con campo `role` (`admin` | `scanner` | `pr`, e `prCode` per i PR).
- Anteprima locale: server Node in `.claude/serve.js` (configurato in `.claude/launch.json`, porta 8000). Usa il database Firebase reale.

## Regole di lavoro
- Ogni modifica va su un branch e in una PR verso `main`, mai commit diretti su `main`.
- Quando cambiano gli script JS, aumentare la versione `?v=` nel tag `<script type="module">` della pagina (il file d'ingresso). I moduli importati possono restare in cache fino a ~10 minuti.
- Nell'anteprima, `pr.html` scollega gli account che non sono PR: non aprirla mentre si è collegati come admin.
- Il repository è pubblico: mai committare credenziali, backup del database o dati personali degli iscritti (`archive/backups/` e `scripts/db_guests/` sono in `.gitignore`).
- Scrivere al proprietario in italiano, in modo semplice.

## Autorizzazioni permanenti del proprietario
Claude può, senza chiedere ogni volta:
- creare branch, commit, push e aprire PR;
- unire (merge) le PR dopo averle verificate: controllo sintassi, pagine provate in locale senza errori e, quando serve, regole provate sul database;
- pubblicare le regole Firestore con `firebase deploy --only firestore:rules` dopo averle verificate, rispettando l'ordine che evita di lasciare fuori gli utenti (prima i documenti `staff` necessari, poi le regole, poi il codice).

Claude deve sempre chiedere prima di:
- cancellare dati in modo definitivo (eventi, iscritti, file, cronologia git) o fare force push;
- inviare email agli iscritti o fare qualsiasi azione a nome del proprietario verso terzi;
- scrivere dati nel database di produzione diversi da quelli già concordati.

Claude non inserisce mai password o email di login e non crea account: lo fa il proprietario.
