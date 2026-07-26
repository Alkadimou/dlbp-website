// js/modules/admin-charts.js

let timelineChart = null;
let statusChart = null;
let conversionChart = null;
let peakTrafficChart = null;

export function renderAnalyticsCharts(datesMap, approved, pending, present, trafficMap) {
    if (typeof Chart === 'undefined') return;

    if (timelineChart) timelineChart.destroy();
    if (statusChart) statusChart.destroy();
    if (conversionChart) conversionChart.destroy();
    if (peakTrafficChart) peakTrafficChart.destroy();

    // 1. Timeline Chart
    const ctxTimeline = document.getElementById('timelineChart')?.getContext('2d');
    if (ctxTimeline) {
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
                        label: 'Nuove Registrazioni',
                        data: dataPoints,
                        borderColor: '#6b3ba7',
                        backgroundColor: 'rgba(107, 59, 167, 0.2)',
                        fill: true,
                        tension: 0.3
                    },
                    {
                        label: 'Totale Cumulativo',
                        data: cumulativeData,
                        borderColor: '#00f2fe',
                        backgroundColor: 'transparent',
                        borderDash: [5, 5],
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: '#ccc' } }
                },
                scales: {
                    x: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    }

    // 2. Status Chart
    const ctxStatus = document.getElementById('statusChart')?.getContext('2d');
    if (ctxStatus) {
        statusChart = new Chart(ctxStatus, {
            type: 'doughnut',
            data: {
                labels: ['Approvati', 'In Attesa'],
                datasets: [{
                    data: [approved, pending],
                    backgroundColor: ['#2ecc71', '#f39c12'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: '#ccc' } }
                }
            }
        });
    }

    // 3. Conversion Chart
    const ctxConversion = document.getElementById('conversionChart')?.getContext('2d');
    if (ctxConversion) {
        const notPresent = Math.max(0, approved - present);
        conversionChart = new Chart(ctxConversion, {
            type: 'pie',
            data: {
                labels: ['Presenti (Check-in)', 'Assenti'],
                datasets: [{
                    data: [present, notPresent],
                    backgroundColor: ['#00f2fe', '#e74c3c'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: '#ccc' } }
                }
            }
        });
    }

    // 4. Peak Traffic Chart
    const ctxPeak = document.getElementById('peakTrafficChart')?.getContext('2d');
    if (ctxPeak) {
        const timeLabels = Object.keys(trafficMap).sort();
        const trafficData = timeLabels.map(t => trafficMap[t]);

        peakTrafficChart = new Chart(ctxPeak, {
            type: 'bar',
            data: {
                labels: timeLabels,
                datasets: [{
                    label: 'Ingressi per fascia oraria',
                    data: trafficData,
                    backgroundColor: 'rgba(0, 242, 254, 0.6)',
                    borderColor: '#00f2fe',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: '#ccc' } }
                },
                scales: {
                    x: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    }
}
