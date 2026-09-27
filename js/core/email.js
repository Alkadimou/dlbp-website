// Invio email con EmailJS. La libreria arriva dal tag <script> di email.min.js nella pagina
// (variabile globale `emailjs`). I template si modificano dal pannello di EmailJS.
const EMAILJS_PUBLIC_KEY = "XIMzE429r_DY-U4nl";
const EMAILJS_SERVICE_ID = "service_ndbmwte";

export const EMAIL_TEMPLATES = {
    registrationPending: "reg_pending", // conferma di iscrizione (event.html)
    ticket: "ticket_confirm"            // location segreta + QR code (admin.html)
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
