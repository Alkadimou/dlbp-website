// Login Firebase (email e password) per le pagine dello staff: admin, scanner e PR.
// Le pagine pubbliche non lo importano, così non scaricano l'SDK di autenticazione.
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { app } from "./firebase.js";

export { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

export const auth = app ? getAuth(app) : null;
