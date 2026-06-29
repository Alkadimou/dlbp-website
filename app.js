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
    const registrationSection = document.getElementById("registration-section");

    // Gate elements
    const gateSection = document.getElementById("gate-section");
    const gatePasswordInput = document.getElementById("gate-password");
    const gateBtn = document.getElementById("gate-btn");
    const gateMessage = document.getElementById("gate-message");
    const publicEventHeader = document.getElementById("public-event-header");

    const PUBLIC_GATE_HASH = "9f0ec1a0240808b239a995975a3a09c633fe9edac27a203f21e90429f5cdbfe9"; // alogasse
    let currentEventId = "act_1"; // Default fallback

    // --- CHECK PR PARAMETER ---
    const urlParams = new URLSearchParams(window.location.search);
    const prCode = urlParams.get('pr') ? urlParams.get('pr').toLowerCase() : null;

    // --- FETCH ACTIVE EVENT ---
    async function loadActiveEvent() {
        if (!db) return;
        try {
            const q = query(collection(db, "events"), where("isActive", "==", true));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const eventDoc = querySnapshot.docs[0];
                const ev = eventDoc.data();
                currentEventId = eventDoc.id;
                
                // Update UI
                const titleEl = document.getElementById("public-event-title");
                const dateEl = document.getElementById("public-event-date");
                const flyerEl = document.getElementById("public-event-flyer");
                const descEl = document.getElementById("public-event-description");
                
                if (titleEl) {
                    titleEl.textContent = ev.name;
                    titleEl.setAttribute("data-text", ev.name);
                }
                if (dateEl) {
                    dateEl.textContent = ev.date;
                }
                if (flyerEl && ev.flyerUrl && ev.flyerUrl.trim() !== "") {
                    flyerEl.src = ev.flyerUrl;
                    flyerEl.style.display = "block";
                } else if (flyerEl) {
                    flyerEl.style.display = "none";
                }
                if (descEl && ev.description && ev.description.trim() !== "") {
                    descEl.innerHTML = ev.description.replace(/\n/g, '<br>');
                }
                
                // Set form state based on event
                if (ev.isOpen === false) {
                    form.style.display = "none";
                    closedMessage.style.display = "block";
                }
            } else {
                // Fallback to legacy check if events collection doesn't exist yet
                checkLegacyAvailability();
            }
        } catch (error) {
            console.error("Error loading active event:", error);
        }
    }

    // Load active event immediately
    loadActiveEvent();

    async function hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // No sessionStorage used: password must be entered on every reload.

    gateBtn.addEventListener("click", async () => {
        const pwd = gatePasswordInput.value;
        const hashedInput = await hashPassword(pwd);
        
        if (hashedInput === PUBLIC_GATE_HASH) {
            gateSection.style.display = "none";
            publicEventHeader.style.display = "block";
            registrationSection.style.display = "block";
        } else {
            gateMessage.textContent = "ACCESSO NEGATO";
            gateMessage.className = "form-message error";
            gateMessage.style.display = "block";
        }
    });

    gatePasswordInput.addEventListener("keyup", (e) => {
        if (e.key === "Enter") {
            gateBtn.click();
        }
    });

    // Fallback if no active event found (migration mode)
    async function checkLegacyAvailability() {
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

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        // Se c'è il messaggio chiuso visibile, blocca
        if (closedMessage.style.display === "block") return;
        
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
                const q = query(collection(db, "registrations"), where("email", "==", email), where("eventId", "==", currentEventId));
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
                    eventId: currentEventId,
                    invited_by: prCode, // Track PR referrals
                    checked_in: false, // New field for QR code system
                    status: "pending", // VIP approval status
                    email_sent: false, // Track if secret location was sent
                    timestamp: serverTimestamp()
                });
            } else {
                // Simulated delay if Firebase is not yet configured
                await new Promise(resolve => setTimeout(resolve, 1500));
                console.log("Simulated saving to DB:", { name, email });
            }

            submitBtn.disabled = false;
            submitBtn.classList.remove("loading-pulse");
            btnText.textContent = "RICHIEDI ACCESSO";
            document.getElementById("name").value = "";
            document.getElementById("email").value = "";
            
            const modal = document.getElementById("success-modal");
            if (modal) {
                modal.classList.remove("hidden");
                document.getElementById("close-modal-btn").onclick = () => {
                    modal.classList.add("hidden");
                };
            } else {
                showMessage("Richiesta inviata. Sarai contattato se selezionato.", "success");
            }
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

    // PWA Service Worker Registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js').catch(error => {
                console.log('ServiceWorker registration failed: ', error);
            });
        });
    }

    // --- WOW FACTOR: Loader & Reveal Animations ---
    window.addEventListener('load', () => {
        const loader = document.getElementById('initial-loader');
        if (loader) {
            setTimeout(() => {
                loader.style.opacity = '0';
                setTimeout(() => {
                    loader.style.display = 'none';
                    initRevealAnimations();
                }, 600);
            }, 800); // Mostra il loader per 800ms
        } else {
            initRevealAnimations();
        }
    });

    function initRevealAnimations() {
        const reveals = document.querySelectorAll('.reveal');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: "0px 0px -50px 0px"
        });

        reveals.forEach(el => observer.observe(el));
    }
});
