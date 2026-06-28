import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, setDoc, getDoc, query, orderBy, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// TODO: Replace with your actual Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyD6THmnRAG_8YL1PLWSL7I2_WKLv-fioWk",
  authDomain: "dlbp-website.firebaseapp.com",
  projectId: "dlbp-website",
  storageBucket: "dlbp-website.firebasestorage.app",
  messagingSenderId: "51111322366",
  appId: "1:51111322366:web:813b96994d6a1f2fbefbaf",
  measurementId: "G-6HC9LRZWV9"
};

// EmailJS config
const EMAILJS_PUBLIC_KEY = "XIMzE429r_DY-U4nl";
const EMAILJS_SERVICE_ID = "service_ndbmwte";
const EMAILJS_TEMPLATE_ID = "template_o3kovxe";

let db;
try {
    if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
    }
} catch (e) {
    console.error("Firebase init error", e);
}

// Initialize EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

document.addEventListener("DOMContentLoaded", () => {
    const loginSection = document.getElementById("login-section");
    const dashboardSection = document.getElementById("dashboard-section");
    const loginBtn = document.getElementById("login-btn");
    const passwordInput = document.getElementById("admin-password");
    const loginMessage = document.getElementById("login-message");
    
    const tbody = document.getElementById("users-tbody");
    const sendEmailsBtn = document.getElementById("send-emails-btn");
    const adminMessage = document.getElementById("admin-message");

    // Settings elements
    const listToggle = document.getElementById("list-toggle");
    const capacityInput = document.getElementById("capacity-input");
    const saveCapacityBtn = document.getElementById("save-capacity-btn");
    const capacityDisplay = document.getElementById("capacity-display");
    const presentCountDisplay = document.getElementById("present-count");
    const exportCsvBtn = document.getElementById("export-csv-btn");
    
    // Multi-delete elements
    const selectAllCb = document.getElementById("select-all-cb");
    const deleteSelectedBtn = document.getElementById("delete-selected-btn");
    const searchInput = document.getElementById("search-input");

    let usersData = [];

    async function loadSettings() {
        if (!db) return;
        try {
            const configSnap = await getDoc(doc(db, "settings", "config"));
            if (configSnap.exists()) {
                const config = configSnap.data();
                listToggle.checked = config.isOpen;
                capacityInput.value = config.maxCapacity;
                capacityDisplay.textContent = config.maxCapacity;
            } else {
                await setDoc(doc(db, "settings", "config"), { isOpen: true, maxCapacity: 100 });
            }
        } catch (error) {
            console.error("Error loading settings:", error);
        }
    }

    listToggle.addEventListener("change", async (e) => {
        if (!db) return;
        try {
            await setDoc(doc(db, "settings", "config"), { isOpen: e.target.checked }, { merge: true });
        } catch (error) {
            console.error("Error saving toggle:", error);
        }
    });

    saveCapacityBtn.addEventListener("click", async () => {
        if (!db) return;
        const cap = parseInt(capacityInput.value);
        if (isNaN(cap) || cap < 1) return;
        try {
            await setDoc(doc(db, "settings", "config"), { maxCapacity: cap }, { merge: true });
            capacityDisplay.textContent = cap;
            saveCapacityBtn.textContent = "FATTO";
            setTimeout(() => saveCapacityBtn.textContent = "SALVA", 2000);
        } catch (error) {
            console.error("Error saving capacity:", error);
        }
    });

    exportCsvBtn.addEventListener("click", () => {
        if (usersData.length === 0) return;
        let csvContent = "Nome,Email,Data Richiesta,Stato Ingresso,Orario Ingresso\n";
        usersData.forEach(user => {
            const time = user.timestamp.toLocaleString('it-IT').replace(/,/g, '');
            const status = user.checked_in ? "Entrato" : "In Attesa";
            const inTime = user.check_in_time ? user.check_in_time.toLocaleTimeString('it-IT') : "";
            csvContent += `"${user.name}","${user.email}","${time}","${status}","${inTime}"\n`;
        });
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `dlbp_guestlist_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // --- LOGIN LOGIC ---
    if (sessionStorage.getItem("dlbp_admin_auth") === "true") {
        loginSection.style.display = "none";
        dashboardSection.style.display = "block";
        loadSettings();
        loadUsers();
    }
    
    const SECRET_HASH = "731c8acd320f54b4fc09a3145661385c4c991fe468ffc907b2602ce971dcfe08"; // Hash di "dlbp2024"

    async function hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    loginBtn.addEventListener("click", async () => {
        const pwd = passwordInput.value;
        const hashedInput = await hashPassword(pwd);
        
        if (hashedInput === SECRET_HASH) { 
            sessionStorage.setItem("dlbp_admin_auth", "true");
            loginSection.style.display = "none";
            dashboardSection.style.display = "block";
            loadSettings();
            loadUsers();
        } else {
            loginMessage.textContent = "Accesso negato.";
            loginMessage.className = "form-message error";
        }
    });

    // --- DASHBOARD LOGIC ---
    async function loadUsers() {
        tbody.innerHTML = "<tr><td colspan='3'>Caricamento dati...</td></tr>";
        try {
            if (db) {
                usersData = [];
                const q = query(collection(db, "registrations"), orderBy("timestamp", "desc"));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    data.id = doc.id;
                    data.timestamp = data.timestamp ? data.timestamp.toDate() : new Date();
                    if (data.check_in_time) {
                        data.check_in_time = data.check_in_time.toDate();
                    }
                    usersData.push(data);
                });
            } else {
                console.warn("Using dummy data because Firebase is not configured.");
            }
            renderTable();
        } catch (error) {
            console.error("Error loading users:", error);
            tbody.innerHTML = "<tr><td colspan='3'>Errore di connessione al database.</td></tr>";
        }
    }

    function renderTable() {
        tbody.innerHTML = "";
        if (usersData.length === 0) {
            tbody.innerHTML = "<tr><td colspan='3'>Nessun iscritto al momento.</td></tr>";
            adminMessage.className = "form-message hidden";
            return;
        }

        let presentCount = 0;
        usersData.forEach(user => {
            const tr = document.createElement("tr");
            
            let statusHtml = `<span class="status-attesa" style="color: #ffcc00;">IN ATTESA</span>`;
            if (user.status === "approved") {
                statusHtml = `<span style="color: #4CAF50; font-weight: bold;">APPROVATO</span>`;
            }
            if (user.checked_in) {
                presentCount++;
                statusHtml = `<span class="status-entrato" style="color: #4CAF50;">ENTRATO</span>`;
            }

            const checkinTimeHtml = user.checked_in && user.check_in_time ? user.check_in_time.toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'}) : '-';
            
            let actionsHtml = `
                <button class="approve-btn" data-id="${user.id}" title="Approva Accesso" style="background: none; border: none; cursor: pointer; font-size: 1.2rem; color: #4CAF50; padding: 0 5px;">✓</button>
                <button class="resend-email-btn" data-id="${user.id}" title="Invia Email Singola" style="background: none; border: none; cursor: pointer; font-size: 1.2rem; color: #aaa; padding: 0 5px;">✉️</button>
            `;

            tr.innerHTML = `
                <td style="text-align: center;"><input type="checkbox" class="user-checkbox" data-id="${user.id}"></td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${statusHtml}</td>
                <td>${user.timestamp.toLocaleString('it-IT', {dateStyle: 'short', timeStyle: 'short'})}</td>
                <td>${checkinTimeHtml}</td>
                <td style="text-align: right; white-space: nowrap;">${actionsHtml}</td>
            `;
            tbody.appendChild(tr);
        });
        presentCountDisplay.textContent = presentCount;
        
        // Reset and attach multi-delete listeners
        selectAllCb.checked = false;
        deleteSelectedBtn.disabled = true;
        deleteSelectedBtn.style.opacity = "0.5";
        
        const userCheckboxes = document.querySelectorAll(".user-checkbox");
        
        function updateDeleteBtn() {
            const anyChecked = Array.from(userCheckboxes).some(cb => cb.checked);
            deleteSelectedBtn.disabled = !anyChecked;
            deleteSelectedBtn.style.opacity = anyChecked ? "1" : "0.5";
        }

        selectAllCb.addEventListener("change", (e) => {
            userCheckboxes.forEach(cb => cb.checked = e.target.checked);
            updateDeleteBtn();
        });

        userCheckboxes.forEach(cb => {
            cb.addEventListener("change", () => {
                const allChecked = Array.from(userCheckboxes).every(c => c.checked);
                selectAllCb.checked = allChecked;
                updateDeleteBtn();
            });
        });

        // Approve Logic
        document.querySelectorAll(".approve-btn").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                const id = e.target.dataset.id;
                try {
                    await updateDoc(doc(db, "registrations", id), { status: "approved" });
                    loadUsers(); // Refresh table
                } catch (error) {
                    console.error("Error approving user", error);
                }
            });
        });

        // Single Resend Email Logic
        document.querySelectorAll(".resend-email-btn").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                const id = e.target.dataset.id;
                const user = usersData.find(u => u.id === id);
                if (!user) return;
                
                if (!confirm(`Vuoi inviare l'email con la location segreta a ${user.name}?`)) return;

                e.target.disabled = true;
                e.target.style.opacity = "0.5";

                try {
                    if (EMAILJS_PUBLIC_KEY !== "YOUR_EMAILJS_PUBLIC_KEY") {
                        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
                            to_name: user.name,
                            to_email: user.email,
                            secret_location: "Via Fabio Filzi 28 Arezzo (AR)",
                            event_date: "SABATO 04/07 | 16:00 - 21:00",
                            qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${user.id}`
                        });
                        await updateDoc(doc(db, "registrations", user.id), { email_sent: true });
                    }
                    alert("Email inviata con successo!");
                    loadUsers();
                } catch (error) {
                    console.error(`Failed to send email to ${user.email}:`, error);
                    alert("Errore durante l'invio dell'email.");
                    e.target.disabled = false;
                    e.target.style.opacity = "1";
                }
            });
        });
        
        // Trigger search filter if there's already text in the input
        if (searchInput && searchInput.value) {
            searchInput.dispatchEvent(new Event('input'));
        }
    }

    // --- SEARCH LOGIC ---
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            const term = e.target.value.toLowerCase();
            const rows = tbody.querySelectorAll("tr");
            rows.forEach(row => {
                const name = row.children[1].textContent.toLowerCase();
                const email = row.children[2].textContent.toLowerCase();
                if (name.includes(term) || email.includes(term)) {
                    row.style.display = "";
                } else {
                    row.style.display = "none";
                }
            });
        });
    }

    // --- DELETE LOGIC ---
    deleteSelectedBtn.addEventListener("click", async () => {
        const selectedIds = Array.from(document.querySelectorAll(".user-checkbox:checked")).map(cb => cb.dataset.id);
        if (selectedIds.length === 0) return;

        if (!confirm(`Sei sicuro di voler eliminare definitivamente ${selectedIds.length} iscritti? Questa azione è irreversibile.`)) {
            return;
        }

        adminMessage.textContent = "Eliminazione in corso...";
        adminMessage.className = "form-message";

        try {
            for (const id of selectedIds) {
                await deleteDoc(doc(db, "registrations", id));
            }
            adminMessage.textContent = "Iscritti eliminati con successo.";
            adminMessage.className = "form-message success";
            setTimeout(() => {
                adminMessage.className = "form-message hidden";
            }, 3000);
            loadUsers();
        } catch (error) {
            console.error("Errore durante l'eliminazione:", error);
            adminMessage.textContent = "Errore durante l'eliminazione.";
            adminMessage.className = "form-message error";
        }
    });

    // --- EMAIL SENDING LOGIC ---
    sendEmailsBtn.addEventListener("click", async () => {
        if (!confirm("ATTENZIONE: Stai per inviare la location segreta a TUTTI gli iscritti. Procedere?")) {
            return;
        }

        sendEmailsBtn.disabled = true;
        sendEmailsBtn.textContent = "INVIO IN CORSO...";
        adminMessage.className = "form-message hidden";

        let successCount = 0;
        let failCount = 0;

        for (const user of usersData) {
            if (user.status === "approved" && user.email_sent !== true) {
                try {
                    if (EMAILJS_PUBLIC_KEY !== "YOUR_EMAILJS_PUBLIC_KEY") {
                        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
                            to_name: user.name,
                            to_email: user.email,
                            secret_location: "Via Fabio Filzi 28 Arezzo (AR)",
                            event_date: "SABATO 04/07 | 16:00 - 21:00",
                            qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${user.id}`
                        });
                        await updateDoc(doc(db, "registrations", user.id), { email_sent: true });
                    } else {
                        // Simulate email sending delay
                        await new Promise(r => setTimeout(r, 500));
                        console.log(`Simulated email sent to ${user.email}`);
                    }
                    successCount++;
                } catch (error) {
                    console.error(`Failed to send email to ${user.email}:`, error);
                    failCount++;
                }
            }
        }

        sendEmailsBtn.disabled = false;
        sendEmailsBtn.textContent = "INVIA SECRET LOCATION";
        
        adminMessage.textContent = `Operazione completata. Inviate: ${successCount}. Fallite: ${failCount}.`;
        adminMessage.className = "form-message success";
    });
});
