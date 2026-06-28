import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
    const passwordInput = document.getElementById("admin-password");
    const loginMessage = document.getElementById("login-message");
    
    const statusBox = document.getElementById("status-box");
    const statusTitle = document.getElementById("status-title");
    const statusDetails = document.getElementById("status-details");
    const nextScanBtn = document.getElementById("next-scan-btn");
    const readerDiv = document.getElementById("reader");

    let html5QrcodeScanner;

    // --- LOGIN LOGIC ---
    if (sessionStorage.getItem("dlbp_admin_auth") === "true") {
        loginSection.style.display = "none";
        scannerSection.style.display = "block";
        startScanner();
    }

    loginBtn.addEventListener("click", () => {
        if (passwordInput.value === "dlbp2024") { 
            sessionStorage.setItem("dlbp_admin_auth", "true");
            loginSection.style.display = "none";
            scannerSection.style.display = "block";
            startScanner();
        } else {
            loginMessage.textContent = "Accesso negato.";
            loginMessage.className = "form-message error";
        }
    });

    // --- SCANNER LOGIC ---
    function startScanner() {
        // Initialize HTML5 QR Code Scanner
        html5QrcodeScanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: {width: 250, height: 250} },
            /* verbose= */ false
        );
        html5QrcodeScanner.render(onScanSuccess, onScanFailure);
    }

    async function onScanSuccess(decodedText, decodedResult) {
        // Stop scanning temporarily
        if (html5QrcodeScanner) {
            html5QrcodeScanner.pause(true);
        }
        
        readerDiv.style.display = "none";
        statusBox.style.display = "block";
        statusBox.className = "status-box"; // reset
        statusTitle.textContent = "VERIFICA IN CORSO...";
        statusDetails.innerHTML = "Controllo nel database...";

        try {
            const ticketId = decodedText.trim();
            const docRef = doc(db, "registrations", ticketId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const userData = docSnap.data();
                
                if (userData.checked_in === true) {
                    // Already checked in
                    statusBox.classList.add("status-error");
                    statusTitle.textContent = "SCANSIONATO";
                    statusDetails.innerHTML = `
                        <strong>Attenzione:</strong> Questo biglietto è già stato utilizzato.<br><br>
                        Nome: ${userData.name}<br>
                        Email: ${userData.email}
                    `;
                } else {
                    // Valid and not checked in - update database
                    await updateDoc(docRef, {
                        checked_in: true,
                        check_in_time: new Date()
                    });

                    statusBox.classList.add("status-success");
                    statusTitle.textContent = "ACCESSO CONSENTITO";
                    statusDetails.innerHTML = `
                        Biglietto valido e annullato correttamente.<br><br>
                        <strong>Nome:</strong> ${userData.name}<br>
                        <strong>Email:</strong> ${userData.email}
                    `;
                }
            } else {
                // Document not found
                statusBox.classList.add("status-error");
                statusTitle.textContent = "BIGLIETTO NON VALIDO";
                statusDetails.innerHTML = "Questo codice QR non esiste nel database.";
            }
        } catch (error) {
            console.error("Error verifying ticket:", error);
            statusBox.classList.add("status-error");
            statusTitle.textContent = "ERRORE DI SISTEMA";
            statusDetails.innerHTML = "Impossibile contattare il database. Riprova.";
        }
    }

    function onScanFailure(error) {
        // handle scan failure, usually better to ignore and keep scanning
    }

    nextScanBtn.addEventListener("click", () => {
        statusBox.style.display = "none";
        readerDiv.style.display = "block";
        if (html5QrcodeScanner) {
            html5QrcodeScanner.resume();
        }
    });
});
