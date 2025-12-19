// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { 
    getDatabase, 
    ref, 
    set, 
    get, 
    update, 
    remove, 
    push, 
    onValue, 
    onChildAdded, 
    query, 
    orderByChild, 
    equalTo,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAl3XunFOwHpGw-4_VYyETMtoLgk4mnRpQ",
    authDomain: "a3len-3ad54.firebaseapp.com",
    databaseURL: "https://a3len-3ad54-default-rtdb.firebaseio.com",
    projectId: "a3len-3ad54",
    storageBucket: "a3len-3ad54.firebasestorage.app",
    messagingSenderId: "767338034080",
    appId: "1:767338034080:web:801d77fb74c0aa56e92ac5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

export { 
    app, 
    auth, 
    database, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    ref, 
    set, 
    get, 
    update, 
    remove, 
    push, 
    onValue, 
    onChildAdded, 
    query, 
    orderByChild, 
    equalTo,
    serverTimestamp 
};