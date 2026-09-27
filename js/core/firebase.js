// Connessione a Firebase (progetto "dlbp-website") e funzioni Firestore usate dal sito.
// Tutte le pagine importano Firestore da qui, così la versione dell'SDK è scritta in un solo punto.
// Questa configurazione è pubblica per natura: la protezione dei dati è in firestore.rules.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export {
    collection, doc, query, where,
    getDoc, getDocs, getCountFromServer, onSnapshot,
    setDoc, addDoc, updateDoc, deleteDoc, writeBatch,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

export { app, db };
