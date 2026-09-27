// Admin – tabella degli iscritti dell'evento selezionato (collezione "registrations"):
// caricamento, ricerca, filtri (ticket, presenza, PR), ordinamento, selezione con checkbox,
// ingresso manuale (pulsante 🚪), contatore "INGRESSI LIVE" ed esportazione CSV.
import { db, collection, doc, query, where, getDocs, getCountFromServer, updateDoc } from "../../core/firebase.js";
import { escapeHtml } from "../../core/html.js";
import { setupSortableHeaders, compareValues } from "../../core/table-sort.js";
import { state } from "./state.js";

const tbody = document.getElementById("users-tbody");
const adminMessage = document.getElementById("admin-message");
const presentCountDisplay = document.getElementById("present-count-dash");
const totalCountDisplay = document.getElementById("stat-total-dash");
const selectAllCb = document.getElementById("select-all-cb");
const deleteSelectedBtn = document.getElementById("delete-selected-btn");
const searchInput = document.getElementById("search-input");

let unsubAdminCounter = null;

// ID degli iscritti selezionati con le checkbox.
export function getSelectedGuestIds() {
    return Array.from(document.querySelectorAll(".user-checkbox:checked")).map(cb => cb.dataset.id);
}

// Carica gli iscritti dell'evento selezionato e avvia il contatore degli ingressi (ogni 30 secondi).
export async function loadUsers() {
    if (!db || !state.currentEventId) return;
    tbody.innerHTML = "<tr><td colspan='7' style='text-align: center;'>Caricamento dati...</td></tr>";
    
    // Setup live counter (Polling with getCountFromServer instead of onSnapshot to save massive bandwidth)
    if (unsubAdminCounter) clearInterval(unsubAdminCounter);
    const qCount = query(collection(db, "registrations"), where("eventId", "==", state.currentEventId), where("checked_in", "==", true));
    
    async function fetchCount() {
        try {
            const snapshot = await getCountFromServer(qCount);
            const count = snapshot.data().count;
            const max = state.maxCapacity;
            const counterDiv = document.getElementById('present-count-dash');
            if (counterDiv) {
                counterDiv.textContent = count;
                if (count >= max && max > 0) {
                    counterDiv.style.color = "var(--error-color)";
                } else {
                    counterDiv.style.color = "var(--accent-color)";
                }
            }
        } catch (e) {
            console.error("Counter update error:", e);
        }
    }
    
    fetchCount();
    unsubAdminCounter = setInterval(fetchCount, 30000); // Aggiorna ogni 30 secondi
    try {
        // Rimosso orderBy per evitare l'errore di indice composito mancante su Firebase
        const q = query(collection(db, "registrations"), where("eventId", "==", state.currentEventId));
        const querySnapshot = await getDocs(q);
        state.usersData = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            state.usersData.push({
                id: doc.id,
                ...data,
                timestamp: data.timestamp ? data.timestamp.toDate() : new Date(),
                check_in_time: data.check_in_time ? data.check_in_time.toDate() : null
            });
        });

        // Ordinamento manuale lato client (dal più recente)
        state.usersData.sort((a, b) => b.timestamp - a.timestamp);
        
        if (totalCountDisplay) {
            totalCountDisplay.textContent = state.usersData.length;
        }
        
        updatePrFilterDropdown();
        renderTable();
    } catch (error) {
        console.error("Error loading users:", error);
        tbody.innerHTML = "<tr><td colspan='3'>Errore di connessione al database.</td></tr>";
    }
}

function renderTable() {
    tbody.innerHTML = "";
    if (state.usersData.length === 0) {
        tbody.innerHTML = "<tr><td colspan='8' style='text-align:center;'>Nessun iscritto al momento.</td></tr>";
        adminMessage.className = "form-message hidden";
        if (totalCountDisplay) totalCountDisplay.textContent = 0;
        presentCountDisplay.textContent = 0;
        return;
    }

    // Apply filters
    const filterTicketVal = document.getElementById("filter-ticket") ? document.getElementById("filter-ticket").value : "all";
    const filterPresenceVal = document.getElementById("filter-presence") ? document.getElementById("filter-presence").value : "all";
    const filterPrVal = document.getElementById("filter-pr") ? document.getElementById("filter-pr").value : "all";
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";

    const filteredUsers = state.usersData.filter(user => {
        // Search text filter
        if (searchTerm) {
            const name = (user.name || "").toLowerCase();
            const email = (user.email || "").toLowerCase();
            if (!name.includes(searchTerm) && !email.includes(searchTerm)) {
                return false;
            }
        }

        // Ticket filter
        if (filterTicketVal === "sent" && !user.email_sent) return false;
        if (filterTicketVal === "not_sent" && user.email_sent) return false;

        // Presence filter
        if (filterPresenceVal === "checked_in" && !user.checked_in) return false;
        if (filterPresenceVal === "not_checked_in" && user.checked_in) return false;

        // PR filter
        if (filterPrVal !== "all" && (user.invited_by || "").toLowerCase() !== filterPrVal.toLowerCase()) return false;

        return true;
    });

    // Sort filtered users
    filteredUsers.sort((a, b) => {
        let valA, valB;
        if (state.sort.field === "timestamp") {
            valA = a.timestamp ? a.timestamp.getTime() : 0;
            valB = b.timestamp ? b.timestamp.getTime() : 0;
        } else if (state.sort.field === "invited_by") {
            valA = (a.invited_by || "").toLowerCase();
            valB = (b.invited_by || "").toLowerCase();
        } else if (state.sort.field === "email_sent") {
            valA = a.email_sent ? 1 : 0;
            valB = b.email_sent ? 1 : 0;
        } else if (state.sort.field === "checked_in") {
            valA = a.checked_in ? 1 : 0;
            valB = b.checked_in ? 1 : 0;
        } else {
            valA = (a[state.sort.field] || "").toString().toLowerCase();
            valB = (b[state.sort.field] || "").toString().toLowerCase();
        }

        return compareValues(valA, valB, state.sort.order);
    });

    if (filteredUsers.length === 0) {
        tbody.innerHTML = "<tr><td colspan='8' style='text-align:center;'>Nessun iscritto corrisponde ai filtri.</td></tr>";
        presentCountDisplay.textContent = 0;
        return;
    }

    let presentCount = 0;
    const fragment = document.createDocumentFragment();
    filteredUsers.forEach(user => {
        const tr = document.createElement("tr");
        
        let statusHtml = `<span style="color: #888;">-</span>`;
        if (user.checked_in) {
            presentCount++;
            statusHtml = `<span class="status-entrato" style="color: #4CAF50; font-weight: bold;">ENTRATO</span>`;
        }

        const checkinTimeHtml = user.checked_in && user.check_in_time ? user.check_in_time.toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'}) : '-';
        
        let actionsHtml = `
            <div style="display: flex; gap: 0.5rem; justify-content: flex-end; flex-wrap: wrap;">
                <button class="checkin-btn action-btn-icon check" data-id="${user.id}" title="Segna Presente" style="${user.checked_in ? 'opacity:0.3; cursor:default;' : ''}">🚪</button>
            </div>
        `;

        const ticketHtml = user.email_sent ? `<span style="color: #4CAF50;">INVIATO</span>` : `<span style="color: #ffcc00;">NO</span>`;

        tr.innerHTML = `
            <td data-label="${escapeHtml(user.name)}" style="text-align: center;"><input type="checkbox" class="user-checkbox" data-id="${user.id}"></td>
            <td data-label="NOME" title="${escapeHtml(user.name)}"><span class="truncate-mobile">${escapeHtml(user.name)}</span></td>
            <td data-label="EMAIL" style="word-break: break-all;" title="${escapeHtml(user.email)}"><span class="truncate-mobile">${escapeHtml(user.email)}</span></td>
            <td data-label="LISTA" style="color: #aaa; text-transform: uppercase; text-align: center;"><span class="truncate-mobile">${escapeHtml(user.invited_by) || '-'}</span></td>
            <td data-label="TICKET" style="text-align: center; white-space: nowrap; font-size: 0.8rem;">${ticketHtml}</td>
            <td data-label="STATO" style="white-space: nowrap;">${statusHtml} ${user.checked_in && user.check_in_time ? '<br><small style="color:#888;">'+user.check_in_time.toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'})+'</small>' : ''}</td>
            <td data-label="REGISTRATO IL" style="white-space: nowrap;">${user.timestamp.toLocaleString('it-IT', {dateStyle: 'short', timeStyle: 'short'})}</td>
            <td data-label="AZIONI" style="text-align: right;">${actionsHtml}</td>
        `;

        tr.style.cursor = "pointer";
        tr.addEventListener("click", (e) => {
            // Evita di selezionare se si clicca su un pulsante o sulla checkbox stessa
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || e.target.tagName === 'INPUT' || e.target.closest('button')) {
                return;
            }
            const cb = tr.querySelector('.user-checkbox');
            if (cb) {
                cb.click();
            }
        });

        fragment.appendChild(tr);
    });
    tbody.appendChild(fragment);
    presentCountDisplay.textContent = presentCount;
    
    // Reset and attach multi-delete listeners
    selectAllCb.checked = false;
    deleteSelectedBtn.disabled = true;
    deleteSelectedBtn.style.opacity = "0.5";
    
    const userCheckboxes = document.querySelectorAll(".user-checkbox");
    
    function updateDeleteBtn() {
        const anyChecked = Array.from(document.querySelectorAll('.user-checkbox')).some(cb => cb.checked);
        deleteSelectedBtn.disabled = !anyChecked;
        deleteSelectedBtn.style.opacity = anyChecked ? "1" : "0.5";
    }

    // Use properties to avoid attaching multiple event listeners on re-renders
    selectAllCb.onchange = (e) => {
        const userCheckboxes = document.querySelectorAll('.user-checkbox');
        userCheckboxes.forEach(cb => cb.checked = e.target.checked);
        updateDeleteBtn();
    };

    tbody.onchange = (e) => {
        if (e.target.classList.contains('user-checkbox')) {
            const userCheckboxes = document.querySelectorAll('.user-checkbox');
            const allChecked = Array.from(userCheckboxes).every(c => c.checked);
            selectAllCb.checked = allChecked;
            updateDeleteBtn();
        }
    };

    // Event Delegation for Check-in Logic
    tbody.onclick = async (e) => {
        const btn = e.target.closest('.checkin-btn');
        if (btn) {
            const id = btn.dataset.id;
            const user = state.usersData.find(u => u.id === id);
            if (user && user.checked_in) return;
            try {
                await updateDoc(doc(db, "registrations", id), { checked_in: true, check_in_time: new Date() });
                loadUsers(); // Refresh table
            } catch (error) {
                console.error("Error checking in user", error);
            }
        }
    };
}

function updatePrFilterDropdown() {
    const prSelect = document.getElementById("filter-pr");
    if (!prSelect) return;
    
    const currentSelection = prSelect.value;
    const uniquePrs = [...new Set(state.usersData.map(u => (u.invited_by || "").trim()).filter(Boolean))].sort();
    
    prSelect.innerHTML = '<option value="all">TUTTE</option>';
    uniquePrs.forEach(pr => {
        const opt = document.createElement("option");
        opt.value = pr.toLowerCase();
        opt.textContent = pr.toUpperCase();
        if (pr.toLowerCase() === currentSelection.toLowerCase()) {
            opt.selected = true;
        }
        prSelect.appendChild(opt);
    });
}

export function initGuests() {
    setupSortableHeaders(document.querySelector(".users-table thead"), state.sort, renderTable);

    // --- SEARCH & FILTER LOGIC ---
    let searchTimeout;
    if (searchInput) {
        searchInput.addEventListener("input", () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                renderTable();
            }, 350);
        });
    }

    const filterBtn = document.getElementById("filter-btn");
    const filterPanel = document.getElementById("filter-panel");
    if (filterBtn && filterPanel) {
        filterBtn.addEventListener("click", () => {
            if (filterPanel.classList.contains("hidden")) {
                filterPanel.classList.remove("hidden");
                filterBtn.querySelector("span:last-child").textContent = "▲";
            } else {
                filterPanel.classList.add("hidden");
                filterBtn.querySelector("span:last-child").textContent = "▼";
            }
        });
    }

    ["filter-ticket", "filter-presence", "filter-pr"].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("change", () => {
                renderTable();
            });
        }
    });

    const exportCsvBtn = document.getElementById("export-csv-btn");
    exportCsvBtn.addEventListener("click", () => {
        if (state.usersData.length === 0) return;
        try {
            let csvContent = "Nome,Email,PR,Data Richiesta,Stato Ingresso,Orario Ingresso\n";
            state.usersData.forEach(user => {
                const time = user.timestamp.toLocaleString('it-IT').replace(/,/g, '');
                const status = user.checked_in ? "Entrato" : "Non Entrato";
                const inTime = user.check_in_time ? user.check_in_time.toLocaleTimeString('it-IT') : "";
                const pr = user.invited_by ? user.invited_by.toUpperCase() : "";
                csvContent += `"${user.name}","${user.email}","${pr}","${time}","${status}","${inTime}"\n`;
            });
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "dlbp_iscritti.csv";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (err) {
            console.error("Error exporting CSV:", err);
            alert("Errore durante l'esportazione CSV.");
        }
    });
}
