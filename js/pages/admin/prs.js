// Admin – sezione PR: aggiunta, collegamento dell'email di accesso ed eliminazione dei PR.
// Ogni PR ha un documento in "prs" e, per il login, uno in "staff/{email}" con role "pr" e prCode:
// i due documenti vengono sempre scritti o cancellati insieme (writeBatch).
import { db, collection, doc, onSnapshot, writeBatch } from "../../core/firebase.js";
import { getStaffProfile } from "../../core/staff-login.js";
import { escapeHtml } from "../../core/html.js";
import { toMillis } from "../../core/dates.js";
import { showModal, showConfirm } from "../../core/modal.js";

const addPrBtn = document.getElementById('add-pr-btn');
const prNameInput = document.getElementById('pr-name-input');
const prCodeInput = document.getElementById('pr-code-input');
const prEmailInput = document.getElementById('pr-email-input');
const prTableBody = document.getElementById('pr-table-body');
let unsubPrs = null;

// Refuse to turn an existing admin/scanner account into a PR (it would lose its role)
async function emailHasOtherRole(email) {
    const profile = await getStaffProfile(email);
    return profile !== null && profile.role !== "pr";
}

export function initPrs() {
    addPrBtn.addEventListener('click', async () => {
        const name = prNameInput.value.trim();
        const code = prCodeInput.value.trim().toLowerCase();
        const email = prEmailInput.value.trim().toLowerCase();
        
        if (!name || !code || !email) {
            showModal("Inserisci Nome, Codice ed Email.");
            return;
        }

        try {
            if (await emailHasOtherRole(email)) {
                showModal("Questa email appartiene già a un account admin o scanner.");
                return;
            }
            // The PR entry and its login role (/staff/{email}) are written together
            const batch = writeBatch(db);
            batch.set(doc(collection(db, "prs")), {
                name: name,
                code: code,
                email: email,
                isActive: true,
                createdAt: new Date()
            });
            batch.set(doc(db, "staff", email), { role: "pr", prCode: code });
            await batch.commit();
            prNameInput.value = '';
            prCodeInput.value = '';
            prEmailInput.value = '';
        } catch (error) {
            console.error("Error adding PR:", error);
            showModal("Errore nell'aggiunta del PR.");
        }
    });
}

// Tabella dei PR, aggiornata in tempo reale.
export function loadPRs() {
    if (unsubPrs) unsubPrs();
    
    // Passiamo direttamente la collection senza query() vuota
    unsubPrs = onSnapshot(collection(db, "prs"), (snapshot) => {
        prTableBody.innerHTML = '';
        
        if (snapshot.empty) {
            prTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nessun PR trovato.</td></tr>';
            return;
        }

        let prsList = [];
        snapshot.forEach((docSnap) => {
            prsList.push({ id: docSnap.id, ...docSnap.data() });
        });
        
        // Ordinamento sicuro
        prsList.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));

        const fragment = document.createDocumentFragment();
        prsList.forEach((pr) => {
            const prId = pr.id;
            const prCode = pr.code || "";
            const prName = pr.name || "";
            const prEmail = pr.email || "";
            const link = `?pr=${prCode}`;
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-label="NOME" title="${escapeHtml(prName)}"><span class="truncate-mobile">${escapeHtml(prName)}</span>${prEmail ? `<br><small style="color:#666;">${escapeHtml(prEmail)}</small>` : ''}</td>
                <td data-label="CODICE / LINK"><span class="truncate-mobile" style="color:var(--accent-color);">${escapeHtml(prCode)}</span><br><small style="color:#666;">${escapeHtml(link)}</small></td>
                <td data-label="STATO"><span class="truncate-mobile">${pr.isActive ? '<span style="color:var(--success-color);">ATTIVO</span>' : '<span style="color:var(--error-color);">DISABILITATO</span>'}</span></td>
                <td data-label="AZIONI" style="text-align: right;">
                    ${prEmail ? '' : `<button class="submit-btn link-pr-btn" data-id="${prId}" data-code="${escapeHtml(prCode)}" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; min-width: unset; margin: 0 0.3rem 0 0;">COLLEGA EMAIL</button>`}
                    <button class="submit-btn delete-pr-btn" data-id="${prId}" data-email="${escapeHtml(prEmail)}" style="padding: 0.3rem 0.6rem; background: var(--error-color); border: none; font-size: 0.8rem; min-width: unset; margin: 0;">ELIMINA</button>
                </td>
            `;
            fragment.appendChild(tr);
        });
        prTableBody.appendChild(fragment);

        // PRs created before staff login have no email: link one to give them access
        document.querySelectorAll('.link-pr-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                const code = e.target.getAttribute('data-code');
                const input = prompt(`Email di accesso del PR "${code}":`);
                if (input === null) return;
                const email = input.trim().toLowerCase();
                if (!/^[^@ ]+@[^@ ]+[.][^@ ]+$/.test(email)) {
                    showModal("Email non valida.");
                    return;
                }
                try {
                    if (await emailHasOtherRole(email)) {
                        showModal("Questa email appartiene già a un account admin o scanner.");
                        return;
                    }
                    const batch = writeBatch(db);
                    batch.update(doc(db, "prs", id), { email: email });
                    batch.set(doc(db, "staff", email), { role: "pr", prCode: code });
                    await batch.commit();
                } catch (error) {
                    console.error("Errore collegamento email PR:", error);
                    showModal("Impossibile collegare l'email al PR.");
                }
            });
        });

        document.querySelectorAll('.delete-pr-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                const email = e.target.getAttribute('data-email');
                if (await showConfirm("Vuoi davvero eliminare questo PR?")) {
                    try {
                        // Also revoke the PR's login role
                        const batch = writeBatch(db);
                        batch.delete(doc(db, "prs", id));
                        if (email) batch.delete(doc(db, "staff", email));
                        await batch.commit();
                    } catch (error) {
                        console.error("Errore eliminazione PR:", error);
                        showModal("Impossibile eliminare il PR.");
                    }
                }
            });
        });
    }, (error) => {
        console.error("Firebase Error PRs:", error);
        prTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red;">Errore di connessione: ${error.message}</td></tr>`;
    });
}
