import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Check Authentication
    if (!sessionStorage.getItem("dlbp_admin_auth")) {
        window.location.href = "admin.html";
        return;
    }

    const eventSelector = document.getElementById("event-selector");
    const loadingOverlay = document.getElementById("loading-overlay");
    const analyticsContent = document.getElementById("analytics-content");

    // Chart instances
    let timelineChart = null;
    let statusChart = null;
    let conversionChart = null;

    // Load Events
    async function loadEvents() {
        if (!db) return;
        try {
            const eventsSnapshot = await getDocs(collection(db, "events"));
            eventSelector.innerHTML = "";
            let hasEvents = false;
            
            // Default active event to pre-select
            let activeEventId = null;

            eventsSnapshot.forEach(doc => {
                hasEvents = true;
                const ev = doc.data();
                const option = document.createElement("option");
                option.value = doc.id;
                option.textContent = ev.name + " - " + ev.date;
                if (ev.isActive) {
                    option.selected = true;
                    activeEventId = doc.id;
                }
                eventSelector.appendChild(option);
            });

            if (!hasEvents) {
                // Fallback se la collezione events non è ancora creata
                const option = document.createElement("option");
                option.value = "act_1";
                option.textContent = "TXK.NØX Act 1 (Legacy)";
                eventSelector.appendChild(option);
                activeEventId = "act_1";
            }

            // Carica dati per l'evento selezionato
            await loadAnalytics(eventSelector.value);

        } catch (error) {
            console.error("Errore nel caricamento eventi:", error);
            alert("Errore di connessione al database.");
        }
    }

    // Load Data for Analytics
    async function loadAnalytics(eventId) {
        loadingOverlay.style.display = "flex";
        analyticsContent.style.display = "none";
        
        try {
            const q = query(collection(db, "registrations"), where("eventId", "==", eventId), orderBy("timestamp", "asc"));
            const querySnapshot = await getDocs(q);
            
            const data = [];
            let total = 0;
            let approved = 0;
            let pending = 0;
            let present = 0;
            
            // Per il grafico a linee
            const datesMap = {};

            querySnapshot.forEach(doc => {
                const user = doc.data();
                data.push(user);
                
                total++;
                if (user.status === "approved") approved++;
                if (user.status === "pending") pending++;
                if (user.checked_in) present++;

                // Gestione date per timeline
                if (user.timestamp) {
                    const dateObj = user.timestamp.toDate();
                    // YYYY-MM-DD format for grouping
                    const dateStr = dateObj.toISOString().split('T')[0];
                    datesMap[dateStr] = (datesMap[dateStr] || 0) + 1;
                }
            });

            // Update UI Counters
            document.getElementById("stat-total").textContent = total;
            document.getElementById("stat-approved").textContent = approved;
            document.getElementById("stat-pending").textContent = pending;
            document.getElementById("stat-present").textContent = present;

            // Update Charts
            renderCharts(datesMap, approved, pending, present);
            
            loadingOverlay.style.display = "none";
            analyticsContent.style.display = "block";
            
        } catch (error) {
            console.error("Errore caricamento dati analytics:", error);
            alert("Errore nel caricamento dei dati.");
            loadingOverlay.style.display = "none";
            analyticsContent.style.display = "block";
        }
    }

    function renderCharts(datesMap, approved, pending, present) {
        // Distruggi i grafici vecchi se esistono
        if (timelineChart) timelineChart.destroy();
        if (statusChart) statusChart.destroy();
        if (conversionChart) conversionChart.destroy();

        // 1. Timeline Chart
        const ctxTimeline = document.getElementById('timelineChart').getContext('2d');
        const labels = Object.keys(datesMap).sort();
        const dataPoints = labels.map(l => datesMap[l]);
        
        // Calcola andamento cumulativo per un secondo dataset (opzionale)
        let cumulative = 0;
        const cumulativeData = dataPoints.map(val => {
            cumulative += val;
            return cumulative;
        });

        timelineChart = new Chart(ctxTimeline, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Nuove Iscrizioni Giornaliere',
                        data: dataPoints,
                        borderColor: '#2ecc71',
                        backgroundColor: 'rgba(46, 204, 113, 0.2)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Totale Iscritti',
                        data: cumulativeData,
                        borderColor: '#fff',
                        borderDash: [5, 5],
                        borderWidth: 1,
                        fill: false,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: '#fff', font: { family: 'Space Grotesk' } } }
                },
                scales: {
                    x: { ticks: { color: '#888' }, grid: { color: '#333' } },
                    y: { ticks: { color: '#888' }, grid: { color: '#333' }, beginAtZero: true }
                }
            }
        });

        // 2. Status Chart (Pending vs Approved)
        const ctxStatus = document.getElementById('statusChart').getContext('2d');
        statusChart = new Chart(ctxStatus, {
            type: 'doughnut',
            data: {
                labels: ['Approvati', 'In Attesa', 'Rifiutati/Altri'],
                datasets: [{
                    data: [approved, pending, Math.max(0, (approved + pending > 0) ? (approved+pending)*0 : 0)], // Semplificato
                    backgroundColor: ['#2ecc71', '#f1c40f', '#e74c3c'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#fff', font: { family: 'Space Grotesk' } } }
                }
            }
        });

        // 3. Conversion Chart (No-Show Rate)
        const ctxConversion = document.getElementById('conversionChart').getContext('2d');
        const absent = approved - present;
        conversionChart = new Chart(ctxConversion, {
            type: 'pie',
            data: {
                labels: ['Presenti alla Porta', 'Assenti (No-Show)'],
                datasets: [{
                    data: [present, Math.max(0, absent)],
                    backgroundColor: ['#3498db', '#333333'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#fff', font: { family: 'Space Grotesk' } } }
                }
            }
        });
    }

    // Event Listener for Dropdown
    eventSelector.addEventListener("change", (e) => {
        loadAnalytics(e.target.value);
    });

    // Avvio iniziale
    loadEvents();
});
