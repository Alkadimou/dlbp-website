// Pagina pr.html: ogni PR vede in tempo reale gli iscritti arrivati con il proprio link (?pr=<codice>)
// per l'evento attivo, e può copiare il link d'invito.
// Accesso: account staff con ruolo "pr" e campo prCode; il PR deve essere attivo nella collezione "prs".
import { db, collection, query, where, getDocs, onSnapshot } from "../core/firebase.js";
import { auth, signOut } from "../core/firebase-auth.js";
import { setupStaffLogin } from "../core/staff-login.js";
import { setupSortableHeaders, compareValues } from "../core/table-sort.js";
import { escapeHtml } from "../core/html.js";
import { initStaffMenu } from "../core/nav.js";

initStaffMenu();

document.addEventListener("DOMContentLoaded", () => {
    const loginSection = document.getElementById("login-section");
    const dashboardSection = document.getElementById("dashboard-section");
    const emailInput = document.getElementById("pr-email");
    const passwordInput = document.getElementById("pr-password");
    const loginBtn = document.getElementById("login-btn");
    const loginMessage = document.getElementById("login-message");
    const logoutBtn = document.getElementById("logout-btn");
    
    const prWelcome = document.getElementById("pr-welcome");
    const statTotal = document.getElementById("stat-total");
    const statApproved = document.getElementById("stat-approved");
    const statEntered = document.getElementById("stat-entered");
    
    const inviteLinkInput = document.getElementById("invite-link");
    const copyBtn = document.getElementById("copy-btn");

    let currentEventId = "act_1"; // Definisci come predefinito
    let unsubscribe = null;
    let currentPrCode = "";
    const sort = { field: "timestamp", order: "desc" };
    let registrationsList = [];

    setupSortableHeaders(document.querySelector(".users-table thead"), sort, () => renderPrTable());

    // Load active event
    async function loadActiveEvent() {
        if (!db) return;
        try {
            const q = query(collection(db, "events"), where("isActive", "==", true));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                currentEventId = querySnapshot.docs[0].id;
            }
        } catch (error) {
            console.error("Error loading active event:", error);
        }
    }

    const activeEventLoaded = loadActiveEvent();
    const { showLoginError } = setupStaffLogin({
        emailInput,
        passwordInput,
        loginBtn,
        loginMessage,
        isAllowed: (profile) => profile.role === "pr" && !!profile.prCode,
        deniedMessage: "Account non abilitato all'area PR.",
        onSignedIn: async (profile) => {
            await activeEventLoaded;
            await openDashboard(profile.prCode);
        },
        onSignedOut: () => {
            loginSection.classList.remove("hidden");
            dashboardSection.classList.add("hidden");
        }
    });

    async function openDashboard(code) {
        const prsQuery = query(collection(db, "prs"), where("code", "==", code), where("isActive", "==", true));
        const prsSnap = await getDocs(prsQuery);
        if (prsSnap.empty) {
            await signOut(auth);
            showLoginError("Codice PR non valido o disabilitato.");
            return;
        }

        const prData = prsSnap.docs[0].data();
        const prName = prData.name;

        currentPrCode = code;

        loginSection.classList.add("hidden");
        dashboardSection.classList.remove("hidden");
        document.getElementById("app-main").style.maxWidth = "800px";

        prWelcome.textContent = `DASHBOARD PR: ${prName.toUpperCase()}`;

        // Generate invite link
        const baseUrl = window.location.origin + '/';
        inviteLinkInput.value = `${baseUrl}?pr=${code}`;

        await loadAllEvents();
        startListening(code);
    }

    logoutBtn.addEventListener("click", async () => {
        if (unsubscribe) unsubscribe();
        await signOut(auth);
        window.location.href = "pr.html";
    });

    copyBtn.addEventListener("click", () => {
        inviteLinkInput.select();
        document.execCommand("copy");
        copyBtn.textContent = "COPIATO!";
        setTimeout(() => {
            copyBtn.textContent = "COPIA";
        }, 2000);
    });

    let eventsMap = {};
    async function loadAllEvents() {
        if (!db) return;
        try {
            const q = query(collection(db, "events"));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach(doc => {
                eventsMap[doc.id] = doc.data().name || "Evento Sconosciuto";
            });
        } catch (error) {
            console.error("Error loading events for map:", error);
        }
    }

    function startListening(prCode) {
        if (!db) return;
        
        const q = query(
            collection(db, "registrations"), 
            where("invited_by", "==", prCode),
            where("eventId", "==", currentEventId)
        );

        unsubscribe = onSnapshot(q, (snapshot) => {
            let total = 0;
            let approved = 0;
            let entered = 0;
            
            registrationsList = [];

            snapshot.forEach((doc) => {
                const data = doc.data();
                registrationsList.push({ id: doc.id, ...data });
                
                total++;
                if (data.status === "approved") approved++;
                if (data.checked_in === true) entered++;
            });

            renderPrTable();

            // Animate numbers
            animateValue(statTotal, parseInt(statTotal.textContent) || 0, total, 500);
            animateValue(statApproved, parseInt(statApproved.textContent) || 0, approved, 500);
            animateValue(statEntered, parseInt(statEntered.textContent) || 0, entered, 500);
        });
    }

    function renderPrTable() {
        const tbody = document.getElementById("pr-guests-tbody");
        if (!tbody) return;

        // Sort registrations
        registrationsList.sort((a, b) => {
            let valA, valB;
            if (sort.field === "timestamp") {
                valA = a.timestamp ? (typeof a.timestamp.toDate === 'function' ? a.timestamp.toDate().getTime() : new Date(a.timestamp).getTime()) : 0;
                valB = b.timestamp ? (typeof b.timestamp.toDate === 'function' ? b.timestamp.toDate().getTime() : new Date(b.timestamp).getTime()) : 0;
            } else if (sort.field === "eventId") {
                valA = (eventsMap[a.eventId] || "").toLowerCase();
                valB = (eventsMap[b.eventId] || "").toLowerCase();
            } else if (sort.field === "checked_in") {
                valA = a.checked_in ? 1 : 0;
                valB = b.checked_in ? 1 : 0;
            } else {
                valA = (a[sort.field] || "").toString().toLowerCase();
                valB = (b[sort.field] || "").toString().toLowerCase();
            }

            return compareValues(valA, valB, sort.order);
        });

        tbody.innerHTML = "";
        if (registrationsList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nessun iscritto al momento.</td></tr>';
            return;
        }

        const fragment = document.createDocumentFragment();
        registrationsList.forEach(reg => {
            const tr = document.createElement("tr");
            const eventName = eventsMap[reg.eventId] || "Evento Sconosciuto";
            const ticketStatus = reg.email_sent ? '<span style="color: #4CAF50;">INVIATO</span>' : '<span style="color: #ffcc00;">NO</span>';
            const checkinStatus = reg.checked_in ? '<span style="color: #4CAF50; font-weight: bold;">ENTRATO</span>' : '<span style="color: #888;">-</span>';
            
            tr.innerHTML = `
                <td data-label="NOME"><span class="truncate-mobile">${escapeHtml(reg.name)}</span></td>
                <td data-label="EMAIL"><span class="truncate-mobile" style="word-break: break-all;">${escapeHtml(reg.email)}</span></td>
                <td data-label="EVENTO"><span class="truncate-mobile" style="color:var(--accent-color);">${escapeHtml(eventName)}</span></td>
                <td data-label="TICKET" style="text-align: center;">${ticketStatus}</td>
                <td data-label="INGRESSO" style="text-align: center;">${checkinStatus}</td>
            `;
            fragment.appendChild(tr);
        });
        tbody.appendChild(fragment);
    }

    function animateValue(obj, start, end, duration) {
        if (start === end) return;
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                obj.innerHTML = end;
            }
        };
        window.requestAnimationFrame(step);
    }
});
