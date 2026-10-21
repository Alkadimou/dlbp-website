// Pagine index.html (home) ed eventi.html: carica gli eventi da Firestore (collezione "events")
// e li mostra come card. Gli eventi attivi portano a event.html per la registrazione;
// quelli con capienza 0 (PROSSIMAMENTE) aprono la stessa pagina, che mostra solo i dettagli.
import { db, collection, query, getDocs } from "../core/firebase.js";
import { initStaffMenu } from "../core/nav.js";
import { toMillis } from "../core/dates.js";
import { initRevealAnimations } from "../core/reveal.js";

initStaffMenu();

document.addEventListener("DOMContentLoaded", () => {
    // Hide loader
    const loader = document.getElementById('initial-loader');
    if (loader) {
        if (sessionStorage.getItem('visited')) {
            loader.classList.add("hidden");
        } else {
            setTimeout(() => {
                loader.style.opacity = '0';
                setTimeout(() => {
                    loader.classList.add("hidden");
                    sessionStorage.setItem('visited', 'true');
                }, 500);
            }, 1000);
        }
    }

    // Scroll animations (.reveal elements)
    initRevealAnimations();

    rememberPrCode();
    loadEvents();
});

// Il link d'invito dei PR porta alla home (?pr=<codice>): il codice resta ricordato per la visita,
// così chi passa dal menu EVENTI all'iscrizione viene comunque collegato al PR (event.js lo rilegge da qui).
function rememberPrCode() {
    const prCode = new URLSearchParams(window.location.search).get("pr");
    if (!prCode) return;
    try { sessionStorage.setItem("dlbp_pr_code", prCode.toLowerCase()); } catch (e) { /* sessionStorage non disponibile */ }
}

// Capienza 0 = evento solo da vedere: niente pagina di iscrizione.
function isViewOnly(ev) {
    return ev.maxCapacity === 0;
}

// Nei titoli delle card permette di andare a capo dopo ogni "/" (es. "BATU/TXK.NØX/RADIO FLARE"),
// così sui telefoni i nomi lunghi non allargano la card oltre lo schermo.
function breakableTitle(name) {
    return String(name).replace(/\//g, "/<wbr>");
}

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
            const dateA = toMillis(a.createdAt);
            const dateB = toMillis(b.createdAt);
            return dateB - dateA;
        });

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        const activeEvents = eventsArray.filter(e => e.isActive === true);
        const pastEvents = eventsArray.filter(e => {
            if (e.isActive === true) return false;
            if (e.isOpen === false) return true;
            if (e.dateIso) {
                return e.dateIso <= todayStr;
            }
            return true;
        });

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
                
                // Capienza 0: la pagina dell'evento si apre, ma mostra solo i dettagli (niente modulo)
                const viewOnly = isViewOnly(ev);
                const isOpen = ev.isOpen !== false;
                const statusText = viewOnly ? 'PROSSIMAMENTE' : (isOpen ? 'ISCRIZIONI APERTE' : 'GUESTLIST CLOSED');
                const statusClass = viewOnly || isOpen ? 'status-open' : 'status-closed';
                const btnText = viewOnly || !isOpen ? 'DETTAGLI' : 'SCOPRI / ACCEDI';

                const flyerHtml = ev.flyerUrl ? `<img src="${ev.flyerUrl}" alt="Locandina" class="event-card-img">` : '';

                const eventUrl = `event.html?id=${ev.id}${prQuery}`;

                card.innerHTML = `
                    <a href="${eventUrl}" style="text-decoration: none; color: inherit; display: block; cursor: pointer;">
                        <div class="event-card-inner">
                            ${flyerHtml}
                            <div class="event-card-content">
                                <div class="event-card-status ${statusClass}">${statusText}</div>
                                <h3 class="event-card-title">${breakableTitle(ev.name)}</h3>
                                <div class="event-card-date">${ev.date}</div>
                                <span class="event-card-btn">
                                    ${btnText}
                                </span>
                            </div>
                        </div>
                    </a>
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
                    
                    const flyerHtml = ev.flyerUrl ? `<img src="${ev.flyerUrl}" alt="Locandina" class="event-card-img">` : '';

                    card.innerHTML = `
                        <div class="event-card-inner">
                            ${flyerHtml}
                            <div class="event-card-content">
                                <div class="event-card-status status-closed" style="border-color: rgba(255,255,255,0.1); color: rgba(255,255,255,0.4);">EVENTO CONCLUSO</div>
                                <h3 class="event-card-title" style="color: rgba(255,255,255,0.6);">${breakableTitle(ev.name)}</h3>
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
                    observer.unobserve(entry.target); // una volta comparsa, la card resta visibile
                }
            });
        }, { threshold: 0.1 });
        
        document.querySelectorAll('.event-card-item.fade-in').forEach(el => observer.observe(el));

    } catch (error) {
        console.error("Error loading events:", error);
        eventsGrid.innerHTML = '<div class="no-events" style="color: var(--error-color);">ERRORE CARICAMENTO EVENTI</div>';
    }
}
