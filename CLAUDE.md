# DLBP Website

Sito statico (HTML/CSS/JS vanilla) pubblicato con GitHub Pages su https://dlbp.art dal branch `main`.
Dati su Firebase (progetto `dlbp-website`, piano gratuito Spark): Firestore + Authentication. Email con EmailJS.

## Struttura
- Mappa completa di pagine, cartelle, collezioni e **funzionalità** nel `README.md`: quando si aggiunge o cambia una funzione, aggiornare anche la sezione "Funzionalità" (e "Aspetto" o "Email" se serve).
- JavaScript: moduli ES senza build. `js/core/` contiene il codice condiviso (Firebase, login staff, email, modali...); `js/pages/` ha un file d'ingresso per pagina; il pannello admin è diviso per sezione in `js/pages/admin/`, con lo stato condiviso in `state.js`.
- Pagine pubbliche: `index.html` ed `eventi.html` (`js/pages/home.js`), `event.html` (registrazione, `js/pages/event.js`).
- Pagine staff: `admin.html` (`js/pages/admin/main.js`), `scanner.html` (`js/pages/scanner.js`), `pr.html` (`js/pages/pr.js`).
- Firestore si importa sempre da `js/core/firebase.js`, mai direttamente da gstatic, così la versione dell'SDK resta una sola. La stessa versione compare anche in `js/core/firebase-auth.js` e nei `<link rel="modulepreload">` di `index.html`, `eventi.html` ed `event.html`: si aggiorna in tutti i punti insieme.
- Aspetto: colori, caratteri e forme in `css/identity.css` (si carica dopo `styles.css`); sfondo 3D, palette (`MOODS`), ordine (`ORDER`) e cambio colore (`CYCLE_EVERY`) in `js/core/background.js`. Regole grafiche in `.agents/skills/dlbp-design-system/SKILL.md`.
- Icone social del footer: `assets/social-icons.svg` (niente Font Awesome).
- GitHub Pages pubblica solo `*.html`, `css/`, `js/`, `assets/`, `manifest.json`, `CNAME`, `robots.txt`, `sitemap.xml` (vedi `.github/workflows/static.yml`): un nuovo file o cartella del sito va aggiunto lì.
- Regole di sicurezza: `firestore.rules`. I ruoli dello staff sono in `staff/{email in minuscolo}` con campo `role` (`admin` | `scanner` | `pr`, e `prCode` per i PR).
- Anteprima locale: server Node in `.claude/serve.js` (configurato in `.claude/launch.json`, porta 8000). Usa il database Firebase reale.

## Regole di lavoro
- Ogni modifica va su un branch e in una PR verso `main`, mai commit diretti su `main`.
- Se cambiano i campi del modulo di iscrizione (`event.html`) o le regole delle iscrizioni, aumentare insieme `FORM_VERSION` in `js/pages/event.js` e `registrationForm` in `js/form-version.json`: chi ha la pagina vecchia vedrà "ricarica la pagina".
- Quando cambiano gli script JS o i CSS, aumentare la versione `?v=` nel tag della pagina (per i JS, il file d'ingresso `<script type="module">`). `styles.css`, `identity.css` e `background.js` hanno lo stesso numero in tutte le pagine: si aumentano ovunque insieme.
- I moduli importati (senza `?v=`) possono restare in cache fino a ~10 minuti, quindi dopo una pubblicazione un file nuovo può trovarsi accanto a uno vecchio. In una stessa PR non togliere o rinominare export usati da altri file e non importare nomi che la versione vecchia del modulo non esporta.
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
