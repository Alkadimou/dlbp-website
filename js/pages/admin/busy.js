// Admin – bottoni con un'azione lenta (lettura/scrittura su Firestore, finestre di conferma).
// Mentre l'azione è in corso il bottone ha aria-busy="true" (si vede attenuato, css/styles.css)
// e gli altri clic vengono ignorati, così un doppio clic non lancia l'azione due volte.
export function whileBusy(btn, action) {
    return async (...args) => {
        if (btn.getAttribute("aria-busy") === "true") return;
        btn.setAttribute("aria-busy", "true");
        try {
            return await action(...args);
        } finally {
            btn.removeAttribute("aria-busy");
        }
    };
}
