// Admin – finestra "STATISTICHE": conta iscritti, approvati, in attesa e presenti dell'evento
// selezionato e prepara i dati per i grafici (iscrizioni per giorno, ingressi per mezz'ora).
import { db, collection, query, where, getDocs } from "../../core/firebase.js";
import { showModal } from "../../core/modal.js";
import { state } from "./state.js";
import { renderAnalyticsCharts } from "./charts.js";

const analyticsLoading = document.getElementById("analytics-loading-placeholder");
const analyticsBody = document.getElementById("analytics-modal-body");

async function loadAnalyticsData() {
    if (!db || !state.currentEventId) return;
    analyticsLoading.classList.remove("hidden");
    analyticsBody.classList.add("hidden");
    
    try {
        const q = query(collection(db, "registrations"), where("eventId", "==", state.currentEventId));
        const querySnapshot = await getDocs(q);
        
        let total = 0;
        let approved = 0;
        let pending = 0;
        let present = 0;
        
        const datesMap = {};
        const trafficMap = {};

        querySnapshot.forEach(docSnap => {
            const user = docSnap.data();
            total++;
            if (user.status === "approved") approved++;
            if (user.status === "pending") pending++;
            if (user.checked_in) present++;

            if (user.timestamp) {
                const dateObj = user.timestamp.toDate();
                const dateStr = dateObj.toISOString().split('T')[0];
                datesMap[dateStr] = (datesMap[dateStr] || 0) + 1;
            }

            if (user.checked_in && user.check_in_time) {
                const timeObj = user.check_in_time.toDate();
                let min = timeObj.getMinutes();
                min = min < 30 ? "00" : "30";
                const bucket = `${timeObj.getHours().toString().padStart(2, '0')}:${min}`;
                trafficMap[bucket] = (trafficMap[bucket] || 0) + 1;
            }
        });

        // Update UI Counters
        document.getElementById("stat-total").textContent = total;
        document.getElementById("stat-approved").textContent = approved;
        document.getElementById("stat-pending").textContent = pending;
        document.getElementById("stat-present").textContent = present;

        // Render Charts
        renderAnalyticsCharts(datesMap, approved, pending, present, trafficMap);

        analyticsLoading.classList.add("hidden");
        analyticsBody.classList.remove("hidden");
    } catch (error) {
        console.error("Errore caricamento dati analytics:", error);
        showModal("Errore nel caricamento dei dati delle statistiche.");
        analyticsLoading.classList.add("hidden");
    }
}

export function initAnalytics() {
    const analyticsBtn = document.getElementById("analytics-btn");
    const analyticsModal = document.getElementById("analytics-modal");
    const closeAnalyticsBtn = document.getElementById("close-analytics-btn");

    if (analyticsBtn && analyticsModal) {
        analyticsBtn.addEventListener("click", async () => {
            if (!state.currentEventId) {
                showModal("Nessun evento selezionato di cui visualizzare le statistiche.");
                return;
            }
            analyticsModal.classList.remove('hidden');
            document.body.classList.add('no-scroll');
            await loadAnalyticsData();
        });
    }

    if (closeAnalyticsBtn && analyticsModal) {
        closeAnalyticsBtn.addEventListener("click", () => {
            analyticsModal.classList.add('hidden');
            document.body.classList.remove('no-scroll');
        });
    }
}
