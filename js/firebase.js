<!-- 1️⃣ Firebase SDK -->
<script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-database.js"></script>

<!-- 2️⃣ Firebase Config -->
<script>
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
  firebase.initializeApp(firebaseConfig);

  // تعريف قاعدة البيانات
  const db = firebase.database();
</script>

<!-- 3️⃣ App Logic -->
<script src="js/app.js"></script>
