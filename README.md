# DLBP Website - Progetto Completato 🚀

Il sistema per la gestione esclusiva degli eventi "Drink Love Breathe Peace" è ufficialmente online e pienamente operativo.

## Architettura del Sistema
L'infrastruttura è stata costruita per essere veloce, gratuita, sicura e dal design premium "dark brutalist":

1. **Frontend (GitHub Pages):** Il sito web pubblico (`index.html`) per raccogliere le registrazioni. Non richiede manutenzione server.
2. **Database (Firebase Firestore):** Archivia in tempo reale, in modo sicuro e ordinato, i nomi e le email di tutti i partecipanti che compilano il form.
3. **Pannello Admin Segreto:** Una pagina nascosta e protetta da password (`dlbp2024`) per visualizzare la lista degli iscritti e gestire gli invii.
4. **Sistema di Mailing (EmailJS):** Integrato nel pannello admin, permette l'invio massivo (con un solo clic) della *Secret Location* e delle coordinate esatte a tutti gli iscritti tramite un template HTML personalizzato in stile con il brand.

## Riepilogo degli Asset Creati
*   `index.html`: Landing page pubblica per la registrazione.
*   `admin.html`: Pannello di controllo segreto.
*   `styles.css`: Foglio di stile globale (Vanilla CSS) per l'estetica scura, minimale e reattiva.
*   `app.js`: Logica client-side per inviare i dati a Firebase.
*   `admin.js`: Logica del pannello admin per leggere da Firebase e comunicare con le API di EmailJS.
*   `logo.jpg`: Il logo ufficiale integrato ovunque (sito ed email).
*   `email_template.md`: Il codice sorgente del template email "brutalista".

## Prossimi Sviluppi Consigliati
Se in futuro vorrai espandere il progetto, potremmo integrare:
*   **Biglietti con QR Code:** Generazione di un QR code univoco nell'email per scansionare gli ingressi alla porta.
*   **Capienza Massima:** Chiusura automatica delle iscrizioni al raggiungimento di un tot di iscritti.
*   **Multi-Evento:** Gestione di date diverse dal pannello admin.

*Lunga vita al movimento DLBP!* 🖤
