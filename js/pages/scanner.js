// Pagina scanner.html: legge i QR code dei biglietti con la fotocamera e segna l'ingresso
// (registrations/{id}.checked_in). Controlla evento giusto, approvazione, doppio ingresso e capienza.
// Accesso: account staff con ruolo "scanner" o "admin".
import { db, doc, getDoc, updateDoc, collection, query, where, getCountFromServer, getDocs } from "../core/firebase.js";
import { auth, signOut } from "../core/firebase-auth.js";
import { setupStaffLogin } from "../core/staff-login.js";
import { escapeHtml } from "../core/html.js";
import { initStaffMenu } from "../core/nav.js";

initStaffMenu();

document.addEventListener("DOMContentLoaded", () => {
    const loginSection = document.getElementById("login-section");
    const scannerSection = document.getElementById("scanner-section");
    const loginBtn = document.getElementById("login-btn");
    const passwordInput = document.getElementById("scanner-password");
    const loginMessage = document.getElementById("login-message");
    
    const statusBox = document.getElementById("status-box");
    const statusTitle = document.getElementById("status-title");
    const statusDetails = document.getElementById("status-details");
    const nextScanBtn = document.getElementById("next-scan-btn");
    const readerDiv = document.getElementById("reader");

    let html5QrcodeScanner;
    let unsubCounter = null;

    // --- LOGIN LOGIC ---
    let scannerStarted = false;
    setupStaffLogin({
        emailInput: document.getElementById("scanner-email"),
        passwordInput,
        loginBtn,
        loginMessage,
        isAllowed: (profile) => profile.role === "scanner" || profile.role === "admin",
        deniedMessage: "Account non abilitato allo scanner.",
        loginErrorMessage: "Accesso negato.",
        onSignedIn: () => {
            loginSection.classList.add("hidden");
            scannerSection.classList.remove("hidden");
            if (!scannerStarted) {
                scannerStarted = true;
                startScanner();
            }
        },
        onSignedOut: () => {
            loginSection.classList.remove("hidden");
            scannerSection.classList.add("hidden");
        }
    });

    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            await signOut(auth);
            window.location.href = "scanner.html";
        });
    }

    let activeEventId = null;
    let activeEventData = null;

    async function loadActiveEvent() {
        if (!db) return;
        try {
            const q = query(collection(db, "events"), where("isActive", "==", true));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const eventDoc = querySnapshot.docs[0];
                activeEventId = eventDoc.id;
                activeEventData = eventDoc.data();
            } else {
                activeEventId = "act_1"; // fallback for migration
                activeEventData = { maxCapacity: 100 };
            }
        } catch (error) {
            console.error("Error loading active event:", error);
        }
    }

    // --- SCANNER LOGIC ---
    // Suoni generati dal telefono (Web Audio): bip acuto = ingresso ok, suono grave = errore.
    // Se il telefono è in modalità silenziosa il suono non si sente.
    let audioCtx = null;
    // I browser tengono l'audio spento finché non si tocca la pagina: lo accendiamo al primo tocco
    // (login, avvio della fotocamera, PROSSIMO BIGLIETTO...).
    function unlockAudio() {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        if (!audioCtx) audioCtx = new AudioCtx();
        if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    }
    document.addEventListener("click", unlockAudio);
    document.addEventListener("touchend", unlockAudio);

    function playBeep(frequency, type, duration) {
        if (!audioCtx) return;
        try {
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.type = type;
            oscillator.frequency.value = frequency;
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + duration);
        } catch (e) {
            console.error("Beep error:", e);
        }
    }
    function playSuccessSound() {
        playBeep(880, 'sine', 0.2);
    }
    function playErrorSound() {
        playBeep(300, 'sawtooth', 0.5);
    }

    // Contatore degli ingressi dell'evento attivo (ogni 30 secondi e dopo ogni scansione)
    async function fetchScannerCount() {
        try {
            const qCount = query(collection(db, "registrations"), where("eventId", "==", activeEventId), where("checked_in", "==", true));
            const snapshot = await getCountFromServer(qCount);
            const count = snapshot.data().count;
            const max = activeEventData ? activeEventData.maxCapacity || 100 : 100;
            const counterDiv = document.getElementById('live-counter');
            if (counterDiv) {
                counterDiv.innerHTML = `INGRESSI: <span style="color: ${count >= max ? 'var(--error-color)' : '#fff'}">${count}</span> / ${max}`;
            }
        } catch (e) {
            console.error("Scanner counter update error:", e);
        }
    }

    async function startScanner() {
        await loadActiveEvent();

        if (unsubCounter) clearInterval(unsubCounter);
        fetchScannerCount();
        unsubCounter = setInterval(fetchScannerCount, 30000);
        
        // Initialize HTML5 QR Code Scanner
        html5QrcodeScanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: {width: 250, height: 250} },
            /* verbose= */ false
        );
        html5QrcodeScanner.render(onScanSuccess, onScanFailure);
    }

    let isProcessing = false;

    async function onScanSuccess(decodedText, decodedResult) {
        if (isProcessing) return;
        isProcessing = true;

        // Stop scanning temporarily
        if (html5QrcodeScanner) {
            html5QrcodeScanner.pause(true);
        }
        
        readerDiv.classList.add("hidden");
        statusBox.classList.remove("hidden");
        statusBox.className = "status-box"; // reset
        statusTitle.textContent = "VERIFICA IN CORSO...";
        statusDetails.innerHTML = "Controllo nel database...";
        nextScanBtn.classList.add("hidden");

        try {
            const ticketId = decodedText.trim();
            const docRef = doc(db, "registrations", ticketId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const userData = docSnap.data();
                
                if (userData.eventId && activeEventId && userData.eventId !== activeEventId) {
                    playErrorSound();
                    statusBox.classList.add("status-error");
                    statusTitle.textContent = "EVENTO ERRATO";
                    statusDetails.innerHTML = `
                        <strong>Attenzione:</strong> Questo biglietto appartiene a un altro evento.<br><br>
                        Nome: ${escapeHtml(userData.name)}<br>
                        Email: ${escapeHtml(userData.email)}
                    `;
                } else if (userData.status !== "approved") {
                    // Not approved
                    playErrorSound();
                    statusBox.classList.add("status-error");
                    statusTitle.textContent = "NON APPROVATO";
                    statusDetails.innerHTML = `
                        <strong>Attenzione:</strong> Questo utente non è stato ancora approvato.<br><br>
                        Nome: ${escapeHtml(userData.name)}<br>
                        Email: ${escapeHtml(userData.email)}
                    `;
                } else if (userData.checked_in === true) {
                    // Already checked in
                    playErrorSound();
                    statusBox.classList.add("status-error");
                    statusTitle.textContent = "SCANSIONATO";
                    statusDetails.innerHTML = `
                        <strong>Attenzione:</strong> Questo biglietto è già stato utilizzato.<br><br>
                        Nome: ${escapeHtml(userData.name)}<br>
                        Email: ${escapeHtml(userData.email)}
                    `;
                } else {
                    // Check capacity before allowing
                    let capacityExceeded = false;
                    try {
                        if (activeEventData) {
                            const maxCap = activeEventData.maxCapacity || 100;
                            const q = query(collection(db, "registrations"), where("eventId", "==", activeEventId), where("checked_in", "==", true));
                            const countSnap = await getCountFromServer(q);
                            if (countSnap.data().count >= maxCap) {
                                capacityExceeded = true;
                            }
                        }
                    } catch (e) { console.error("Capacity check error:", e); }

                    if (capacityExceeded) {
                        playErrorSound();
                        statusBox.classList.add("status-error");
                        statusTitle.textContent = "LOCALE PIENO";
                        statusDetails.innerHTML = `
                            <strong>Attenzione:</strong> Capienza massima raggiunta!<br><br>
                            Il biglietto di <strong>${escapeHtml(userData.name)}</strong> è valido, ma il locale è pieno. L'ingresso non è stato registrato: il biglietto resta valido.
                        `;
                    } else {
                        // Valid, not checked in, and capacity not exceeded
                        await updateDoc(docRef, {
                            checked_in: true,
                            check_in_time: new Date()
                        });

                        playSuccessSound();
                        statusBox.classList.add("status-success");
                        statusTitle.textContent = "ACCESSO CONSENTITO";
                        statusDetails.innerHTML = `
                            Biglietto valido: può entrare.<br>Ingresso registrato.<br><br>
                            <strong>Nome:</strong> ${escapeHtml(userData.name)}<br>
                            <strong>Email:</strong> ${escapeHtml(userData.email)}
                        `;
                    }
                }
            } else {
                // Document not found
                playErrorSound();
                statusBox.classList.add("status-error");
                statusTitle.textContent = "BIGLIETTO NON VALIDO";
                statusDetails.innerHTML = "Questo codice QR non esiste nel database.";
            }
        } catch (error) {
            console.error("Error verifying ticket:", error);
            playErrorSound();
            statusBox.classList.add("status-error");
            statusTitle.textContent = "ERRORE DI SISTEMA";
            statusDetails.innerHTML = "Impossibile contattare il database. Riprova.";
        }

        // Esito mostrato: il bottone "PROSSIMO BIGLIETTO" riattiva la fotocamera
        nextScanBtn.classList.remove("hidden");
        fetchScannerCount();
    }

    function onScanFailure(error) {
        // handle scan failure, usually better to ignore and keep scanning
    }

    nextScanBtn.addEventListener("click", () => {
        isProcessing = false;
        statusBox.classList.add("hidden");
        readerDiv.classList.remove("hidden");
        if (html5QrcodeScanner) {
            html5QrcodeScanner.resume();
        }
    });
});
