// Pagina annulla-iscrizione.html?id=<codice>: il link personale nelle mail di invito.
// L'ID è il codice segreto del contatto in "contacts"; le regole permettono solo di cancellarlo.
// Serve il clic su CONFERMA: i programmi di posta aprono da soli i link per controllarli.
import { db, doc, deleteDoc } from "../core/firebase.js";

const id = new URLSearchParams(location.search).get("id") || "";
const btn = document.getElementById("unsub-btn");
const text = document.getElementById("unsub-text");
const message = document.getElementById("unsub-message");

function showMessage(msg, isError) {
    message.textContent = msg;
    message.classList.remove("hidden");
    message.classList.toggle("error", isError);
}

if (!/^[A-Za-z0-9]{20}$/.test(id)) {
    btn.classList.add("hidden");
    text.textContent = "Il link non è valido. Usa il link \"Annulla l'iscrizione\" che trovi in fondo alla mail di invito.";
} else {
    btn.addEventListener("click", async () => {
        btn.disabled = true;
        try {
            await deleteDoc(doc(db, "contacts", id));
            btn.classList.add("hidden");
            document.getElementById("unsub-title").textContent = "FATTO";
            text.textContent = "Il tuo contatto è stato cancellato: non riceverai più inviti DLBP.";
        } catch (e) {
            console.error("Annulla iscrizione:", e);
            btn.disabled = false;
            showMessage("Qualcosa non ha funzionato. Riprova tra poco.", true);
        }
    });
}
