import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, onSnapshot, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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

let app, db, auth;
try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
} catch (e) {
    console.error("Firebase initialization error", e);
}

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
    let currentSortField = "timestamp";
    let currentSortOrder = "desc";
    let registrationsList = [];

    // Sort table headers setup
    const prTableHead = document.querySelector(".users-table thead");
    if (prTableHead) {
        prTableHead.addEventListener("click", (e) => {
            const th = e.target.closest("th");
            if (th && th.dataset.sort) {
                const field = th.dataset.sort;
                if (currentSortField === field) {
                    currentSortOrder = currentSortOrder === "asc" ? "desc" : "asc";
                } else {
                    currentSortField = field;
                    currentSortOrder = "asc";
                }
                updateSortHeaders(prTableHead);
                renderPrTable();
            }
        });
    }

    function updateSortHeaders(thead) {
        thead.querySelectorAll("th[data-sort]").forEach(th => {
            th.innerHTML = th.innerHTML.replace(/ [▲▼]/g, "");
            if (th.dataset.sort === currentSortField) {
                th.innerHTML += currentSortOrder === "asc" ? " ▲" : " ▼";
            }
        });
    }

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

    function showLoginError(text) {
        loginMessage.textContent = text;
        loginMessage.className = "form-message error";
        loginMessage.classList.remove("hidden");
    }

    // Firebase Auth: the account needs role "pr" and its prCode in /staff/{email}
    const activeEventLoaded = loadActiveEvent();
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            loginSection.classList.remove("hidden");
            dashboardSection.classList.add("hidden");
            return;
        }
        await activeEventLoaded;
        try {
            const staffSnap = await getDoc(doc(db, "staff", user.email.toLowerCase()));
            const staff = staffSnap.exists() ? staffSnap.data() : {};
            if (staff.role !== "pr" || !staff.prCode) {
                await signOut(auth);
                showLoginError("Account non abilitato all'area PR.");
                return;
            }
            await openDashboard(staff.prCode);
        } catch (error) {
            console.error("Errore login PR:", error);
            await signOut(auth);
            showLoginError("Errore di connessione al database.");
        }
    });

    loginBtn.addEventListener("click", async () => {
        const email = emailInput.value.trim();
        const pwd = passwordInput.value;
        if (!email || !pwd) {
            showLoginError("Inserisci email e password.");
            return;
        }
        loginBtn.disabled = true;
        try {
            await signInWithEmailAndPassword(auth, email, pwd);
            // onAuthStateChanged will open the dashboard
        } catch (error) {
            console.error("Login error:", error);
            showLoginError("Credenziali errate o utente non trovato.");
        } finally {
            loginBtn.disabled = false;
        }
    });

    passwordInput.addEventListener("keyup", (e) => {
        if (e.key === "Enter") loginBtn.click();
    });
    emailInput.addEventListener("keyup", (e) => {
        if (e.key === "Enter") passwordInput.focus();
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
            if (currentSortField === "timestamp") {
                valA = a.timestamp ? (typeof a.timestamp.toDate === 'function' ? a.timestamp.toDate().getTime() : new Date(a.timestamp).getTime()) : 0;
                valB = b.timestamp ? (typeof b.timestamp.toDate === 'function' ? b.timestamp.toDate().getTime() : new Date(b.timestamp).getTime()) : 0;
            } else if (currentSortField === "eventId") {
                valA = (eventsMap[a.eventId] || "").toLowerCase();
                valB = (eventsMap[b.eventId] || "").toLowerCase();
            } else if (currentSortField === "checked_in") {
                valA = a.checked_in ? 1 : 0;
                valB = b.checked_in ? 1 : 0;
            } else {
                valA = (a[currentSortField] || "").toString().toLowerCase();
                valB = (b[currentSortField] || "").toString().toLowerCase();
            }

            if (valA < valB) return currentSortOrder === "asc" ? -1 : 1;
            if (valA > valB) return currentSortOrder === "asc" ? 1 : -1;
            return 0;
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
