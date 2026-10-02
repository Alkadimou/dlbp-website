// Invio email con EmailJS. La libreria arriva dal tag <script> di email.min.js nella pagina
// (variabile globale `emailjs`). I template si modificano dal pannello di EmailJS.
import { escapeHtml } from "./html.js";

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
// La grafica è in assets/mail/biglietto.html: i segnaposto tra doppie graffe vengono riempiti qui
// con i dati protetti (escapeHtml) e la mail parte come html_body. Il template EmailJS "ticket_confirm"
// contiene solo html_body tra tre graffe, con oggetto subject tra tre graffe.
// Le variabili singole (to_name, event_name, ...) restano nei parametri per chi legge il template vecchio.
// map_url è il link del bottone APRI LA MAPPA: quello scritto nell'admin (mapUrl), altrimenti la ricerca
// dell'indirizzo su Google Maps. event_fee è la quota partecipazione; senza quota diventa "Free entry". secret_location non compare
// più nella mail (c'è solo il bottone della mappa), ma resta nei parametri.
let ticketHtml;
function loadTicketHtml() {
    ticketHtml ??= fetch("/assets/mail/biglietto.html").then((r) => {
        if (!r.ok) throw new Error(`biglietto.html: ${r.status}`);
        return r.text();
    });
    ticketHtml.catch(() => { ticketHtml = undefined; }); // al prossimo invio si riprova
    return ticketHtml;
}

export async function sendTicketEmail(registration, event) {
    const location = event.location || "Secret Location";
    const fee = (event.fee || "").trim();
    const mapUrl = (event.mapUrl || "").trim();
    const params = {
        to_name: registration.name,
        to_email: registration.email,
        event_name: event.name || "Evento",
        secret_location: location,
        map_url: /^https:\/\/\S+$/.test(mapUrl) ? mapUrl
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`,
        event_date: event.date || "Data Evento",
        ticket_id: registration.id.slice(-8).toUpperCase(),
        qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(registration.id)}`,
        event_fee: fee || "Free entry"
    };
    const html = await loadTicketHtml();
    params.html_body = html.replace(/\{\{(\w+)\}\}/g, (m, key) => key in params ? escapeHtml(params[key]) : m);
    params.subject = `DLBP · Sei in lista · ${params.event_name}`;
    return sendEmail(EMAIL_TEMPLATES.ticket, params);
}
