// Tabelle ordinabili: un clic su un'intestazione <th data-sort="campo"> ordina per quel campo,
// un secondo clic inverte l'ordine. La freccia ▲/▼ mostra l'ordinamento attivo.

// `sort` è un oggetto { field, order } che viene aggiornato qui; `onChange` ridisegna la tabella.
export function setupSortableHeaders(thead, sort, onChange) {
    if (!thead) return;
    thead.addEventListener("click", (e) => {
        const th = e.target.closest("th");
        if (th && th.dataset.sort) {
            const field = th.dataset.sort;
            if (sort.field === field) {
                sort.order = sort.order === "asc" ? "desc" : "asc";
            } else {
                sort.field = field;
                sort.order = "asc";
            }
            updateSortHeaders(thead, sort);
            onChange();
        }
    });
}

function updateSortHeaders(thead, sort) {
    thead.querySelectorAll("th[data-sort]").forEach(th => {
        th.innerHTML = th.innerHTML.replace(/ [▲▼]/g, "");
        if (th.dataset.sort === sort.field) {
            th.innerHTML += sort.order === "asc" ? " ▲" : " ▼";
        }
    });
}

// Confronto per Array.sort() secondo l'ordine scelto ("asc" o "desc").
export function compareValues(valA, valB, order) {
    if (valA < valB) return order === "asc" ? -1 : 1;
    if (valA > valB) return order === "asc" ? 1 : -1;
    return 0;
}
