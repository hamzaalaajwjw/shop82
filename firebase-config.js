import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAl3XunFOwHpGw-4_VYyETMtoLgk4mnRpQ",
    authDomain: "a3len-3ad54.firebaseapp.com",
    databaseURL: "https://a3len-3ad54-default-rtdb.firebaseio.com",
    projectId: "a3len-3ad54",
    storageBucket: "a3len-3ad54.firebasestorage.app",
    messagingSenderId: "767338034080",
    appId: "1:767338034080:web:801d77fb74c0aa56e92ac5"
};

// تهيئة Firebase
console.log('🔥 تهيئة Firebase...');
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

console.log('✅ Firebase جاهز:', {
    app: app.name,
    auth: auth.currentUser ? 'مستخدم مسجل' : 'لا يوجد مستخدم',
    database: database
});

export { app, auth, database };
