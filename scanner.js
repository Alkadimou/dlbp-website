import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc, collection, query, where, getCountFromServer, getDocs, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

let db;
try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
} catch (e) {
    console.error("Firebase init error", e);
}

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
    const SECRET_HASH = "871c074e5911bd5418aa264ca0b0b0e09705189f84ce28d415d1fad0dcadda15"; // Hash of "dlbpscan"

    async function hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    if (sessionStorage.getItem("dlbp_scanner_auth") === "true") {
        loginSection.style.display = "none";
        scannerSection.style.display = "block";
        startScanner();
    }

    loginBtn.addEventListener("click", async () => {
        const pwd = passwordInput.value;
        const hashedInput = await hashPassword(pwd);

        if (hashedInput === SECRET_HASH) { 
            sessionStorage.setItem("dlbp_scanner_auth", "true");
            loginSection.style.display = "none";
            scannerSection.style.display = "block";
            startScanner();
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

    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            sessionStorage.removeItem("dlbp_scanner_auth");
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
    // Suoni di sistema base64 per evitare dipendenze esterne
    const audioSuccess = new Audio('data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq');
    const audioError = new Audio('data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq');
    
    // Fallback con AudioContext per bip dinamici se il base64 non viene supportato
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    function playBeep(frequency, type, duration) {
        if (!audioCtx) return;
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
    }
    function playSuccessSound() {
        try { audioSuccess.play(); } catch(e) { playBeep(880, 'sine', 0.2); }
    }
    function playErrorSound() {
        try { audioError.play(); } catch(e) { playBeep(300, 'sawtooth', 0.5); }
    }

    async function startScanner() {
        await loadActiveEvent();
        
        // Counter Live
        // Counter Live (Polling with getCountFromServer)
        if (unsubCounter) clearInterval(unsubCounter);
        const qCount = query(collection(db, "registrations"), where("eventId", "==", activeEventId), where("checked_in", "==", true));
        
        async function fetchScannerCount() {
            try {
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

    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe.toString()
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    let isProcessing = false;

    async function onScanSuccess(decodedText, decodedResult) {
        if (isProcessing) return;
        isProcessing = true;

        // Stop scanning temporarily
        if (html5QrcodeScanner) {
            html5QrcodeScanner.pause(true);
        }
        
        readerDiv.style.display = "none";
        statusBox.style.display = "block";
        statusBox.className = "status-box"; // reset
        statusTitle.textContent = "VERIFICA IN CORSO...";
        statusDetails.innerHTML = "Controllo nel database...";
        nextScanBtn.style.display = "none";

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
                            Il biglietto di <strong>${escapeHtml(userData.name)}</strong> è valido, ma il locale è pieno. Non è stato annullato.
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
                            Biglietto valido e annullato correttamente.<br><br>
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
    }

    function onScanFailure(error) {
        // handle scan failure, usually better to ignore and keep scanning
    }

    nextScanBtn.addEventListener("click", () => {
        isProcessing = false;
        statusBox.style.display = "none";
        readerDiv.style.display = "block";
        if (html5QrcodeScanner) {
            html5QrcodeScanner.resume();
        }
    });
});
