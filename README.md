# DLBP Website - Progetto Completato 🚀

Il sistema per la gestione esclusiva degli eventi "Drink Love Breathe Peace" è ufficialmente online e pienamente operativo.

## Architettura del Sistema
L'infrastruttura è stata costruita per essere veloce, gratuita, sicura e dal design premium "dark brutalist":

1. **Frontend (GitHub Pages):** Il sito web pubblico (`index.html`) per raccogliere le registrazioni. Non richiede manutenzione server.
2. **Database (Firebase Firestore):** Archivia in tempo reale, in modo sicuro e ordinato, i nomi e le email di tutti i partecipanti che compilano il form.
3. **Pannello Admin Segreto:** Una pagina nascosta, protetta da login Firebase (email e password), per visualizzare la lista degli iscritti e gestire gli invii.
4. **Sistema di Mailing (EmailJS):** Integrato nel pannello admin, permette l'invio massivo (con un solo clic) della *Secret Location* e delle coordinate esatte a tutti gli iscritti tramite un template HTML personalizzato in stile con il brand.

## Accessi Staff
Admin, scanner e PR accedono con un account Firebase (email e password). Ogni account ha un ruolo nella collezione Firestore `staff`, dove l'ID del documento è l'email in minuscolo:

| Ruolo | Pagina | Può fare |
|---|---|---|
| `admin` | `admin.html` (e `scanner.html`) | Tutto |
| `scanner` | `scanner.html` | Leggere i biglietti e segnare gli ingressi |
| `pr` | `pr.html` | Vedere solo gli iscritti arrivati con il proprio codice (`prCode`) |

**Aggiungere un membro dello staff**
1. [Firebase Console → Authentication → Users](https://console.firebase.google.com/project/dlbp-website/authentication/users) → **Add user** con email e password.
2. Assegnare il ruolo:
   - **PR:** dal pannello admin, sezione PR, inserendo nome, codice ed email. Il documento `staff` viene creato automaticamente, ed eliminando il PR l'accesso viene revocato.
   - **Admin o scanner:** [Firestore → Data](https://console.firebase.google.com/project/dlbp-website/firestore/data) → collezione `staff` → documento con ID = email in minuscolo e campo `role` (stringa) = `admin` oppure `scanner`.

Le regole di sicurezza sono in `firestore.rules` e vanno pubblicate su Firestore → Rules ogni volta che cambiano.

## Riepilogo degli Asset Creati
*   `index.html`: Landing page pubblica per la registrazione.
*   `admin.html`: Pannello di controllo segreto.
*   `css/styles.css`: Foglio di stile globale (Vanilla CSS) per l'estetica scura, minimale e reattiva.
*   `js/app.js`: Logica client-side per inviare i dati a Firebase.
*   `js/admin.js`: Logica del pannello admin per leggere da Firebase e comunicare con le API di EmailJS.
*   `assets/logo.jpg`: Il logo ufficiale integrato ovunque (sito ed email).

## Prossimi Sviluppi Consigliati
Se in futuro vorrai espandere il progetto, potremmo integrare:
*   **Biglietti con QR Code:** Generazione di un QR code univoco nell'email per scansionare gli ingressi alla porta.
*   **Capienza Massima:** Chiusura automatica delle iscrizioni al raggiungimento di un tot di iscritti.
*   **Multi-Evento:** Gestione di date diverse dal pannello admin.

*Lunga vita al movimento DLBP!* 🖤
