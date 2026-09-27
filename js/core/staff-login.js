// Login dello staff, uguale per admin.html, scanner.html e pr.html.
// Il ruolo di ogni account è nel documento Firestore staff/{email in minuscolo}:
// { role: "admin" | "scanner" | "pr", prCode: "..." (solo per i PR) }.
import { db, doc, getDoc } from "./firebase.js";
import { auth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "./firebase-auth.js";

// Restituisce il documento staff dell'email, oppure null se l'account non ha un ruolo.
export async function getStaffProfile(email) {
    const staffSnap = await getDoc(doc(db, "staff", email.toLowerCase()));
    return staffSnap.exists() ? staffSnap.data() : null;
}

/**
 * Collega il form di login e controlla il ruolo a ogni accesso.
 * - isAllowed(profile): true se il ruolo può usare questa pagina
 * - onSignedIn(profile): mostra la pagina dello staff
 * - onSignedOut(): mostra di nuovo il form di login
 * Se il ruolo non va bene l'account viene scollegato e compare deniedMessage.
 * Restituisce { showLoginError } per mostrare altri errori nello stesso riquadro.
 */
export function setupStaffLogin({
    emailInput, passwordInput, loginBtn, loginMessage,
    isAllowed, onSignedIn, onSignedOut,
    deniedMessage,
    loginErrorMessage = "Credenziali errate o utente non trovato.",
    busyText = null
}) {
    function showLoginError(text) {
        loginMessage.textContent = text;
        loginMessage.className = "form-message error";
        loginMessage.classList.remove("hidden");
    }

    if (!auth) return { showLoginError };

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            onSignedOut();
            return;
        }
        try {
            const profile = await getStaffProfile(user.email);
            if (!profile || !isAllowed(profile)) {
                await signOut(auth);
                showLoginError(deniedMessage);
                return;
            }
            await onSignedIn(profile);
        } catch (error) {
            console.error("Error checking staff role:", error);
            await signOut(auth);
            showLoginError("Errore di connessione al database.");
        }
    });

    loginBtn.addEventListener("click", async () => {
        const email = emailInput.value.trim();
        const pwd = passwordInput.value;
        if (!email || !pwd) {
            showLoginError("Inserisci email e password.");
            return;
        }

        const originalText = loginBtn.textContent;
        loginBtn.disabled = true;
        if (busyText) loginBtn.textContent = busyText;

        try {
            await signInWithEmailAndPassword(auth, email, pwd);
            // onAuthStateChanged will handle the UI switch
        } catch (error) {
            console.error("Login error:", error);
            showLoginError(loginErrorMessage);
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = originalText;
        }
    });

    passwordInput.addEventListener("keyup", (e) => {
        if (e.key === "Enter") loginBtn.click();
    });
    emailInput.addEventListener("keyup", (e) => {
        if (e.key === "Enter") passwordInput.focus();
    });

    return { showLoginError };
}
