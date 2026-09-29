// Admin – gestione degli eventi: menu a tendina per scegliere l'evento, "RENDI ATTIVO/INATTIVO"
// (l'evento attivo è quello mostrato al pubblico e usato da scanner e PR), "APRI/CHIUDI LISTA"
// (iscrizioni aperte o chiuse) ed eliminazione di un evento con tutti i suoi iscritti.
import { db, collection, doc, query, where, getDoc, getDocs, getCountFromServer, setDoc, updateDoc, deleteDoc, writeBatch } from "../../core/firebase.js";
import { showModal, showConfirm } from "../../core/modal.js";
import { toMillis } from "../../core/dates.js";
import { state } from "./state.js";
import { whileBusy } from "./busy.js";
import { loadEventSettings, setEditMode } from "./event-form.js";
import { loadUsers } from "./guests.js";

const adminEventSelector = document.getElementById("admin-event-selector");

// Migrazione una tantum: se non esiste nessun evento, crea "act_1" dalle vecchie impostazioni
// (settings/config) e gli assegna le registrazioni senza eventId.
export async function setupEventsIfNeeded() {
    if (!db) return;
    try {
        // Conta gli eventi senza scaricarli (con le locandine): la lista vera la carica loadEventsList
        const countSnap = await getCountFromServer(collection(db, "events"));
        if (countSnap.data().count === 0) {
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

export async function loadEventsList() {
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
            const dateA = toMillis(a.createdAt);
            const dateB = toMillis(b.createdAt);
            return dateB - dateA;
        });

        const fragment = document.createDocumentFragment();
        eventsArray.forEach(ev => {
            const option = document.createElement("option");
            option.value = ev.id;
            option.textContent = ev.name + " (" + ev.date + ")" + (ev.isActive ? " [ATTIVO ONLINE]" : "");
            fragment.appendChild(option);
        });
        adminEventSelector.appendChild(fragment);

        if (!state.currentEventId) {
            let activeEv = eventsArray.find(e => e.isActive);
            if (activeEv) {
                state.currentEventId = activeEv.id;
            } else if (eventsArray.length > 0) {
                state.currentEventId = eventsArray[0].id;
            }
        }

        if (state.currentEventId) {
            adminEventSelector.value = state.currentEventId;
            await loadEventSettings();
            await loadUsers();
        }
    } catch (error) {
        console.error("Error loading events list:", error);
    }
}

export function initEvents() {
    const setActiveBtn = document.getElementById("set-active-btn");
    const toggleListBtn = document.getElementById("toggle-list-btn");
    const deleteEventBtn = document.getElementById("delete-event-btn");

    if (adminEventSelector) {
        adminEventSelector.addEventListener("change", (e) => {
            state.currentEventId = e.target.value;
            setEditMode();
            loadEventSettings();
            loadUsers();
        });
    }

    if (setActiveBtn) {
        setActiveBtn.addEventListener("click", whileBusy(setActiveBtn, async () => {
            if (!state.currentEventId) return;
            // L'evento resta quello di quando si è cliccato, anche se nel frattempo si cambia menu
            const eventId = state.currentEventId;

            try {
                const currentDoc = await getDoc(doc(db, "events", eventId));
                if (!currentDoc.exists()) return;
                
                const evData = currentDoc.data();
                const nowActive = evData.isActive || false;
                
                if (nowActive) {
                    if (!await showConfirm("Vuoi impostare questo evento come NON ATTIVO? Non sarà più visibile tra gli eventi attivi.")) return;
                    await updateDoc(doc(db, "events", eventId), { isActive: false });
                    showModal("Evento disattivato con successo!");
                } else {
                    if (!await showConfirm("Vuoi impostare questo evento come ATTIVO ONLINE?")) return;
                    await updateDoc(doc(db, "events", eventId), { isActive: true });
                    showModal("Evento impostato come ATTIVO ONLINE!");
                }
                
                await loadEventSettings();
                await loadEventsList();
            } catch (error) {
                console.error("Error setting active event:", error);
                showModal("Errore durante l'operazione.");
            }
        }));
    }

    // Apre o chiude le iscrizioni (lista) dell'evento selezionato
    if (toggleListBtn) {
        toggleListBtn.addEventListener("click", whileBusy(toggleListBtn, async () => {
            if (!state.currentEventId) return;
            const eventId = state.currentEventId;

            try {
                const currentDoc = await getDoc(doc(db, "events", eventId));
                if (!currentDoc.exists()) return;

                const isOpen = currentDoc.data().isOpen !== false;

                if (isOpen) {
                    if (!await showConfirm("Vuoi CHIUDERE la lista? Nessuno potrà più iscriversi a questo evento.")) return;
                    await updateDoc(doc(db, "events", eventId), { isOpen: false });
                    showModal("Lista chiusa!");
                } else {
                    if (!await showConfirm("Vuoi RIAPRIRE la lista? Le persone potranno di nuovo iscriversi.")) return;
                    await updateDoc(doc(db, "events", eventId), { isOpen: true });
                    showModal("Lista aperta!");
                }

                await loadEventSettings();
            } catch (error) {
                console.error("Error toggling list:", error);
                showModal("Errore durante l'operazione.");
            }
        }));
    }

    if (deleteEventBtn) {
        deleteEventBtn.addEventListener('click', whileBusy(deleteEventBtn, async () => {
            if (!state.currentEventId || state.isCreatingNew) return;
            // Si elimina l'evento selezionato al momento del clic, anche se poi si cambia menu
            const eventId = state.currentEventId;

            const confirmDelete = await showConfirm("⚠️ ATTENZIONE: Sei sicuro di voler eliminare definitivamente questo evento e tutti i suoi iscritti? L'azione è irreversibile.");
            if (!confirmDelete) return;

            deleteEventBtn.textContent = "ELIMINAZIONE...";
            deleteEventBtn.disabled = true;

            try {
                // Delete registrations associated with this event
                const q = query(collection(db, "registrations"), where("eventId", "==", eventId));
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
                await deleteDoc(doc(db, "events", eventId));
                
                showModal("Evento e iscritti eliminati con successo!");
                window.location.reload(); 
            } catch (error) {
                console.error("Errore durante l'eliminazione:", error);
                showModal("Si è verificato un errore durante l'eliminazione.");
                deleteEventBtn.textContent = "ELIMINA";
                deleteEventBtn.disabled = false;
            }
        }));
    }
}
