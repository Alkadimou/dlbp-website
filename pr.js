import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// TODO: Replace with your actual Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD6THmnRAG_8YL1PLWSL7I2_WKLv-fioWk",
  authDomain: "dlbp-website.firebaseapp.com",
  projectId: "dlbp-website",
  storageBucket: "dlbp-website.firebasestorage.app",
  messagingSenderId: "51111322366",
  appId: "1:51111322366:web:813b96994d6a1f2fbefbaf",
  measurementId: "G-6HC9LRZWV9"
};

let app, db;
try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
} catch (e) {
    console.error("Firebase initialization error", e);
}

document.addEventListener("DOMContentLoaded", () => {
    const loginSection = document.getElementById("login-section");
    const dashboardSection = document.getElementById("dashboard-section");
    const prCodeInput = document.getElementById("pr-code");
    const loginBtn = document.getElementById("login-btn");
    const loginMessage = document.getElementById("login-message");
    const logoutBtn = document.getElementById("logout-btn");
    
    const prWelcome = document.getElementById("pr-welcome");
    const statTotal = document.getElementById("stat-total");
    const statApproved = document.getElementById("stat-approved");
    const statEntered = document.getElementById("stat-entered");
    
    const inviteLinkInput = document.getElementById("invite-link");
    const copyBtn = document.getElementById("copy-btn");

    let currentEventId = "act_1"; // Definisci come predefinito
    let unsubscribe = null;
    let currentPrCode = "";

    // Load active event
    async function loadActiveEvent() {
        if (!db) return;
        try {
            const q = query(collection(db, "events"), where("isActive", "==", true));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                currentEventId = querySnapshot.docs[0].id;
            }
        } catch (error) {
            console.error("Error loading active event:", error);
        }
    }

    loadActiveEvent();

    // Check session
    const savedPr = sessionStorage.getItem("dlbp_pr_code");
    if (savedPr) {
        login(savedPr);
    }

    loginBtn.addEventListener("click", () => {
        const code = prCodeInput.value.trim().toLowerCase();
        if (code.length < 2) {
            loginMessage.textContent = "Inserisci un codice valido.";
            loginMessage.className = "form-message error";
            loginMessage.style.display = "block";
            return;
        }
        login(code);
    });

    prCodeInput.addEventListener("keyup", (e) => {
        if (e.key === "Enter") loginBtn.click();
    });

    function login(code) {
        currentPrCode = code;
        sessionStorage.setItem("dlbp_pr_code", code);
        
        loginSection.style.display = "none";
        dashboardSection.style.display = "block";
        document.getElementById("app-main").style.maxWidth = "800px";
        
        prWelcome.textContent = `DASHBOARD PR: ${code.toUpperCase()}`;
        
        // Generate invite link
        const baseUrl = window.location.origin + window.location.pathname.replace('pr.html', 'index.html');
        inviteLinkInput.value = `${baseUrl}?pr=${code}`;

        startListening(code);
    }

    logoutBtn.addEventListener("click", () => {
        sessionStorage.removeItem("dlbp_pr_code");
        if (unsubscribe) unsubscribe();
        location.reload();
    });

    copyBtn.addEventListener("click", () => {
        inviteLinkInput.select();
        document.execCommand("copy");
        copyBtn.textContent = "COPIATO!";
        setTimeout(() => {
            copyBtn.textContent = "COPIA";
        }, 2000);
    });

    function startListening(prCode) {
        if (!db) return;
        
        const q = query(
            collection(db, "registrations"), 
            where("eventId", "==", currentEventId),
            where("invited_by", "==", prCode)
        );

        unsubscribe = onSnapshot(q, (snapshot) => {
            let total = 0;
            let approved = 0;
            let entered = 0;

            snapshot.forEach((doc) => {
                const data = doc.data();
                total++;
                if (data.status === "approved") approved++;
                if (data.checked_in === true) entered++;
            });

            // Animate numbers
            animateValue(statTotal, parseInt(statTotal.textContent), total, 500);
            animateValue(statApproved, parseInt(statApproved.textContent), approved, 500);
            animateValue(statEntered, parseInt(statEntered.textContent), entered, 500);
        });
    }

    function animateValue(obj, start, end, duration) {
        if (start === end) return;
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                obj.innerHTML = end;
            }
        };
        window.requestAnimationFrame(step);
    }
});
