// Stato condiviso dai moduli del pannello admin. Si legge e si modifica sempre da qui
// (es. state.currentEventId), così tutti i moduli vedono gli stessi valori.
export const state = {
    currentEventId: null,               // evento selezionato nel menu a tendina
    isCreatingNew: false,               // true mentre il pannello crea un nuovo evento
    usersData: [],                      // iscritti dell'evento selezionato
    sort: { field: "timestamp", order: "desc" }, // ordinamento della tabella iscritti
    maxCapacity: 100                    // capienza dell'evento selezionato
};
