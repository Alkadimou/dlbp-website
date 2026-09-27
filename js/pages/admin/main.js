// Pagina admin.html – punto d'ingresso del pannello di controllo.
// Accesso: account staff con ruolo "admin". Ogni sezione del pannello è in un modulo di questa cartella:
//   events.js         scelta evento, attiva/disattiva, elimina
//   event-form.js     crea / modifica evento
//   event-details.js  finestra DETTAGLI
//   analytics.js      finestra STATISTICHE (grafici in charts.js)
//   guests.js         tabella iscritti, filtri, contatore ingressi, CSV
//   guest-actions.js  elimina iscritti selezionati, invia email con biglietto
//   prs.js            gestione PR
//   state.js          dati condivisi tra i moduli
import { auth, signOut } from "../../core/firebase-auth.js";
import { setupStaffLogin } from "../../core/staff-login.js";
import { initEmailJs } from "../../core/email.js";
import { initStaffMenu } from "../../core/nav.js";
import { initEvents, setupEventsIfNeeded, loadEventsList } from "./events.js";
import { initEventForm } from "./event-form.js";
import { initEventDetails } from "./event-details.js";
import { initAnalytics } from "./analytics.js";
import { initGuests } from "./guests.js";
import { initGuestActions } from "./guest-actions.js";
import { initPrs, loadPRs } from "./prs.js";

initStaffMenu();
initEmailJs();

document.addEventListener("DOMContentLoaded", () => {
    const loginSection = document.getElementById("login-section");
    const dashboardSection = document.getElementById("dashboard-section");

    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            if (auth) signOut(auth);
        });
    }

    initEvents();
    initEventForm({ onSaved: loadEventsList });
    initEventDetails();
    initAnalytics();
    initGuests();
    initGuestActions();
    initPrs();

    setupStaffLogin({
        emailInput: document.getElementById("admin-email"),
        passwordInput: document.getElementById("admin-password"),
        loginBtn: document.getElementById("login-btn"),
        loginMessage: document.getElementById("login-message"),
        isAllowed: (profile) => profile.role === "admin",
        deniedMessage: "Account non abilitato al pannello admin.",
        busyText: "ACCESSO...",
        onSignedIn: async () => {
            loginSection.classList.add("hidden");
            dashboardSection.classList.remove("hidden");
            document.getElementById("app-main").style.maxWidth = "1200px";
            await setupEventsIfNeeded();
            await loadEventsList();
            loadPRs();
        },
        onSignedOut: () => {
            loginSection.classList.remove("hidden");
            dashboardSection.classList.add("hidden");
            document.getElementById("app-main").style.maxWidth = "";
        }
    });
});
