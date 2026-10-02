// Admin – pannello "CREA / MODIFICA EVENTO": carica i dati dell'evento selezionato nel form
// e nel riepilogo, salva le modifiche o crea un nuovo evento (collezione "events").
// La locandina viene compressa e salvata come immagine Base64 dentro il documento dell'evento.
import { db, collection, doc, getDoc, addDoc, updateDoc } from "../../core/firebase.js";
import { showModal } from "../../core/modal.js";
import { state } from "./state.js";
import { whileBusy } from "./busy.js";

const capacityInput = document.getElementById("capacity-input");
const capacityDisplay = document.getElementById("capacity-display");
const settingsPanel = document.getElementById("settings-modal");
const setActiveBtn = document.getElementById("set-active-btn");
const toggleListBtn = document.getElementById("toggle-list-btn");

// Capienza scritta nel form. 0 è valido: evento solo da vedere, senza iscrizioni.
// Se il campo è vuoto o non valido si usa 100.
function readCapacity() {
    const cap = parseInt(capacityInput.value, 10);
    return Number.isNaN(cap) || cap < 0 ? 100 : cap;
}

// Mette il pannello in modalità "modifica evento esistente".
export function setEditMode() {
    state.isCreatingNew = false;
    const title = document.getElementById('settings-panel-title');
    if (title) {
        title.textContent = "MODIFICA EVENTO ESISTENTE";
        title.style.color = "var(--accent-color)";
    }
    document.getElementById('save-content-btn').textContent = "SALVA DETTAGLI EVENTO";
}

export async function loadEventSettings() {
    if (!db || !state.currentEventId) return;
    const eventId = state.currentEventId;
    try {
        const eventSnap = await getDoc(doc(db, "events", eventId));
        // Nel frattempo è stato scelto un altro evento: questi dati sono vecchi
        if (eventId !== state.currentEventId) return;
        if (eventSnap.exists()) {
            const evData = eventSnap.data();

            document.getElementById('event-name-input').value = evData.name || "";
            document.getElementById('event-location-input').value = evData.location || "";
            document.getElementById('event-fee-input').value = evData.fee || "";
            document.getElementById('event-map-url-input').value = evData.mapUrl || "";
            document.getElementById('event-password-input').value = evData.password || "";
            document.getElementById('event-date-input').value = evData.dateIso || "";
            document.getElementById('event-start-time-input').value = evData.startTime || "";
            document.getElementById('event-end-time-input').value = evData.endTime || "";
            const cap = evData.maxCapacity ?? 100;
            capacityInput.value = cap;
            capacityDisplay.textContent = cap;
            state.maxCapacity = cap;
            
            const previewDiv = document.getElementById('current-flyer-preview');
            if (evData.flyerUrl) {
                previewDiv.innerHTML = `Flyer attuale:<br><img src="${evData.flyerUrl}" style="max-width: 150px; margin-top: 10px; border-radius: 8px;">`;
            } else {
                previewDiv.innerHTML = "Nessun flyer caricato.";
            }
            document.getElementById('flyer-input').value = "";
            document.getElementById('desc-input').value = evData.description || "";
            
            // Aggiorna lo stato visivo del pulsante "Rendi attivo"
            if (setActiveBtn) {
                if (evData.isActive) {
                    setActiveBtn.textContent = "RENDI INATTIVO";
                    setActiveBtn.style.borderColor = "rgba(255, 50, 50, 0.4)";
                    setActiveBtn.style.color = "rgba(255, 100, 100, 0.8)";
                } else {
                    setActiveBtn.textContent = "RENDI ATTIVO";
                    setActiveBtn.style.borderColor = "rgba(46, 204, 113, 0.4)";
                    setActiveBtn.style.color = "rgba(46, 204, 113, 0.9)";
                }
            }

            // Aggiorna lo stato visivo del pulsante "Apri/Chiudi lista"
            if (toggleListBtn) {
                if (evData.isOpen !== false) {
                    toggleListBtn.textContent = "CHIUDI LISTA";
                    toggleListBtn.style.borderColor = "rgba(255, 50, 50, 0.4)";
                    toggleListBtn.style.color = "rgba(255, 100, 100, 0.8)";
                } else {
                    toggleListBtn.textContent = "APRI LISTA";
                    toggleListBtn.style.borderColor = "rgba(46, 204, 113, 0.4)";
                    toggleListBtn.style.color = "rgba(46, 204, 113, 0.9)";
                }
            }
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

// onSaved: chiamata dopo un salvataggio riuscito (ricarica la lista degli eventi).
export function initEventForm({ onSaved }) {
    const editEventBtn = document.getElementById("edit-event-btn");
    const closeSettingsBtn = document.getElementById("close-settings-btn");
    const newEventBtn = document.getElementById("new-event-btn");
    const adminEventSelector = document.getElementById("admin-event-selector");

    if (editEventBtn && settingsPanel) {
        editEventBtn.addEventListener("click", whileBusy(editEventBtn, async () => {
            if (!state.currentEventId) {
                showModal("Nessun evento selezionato da modificare.");
                return;
            }
            setEditMode();
            // La finestra si apre subito; il salvataggio resta bloccato finché i dati non sono caricati
            const saveBtn = document.getElementById("save-content-btn");
            saveBtn.disabled = true;
            settingsPanel.classList.remove('hidden');
            document.body.classList.add('no-scroll');
            try {
                await loadEventSettings();
            } finally {
                saveBtn.disabled = false;
            }
        }));
    }

    if (closeSettingsBtn && settingsPanel) {
        closeSettingsBtn.addEventListener("click", () => {
            settingsPanel.classList.add('hidden');
            document.body.classList.remove('no-scroll');
        });
    }

    if (newEventBtn) {
        newEventBtn.addEventListener("click", () => {
            state.isCreatingNew = true;
            state.currentEventId = null;
            if (adminEventSelector) adminEventSelector.value = "";
            
            const title = document.getElementById('settings-panel-title');
            if (title) {
                title.textContent = "CREAZIONE NUOVO EVENTO";
                title.style.color = "var(--accent-color)";
            }
            settingsPanel.classList.remove('hidden');
            document.body.classList.add('no-scroll');
            document.getElementById('event-name-input').value = "";
            document.getElementById('event-location-input').value = "";
            document.getElementById('event-fee-input').value = "";
            document.getElementById('event-map-url-input').value = "";
            document.getElementById('event-password-input').value = "";
            document.getElementById('event-date-input').value = "";
            document.getElementById('event-start-time-input').value = "";
            document.getElementById('event-end-time-input').value = "";
            document.getElementById('desc-input').value = "";
            document.getElementById('flyer-input').value = "";
            document.getElementById('current-flyer-preview').innerHTML = "Nessun flyer caricato.";
            document.getElementById('save-content-btn').textContent = "CREA NUOVO EVENTO";
            
            document.getElementById('event-name-input').focus();
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
        // Quota partecipazione (testo libero, es. "15 €"): se è vuota la mail del biglietto scrive FREE ENTRY
        const fee = document.getElementById('event-fee-input').value.trim();
        // Link del bottone APRI LA MAPPA nella mail del biglietto: se è vuoto si cerca l'indirizzo su Google Maps
        const mapUrl = document.getElementById('event-map-url-input').value.trim();
        const dateIso = document.getElementById('event-date-input').value;
        const startTime = document.getElementById('event-start-time-input').value;
        const endTime = document.getElementById('event-end-time-input').value;

        if (mapUrl && !/^https:\/\/\S+$/.test(mapUrl)) {
            showModal("Il link di Google Maps deve iniziare con https:// (copialo da Condividi → Copia link in Google Maps).");
            btn.textContent = originalText;
            btn.disabled = false;
            return;
        }

        if (!dateIso || !startTime || !endTime) {
            showModal("Compila correttamente la Data, l'Ora di Inizio e l'Ora di Fine dell'evento prima di salvare.");
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
                    showModal("L'immagine è troppo grande anche dopo la compressione. Scegli un'immagine più leggera.");
                    return;
                }
            }
            
            if (state.isCreatingNew) {
                const newEventRef = await addDoc(collection(db, "events"), {
                    name: name || "Nuovo Evento",
                    date: formattedDate,
                    dateIso: dateIso,
                    startTime: startTime,
                    endTime: endTime,
                    location: location,
                    fee: fee,
                    mapUrl: mapUrl,
                    password: document.getElementById('event-password-input').value.trim(),
                    flyerUrl: flyerUrl || "",
                    description: description || "",
                    maxCapacity: readCapacity(),
                    isOpen: true,
                    isActive: false,
                    createdAt: new Date()
                });
                state.currentEventId = newEventRef.id;
                state.isCreatingNew = false;
                
                const title = document.getElementById('settings-panel-title');
                if (title) {
                    title.textContent = "MODIFICA EVENTO ESISTENTE";
                    title.style.color = "var(--accent-color)";
                }
                
                await onSaved();
                showModal("Nuovo evento creato con successo!");
            } else {
                const cap = readCapacity();
                
                const updates = {
                    name: name,
                    location: location,
                    fee: fee,
                    mapUrl: mapUrl,
                    password: document.getElementById('event-password-input').value.trim(),
                    dateIso: dateIso,
                    date: formattedDate,
                    startTime: startTime,
                    endTime: endTime,
                    description: description,
                    maxCapacity: cap
                };
                if (flyerUrl) updates.flyerUrl = flyerUrl;
                
                await updateDoc(doc(db, "events", state.currentEventId), updates);
                capacityDisplay.textContent = cap;
                state.maxCapacity = cap;
                await onSaved();
                showModal("Dettagli evento salvati con successo!");
            }
            
            // Close the panel after saving
            if (settingsPanel) settingsPanel.classList.add('hidden');

            if (flyerUrl) {
                document.getElementById('current-flyer-preview').innerHTML = `Flyer attuale:<br><img src="${flyerUrl}" style="max-width: 150px; margin-top: 10px; border-radius: 8px;">`;
                fileInput.value = "";
            }
        } catch (error) {
            console.error("Error saving content:", error);
            showModal("Errore durante il salvataggio.");
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    });
}
