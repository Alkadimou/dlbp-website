import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// EmailJS config
const EMAILJS_PUBLIC_KEY = "XIMzE429r_DY-U4nl";
const EMAILJS_SERVICE_ID = "service_ndbmwte";
const EMAILJS_TEMPLATE_ID = "template_o3kovxe";

let db;
try {
    if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
    }
} catch (e) {
    console.error("Firebase init error", e);
}

// Initialize EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

document.addEventListener("DOMContentLoaded", () => {
    const loginSection = document.getElementById("login-section");
    const dashboardSection = document.getElementById("dashboard-section");
    const loginBtn = document.getElementById("login-btn");
    const passwordInput = document.getElementById("admin-password");
    const loginMessage = document.getElementById("login-message");
    
    const tbody = document.getElementById("users-tbody");
    const sendEmailsBtn = document.getElementById("send-emails-btn");
    const adminMessage = document.getElementById("admin-message");

    // Dummy data for preview purposes
    let usersData = [
        { name: "Mario Rossi", email: "mario@example.com", timestamp: new Date() },
        { name: "Giulia Bianchi", email: "giulia@example.com", timestamp: new Date() }
    ];

    // --- LOGIN LOGIC ---
    loginBtn.addEventListener("click", () => {
        // Hardcoded password for preview. IN PRODUCTION: Use proper Firebase Authentication!
        if (passwordInput.value === "dlbp2024") { 
            loginSection.style.display = "none";
            dashboardSection.style.display = "block";
            loadUsers();
        } else {
            loginMessage.textContent = "Accesso negato.";
            loginMessage.className = "form-message error";
        }
    });

    // --- DASHBOARD LOGIC ---
    async function loadUsers() {
        tbody.innerHTML = "<tr><td colspan='3'>Caricamento dati...</td></tr>";
        
        try {
            if (db) {
                usersData = [];
                const q = query(collection(db, "registrations"), orderBy("timestamp", "desc"));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    data.id = doc.id; // Save document ID for QR Code
                    // Convert Firestore timestamp to JS Date
                    data.timestamp = data.timestamp ? data.timestamp.toDate() : new Date();
                    usersData.push(data);
                });
            } else {
                console.warn("Using dummy data because Firebase is not configured.");
            }
            renderTable();
        } catch (error) {
            console.error("Error loading users:", error);
            tbody.innerHTML = "<tr><td colspan='3'>Errore di connessione al database.</td></tr>";
        }
    }

    function renderTable() {
        tbody.innerHTML = "";
        if (usersData.length === 0) {
            tbody.innerHTML = "<tr><td colspan='3'>Nessun iscritto al momento.</td></tr>";
            return;
        }

        usersData.forEach(user => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.timestamp.toLocaleString('it-IT')}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // --- EMAIL SENDING LOGIC ---
    sendEmailsBtn.addEventListener("click", async () => {
        if (!confirm("ATTENZIONE: Stai per inviare la location segreta a TUTTI gli iscritti. Procedere?")) {
            return;
        }

        sendEmailsBtn.disabled = true;
        sendEmailsBtn.textContent = "INVIO IN CORSO...";
        adminMessage.className = "form-message hidden";

        let successCount = 0;
        let failCount = 0;

        for (const user of usersData) {
            try {
                if (EMAILJS_PUBLIC_KEY !== "YOUR_EMAILJS_PUBLIC_KEY") {
                    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
                        to_name: user.name,
                        to_email: user.email,
                        secret_location: "Via Roma 123, Piano Interrato. Ingresso dal retro.", // Example data
                        event_date: "Venerdì alle 23:00",
                        qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${user.id}`
                    });
                } else {
                    // Simulate email sending delay
                    await new Promise(r => setTimeout(r, 500));
                    console.log(`Simulated email sent to ${user.email}`);
                }
                successCount++;
            } catch (error) {
                console.error(`Failed to send email to ${user.email}:`, error);
                failCount++;
            }
        }

        sendEmailsBtn.disabled = false;
        sendEmailsBtn.textContent = "INVIA SECRET LOCATION";
        
        adminMessage.textContent = `Operazione completata. Inviate: ${successCount}. Fallite: ${failCount}.`;
        adminMessage.className = "form-message success";
    });
});
