import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// TODO: Replace with your actual Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD6THmnRAG_8YL1PLWSL7I2_WKLv-fioWk",
  authDomain: "dlbp-website.firebaseapp.com",
  projectId: "dlbp-website",
  storageBucket: "dlbp-website.firebasestorage.app",
  messagingSenderId: "51111322366",
  appId: "1:51111322366:web:813b96994d6a1f2fbefbaf",
  measurementId: "G-6HC9LRZWV9"
};

let app, db;
try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
} catch (e) {
    console.error("Firebase initialization error", e);
}

document.addEventListener("DOMContentLoaded", () => {
    const loginSection = document.getElementById("login-section");
    const dashboardSection = document.getElementById("dashboard-section");
    const prCodeInput = document.getElementById("pr-code");
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

    loadActiveEvent();

    // Check session
    const savedPr = sessionStorage.getItem("dlbp_pr_code");
    if (savedPr) {
        login(savedPr);
    }

    loginBtn.addEventListener("click", () => {
        const code = prCodeInput.value.trim().toLowerCase();
        if (code.length < 2) {
            loginMessage.textContent = "Inserisci un codice valido.";
            loginMessage.className = "form-message error";
            loginMessage.style.display = "block";
            return;
        }
        login(code);
    });

    prCodeInput.addEventListener("keyup", (e) => {
        if (e.key === "Enter") loginBtn.click();
    });

    async function login(code) {
        if (!db) return;
        
        try {
            const prsQuery = query(collection(db, "prs"), where("code", "==", code), where("isActive", "==", true));
            const prsSnap = await getDocs(prsQuery);
            if (prsSnap.empty) {
                loginMessage.textContent = "Codice PR non valido o disabilitato.";
                loginMessage.className = "form-message error";
                loginMessage.style.display = "block";
                return;
            }
            
            const prData = prsSnap.docs[0].data();
            const prName = prData.name;

            currentPrCode = code;
            sessionStorage.setItem("dlbp_pr_code", code);
            
            loginSection.style.display = "none";
            dashboardSection.style.display = "block";
            document.getElementById("app-main").style.maxWidth = "800px";
            
            prWelcome.textContent = `DASHBOARD PR: ${prName.toUpperCase()}`;
            
            // Generate invite link
            const baseUrl = window.location.origin + '/';
            inviteLinkInput.value = `${baseUrl}?pr=${code}`;

            await loadAllEvents();
            startListening(code);
        } catch (error) {
            console.error("Errore login PR:", error);
            loginMessage.textContent = "Errore di connessione al database.";
            loginMessage.className = "form-message error";
            loginMessage.style.display = "block";
        }
    }

    logoutBtn.addEventListener("click", () => {
        sessionStorage.removeItem("dlbp_pr_code");
        if (unsubscribe) unsubscribe();
        location.reload();
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

    function escapeHtml(str) {
        if (!str) return "";
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function startListening(prCode) {
        if (!db) return;
        
        const q = query(
            collection(db, "registrations"), 
            where("invited_by", "==", prCode)
        );

        unsubscribe = onSnapshot(q, (snapshot) => {
            let total = 0;
            let approved = 0;
            let entered = 0;
            
            const tbody = document.getElementById("pr-guests-tbody");
            const fragment = document.createDocumentFragment();
            let registrationsList = [];

            snapshot.forEach((doc) => {
                const data = doc.data();
                registrationsList.push({ id: doc.id, ...data });
                
                total++;
                if (data.status === "approved") approved++;
                if (data.checked_in === true) entered++;
            });

            // Sort registrations by timestamp descending
            registrationsList.sort((a, b) => {
                const timeA = a.timestamp ? (typeof a.timestamp.toDate === 'function' ? a.timestamp.toDate() : new Date(a.timestamp)) : 0;
                const timeB = b.timestamp ? (typeof b.timestamp.toDate === 'function' ? b.timestamp.toDate() : new Date(b.timestamp)) : 0;
                return timeB - timeA;
            });

            if (tbody) {
                tbody.innerHTML = "";
                if (registrationsList.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nessun iscritto al momento.</td></tr>';
                } else {
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
            }

            // Animate numbers
            animateValue(statTotal, parseInt(statTotal.textContent) || 0, total, 500);
            animateValue(statApproved, parseInt(statApproved.textContent) || 0, approved, 500);
            animateValue(statEntered, parseInt(statEntered.textContent) || 0, entered, 500);
        });
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
