// Admin – i 4 grafici della finestra "STATISTICHE" (libreria Chart.js, caricata da admin.html).
let timelineChart = null;
let statusChart = null;
let conversionChart = null;
let peakTrafficChart = null;

export function renderAnalyticsCharts(datesMap, approved, pending, present, trafficMap) {
    if (timelineChart) timelineChart.destroy();
    if (statusChart) statusChart.destroy();
    if (conversionChart) conversionChart.destroy();
    if (peakTrafficChart) peakTrafficChart.destroy();

    // 1. Timeline Chart
    const ctxTimeline = document.getElementById('timelineChart').getContext('2d');
    const labels = Object.keys(datesMap).sort();
    const dataPoints = labels.map(l => datesMap[l]);
    
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
                legend: { labels: { color: '#fff', font: { family: 'Space Mono' } } }
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
            labels: ['Approvati', 'In Attesa', 'Altri'],
            datasets: [{
                data: [approved, pending, 0],
                backgroundColor: ['#2ecc71', '#f1c40f', '#e74c3c'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#fff', font: { family: 'Space Mono' } } }
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
                legend: { position: 'bottom', labels: { color: '#fff', font: { family: 'Space Mono' } } }
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
