import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, setDoc, getDoc, query, deleteDoc, updateDoc, where, addDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

    const adminEventSelector = document.getElementById("admin-event-selector");
    const newEventBtn = document.getElementById("new-event-btn");
    const setActiveBtn = document.getElementById("set-active-btn");
    
    let usersData = [];
    let currentEventId = null;

    async function setupEventsIfNeeded() {
        if (!db) return;
        try {
            const eventsSnap = await getDocs(collection(db, "events"));
            if (eventsSnap.empty) {
                console.log("No events found, migrating legacy settings to act_1...");
                let oldMaxCapacity = 100;
                let oldIsOpen = true;
                const oldSettingsSnap = await getDoc(doc(db, "settings", "config"));
                if (oldSettingsSnap.exists()) {
                    const data = oldSettingsSnap.data();
                    oldMaxCapacity = data.maxCapacity || 100;
                    oldIsOpen = data.isOpen !== false;
                }

                await setDoc(doc(db, "events", "act_1"), {
                    name: "TXK.NØX Act I",
                    date: "SABATO 04/07 | 16:00 - 21:00",
                    location: "Via Fabio Filzi 28 Arezzo (AR)",
                    maxCapacity: oldMaxCapacity,
                    isOpen: oldIsOpen,
                    isActive: true,
                    createdAt: new Date()
                });
                
                // Migrazione vecchie registrazioni
                const regSnap = await getDocs(collection(db, "registrations"));
                for (const d of regSnap.docs) {
                    if (!d.data().eventId) {
                        await updateDoc(doc(db, "registrations", d.id), { eventId: "act_1" });
                    }
                }
            }
        } catch (error) {
            console.error("Error setting up events:", error);
        }
    }

    async function loadEventsList() {
        if (!db) return;
        try {
            // Rimosso orderBy per evitare problemi di indici mancanti o documenti senza createdAt
            const eventsSnap = await getDocs(collection(db, "events"));
            adminEventSelector.innerHTML = "";
            let foundActive = false;

            // Mettiamo gli eventi in un array per poterli ordinare
            let eventsArray = [];
            eventsSnap.forEach(doc => {
                eventsArray.push({ id: doc.id, ...doc.data() });
            });

            // Ordinamento decrescente (più recenti prima)
            eventsArray.sort((a, b) => {
                const dateA = a.createdAt ? a.createdAt.toMillis() : 0;
                const dateB = b.createdAt ? b.createdAt.toMillis() : 0;
                return dateB - dateA;
            });

            eventsArray.forEach(ev => {
                const option = document.createElement("option");
                option.value = ev.id;
                option.textContent = ev.name + " (" + ev.date + ")" + (ev.isActive ? " [ATTIVO ONLINE]" : "");
                if (ev.isActive && !foundActive) {
                    option.selected = true;
                    foundActive = true;
                    currentEventId = ev.id;
                }
                adminEventSelector.appendChild(option);
            });

            if (!currentEventId && eventsSnap.docs.length > 0) {
                currentEventId = eventsSnap.docs[0].id;
                adminEventSelector.value = currentEventId;
            }

            if (currentEventId) {
                await loadSettings();
                await loadUsers();
            }
        } catch (error) {
            console.error("Error loading events list:", error);
        }
    }

    if (adminEventSelector) {
        adminEventSelector.addEventListener("change", (e) => {
            currentEventId = e.target.value;
            loadSettings();
            loadUsers();
        });
    }

    if (newEventBtn) {
        newEventBtn.addEventListener("click", async () => {
            const name = prompt("Nome del nuovo evento (es: TXK.NØX Act II):");
            if (!name) return;
            const date = prompt("Data e ora (es: VENERDÌ 14/08 | 23:00 - 05:00):");
            if (!date) return;
            const capacity = prompt("Capienza massima:", "100");
            
            try {
                const newEventRef = await addDoc(collection(db, "events"), {
                    name: name,
                    date: date,
                    flyerUrl: "",
                    description: "",
                    location: "Via Fabio Filzi 28 Arezzo (AR)", // Puoi renderlo dinamico in futuro
                    maxCapacity: parseInt(capacity) || 100,
                    isOpen: true,
                    isActive: false,
                    createdAt: new Date()
                });
                
                alert("Nuovo evento creato! Ricordati di cliccare su 'IMPOSTA ATTIVO' quando vuoi pubblicarlo.");
                currentEventId = newEventRef.id;
                await loadEventsList();
                // Assicuriamoci che il selettore mostri l'evento appena creato
                if (adminEventSelector) adminEventSelector.value = currentEventId;
            } catch (error) {
                console.error("Error creating new event:", error);
                alert("Errore nella creazione dell'evento.");
            }
        });
    }

    if (setActiveBtn) {
        setActiveBtn.addEventListener("click", async () => {
            if (!currentEventId) return;
            
            try {
                const currentDoc = await getDoc(doc(db, "events", currentEventId));
                if (currentDoc.exists() && currentDoc.data().isActive) {
                    alert("Questo evento è già attivo online!");
                    return;
                }

                if (!confirm("Vuoi impostare questo evento come ATTIVO ONLINE? Le nuove iscrizioni finiranno qui.")) return;
                
                // Imposta tutti gli altri eventi come NON attivi
                const eventsSnap = await getDocs(collection(db, "events"));
                const batch = writeBatch(db);
                for (const d of eventsSnap.docs) {
                    if (d.data().isActive && d.id !== currentEventId) {
                        batch.update(doc(db, "events", d.id), { isActive: false });
                    }
                }
                // Imposta quello corrente come attivo
                batch.update(doc(db, "events", currentEventId), { isActive: true });
                
                await batch.commit();
                alert("Evento impostato come ATTIVO ONLINE!");
                await loadEventsList();
            } catch (error) {
                console.error("Error setting active event:", error);
                alert("Errore durante l'operazione.");
            }
        });
    }

    async function loadSettings() {
        if (!db || !currentEventId) return;
        try {
            const eventSnap = await getDoc(doc(db, "events", currentEventId));
            if (eventSnap.exists()) {
                const evData = eventSnap.data();
                listToggle.checked = evData.isOpen !== false; // default true
                capacityInput.value = evData.maxCapacity || 100;
                capacityDisplay.textContent = evData.maxCapacity || 100;
                document.getElementById('flyer-input').value = evData.flyerUrl || "";
                document.getElementById('desc-input').value = evData.description || "";
            }
        } catch (error) {
            console.error("Error loading event settings:", error);
        }
    }

    listToggle.addEventListener("change", async (e) => {
        if (!db || !currentEventId) return;
        try {
            await updateDoc(doc(db, "events", currentEventId), { isOpen: e.target.checked });
        } catch (error) {
            console.error("Error saving toggle:", error);
        }
    });

    saveCapacityBtn.addEventListener("click", async () => {
        if (!db || !currentEventId) return;
        const cap = parseInt(capacityInput.value);
        if (isNaN(cap) || cap < 1) return;
        try {
            await updateDoc(doc(db, "events", currentEventId), { maxCapacity: cap });
            capacityDisplay.textContent = cap;
            saveCapacityBtn.textContent = "FATTO";
            setTimeout(() => saveCapacityBtn.textContent = "SALVA", 2000);
        } catch (error) {
            console.error("Error saving capacity:", error);
        }
    });

    document.getElementById('save-content-btn').addEventListener("click", async () => {
        if (!db || !currentEventId) return;
        const flyerUrl = document.getElementById('flyer-input').value.trim();
        const description = document.getElementById('desc-input').value.trim();
        
        try {
            await updateDoc(doc(db, "events", currentEventId), { 
                flyerUrl: flyerUrl,
                description: description
            });
            alert("Testi e Immagine salvati con successo!");
        } catch (error) {
            console.error("Error saving content:", error);
            alert("Errore durante il salvataggio.");
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
        document.getElementById("app-main").style.maxWidth = "1200px";
        setupEventsIfNeeded().then(() => {
            loadEventsList();
        });
    }
    
    const SECRET_HASH = "20d70daed03b66603556192e43f3d6c94cf4543f84725d2cbdca96d3e65a4d97"; // Hash di "dlbpadmin"

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
            // Verify SHA-256
            if (hashedInput === SECRET_HASH) {
                sessionStorage.setItem("dlbp_admin_auth", "true");
                loginSection.style.display = "none";
                dashboardSection.style.display = "block";
                document.getElementById("app-main").style.maxWidth = "1200px";
                await setupEventsIfNeeded();
                await loadEventsList();
            } else {
            loginMessage.textContent = "Accesso negato.";
            loginMessage.className = "form-message error";
        }
    });

    passwordInput.addEventListener("keyup", (e) => {
        if (e.key === "Enter") {
            loginBtn.click();
        }
    });

    // --- DATA LOADING LOGIC ---
    async function loadUsers() {
        if (!db || !currentEventId) return;
        tbody.innerHTML = "<tr><td colspan='7' style='text-align: center;'>Caricamento dati...</td></tr>";
        try {
            // Rimosso orderBy per evitare l'errore di indice composito mancante su Firebase
            const q = query(collection(db, "registrations"), where("eventId", "==", currentEventId));
            const querySnapshot = await getDocs(q);
            usersData = [];
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                usersData.push({
                    id: doc.id,
                    ...data,
                    timestamp: data.timestamp ? data.timestamp.toDate() : new Date(),
                    check_in_time: data.check_in_time ? data.check_in_time.toDate() : null
                });
            });

            // Ordinamento manuale lato client (dal più recente)
            usersData.sort((a, b) => b.timestamp - a.timestamp);
            
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
            // Usa writeBatch per eliminazioni multiple in una singola richiesta di rete (più efficiente)
            const batch = writeBatch(db);
            for (const id of selectedIds) {
                batch.delete(doc(db, "registrations", id));
            }
            await batch.commit();

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
