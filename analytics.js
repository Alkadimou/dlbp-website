import { showModal } from './utils.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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
let auth;
try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
} catch (e) {
    console.error("Firebase init error", e);
}

document.addEventListener("DOMContentLoaded", async () => {
    const eventSelector = document.getElementById("event-selector");
    const loadingOverlay = document.getElementById("loading-overlay");
    const analyticsContent = document.getElementById("analytics-content");

    // 1. Check Authentication
    if (auth) {
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                window.location.href = "admin.html";
            } else {
                document.getElementById('analytics-content').style.display = 'block';
                await loadEvents();
            }
        });
    } else {
        window.location.href = "admin.html";
    }

    // Chart instances
    let timelineChart = null;
    let statusChart = null;
    let conversionChart = null;
    let peakTrafficChart = null;

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
            showModal("Errore di connessione al database.");
        }
    }

    // Load Data for Analytics
    async function loadAnalytics(eventId) {
        loadingOverlay.style.display = "flex";
        analyticsContent.style.display = "none";
        
        try {
            const q = query(collection(db, "registrations"), where("eventId", "==", eventId)); // Rimosso orderBy
            const querySnapshot = await getDocs(q);
            
            const data = [];
            let total = 0;
            let approved = 0;
            let pending = 0;
            let present = 0;
            
            // Per il grafico a linee e picchi
            const datesMap = {};
            const trafficMap = {};

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

                // Gestione picchi di affluenza (check_in_time in buckets da 30 min)
                if (user.checked_in && user.check_in_time) {
                    const timeObj = user.check_in_time.toDate();
                    let min = timeObj.getMinutes();
                    // Arrotonda ai 30 min
                    min = min < 30 ? "00" : "30";
                    const bucket = `${timeObj.getHours().toString().padStart(2, '0')}:${min}`;
                    trafficMap[bucket] = (trafficMap[bucket] || 0) + 1;
                }
            });

            // Update UI Counters
            document.getElementById("stat-total").textContent = total;
            document.getElementById("stat-approved").textContent = approved;
            document.getElementById("stat-pending").textContent = pending;
            document.getElementById("stat-present").textContent = present;

            // Update Charts
            renderCharts(datesMap, approved, pending, present, trafficMap);
            
            loadingOverlay.style.display = "none";
            analyticsContent.style.display = "block";
            
        } catch (error) {
            console.error("Errore caricamento dati analytics:", error);
            showModal("Errore nel caricamento dei dati.");
            loadingOverlay.style.display = "none";
            analyticsContent.style.display = "block";
        }
    }

    function renderCharts(datesMap, approved, pending, present, trafficMap) {
        // Distruggi i grafici vecchi se esistono
        if (timelineChart) timelineChart.destroy();
        if (statusChart) statusChart.destroy();
        if (conversionChart) conversionChart.destroy();
        if (peakTrafficChart) peakTrafficChart.destroy();

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

        // 4. Peak Traffic Chart (Bar)
        const ctxTraffic = document.getElementById('peakTrafficChart').getContext('2d');
        const trafficLabels = Object.keys(trafficMap).sort();
        const trafficDataPoints = trafficLabels.map(l => trafficMap[l]);

        peakTrafficChart = new Chart(ctxTraffic, {
            type: 'bar',
            data: {
                labels: trafficLabels,
                datasets: [{
                    label: 'Ingressi per fascia oraria',
                    data: trafficDataPoints,
                    backgroundColor: '#e67e22',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: { ticks: { color: '#888' }, grid: { display: false } },
                    y: { ticks: { color: '#888' }, grid: { color: '#333' }, beginAtZero: true }
                }
            }
        });
    }

    // Event Listener for Dropdown
    eventSelector.addEventListener("change", (e) => {
        loadAnalytics(e.target.value);
    });

    // Initialization relies on Auth state now
});
