// Admin – azioni sugli iscritti selezionati: eliminazione definitiva e invio dell'email
// con location segreta e QR code del biglietto (EmailJS, template "ticket_confirm").
// Il biglietto parte già da solo all'iscrizione: qui serve per reinviarlo o per chi non l'ha ricevuto.
import { db, doc, getDoc, updateDoc, writeBatch } from "../../core/firebase.js";
import { sendTicketEmail } from "../../core/email.js";
import { showModal, showConfirm } from "../../core/modal.js";
import { state } from "./state.js";
import { loadUsers, getSelectedGuestIds } from "./guests.js";

export function initGuestActions() {
    const adminMessage = document.getElementById("admin-message");
    const deleteSelectedBtn = document.getElementById("delete-selected-btn");

    // --- DELETE LOGIC ---
    deleteSelectedBtn.addEventListener("click", async () => {
        const selectedIds = getSelectedGuestIds();
        if (selectedIds.length === 0) return;

        if (!await showConfirm(`Sei sicuro di voler eliminare definitivamente ${selectedIds.length} iscritti? Questa azione è irreversibile.`)) {
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
        const selectedIds = getSelectedGuestIds();
        if (selectedIds.length === 0) {
            showModal("Seleziona almeno un iscritto a cui inviare gli accessi.");
            return;
        }

        if (!await showConfirm(`Stai per inviare la location segreta a ${selectedIds.length} iscritti selezionati. Procedere?`)) {
            return;
        }

        sendEmailsBtn.disabled = true;
        sendEmailsBtn.textContent = "INVIO IN CORSO...";
        adminMessage.className = "form-message hidden";

        try {

        let eventData = {};
        try {
            const eventSnap = await getDoc(doc(db, "events", state.currentEventId));
            if (eventSnap.exists()) {
                eventData = eventSnap.data();
            }
        } catch(e) {
            console.error("Failed to fetch event data", e);
        }

        let successCount = 0;
        let failCount = 0;

        const selectedUsers = state.usersData.filter(user => selectedIds.includes(user.id));

        for (const user of selectedUsers) {
            try {
                await sendTicketEmail(user, eventData);
                await updateDoc(doc(db, "registrations", user.id), { email_sent: true });
                successCount++;
            } catch (error) {
                console.error(`Failed to send email to ${user.email}:`, error);
                failCount++;
            }
        }

        sendEmailsBtn.disabled = false;
        sendEmailsBtn.textContent = "INVIA ACCESSI";
        
        adminMessage.textContent = `Operazione completata. Inviate: ${successCount}. Fallite: ${failCount}.`;
        adminMessage.className = "form-message success";
        setTimeout(() => {
            adminMessage.className = "form-message hidden";
        }, 5000);
        
        loadUsers();
        } catch (err) {
            console.error("Error in email sending process:", err);
            showModal("Errore imprevisto durante l'invio delle email.");
            sendEmailsBtn.disabled = false;
            sendEmailsBtn.textContent = "INVIA ACCESSI";
        }
    });
    }
}
