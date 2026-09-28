// Admin – finestra "DETTAGLI": mostra in sola lettura i dati dell'evento selezionato.
import { db, doc, getDoc } from "../../core/firebase.js";
import { showModal } from "../../core/modal.js";
import { state } from "./state.js";

async function loadDetails() {
    if (!db || !state.currentEventId) return;
    try {
        const eventSnap = await getDoc(doc(db, "events", state.currentEventId));
        if (eventSnap.exists()) {
            const evData = eventSnap.data();
            document.getElementById('details-event-name').textContent = evData.name || "NOME NON DEFINITO";
            document.getElementById('details-event-location').textContent = evData.location || "SECRET LOCATION";

            const dateObj = evData.dateIso ? new Date(evData.dateIso) : null;
            const dateStr = !dateObj || isNaN(dateObj) ? (evData.dateIso || "Data non definita") : dateObj.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            document.getElementById('details-event-date').textContent = dateStr;

            document.getElementById('details-event-start').textContent = evData.startTime || "--:--";
            document.getElementById('details-event-end').textContent = evData.endTime || "--:--";
            document.getElementById('details-event-status').innerHTML = evData.isOpen !== false ? '<span style="color:var(--success-color);">APERTE</span>' : '<span style="color:var(--error-color);">CHIUSE</span>';
            document.getElementById('details-event-capacity').textContent = evData.maxCapacity === 0 ? "0 (SOLO VISIBILE, SENZA ISCRIZIONI)" : (evData.maxCapacity || "100");

            const img = document.getElementById('details-event-flyer-img');
            const noneSpan = document.getElementById('details-event-flyer-none');
            if (evData.flyerUrl) {
                img.src = evData.flyerUrl;
                img.classList.remove("hidden");
                noneSpan.classList.add("hidden");
            } else {
                img.src = '';
                img.classList.add("hidden");
                noneSpan.classList.remove("hidden");
            }

            document.getElementById('details-event-desc').textContent = evData.description || "Nessuna descrizione definita.";
        }
    } catch (error) {
        console.error("Errore caricamento dettagli:", error);
    }
}

export function initEventDetails() {
    const viewEventBtn = document.getElementById("view-event-btn");
    const detailsModal = document.getElementById("details-modal");
    const closeDetailsBtn = document.getElementById("close-details-btn");

    if (viewEventBtn && detailsModal) {
        viewEventBtn.addEventListener("click", async () => {
            if (!state.currentEventId) {
                showModal("Nessun evento selezionato da visualizzare.");
                return;
            }
            await loadDetails();
            detailsModal.classList.remove('hidden');
            document.body.classList.add('no-scroll');
        });
    }

    if (closeDetailsBtn && detailsModal) {
        closeDetailsBtn.addEventListener("click", () => {
            detailsModal.classList.add('hidden');
            document.body.classList.remove('no-scroll');
        });
    }
}
