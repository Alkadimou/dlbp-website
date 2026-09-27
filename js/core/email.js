// Invio email con EmailJS. La libreria arriva dal tag <script> di email.min.js nella pagina
// (variabile globale `emailjs`). I template si modificano dal pannello di EmailJS.
const EMAILJS_PUBLIC_KEY = "XIMzE429r_DY-U4nl";
const EMAILJS_SERVICE_ID = "service_ndbmwte";

export const EMAIL_TEMPLATES = {
    ticket: "ticket_confirm" // location + QR code, inviata all'iscrizione (event.html) e dall'admin
};

export function isEmailJsLoaded() {
    return typeof emailjs !== "undefined";
}

export function initEmailJs() {
    if (isEmailJsLoaded()) {
        emailjs.init(EMAILJS_PUBLIC_KEY);
    }
}

export function sendEmail(templateId, params) {
    return emailjs.send(EMAILJS_SERVICE_ID, templateId, params);
}

// Email del biglietto: location, data e QR code (il QR contiene l'ID dell'iscrizione,
// che lo scanner legge alla porta). `event` è il documento dell'evento, anche vuoto.
export function sendTicketEmail(registration, event) {
    return sendEmail(EMAIL_TEMPLATES.ticket, {
        to_name: registration.name,
        to_email: registration.email,
        event_name: event.name || "Evento",
        secret_location: event.location || "Secret Location",
        event_date: event.date || "Data Evento",
        qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${registration.id}`
    });
}
