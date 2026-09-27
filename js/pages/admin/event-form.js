// Admin – pannello "CREA / MODIFICA EVENTO": carica i dati dell'evento selezionato nel form
// e nel riepilogo, salva le modifiche o crea un nuovo evento (collezione "events").
// La locandina viene compressa e salvata come immagine Base64 dentro il documento dell'evento.
import { db, collection, doc, getDoc, addDoc, updateDoc } from "../../core/firebase.js";
import { showModal } from "../../core/modal.js";
import { state } from "./state.js";

const listToggle = document.getElementById("list-toggle");
const capacityInput = document.getElementById("capacity-input");
const capacityDisplay = document.getElementById("capacity-display");
const settingsPanel = document.getElementById("settings-modal");
const setActiveBtn = document.getElementById("set-active-btn");

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
    try {
        const eventSnap = await getDoc(doc(db, "events", state.currentEventId));
        if (eventSnap.exists()) {
            const evData = eventSnap.data();
            
            const summaryTitle = document.getElementById("summary-event-title");
            const summaryDate = document.getElementById("summary-event-date");
            if (summaryTitle) summaryTitle.textContent = evData.name || "NOME EVENTO";
            if (summaryDate) {
                if (evData.dateIso) {
                    const dateObj = new Date(evData.dateIso);
                    const dateStr = isNaN(dateObj) ? evData.dateIso : dateObj.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                    summaryDate.innerHTML = `<i class="fas fa-calendar-alt"></i> ${dateStr}`;
                } else {
                    summaryDate.innerHTML = `<i class="fas fa-calendar-alt"></i> Data non definita`;
                }
            }
            
            document.getElementById('event-name-input').value = evData.name || "";
            document.getElementById('event-location-input').value = evData.location || "";
            document.getElementById('event-password-input').value = evData.password || "";
            document.getElementById('event-date-input').value = evData.dateIso || "";
            document.getElementById('event-start-time-input').value = evData.startTime || "";
            document.getElementById('event-end-time-input').value = evData.endTime || "";
            listToggle.checked = evData.isOpen !== false; // default true
            capacityInput.value = evData.maxCapacity || 100;
            capacityDisplay.textContent = evData.maxCapacity || 100;
            state.maxCapacity = evData.maxCapacity || 100;
            
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
        editEventBtn.addEventListener("click", async () => {
            if (!state.currentEventId) {
                showModal("Nessun evento selezionato da modificare.");
                return;
            }
            setEditMode();
            await loadEventSettings();
            
            settingsPanel.classList.remove('hidden');
            document.body.classList.add('no-scroll');
        });
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
        const dateIso = document.getElementById('event-date-input').value;
        const startTime = document.getElementById('event-start-time-input').value;
        const endTime = document.getElementById('event-end-time-input').value;

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
                    password: document.getElementById('event-password-input').value.trim(),
                    flyerUrl: flyerUrl || "",
                    description: description || "",
                    maxCapacity: parseInt(document.getElementById('capacity-input').value) || 100,
                    isOpen: document.getElementById('list-toggle').checked,
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
                const cap = parseInt(document.getElementById('capacity-input').value) || 100;
                const isOpen = document.getElementById('list-toggle').checked;
                
                const updates = {
                    name: name,
                    location: location,
                    password: document.getElementById('event-password-input').value.trim(),
                    dateIso: dateIso,
                    date: formattedDate,
                    startTime: startTime,
                    endTime: endTime,
                    description: description,
                    maxCapacity: cap,
                    isOpen: isOpen
                };
                if (flyerUrl) updates.flyerUrl = flyerUrl;
                
                await updateDoc(doc(db, "events", state.currentEventId), updates);
                capacityDisplay.textContent = cap;
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
