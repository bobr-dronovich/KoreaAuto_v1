// ==========================================================================
// KoreaAuto_v1 - Firebase v10 Modular SDK Initialization
// ==========================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    sendPasswordResetEmail,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    setDoc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    orderBy, 
    limit, 
    startAfter, 
    onSnapshot, 
    serverTimestamp,
    writeBatch
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDvA_umj5-dTNCk1lvNs8mO0ExeMiNHkwY",
  authDomain: "korea-auto-3213f.firebaseapp.com",
  projectId: "korea-auto-3213f",
  storageBucket: "korea-auto-3213f.firebasestorage.app",
  messagingSenderId: "214087594043",
  appId: "1:214087594043:web:c77f6b7cf834e23c28ac1e",
  measurementId: "G-C7CYJEGK3R"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Authentication & Firestore
const auth = getAuth(app);
const db = getFirestore(app);

// Export instances and functions
export { 
    app, 
    auth, 
    db, 
    // Auth functions
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged, 
    sendPasswordResetEmail,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    updateProfile,
    // Firestore functions
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    setDoc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    orderBy, 
    limit, 
    startAfter, 
    onSnapshot, 
    serverTimestamp,
    writeBatch
};
