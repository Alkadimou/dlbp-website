import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, doc, getDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// TODO: Replace with your actual Firebase configuration from the Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyD6THmnRAG_8YL1PLWSL7I2_WKLv-fioWk",
  authDomain: "dlbp-website.firebaseapp.com",
  projectId: "dlbp-website",
  storageBucket: "dlbp-website.firebasestorage.app",
  messagingSenderId: "51111322366",
  appId: "1:51111322366:web:813b96994d6a1f2fbefbaf",
  measurementId: "G-6HC9LRZWV9"
};

// Initialize Firebase only if the config is updated
let app;
let db;
try {
    if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
    } else {
        console.warn("Firebase config is missing. Database operations will be simulated.");
    }
} catch (e) {
    console.error("Firebase initialization error", e);
}

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("registration-form");
    const messageDiv = document.getElementById("form-message");
    const closedMessage = document.getElementById("closed-message");
    const submitBtn = document.getElementById("submit-btn");
    const btnText = submitBtn.querySelector(".btn-text");

    // Check if list is open
    async function checkAvailability() {
        if (!db) return true;
        try {
            const configSnap = await getDoc(doc(db, "settings", "config"));
            if (configSnap.exists()) {
                const config = configSnap.data();
                if (config.isOpen === false) {
                    form.style.display = "none";
                    closedMessage.style.display = "block";
                    return false;
                }
            }
        } catch (error) {
            console.error("Error checking availability:", error);
        }
        return true;
    }

    checkAvailability();

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const isStillOpen = await checkAvailability();
        if (!isStillOpen) return;
        
        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();

        if (!name || !email) {
            showMessage("Tutti i campi sono obbligatori.", "error");
            return;
        }

        // UI Loading state
        submitBtn.disabled = true;
        submitBtn.classList.add("loading-pulse");
        btnText.textContent = "IN ELABORAZIONE...";
        messageDiv.className = "form-message hidden";

        try {
            if (db) {
                // Anti-spam check
                const q = query(collection(db, "registrations"), where("email", "==", email), where("eventId", "==", "act_1"));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    showMessage("Questa email risulta già in lista per l'evento.", "error");
                    submitBtn.disabled = false;
                    submitBtn.classList.remove("loading-pulse");
                    btnText.textContent = "RICHIEDI ACCESSO";
                    return;
                }

                // Actual Firebase write
                await addDoc(collection(db, "registrations"), {
                    name: name,
                    email: email,
                    eventId: "act_1", // Hardcoded for this event
                    checked_in: false, // New field for QR code system
                    timestamp: serverTimestamp()
                });
            } else {
                // Simulated delay if Firebase is not yet configured
                await new Promise(resolve => setTimeout(resolve, 1500));
                console.log("Simulated saving to DB:", { name, email });
            }

            showMessage("Richiesta inviata. Sarai contattato se selezionato.", "success");
            form.reset();
        } catch (error) {
            console.error("Error adding document: ", error);
            showMessage("Errore di sistema. Riprova più tardi.", "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.classList.remove("loading-pulse");
            btnText.textContent = "RICHIEDI ACCESSO";
        }
    });

    function showMessage(msg, type) {
        messageDiv.textContent = msg;
        messageDiv.className = `form-message ${type}`;
    }
});
