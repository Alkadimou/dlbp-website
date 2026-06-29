import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, doc, setDoc, getDoc, query, deleteDoc, updateDoc, where, addDoc, writeBatch, onSnapshot, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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
let auth;
let currentEventId = null;
let isCreatingNew = false;
try {
    if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
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
    const adminMessage = document.getElementById("admin-message");

    // Settings elements
    const listToggle = document.getElementById("list-toggle");
    const capacityInput = document.getElementById("capacity-input");
    const capacityDisplay = document.getElementById("capacity-display");
    const settingsPanel = document.getElementById("settings-panel");
    const editEventBtn = document.getElementById("edit-event-btn");
    const closeSettingsBtn = document.getElementById("close-settings-btn");
    const deleteEventBtn = document.getElementById("delete-event-btn");
    const presentCountDisplay = document.getElementById("present-count");
    const exportCsvBtn = document.getElementById("export-csv-btn");
    const logoutBtn = document.getElementById("logout-btn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            if (auth) signOut(auth);
        });
    }
    
    // Multi-delete elements
    const selectAllCb = document.getElementById("select-all-cb");
    const deleteSelectedBtn = document.getElementById("delete-selected-btn");
    const searchInput = document.getElementById("search-input");

    const adminEventSelector = document.getElementById("admin-event-selector");
    const newEventBtn = document.getElementById("new-event-btn");
    const setActiveBtn = document.getElementById("set-active-btn");
    
    let usersData = [];

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
                adminEventSelector.appendChild(option);
            });

            if (!currentEventId) {
                let activeEv = eventsArray.find(e => e.isActive);
                if (activeEv) {
                    currentEventId = activeEv.id;
                } else if (eventsArray.length > 0) {
                    currentEventId = eventsArray[0].id;
                }
            }

            if (currentEventId) {
                adminEventSelector.value = currentEventId;
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
            isCreatingNew = false;
            const title = document.getElementById('settings-panel-title');
            if (title) {
                title.textContent = "MODIFICA EVENTO ESISTENTE";
                title.style.color = "var(--accent-color)";
            }
            document.getElementById('save-content-btn').textContent = "SALVA DETTAGLI EVENTO";
            if (deleteEventBtn) deleteEventBtn.style.display = 'block';
            loadSettings();
            loadUsers();
        });
    }

    if (editEventBtn && settingsPanel) {
        editEventBtn.addEventListener("click", () => {
            if (!currentEventId) {
                alert("Nessun evento selezionato da modificare.");
                return;
            }
            isCreatingNew = false;
            const title = document.getElementById('settings-panel-title');
            if (title) {
                title.textContent = "MODIFICA EVENTO ESISTENTE";
                title.style.color = "var(--accent-color)";
            }
            document.getElementById('save-content-btn').textContent = "SALVA DETTAGLI EVENTO";
            if (deleteEventBtn) deleteEventBtn.style.display = 'block';
            settingsPanel.style.display = 'flex';
        });
    }

    if (closeSettingsBtn && settingsPanel) {
        closeSettingsBtn.addEventListener("click", () => {
            settingsPanel.style.display = 'none';
        });
    }

    if (newEventBtn) {
        newEventBtn.addEventListener("click", () => {
            isCreatingNew = true;
            currentEventId = null;
            if (adminEventSelector) adminEventSelector.value = "";
            
            const title = document.getElementById('settings-panel-title');
            if (title) {
                title.textContent = "CREAZIONE NUOVO EVENTO";
                title.style.color = "var(--accent-color)";
            }
            settingsPanel.style.display = "block";
            document.getElementById('event-name-input').value = "";
            document.getElementById('event-location-input').value = "";
            document.getElementById('event-date-input').value = "";
            document.getElementById('event-start-time-input').value = "";
            document.getElementById('event-end-time-input').value = "";
            document.getElementById('desc-input').value = "";
            document.getElementById('flyer-input').value = "";
            document.getElementById('current-flyer-preview').innerHTML = "Nessun flyer caricato.";
            document.getElementById('save-content-btn').textContent = "CREA NUOVO EVENTO";
            if (deleteEventBtn) deleteEventBtn.style.display = 'none';
            
            if (settingsPanel) settingsPanel.style.display = 'flex';
            document.getElementById('event-name-input').focus();
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
                document.getElementById('event-name-input').value = evData.name || "";
                document.getElementById('event-location-input').value = evData.location || "";
                document.getElementById('event-date-input').value = evData.dateIso || "";
                document.getElementById('event-start-time-input').value = evData.startTime || "";
                document.getElementById('event-end-time-input').value = evData.endTime || "";
                listToggle.checked = evData.isOpen !== false; // default true
                capacityInput.value = evData.maxCapacity || 100;
                capacityDisplay.textContent = evData.maxCapacity || 100;
                
                const previewDiv = document.getElementById('current-flyer-preview');
                if (evData.flyerUrl) {
                    previewDiv.innerHTML = `Flyer attuale:<br><img src="${evData.flyerUrl}" style="max-width: 150px; margin-top: 10px; border-radius: 8px;">`;
                } else {
                    previewDiv.innerHTML = "Nessun flyer caricato.";
                }
                document.getElementById('flyer-input').value = "";
                document.getElementById('desc-input').value = evData.description || "";
            }
        } catch (error) {
            console.error("Error loading event settings:", error);
        }
    }

    // Utility to compress image to Base64
    function compressImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = event => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const maxWidth = 800;
                    const maxHeight = 800;
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > height) {
                        if (width > maxWidth) {
                            height = Math.round(height * (maxWidth / width));
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = Math.round(width * (maxHeight / height));
                            height = maxHeight;
                        }
                    }
                    
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.6)); // Compress to 60% quality JPEG
                };
                img.onerror = error => reject(error);
            };
            reader.onerror = error => reject(error);
        });
    }

    if (deleteEventBtn) {
        deleteEventBtn.addEventListener('click', async () => {
            if (!currentEventId || isCreatingNew) return;
            
            const confirmDelete = confirm("⚠️ ATTENZIONE: Sei sicuro di voler eliminare definitivamente questo evento e tutti i suoi iscritti? L'azione è irreversibile.");
            if (!confirmDelete) return;

            deleteEventBtn.textContent = "ELIMINAZIONE...";
            deleteEventBtn.disabled = true;

            try {
                // Delete registrations associated with this event
                const q = query(collection(db, "registrations"), where("eventId", "==", currentEventId));
                const snapshot = await getDocs(q);
                
                if (!snapshot.empty) {
                    let batch = writeBatch(db);
                    let count = 0;
                    
                    for (const docSnap of snapshot.docs) {
                        batch.delete(doc(db, "registrations", docSnap.id));
                        count++;
                        
                        // Firestore batches support up to 500 operations
                        if (count === 490) {
                            await batch.commit();
                            batch = writeBatch(db);
                            count = 0;
                        }
                    }
                    if (count > 0) {
                        await batch.commit();
                    }
                }

                // Delete the event document
                await deleteDoc(doc(db, "events", currentEventId));
                
                alert("Evento e iscritti eliminati con successo!");
                window.location.reload(); 
            } catch (error) {
                console.error("Errore durante l'eliminazione:", error);
                alert("Si è verificato un errore durante l'eliminazione.");
                deleteEventBtn.textContent = "ELIMINA EVENTO";
                deleteEventBtn.disabled = false;
            }
        });
    }

    document.getElementById("save-content-btn").addEventListener("click", async () => {
        if (!db) return;
        const btn = document.getElementById("save-content-btn");
        const originalText = btn.textContent;
        btn.textContent = "SALVATAGGIO...";
        btn.disabled = true;

        const name = document.getElementById('event-name-input').value.trim();
        const location = document.getElementById('event-location-input').value.trim() || "Secret Location";
        const dateIso = document.getElementById('event-date-input').value;
        const startTime = document.getElementById('event-start-time-input').value;
        const endTime = document.getElementById('event-end-time-input').value;

        if (!dateIso || !startTime || !endTime) {
            alert("Compila correttamente la Data, l'Ora di Inizio e l'Ora di Fine dell'evento prima di salvare.");
            btn.textContent = originalText;
            btn.disabled = false;
            return;
        }
        
        // Append T12:00:00 to avoid UTC timezone offset issues making it the day before
        const d = new Date(dateIso + "T12:00:00");
        const days = ['DOMENICA', 'LUNEDÌ', 'MARTEDÌ', 'MERCOLEDÌ', 'GIOVEDÌ', 'VENERDÌ', 'SABATO'];
        const dayName = days[d.getDay()];
        const dayNum = String(d.getDate()).padStart(2, '0');
        const monthNum = String(d.getMonth() + 1).padStart(2, '0');
        
        let timeString = startTime;
        if (endTime) {
            timeString += ` - ${endTime}`;
        }
        
        const formattedDate = `${dayName} ${dayNum}/${monthNum} | ${timeString}`;
        const description = document.getElementById('desc-input').value.trim();
        const fileInput = document.getElementById('flyer-input');
        const file = fileInput.files[0];
        
        try {
            let flyerUrl = undefined;
            if (file) {
                // Compress and convert to Base64
                flyerUrl = await compressImage(file);
                
                // Firestore document size limit is 1MB. Warn if still too large.
                if (flyerUrl.length > 1000000) {
                    alert("L'immagine è troppo grande anche dopo la compressione. Scegli un'immagine più leggera.");
                    return;
                }
            }
            
            if (isCreatingNew) {
                const newEventRef = await addDoc(collection(db, "events"), {
                    name: name || "Nuovo Evento",
                    date: formattedDate,
                    dateIso: dateIso,
                    startTime: startTime,
                    endTime: endTime,
                    location: location,
                    flyerUrl: flyerUrl || "",
                    description: description || "",
                    maxCapacity: parseInt(document.getElementById('capacity-input').value) || 100,
                    isOpen: document.getElementById('list-toggle').checked,
                    isActive: false,
                    createdAt: new Date()
                });
                currentEventId = newEventRef.id;
                isCreatingNew = false;
                
                const title = document.getElementById('settings-panel-title');
                if (title) {
                    title.textContent = "MODIFICA EVENTO ESISTENTE";
                    title.style.color = "var(--accent-color)";
                }
                
                await loadEventsList();
                alert("Nuovo evento creato con successo!");
            } else {
                const cap = parseInt(document.getElementById('capacity-input').value) || 100;
                const isOpen = document.getElementById('list-toggle').checked;
                
                const updates = {
                    name: name,
                    location: location,
                    dateIso: dateIso,
                    date: formattedDate,
                    startTime: startTime,
                    endTime: endTime,
                    description: description,
                    maxCapacity: cap,
                    isOpen: isOpen
                };
                if (flyerUrl) updates.flyerUrl = flyerUrl;
                
                await updateDoc(doc(db, "events", currentEventId), updates);
                capacityDisplay.textContent = cap;
                await loadEventsList();
                alert("Dettagli evento salvati con successo!");
            }
            
            // Close the panel after saving
            if (settingsPanel) settingsPanel.style.display = 'none';

            if (flyerUrl) {
                document.getElementById('current-flyer-preview').innerHTML = `Flyer attuale:<br><img src="${flyerUrl}" style="max-width: 150px; margin-top: 10px; border-radius: 8px;">`;
                fileInput.value = "";
            }
        } catch (error) {
            console.error("Error saving content:", error);
            alert("Errore durante il salvataggio.");
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    });

    exportCsvBtn.addEventListener("click", () => {
        if (usersData.length === 0) return;
        let csvContent = "Nome,Email,PR,Data Richiesta,Status Approvazione,Stato Ingresso,Orario Ingresso\n";
        usersData.forEach(user => {
            const time = user.timestamp.toLocaleString('it-IT').replace(/,/g, '');
            const approvazione = user.status === "approved" ? "Approvato" : "In Attesa";
            const status = user.checked_in ? "Entrato" : "Non Entrato";
            const inTime = user.check_in_time ? user.check_in_time.toLocaleTimeString('it-IT') : "";
            const pr = user.invited_by ? user.invited_by.toUpperCase() : "";
            csvContent += `"${user.name}","${user.email}","${pr}","${time}","${approvazione}","${status}","${inTime}"\n`;
        });
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "dlbp_iscritti.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });

    // --- LOGIN LOGIC ---
    // Firebase Auth logic
    if (auth) {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                loginSection.style.display = "none";
                dashboardSection.style.display = "block";
                document.getElementById("app-main").style.maxWidth = "1200px";
                await setupEventsIfNeeded();
                await loadEventsList();
            } else {
                loginSection.style.display = "block";
                dashboardSection.style.display = "none";
                document.getElementById("app-main").style.maxWidth = "";
            }
        });
    }

    loginBtn.addEventListener("click", async () => {
        if (!auth) return;
        const email = document.getElementById("admin-email").value.trim();
        const pwd = passwordInput.value;
        
        if (!email || !pwd) {
            loginMessage.textContent = "Inserisci email e password.";
            loginMessage.className = "form-message error";
            loginMessage.style.display = "block";
            return;
        }

        loginBtn.disabled = true;
        loginBtn.textContent = "ACCESSO...";

        try {
            await signInWithEmailAndPassword(auth, email, pwd);
            // onAuthStateChanged will handle the UI switch
        } catch (error) {
            console.error("Login error:", error);
            loginMessage.textContent = "Credenziali errate o utente non trovato.";
            loginMessage.className = "form-message error";
            loginMessage.style.display = "block";
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = "ACCEDI";
        }
    });

    passwordInput.addEventListener("keyup", (e) => {
        if (e.key === "Enter") {
            loginBtn.click();
        }
    });
    document.getElementById("admin-email").addEventListener("keyup", (e) => {
        if (e.key === "Enter") {
            passwordInput.focus();
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
                <button class="approve-btn" data-id="${user.id}" title="Approva Accesso" style="background: none; border: none; cursor: pointer; font-size: 1.2rem; color: #4CAF50; padding: 0 5px; ${user.status === 'approved' ? 'opacity:0.3; cursor:default;' : ''}">✓</button>
                <button class="checkin-btn" data-id="${user.id}" title="Segna Presente" style="background: none; border: none; cursor: pointer; font-size: 1.2rem; color: #00bcd4; padding: 0 5px; ${user.checked_in ? 'opacity:0.3; cursor:default;' : ''}">🚪</button>
                <button class="resend-email-btn" data-id="${user.id}" title="Invia Email Singola" style="background: none; border: none; cursor: pointer; font-size: 1.2rem; color: #aaa; padding: 0 5px;">✉️</button>
            `;

            tr.innerHTML = `
                <td style="text-align: center;"><input type="checkbox" class="user-checkbox" data-id="${user.id}"></td>
                <td>${escapeHtml(user.name)}</td>
                <td>${escapeHtml(user.email)}</td>
                <td style="color: #aaa; text-transform: uppercase;">${escapeHtml(user.invited_by) || '-'}</td>
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
                const user = usersData.find(u => u.id === id);
                if (user && user.status === "approved") return;
                try {
                    await updateDoc(doc(db, "registrations", id), { status: "approved" });
                    loadUsers(); // Refresh table
                } catch (error) {
                    console.error("Error approving user", error);
                }
            });
        });

        // Check-in Logic
        document.querySelectorAll(".checkin-btn").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                const id = e.target.dataset.id;
                const user = usersData.find(u => u.id === id);
                if (user && user.checked_in) return;
                try {
                    await updateDoc(doc(db, "registrations", id), { checked_in: true, check_in_time: new Date() });
                    loadUsers(); // Refresh table
                } catch (error) {
                    console.error("Error checking in user", error);
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

                let eventLocation = "Secret Location";
                let eventDateStr = "Data Evento";
                try {
                    const eventSnap = await getDoc(doc(db, "events", currentEventId));
                    if (eventSnap.exists()) {
                        const ed = eventSnap.data();
                        eventLocation = ed.location || "Secret Location";
                        eventDateStr = ed.date || "Data Evento";
                    }
                } catch(e) {
                    console.error("Failed to fetch event data", e);
                }

                try {
                    if (EMAILJS_PUBLIC_KEY !== "YOUR_EMAILJS_PUBLIC_KEY") {
                        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
                            to_name: user.name,
                            to_email: user.email,
                            secret_location: eventLocation,
                            event_date: eventDateStr,
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
    const sendEmailsBtn = document.getElementById("send-emails-btn");
    if (sendEmailsBtn) {
        sendEmailsBtn.addEventListener("click", async () => {
        if (!confirm("ATTENZIONE: Stai per inviare la location segreta a TUTTI gli iscritti. Procedere?")) {
            return;
        }

        sendEmailsBtn.disabled = true;
        sendEmailsBtn.textContent = "INVIO IN CORSO...";
        adminMessage.className = "form-message hidden";

        let eventLocation = "Secret Location";
        let eventDateStr = "Data Evento";
        try {
            const eventSnap = await getDoc(doc(db, "events", currentEventId));
            if (eventSnap.exists()) {
                const ed = eventSnap.data();
                eventLocation = ed.location || "Secret Location";
                eventDateStr = ed.date || "Data Evento";
            }
        } catch(e) {
            console.error("Failed to fetch event data", e);
        }

        let successCount = 0;
        let failCount = 0;

        for (const user of usersData) {
            if (user.status === "approved" && user.email_sent !== true) {
                try {
                    if (EMAILJS_PUBLIC_KEY !== "YOUR_EMAILJS_PUBLIC_KEY") {
                        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
                            to_name: user.name,
                            to_email: user.email,
                            secret_location: eventLocation,
                            event_date: eventDateStr,
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
    }

    // --- PR MANAGEMENT LOGIC ---
    const managePrBtn = document.getElementById('manage-pr-btn');
    const prModal = document.getElementById('pr-modal');
    const closePrModalBtn = document.getElementById('close-pr-modal-btn');
    const addPrBtn = document.getElementById('add-pr-btn');
    const prNameInput = document.getElementById('pr-name-input');
    const prCodeInput = document.getElementById('pr-code-input');
    const prTableBody = document.getElementById('pr-table-body');
    let unsubPrs = null;

    managePrBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log("PR button clicked!");
        try {
            prModal.style.display = 'flex';
            prModal.style.opacity = '1';
            prModal.style.visibility = 'visible';
            loadPRs();
        } catch (err) {
            console.error("Errore PR:", err);
            alert("Si è verificato un errore nell'apertura: " + err.message);
        }
    });

    closePrModalBtn.addEventListener('click', () => {
        prModal.style.display = 'none';
        if (unsubPrs) {
            unsubPrs();
            unsubPrs = null;
        }
    });

    addPrBtn.addEventListener('click', async () => {
        const name = prNameInput.value.trim();
        const code = prCodeInput.value.trim().toLowerCase();
        
        if (!name || !code) {
            alert("Inserisci sia Nome che Codice.");
            return;
        }

        try {
            await addDoc(collection(db, "prs"), {
                name: name,
                code: code,
                isActive: true,
                createdAt: new Date()
            });
            prNameInput.value = '';
            prCodeInput.value = '';
        } catch (error) {
            console.error("Error adding PR:", error);
            alert("Errore nell'aggiunta del PR.");
        }
    });

    function loadPRs() {
        if (unsubPrs) unsubPrs();
        
        const q = query(collection(db, "prs"), orderBy("createdAt", "desc"));
        unsubPrs = onSnapshot(q, (snapshot) => {
            prTableBody.innerHTML = '';
            snapshot.forEach((docSnap) => {
                const pr = docSnap.data();
                const prId = docSnap.id;
                const link = `?pr=${pr.code}`;
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${escapeHtml(pr.name)}</td>
                    <td><span style="color:var(--accent-color);">${escapeHtml(pr.code)}</span><br><small style="color:#666;">${escapeHtml(link)}</small></td>
                    <td>${pr.isActive ? '<span style="color:var(--success-color);">ATTIVO</span>' : '<span style="color:var(--error-color);">DISABILITATO</span>'}</td>
                    <td style="text-align: right;">
                        <button class="submit-btn delete-pr-btn" data-id="${prId}" style="padding: 0.3rem 0.6rem; background: var(--error-color); border: none; font-size: 0.8rem; min-width: unset; margin: 0;">ELIMINA</button>
                    </td>
                `;
                prTableBody.appendChild(tr);
            });

            document.querySelectorAll('.delete-pr-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.target.getAttribute('data-id');
                    if (confirm("Sei sicuro di voler eliminare questo PR?")) {
                        try {
                            await deleteDoc(doc(db, "prs", id));
                        } catch (error) {
                            console.error("Error deleting PR:", error);
                        }
                    }
                });
            });
        });
    }

});
