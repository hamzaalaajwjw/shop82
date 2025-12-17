<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>a3len | دخول الأدمن</title>
  <link rel="stylesheet" href="../css/style.css">
</head>
<body>
<header class="header">
  <h1>a3len</h1>
  <p>تسجيل دخول الإدارة</p>
</header>
<main class="container">
  <form id="loginForm">
    <input type="email" id="email" placeholder="الإيميل" required>
    <br><br>
    <input type="password" id="password" placeholder="كلمة المرور" required>
    <br><br>
    <button type="submit" class="whatsapp">دخول</button>
  </form>
  <p id="msg"></p>
</main>
<script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-auth.js"></script>
<script src="../js/firebase.js"></script>
<script src="admin.js"></script>
</body>
</html>