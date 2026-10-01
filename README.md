# DLBP Website

Sito degli eventi **Drink Love Breathe Peace**, online su [dlbp.art](https://dlbp.art).
Il pubblico vede gli eventi e si iscrive in lista. Lo staff gestisce eventi e iscritti, controlla gli ingressi alla porta e segue i propri inviti.

- **Frontend:** HTML, CSS e JavaScript senza framework né build. I file del repository sono quelli che vanno online.
- **Hosting:** GitHub Pages, pubblicato automaticamente a ogni push su `main`.
- **Database e login:** Firebase (progetto `dlbp-website`, piano gratuito Spark), cioè Firestore e Authentication.
- **Email:** EmailJS manda il biglietto (location, mappa e QR code) subito dopo l'iscrizione; l'admin può reinviarlo con INVIA ACCESSI.

## Pagine

| Pagina | Per chi | Cosa fa | JavaScript |
|---|---|---|---|
| `index.html` | pubblico | Home con lo sfondo 3D e il bottone PROSSIMO EVENTO | `js/pages/home.js` |
| `eventi.html` | pubblico | Elenco degli eventi in programma e passati | `js/pages/home.js` |
| `event.html?id=<evento>` | pubblico | Password d'ingresso (se c'è) e iscrizione in lista | `js/pages/event.js` |
| `annulla-iscrizione.html?id=<codice>` | pubblico (link personale nelle mail di invito) | Cancella il contatto dalla rubrica `contacts` dopo il clic su CONFERMA; fuori dai motori di ricerca | `js/pages/unsubscribe.js` |
| `admin.html` | staff `admin` | Eventi, iscritti, email, statistiche, PR | `js/pages/admin/main.js` |
| `scanner.html` | staff `scanner` o `admin` | Lettura dei QR code alla porta | `js/pages/scanner.js` |
| `pr.html` | staff `pr` | Iscritti arrivati con il proprio link d'invito | `js/pages/pr.js` |

Un link con `?pr=<codice>` (per esempio `https://dlbp.art/?pr=mario`) collega l'iscrizione a quel PR.

## Funzionalità

### Home (`index.html`)
- Sfondo con l'elica di DNA in cromo e il motto DRINK · LOVE · BREATHE · PEACE (vedi [Aspetto](#aspetto)).
- Sotto il motto c'è una sequenza di DNA che ogni tanto si decifra nella parola del colore attuale.
- Il bottone **PROSSIMO EVENTO** compare solo se c'è almeno un evento attivo.
  - Porta all'evento attivo con la data più vicina da oggi in poi; se nessuno ha una data futura, al più recente. Vale anche per gli eventi con capienza 0, che aprono la pagina dell'evento senza modulo.
  - Mantiene il codice `?pr=`.
- Alla prima visita della sessione compare per circa 1,5 secondi una schermata con il logo.

### Eventi (`eventi.html`)
- **Prossimi eventi**: gli eventi attivi, con locandina, data, stato (ISCRIZIONI APERTE o GUESTLIST CLOSED) e link all'iscrizione. Il link mantiene `?pr=`.
  - **Capienza 0 = evento solo da vedere:** la card compare con PROSSIMAMENTE e il bottone DETTAGLI, e apre la pagina dell'evento senza modulo.
- **Eventi passati**: gli eventi non attivi con la lista chiusa o con la data passata, segnati come ARCHIVIATO.

### Iscrizione (`event.html?id=<evento>`)
- Mostra locandina, nome, data e descrizione dell'evento. Il nome compare anche nella scheda del browser.
- La **password d'ingresso** è facoltativa e non distingue maiuscole e minuscole.
- **Modulo:**
  - nome e cognome, salvati in maiuscolo sia separati sia insieme;
  - email;
  - consenso privacy.
- Se la lista è chiusa compare GUESTLIST CLOSED al posto del modulo.
- Se la capienza è 0 non c'è né password né modulo: sopra il titolo compare PROSSIMO EVENTO // INGRESSO LIBERO (invece di NUMERO CHIUSO) e al posto del modulo il riquadro INGRESSO LIBERO; anche le regole di Firestore rifiutano le iscrizioni a quell'evento.
- **Una sola iscrizione per email e per evento.** L'ID del documento è `<evento>_<hash dell'email>` e le regole permettono al pubblico solo di creare, mai di sovrascrivere.
- **Codice PR:** `?pr=<codice>` resta ricordato per tutta la visita e finisce nel campo `invited_by`.
- **Email del biglietto:** parte subito dopo l'iscrizione e l'iscrizione viene segnata `email_sent: true`. Se l'email non parte, l'iscrizione resta valida e l'admin può reinviarla.
- **"Ricarica la pagina":** se una pagina vecchia rimasta in cache prova a iscriversi dopo un cambio del modulo, compare il messaggio con il bottone RICARICA LA PAGINA invece di un errore. `FORM_VERSION` in `js/pages/event.js` e `registrationForm` in `js/form-version.json` devono avere lo stesso numero.
- Alla prima visita della sessione compare per circa 3 secondi una schermata con il logo.

### Admin (`admin.html`, ruolo `admin`)
- **Evento:**
  - scelta dell'evento nel menu; quello attivo è segnato [ATTIVO ONLINE];
  - + NUOVO per crearne uno.
- **Riquadri:**
  - capienza e iscritti;
  - ingressi live, aggiornati ogni 30 secondi e in rosso quando il locale è pieno.
- **Bottoni dell'evento:**
  - DETTAGLI: sola lettura;
  - MODIFICA: nome, location, password, data, orari, capienza (0 = evento solo da vedere, senza iscrizioni), locandina (compressa in JPEG) e descrizione;
  - ELIMINA: cancella l'evento con tutti i suoi iscritti;
  - RENDI ATTIVO / INATTIVO;
  - APRI / CHIUDI LISTA.
  - mentre un bottone lavora (lettura o salvataggio) appare attenuato e ignora altri clic (`js/pages/admin/busy.js`); agisce sempre sull'evento scelto al momento del clic.
- **Tabella iscritti:**
  - ricerca per nome o email;
  - filtri per ticket inviato, presenza e lista PR;
  - colonne ordinabili con ▲▼;
  - selezione con le caselle o toccando la riga;
  - ingresso manuale con 🚪.
- **Sotto la tabella:**
  - ANALYTICS: numeri e 4 grafici (iscrizioni nel tempo, approvati e in attesa, presenti e assenti, ingressi per mezz'ora);
  - ESPORTA: file CSV degli iscritti;
  - ELIMINA: gli iscritti selezionati;
  - INVIA ACCESSI: reinvia l'email del biglietto ai selezionati.
- **Gestione PR:**
  - AGGIUNGI crea nome, codice ed email di accesso; scrive insieme i documenti `prs` e `staff`;
  - COLLEGA EMAIL serve per i PR creati prima del login con email;
  - ELIMINA toglie anche l'accesso;
  - un'email che è già admin o scanner non può diventare PR.
- Sui telefoni le tabelle diventano schede e le finestre (MODIFICA, DETTAGLI, ANALYTICS) stanno dentro lo schermo e scorrono solo in verticale.

### Scanner (`scanner.html`, ruolo `scanner` o `admin`)
- Legge il QR del biglietto con la fotocamera.
- La fotocamera parte solo quando si preme "Start Scanning", anche se il permesso è già stato dato.
- **Controlla, in ordine:**
  - che il biglietto esista;
  - che sia dell'evento attivo;
  - che l'iscrizione sia approvata;
  - che la persona non sia già entrata;
  - che il locale non sia pieno.
- **Esiti:**
  - ACCESSO CONSENTITO: ingresso registrato, bip acuto;
  - EVENTO ERRATO, NON APPROVATO, SCANSIONATO, LOCALE PIENO, BIGLIETTO NON VALIDO: suono grave;
  - dopo ogni esito si passa al successivo con PROSSIMO BIGLIETTO.
- Il contatore INGRESSI (x / capienza) si aggiorna ogni 30 secondi e dopo ogni scansione.
- I suoni si attivano dopo il primo tocco sulla pagina. Con il telefono in modalità silenziosa non si sentono.

### Area PR (`pr.html`, ruolo `pr` con `prCode`)
- Il PR deve essere attivo nella collezione `prs`.
- Link d'invito personale (`https://dlbp.art/?pr=<codice>`) con il bottone COPIA.
- Lista degli iscritti arrivati con il proprio link per l'evento attivo:
  - si aggiorna in tempo reale;
  - ha colonne ordinabili;
  - mostra i totali di iscritti, approvati ed entrati.

### Annulla iscrizione (`annulla-iscrizione.html?id=<codice>`)
- Il link arriva in fondo a ogni mail di invito: `<codice>` è l'ID segreto del contatto in `contacts` (20 lettere e cifre casuali).
- Serve il clic su CONFERMA: i programmi di posta aprono da soli i link per controllarli, e senza conferma cancellerebbero il contatto.
- Dopo il clic il contatto viene cancellato dal server e la pagina scrive FATTO. Con un link sbagliato mostra un avviso.
- Per gli invii vale sempre l'elenco sul server: chi si è cancellato resta nei CSV locali ma non deve tornare dentro.

### In tutte le pagine
- Menu AREA RISERVATA con i link ad Admin, Scanner e Area PR.
- Footer con le icone social: per ora è attivo solo Instagram.
- Su telefono la pagina non si ingrandisce (niente pizzico né doppio tocco) e scorre solo dall'alto in basso (il rimbalzo ai bordi resta): meta viewport, `touch-action` (su ogni elemento, così vale anche dentro le finestre) in `css/styles.css` e `js/core/no-zoom.js`.

## Aspetto

Dal 27/09/2026 l'identità è "cromo nero, colore vivo": nero, un'elica di DNA in cromo liquido con glitch a scatti e un solo colore del motto alla volta.

**I 4 colori**, uno per parola del motto:

| Parola | Nome nel codice | Colore |
|---|---|---|
| Drink | `strobo` | `#ff2a3c` |
| Love | `magenta` | `#8a2c80` |
| Breathe | `breathe` | `#1fa39a` |
| Peace | `ghiaccio` | `#cfe6ff` |

- I colori sono definiti in `js/core/background.js` (`MOODS`, con le versioni profonde).
- Il CSS li usa tramite `--mood`, `--mood-deep`, `--on-mood` (testo sopra il colore) e `--mood-text`.
- Chi cambia la palette la cambia in `background.js` e in `css/identity.css`.

**Come cambia il colore:**
- Il sito parte da Breathe.
- Il colore cambia da solo ogni 3 glitch (`CYCLE_EVERY`, circa ogni 7 secondi), nell'ordine di `ORDER`.
- Il colore raggiunto resta per tutta la visita.
- `?mood=<colore o parola>` nell'indirizzo sceglie il colore di partenza, per esempio `?mood=love`.

**Attributi dello sfondo** (`<div class="site-background">`):
- `data-dim`: sfondo più scuro;
- `data-lite`: versione leggera, usata dallo scanner;
- `data-tap`: pagine pubbliche. Il cursore è una croce su tutta la pagina (tranne link, bottoni e campi) e un clic dove c'è la croce fa partire un glitch.

**Altro:**
- Durante il glitch anche titoli e logo si spostano (`body.glitching`).
- Finestre (avvisi e conferme di `js/core/modal.js`, "Iscrizione completata"): pannello nero con bordo sottile e angoli vivi, senza sfocatura. Il bottone principale (OK, CONFERMA) è pieno nel colore della serata; ANNULLA è vuoto, con il bordo sottile.
- Bottoni dell'area staff: ELIMINA ed ESCI sono vuoti con il bordo rosso, FILTRI è vuoto con il bordo sottile; solo i bottoni principali sono pieni nel colore della serata.
- Sugli schermi a 120 Hz o più l'elica viene disegnata al massimo circa 60 volte al secondo.
- Con l'opzione "riduci movimento" del telefono l'elica resta ferma.
- Caratteri:
  - League Gothic per titoli e nomi;
  - IBM Plex Sans per i testi;
  - Space Mono per date, etichette e bottoni.
- Le regole grafiche per chi modifica il sito sono in `.agents/skills/dlbp-design-system/SKILL.md`.

## Email (EmailJS)

L'email del biglietto usa il template `ticket_confirm`. Parte all'iscrizione e con INVIA ACCESSI.

**Segnaposto della mail (inviati anche come variabili a EmailJS):**
- `to_name`, `to_email`;
- `event_name`, `event_date`;
- `secret_location`: indirizzo; nella mail non si scrive, serve per il bottone APRI LA MAPPA;
- `map_url`: Google Maps della location;
- `ticket_id`: ultimi 8 caratteri dell'ID del biglietto;
- `qr_code_url`: immagine del QR con l'ID del biglietto, che lo scanner legge alla porta.
- `event_fee`: quota adesione dell'evento (campo QUOTA ADESIONE nel pannello admin); se è vuota nella mail compare FREE ENTRY;
- `fee_visibility`: `hidden` senza quota, così l'etichetta "Quota adesione" non si vede.

La grafica della mail è in `assets/mail/biglietto.html`: `js/core/email.js` la scarica, riempie i segnaposto tra doppie graffe con i dati protetti e la manda come `html_body`.
Su EmailJS il template `ticket_confirm` contiene solo `{{{html_body}}}` (contenuto, Code Editor) e `{{{subject}}}` (oggetto): per cambiare la mail si modifica il file nel sito, non il template.

Il piano gratuito di EmailJS ha un limite mensile di invii.

## Google e anteprime dei link

- `robots.txt` e `sitemap.xml` (home ed eventi) sono per i motori di ricerca.
- Admin, scanner e area PR hanno `<meta name="robots" content="noindex">` e non compaiono nelle ricerche.
- Nome del sito su Google: **DLBP Art**, indicato con i dati strutturati `WebSite` (JSON-LD) in `index.html`, insieme alla scheda `Organization` con logo e profili ufficiali in `sameAs` (Instagram dlbp.art e dlbp.mvmnt: un nuovo profilo si aggiunge lì) e con `og:site_name` nelle pagine pubbliche. Google lo aggiorna quando rilegge la home.
- Home, eventi e iscrizione hanno i tag Open Graph: su WhatsApp, Instagram e Telegram il link mostra titolo, descrizione e logo.
- Home ed eventi hanno anche il `canonical`, così i link `?pr=` non diventano pagine doppie su Google.
- dlbp.art è registrato su [Google Search Console](https://search.google.com/search-console) come proprietà "Prefisso URL" `https://dlbp.art/`, con la sitemap inviata. La verifica è il tag `google-site-verification` in `index.html`: se si toglie, Google perde la verifica.

## Struttura delle cartelle

```
*.html                 le pagine del sito (restano nella radice per mantenere gli indirizzi)
robots.txt, sitemap.xml  indicazioni per Google
css/
  styles.css             stili di base e componenti
  identity.css           identità "cromo nero, colore vivo": colori, caratteri, forme (si carica dopo styles.css)
assets/                logo (logo.png, logo.jpg) e icone social (social-icons.svg)
  mail/                immagini usate nelle mail di invito (si caricano da dlbp.art/assets/mail/)
js/
  form-version.json      versione del modulo di iscrizione (vedi "ricarica la pagina")
  core/                codice condiviso da più pagine
    firebase.js          connessione a Firebase e funzioni Firestore (versione SDK in un solo punto)
    firebase-auth.js     login Firebase (solo pagine staff)
    staff-login.js       form di login dello staff e controllo del ruolo
    email.js             invio email con EmailJS e nomi dei template
    background.js        sfondo 3D, colori del motto, glitch, cursore a croce
    dates.js             conversione delle date lette da Firestore
    modal.js             finestre di avviso e conferma
    html.js              escapeHtml, per mostrare in sicurezza i testi degli utenti
    table-sort.js        intestazioni di tabella ordinabili
    nav.js               menu "AREA RISERVATA"
    reveal.js            animazioni di comparsa
    no-zoom.js           blocca lo zoom con le dita su iPhone (caricato da background.js)
  pages/               un file per pagina (il punto d'ingresso caricato dall'HTML)
    admin/               il pannello admin, diviso per sezione
      main.js              avvio e login
      state.js             dati condivisi tra i moduli (evento selezionato, iscritti...)
      events.js            scelta evento, attiva/disattiva, apri/chiudi lista, elimina
      event-form.js        crea / modifica evento, locandina
      event-details.js     finestra DETTAGLI
      busy.js              bottoni attenuati mentre lavorano, niente doppio clic
      analytics.js         finestra ANALYTICS
      charts.js            grafici (Chart.js)
      guests.js            tabella iscritti, filtri, contatore ingressi, CSV
      guest-actions.js     elimina iscritti, invia biglietti via email
      prs.js               gestione PR
firestore.rules        regole di sicurezza del database
firebase.json, .firebaserc   configurazione della Firebase CLI
.github/workflows/     pubblicazione su GitHub Pages
.claude/               server per l'anteprima locale
.agents/skills/        guide per gli assistenti AI (regole grafiche, test)
scripts/               script Python usati una tantum sul database (non vanno online)
tests/                 vecchi test Playwright (da aggiornare, vedi sotto)
archive/               materiale storico: screenshot, vecchie versioni
```

Ogni file JavaScript inizia con un breve commento che spiega a cosa serve.

**Librerie esterne:**
- Firebase 10.12.2 da `www.gstatic.com`;
- Three.js r128 per lo sfondo;
- Chart.js 4.5.1 nell'admin;
- html5-qrcode 2.3.8 nello scanner;
- EmailJS 3.12.1.

Tutte hanno la versione fissa, così un aggiornamento esterno non può rompere il sito.

## Database (Firestore)

| Collezione | Contenuto | Chi può leggere / scrivere |
|---|---|---|
| `events` | un documento per evento: `name`, `date` (testo mostrato), `dateIso`, `startTime`, `endTime`, `location`, `password` (d'ingresso, facoltativa), `flyerUrl` (immagine Base64), `description`, `maxCapacity` (0 = evento solo da vedere, senza iscrizioni), `isOpen` (iscrizioni aperte), `isActive` (evento in corso), `createdAt` | tutti leggono, admin scrive |
| `registrations` | un iscritto per evento. ID = `<eventId>_<hash dell'email>`, così la stessa email non può iscriversi due volte. Campi: `name` (= `first_name` + " " + `last_name`), `first_name`, `last_name`, `email`, `eventId`, `invited_by` (codice PR), `status`, `checked_in`, `check_in_time`, `email_sent`, `privacy_consent`, `timestamp` | il pubblico può solo creare (non per gli eventi con capienza 0) e poi segnare `email_sent` da false a true; admin tutto; scanner legge e segna l'ingresso; il PR legge solo i propri iscritti |
| `prs` | `name`, `code`, `email`, `isActive`, `createdAt` | admin |
| `staff` | ruoli dello staff, ID = email in minuscolo: `role` (`admin`, `scanner`, `pr`), `prCode` per i PR | admin; ognuno legge il proprio |
| `contacts` | rubrica per gli inviti (456 contatti caricati l'01/10/2026 dalle iscrizioni passate, dai biglietti e dai tesserati). ID = codice casuale di 20 lettere e cifre, che va solo nel link personale di annullamento. Campi: `firstName`, `lastName`, `email`, `phone` (può essere vuoto), `createdAt` | nessuno legge o elenca dal sito; chi conosce l'ID può solo cancellare quel contatto (`annulla-iscrizione.html`); il resto dalla console di Firebase |
| `settings` | `config`: vecchie impostazioni di prima della gestione multi-evento | tutti leggono, admin scrive |

**Note sulle iscrizioni:**
- Dal 27/09/2026 nome e cognome separati sono obbligatori nelle iscrizioni pubbliche.
- L'01/10/2026 sono state cancellate le iscrizioni degli eventi passati (Act I, Act II e l'evento annullato del 26/07), dopo un backup completo in `archive/backups/`; i contatti sono passati in `contacts`.

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
- **Numero `?v=`:** quando cambia un file JavaScript o CSS, si aumenta il numero `?v=` nel tag della pagina, così i browser scaricano la versione nuova.
  - `styles.css`, `identity.css` e `background.js` usano lo stesso numero in tutte le pagine e si aumentano ovunque insieme.
  - I moduli importati dagli altri file non hanno `?v=` e possono restare in cache per circa 10 minuti.
- **Versione di Firebase:** è scritta in `js/core/firebase.js`, in `js/core/firebase-auth.js` e nei `modulepreload` di `index.html`, `eventi.html`, `event.html` e `annulla-iscrizione.html`. Si aggiorna in tutti i punti insieme.
- **Modulo di iscrizione:** se cambiano i campi del modulo o le regole delle iscrizioni, si aumentano insieme `FORM_VERSION` in `js/pages/event.js` e `registrationForm` in `js/form-version.json`.
- **Dati riservati:** le chiavi di Firebase ed EmailJS nel codice sono pubbliche per natura; la protezione dei dati sta nelle regole Firestore. Password, backup del database e dati degli iscritti non vanno mai nel repository (`archive/backups/` e `scripts/db_guests/` sono esclusi da `.gitignore`).

**Pubblicare**
- **Sito:** si unisce la Pull Request in `main`. Il workflow `.github/workflows/static.yml` pubblica solo i file del sito (`*.html`, `css/`, `js/`, `assets/`, `manifest.json`, `CNAME`, `robots.txt`, `sitemap.xml`). Un nuovo file o cartella del sito va aggiunto lì.
- **Regole Firestore:** `firebase deploy --only firestore:rules` (serve la Firebase CLI con accesso al progetto). Se una modifica richiede nuovi documenti `staff`, vanno creati prima di pubblicare le regole, per non lasciare fuori nessuno.

## Da fare
- **Test:** quelli in `tests/` e la guida `.agents/skills/dlbp-browser-testing` usano il vecchio login con sola password e la porta 8080. Vanno aggiornati al login con email e ruoli prima di poterli usare.
- **CSS:** `css/styles.css` ha circa 1820 righe. Si può dividere per sezione, confrontando gli screenshot prima e dopo.
- **Idee per il futuro:**
  - Firestore "Lite" nelle pagine pubbliche farebbe risparmiare circa 80 KB. Va provata con un'iscrizione di prova, perché tocca il modulo.
  - Un'immagine dedicata di 1200×630 per le anteprime dei link, seguendo la guida grafica.
