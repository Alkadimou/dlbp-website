# DLBP Website

Sito degli eventi **Drink Love Breathe Peace**, online su [dlbp.art](https://dlbp.art).
Il pubblico vede gli eventi e si iscrive in lista; lo staff gestisce eventi e iscritti, controlla gli ingressi alla porta e segue i propri inviti.

- **Frontend:** HTML, CSS e JavaScript senza framework né build. I file del repository sono quelli che vanno online.
- **Hosting:** GitHub Pages, pubblicato automaticamente a ogni push su `main`.
- **Database e login:** Firebase (progetto `dlbp-website`, piano gratuito Spark): Firestore + Authentication.
- **Email:** EmailJS (conferma d'iscrizione e biglietto con QR code).

## Pagine

| Pagina | Per chi | Cosa fa | JavaScript |
|---|---|---|---|
| `index.html` | pubblico | Home | `js/pages/home.js` |
| `eventi.html` | pubblico | Elenco eventi in programma e passati | `js/pages/home.js` |
| `event.html?id=<evento>` | pubblico | Password d'ingresso (se c'è) e iscrizione in lista | `js/pages/event.js` |
| `admin.html` | staff `admin` | Eventi, iscritti, email, statistiche, PR | `js/pages/admin/main.js` |
| `scanner.html` | staff `scanner` o `admin` | Lettura dei QR code alla porta | `js/pages/scanner.js` |
| `pr.html` | staff `pr` | Iscritti arrivati con il proprio link d'invito | `js/pages/pr.js` |

Un link con `?pr=<codice>` (per esempio `https://dlbp.art/?pr=mario`) collega l'iscrizione a quel PR.

## Struttura delle cartelle

```
*.html                 le pagine del sito (restano nella radice per mantenere gli indirizzi)
css/styles.css         tutti gli stili
assets/                logo, immagini, video
js/
  core/                codice condiviso da più pagine
    firebase.js          connessione a Firebase e funzioni Firestore (versione SDK in un solo punto)
    firebase-auth.js     login Firebase (solo pagine staff)
    staff-login.js       form di login dello staff e controllo del ruolo
    email.js             invio email con EmailJS e nomi dei template
    modal.js             finestre di avviso e conferma
    html.js              escapeHtml, per mostrare in sicurezza i testi degli utenti
    table-sort.js        intestazioni di tabella ordinabili
    nav.js               menu "AREA RISERVATA"
    reveal.js            animazioni di comparsa
  pages/               un file per pagina (il punto d'ingresso caricato dall'HTML)
    admin/               il pannello admin, diviso per sezione
      main.js              avvio e login
      state.js             dati condivisi tra i moduli (evento selezionato, iscritti...)
      events.js            scelta evento, attiva/disattiva, elimina
      event-form.js        crea / modifica evento, locandina
      event-details.js     finestra DETTAGLI
      analytics.js         finestra STATISTICHE
      charts.js            grafici (Chart.js)
      guests.js            tabella iscritti, filtri, contatore ingressi, CSV
      guest-actions.js     elimina iscritti, invia biglietti via email
      prs.js               gestione PR
firestore.rules        regole di sicurezza del database
firebase.json, .firebaserc   configurazione della Firebase CLI
.github/workflows/     pubblicazione su GitHub Pages
.claude/               server per l'anteprima locale
scripts/               script Python usati una tantum sul database (non vanno online)
tests/                 vecchi test Playwright (da aggiornare, vedi sotto)
archive/               materiale storico: screenshot, vecchie versioni
```

Ogni file JavaScript inizia con un breve commento che spiega a cosa serve.

## Database (Firestore)

| Collezione | Contenuto | Chi può leggere / scrivere |
|---|---|---|
| `events` | un documento per evento: `name`, `date` (testo mostrato), `dateIso`, `startTime`, `endTime`, `location`, `password` (d'ingresso, facoltativa), `flyerUrl` (immagine Base64), `description`, `maxCapacity`, `isOpen` (iscrizioni aperte), `isActive` (evento in corso), `createdAt` | tutti leggono, admin scrive |
| `registrations` | un iscritto per evento. ID = `<eventId>_<hash dell'email>`, così la stessa email non può iscriversi due volte. Campi: `name`, `email`, `eventId`, `invited_by` (codice PR), `status`, `checked_in`, `check_in_time`, `email_sent`, `privacy_consent`, `timestamp` | il pubblico può solo creare; admin tutto; scanner legge e segna l'ingresso; il PR legge solo i propri iscritti |
| `prs` | `name`, `code`, `email`, `isActive`, `createdAt` | admin |
| `staff` | ruoli dello staff, ID = email in minuscolo: `role` (`admin`, `scanner`, `pr`), `prCode` per i PR | admin; ognuno legge il proprio |
| `settings` | `config`: vecchie impostazioni di prima della gestione multi-evento | tutti leggono, admin scrive |

Le regole complete sono in `firestore.rules`.

## Accessi dello staff

Admin, scanner e PR accedono con un account Firebase (email e password). Le pagine controllano il ruolo nel documento `staff/{email}` e scollegano chi non ha il ruolo giusto.

**Aggiungere un membro dello staff**
1. [Firebase Console → Authentication → Users](https://console.firebase.google.com/project/dlbp-website/authentication/users) → **Add user** con email e password.
2. Assegnare il ruolo:
   - **PR:** dal pannello admin, sezione PR, inserendo nome, codice ed email. Il documento `staff` viene creato automaticamente; eliminando il PR l'accesso viene revocato.
   - **Admin o scanner:** [Firestore → Data](https://console.firebase.google.com/project/dlbp-website/firestore/data) → collezione `staff` → documento con ID = email in minuscolo e campo `role` (stringa) = `admin` oppure `scanner`.

## Lavorare sul sito

**Anteprima locale** (usa il database reale, quindi attenzione a cosa si salva):
```bash
node .claude/serve.js 8000
```
poi aprire http://localhost:8000.

**Modificare il codice**
- Si lavora su un branch e si apre una Pull Request verso `main`.
- Quando cambia un file JavaScript, aumentare il numero `?v=` nel tag `<script type="module">` della pagina, così i browser scaricano la versione nuova. I moduli importati possono restare in cache per qualche minuto (GitHub Pages li tiene circa 10 minuti).
- Le chiavi di Firebase ed EmailJS nel codice sono pubbliche per natura: la protezione dei dati sta nelle regole Firestore. Password, backup del database e dati degli iscritti non vanno mai nel repository (`archive/backups/` e `scripts/db_guests/` sono esclusi da `.gitignore`).

**Pubblicare**
- **Sito:** unire la Pull Request in `main`. Il workflow `.github/workflows/static.yml` pubblica solo i file del sito (`*.html`, `css/`, `js/`, `assets/`, `manifest.json`, `CNAME`).
- **Regole Firestore:** `firebase deploy --only firestore:rules` (serve la Firebase CLI con accesso al progetto). Se una modifica richiede nuovi documenti `staff`, crearli prima di pubblicare le regole, per non lasciare fuori nessuno.

## Da fare
- I test in `tests/` usano il vecchio login con sola password e la porta 8080: vanno aggiornati al login con email e ruoli prima di poterli usare.
- `css/styles.css` è un file unico di circa 2400 righe: si può dividere per sezione, confrontando gli screenshot prima e dopo.
