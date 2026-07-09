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
    if (loader) {
        if (sessionStorage.getItem('visited')) {
            loader.style.display = 'none';
        } else {
            setTimeout(() => {
                loader.style.opacity = '0';
                setTimeout(() => {
                    loader.style.display = 'none';
                    sessionStorage.setItem('visited', 'true');
                }, 500);
            }, 1000);
        }
    }

    // Scroll Down Indicator Logic
    const scrollIndicator = document.querySelector('.scroll-indicator');
    if (scrollIndicator) {
        scrollIndicator.addEventListener('click', () => {
            const eventsSection = document.getElementById('events');
            if (eventsSection) {
                eventsSection.scrollIntoView({ behavior: 'smooth' });
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
    if (!eventsGrid) return;
    
    const pastEventsGrid = document.getElementById("past-events-grid");
    
    try {
        // Fetch all events
        const q = query(collection(db, "events"));
        const querySnapshot = await getDocs(q);
        
        eventsGrid.innerHTML = ''; // Clear loading text
        if (pastEventsGrid) {
            pastEventsGrid.innerHTML = '';
        }

        if (querySnapshot.empty) {
            eventsGrid.innerHTML = '<div class="no-events">NESSUN EVENTO IN PROGRAMMA</div>';
            return;
        }

        // Put events into array
        let eventsArray = [];
        querySnapshot.forEach((doc) => {
            eventsArray.push({ id: doc.id, ...doc.data() });
        });

        // Sort by createdAt descending
        eventsArray.sort((a, b) => {
            const dateA = a.createdAt ? a.createdAt.toMillis() : 0;
            const dateB = b.createdAt ? b.createdAt.toMillis() : 0;
            return dateB - dateA;
        });

        const activeEvents = eventsArray.filter(e => e.isActive === true);
        const pastEvents = eventsArray.filter(e => e.isActive !== true);

        if (activeEvents.length === 0) {
            eventsGrid.innerHTML = '<div class="no-events">NESSUN EVENTO IN PROGRAMMA</div>';
        } else {
            // Render upcoming active events
            const activeFragment = document.createDocumentFragment();
            const urlParams = new URLSearchParams(window.location.search);
            const prCode = urlParams.get('pr');
            let prQuery = prCode ? `&pr=${encodeURIComponent(prCode)}` : '';

            activeEvents.forEach((ev) => {
                const card = document.createElement('div');
                card.className = 'event-card-item fade-in';
                
                const isOpen = ev.isOpen !== false;
                const statusText = isOpen ? 'ISCRIZIONI APERTE' : 'GUESTLIST CLOSED';
                const statusClass = isOpen ? 'status-open' : 'status-closed';

                const flyerHtml = ev.flyerUrl ? `<img src="${ev.flyerUrl}" alt="Locandina" class="event-card-img">` : '';

                card.innerHTML = `
                    <div class="event-card-inner">
                        ${flyerHtml}
                        <div class="event-card-content">
                            <div class="event-card-status ${statusClass}">${statusText}</div>
                            <h3 class="event-card-title">${ev.name}</h3>
                            <div class="event-card-date">${ev.date}</div>
                            <a href="event?id=${ev.id}${prQuery}" class="event-card-btn">
                                ${isOpen ? 'SCOPRI / ACCEDI' : 'DETTAGLI'}
                            </a>
                        </div>
                    </div>
                `;
                activeFragment.appendChild(card);
            });
            eventsGrid.appendChild(activeFragment);
        }

        // Render past events (if container exists on page)
        if (pastEventsGrid) {
            if (pastEvents.length === 0) {
                pastEventsGrid.innerHTML = '<div class="no-events">NESSUN EVENTO PASSATO</div>';
            } else {
                const pastFragment = document.createDocumentFragment();
                pastEvents.forEach((ev) => {
                    const card = document.createElement('div');
                    card.className = 'event-card-item fade-in';
                    card.style.opacity = '0.5';
                    
                    const flyerHtml = ev.flyerUrl ? `<img src="${ev.flyerUrl}" alt="Locandina" class="event-card-img" style="filter: grayscale(100%);">` : '';

                    card.innerHTML = `
                        <div class="event-card-inner">
                            ${flyerHtml}
                            <div class="event-card-content">
                                <div class="event-card-status status-closed" style="border-color: rgba(255,255,255,0.1); color: rgba(255,255,255,0.4);">EVENTO CONCLUSO</div>
                                <h3 class="event-card-title" style="color: rgba(255,255,255,0.6);">${ev.name}</h3>
                                <div class="event-card-date" style="color: rgba(255,255,255,0.3);">${ev.date}</div>
                                <span class="event-card-btn" style="background: rgba(255,255,255,0.02); color: rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.05); cursor: default; pointer-events: none; text-align: center; display: block; padding: 0.8rem; font-size: 0.8rem; text-transform: uppercase;">
                                    ARCHIVIATO
                                </span>
                            </div>
                        </div>
                    `;
                    pastFragment.appendChild(card);
                });
                pastEventsGrid.appendChild(pastFragment);
            }
        }

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
