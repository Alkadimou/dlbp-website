import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD6THmnRAG_8YL1PLWSL7I2_WKLv-fioWk",
  authDomain: "dlbp-website.firebaseapp.com",
  projectId: "dlbp-website",
  storageBucket: "dlbp-website.firebasestorage.app",
  messagingSenderId: "51111322366",
  appId: "1:51111322366:web:813b96994d6a1f2fbefbaf",
  measurementId: "G-6HC9LRZWV9"
};

let app;
let db;
try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
} catch (e) {
    console.error("Firebase initialization error", e);
}

document.addEventListener("DOMContentLoaded", () => {
    // Hide loader
    const loader = document.getElementById('initial-loader');
    if(loader) {
        setTimeout(() => {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
            }, 500);
        }, 1000);
    }

    // Scroll Down Indicator Logic
    const scrollIndicator = document.querySelector('.scroll-indicator');
    if (scrollIndicator) {
        scrollIndicator.addEventListener('click', () => {
            const conceptSection = document.getElementById('concept');
            if (conceptSection) {
                conceptSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    // Intersection Observer for scroll animations (.reveal elements)
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    loadEvents();
});

async function loadEvents() {
    if (!db) return;
    const eventsGrid = document.getElementById("events-grid");
    
    try {
        // Fetch all active events
        const q = query(collection(db, "events"), where("isActive", "==", true));
        const querySnapshot = await getDocs(q);
        
        eventsGrid.innerHTML = ''; // Clear loading text

        if (querySnapshot.empty) {
            eventsGrid.innerHTML = '<div class="no-events">NESSUN EVENTO IN PROGRAMMA</div>';
            return;
        }

        // Get PR code from URL if exists to pass it to event.html
        const urlParams = new URLSearchParams(window.location.search);
        const prCode = urlParams.get('pr');
        let prQuery = prCode ? `&pr=${encodeURIComponent(prCode)}` : '';

        querySnapshot.forEach((doc) => {
            const ev = doc.data();
            const eventId = doc.id;
            
            // Build card
            const card = document.createElement('div');
            card.className = 'event-card-item fade-in';
            
            const isOpen = ev.isOpen !== false;
            const statusText = isOpen ? 'ISCRIZIONI APERTE' : 'GUESTLIST CLOSED';
            const statusClass = isOpen ? 'status-open' : 'status-closed';

            card.innerHTML = `
                <div class="event-card-inner">
                    <div class="event-card-status ${statusClass}">${statusText}</div>
                    <h3 class="event-card-title">${ev.name}</h3>
                    <div class="event-card-date">${ev.date}</div>
                    <a href="event.html?id=${eventId}${prQuery}" class="event-card-btn">
                        ${isOpen ? 'SCOPRI / ACCEDI' : 'DETTAGLI'}
                    </a>
                </div>
            `;
            
            eventsGrid.appendChild(card);
        });

        // Add intersection observer for fade-in elements inside the grid
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1 });
        
        document.querySelectorAll('.event-card-item.fade-in').forEach(el => observer.observe(el));

    } catch (error) {
        console.error("Error loading events:", error);
        eventsGrid.innerHTML = '<div class="no-events" style="color: var(--error-color);">ERRORE CARICAMENTO EVENTI</div>';
    }
}
