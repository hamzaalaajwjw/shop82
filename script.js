
// Firebase Config - استخدم Environment Variables في الإنتاج
const firebaseConfig = {
  apiKey: "AIzaSyAl3XunFOwHpGw-4_VYyETMtoLgk4mnRpQ",
  authDomain: "a3len-3ad54.firebaseapp.com",
  databaseURL: "https://a3len-3ad54-default-rtdb.firebaseio.com",
  projectId: "a3len-3ad54",
  storageBucket: "a3len-3ad54.firebasestorage.app",
  messagingSenderId: "767338034080",
  appId: "1:767338034080:web:801d77fb74c0aa56e92ac5"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
firebase.auth().signInAnonymously().catch(err=>console.error(err));

let userUID = null;
firebase.auth().onAuthStateChanged(u=>{if(u) userUID = u.uid;});

const categories = ["CPU","GPU","RAM","Motherboard","Storage","Power Supply","Case","Cooler","Accessories"];
let budget = null;

let currentPage = 1;
const postsPerPage = 6;

let currentUser = null;
let userDisplayName = null;
let userFullName = null;

// ===== 🔒 دوال الأمان المحسنة =====

// دالة Escape محسنة ضد XSS
function escapeHTML(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// دالة تنظيف Input
function sanitizeInput(input, maxLength = 100) {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>'"]/g, ''); // إزالة أحرف خطيرة
}

// التحقق من رقم الهاتف العراقي
function validateIraqiPhone(phone) {
  // يقبل فقط: 07[3-9][0-9]{8}
  const iraqiPhoneRegex = /^07[3-9][0-9]{8}$/;
  
  if (!iraqiPhoneRegex.test(phone)) {
    return {
      valid: false,
      message: 'رقم الهاتف يجب أن يبدأ بـ 073-079 ويتكون من 11 رقم'
    };
  }
  
  // رفض الأرقام المتكررة
  if (/^(.)\1{10}$/.test(phone)) {
    return {
      valid: false,
      message: 'رقم الهاتف غير صالح'
    };
  }
  
  return { valid: true };
}

// التحقق من السعر
function validatePrice(price) {
  const priceNum = parseFloat(price);
  
  if (isNaN(priceNum)) {
    return { valid: false, message: 'السعر يجب أن يكون رقماً' };
  }
  
  if (priceNum < 1000) {
    return { valid: false, message: 'السعر يجب أن يكون 1000 دينار على الأقل' };
  }
  
  if (priceNum > 10000000) {
    return { valid: false, message: 'السعر يجب أن يكون أقل من 10 مليون دينار' };
  }
  
  return { valid: true, value: priceNum };
}

// ===== 🔒 CSRF Protection =====
class CSRFProtection {
  constructor() {
    this.token = this.generateToken();
    sessionStorage.setItem('csrf_token', this.token);
  }
  
  generateToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  getToken() {
    let token = sessionStorage.getItem('csrf_token');
    if (!token) {
      token = this.generateToken();
      sessionStorage.setItem('csrf_token', token);
    }
    return token;
  }
  
  validateToken(token) {
    return token === this.getToken();
  }
}

const csrfProtection = new CSRFProtection();

// ===== Sidebar =====
function toggleSidebar(){document.querySelector(".sidebar").classList.toggle("active")}
function closeSidebar(){document.querySelector(".sidebar").classList.remove("active")}

// ===== Home =====
function showHome(){
  closeSidebar();
  document.getElementById("content").innerHTML = `
    <div class="search-bar">
      <input id="search" placeholder="🔍 ابحث عن قطعة..." onkeyup="loadProducts()" maxlength="50">
      <select id="cat" onchange="loadProducts()">
        <option value="">كل الأقسام</option>
        ${categories.map(c=>`<option>${escapeHTML(c)}</option>`).join("")}
      </select>
      <button onclick="showBudgetDialog()" class="budget-btn">ميزانيتك 💰</button>
    </div>
    <div class="cards" id="products"></div>
    <div id="pagination" style="text-align:center;margin:20px"></div>
  `;
  loadProducts();
}

// ===== Budget Dialog =====
function showBudgetDialog(){document.getElementById("budgetDialog").classList.add("show")}
function closeBudget(){document.getElementById("budgetDialog").classList.remove("show")}

function applyBudget(){
  const val = parseFloat(document.getElementById("maxBudget").value);
  
  if (isNaN(val) || val < 0) {
    alert('يرجى إدخال قيمة صحيحة');
    return;
  }
  
  if (val > 10000000) {
    alert('القيمة كبيرة جداً');
    return;
  }
  
  budget = val;
  closeBudget();
  loadProducts();
}

// ===== Load Products (محمي) =====
function loadProducts(){
  const searchInput = document.getElementById("search");
  const catSelect = document.getElementById("cat");
  
  if (!searchInput || !catSelect) return;
  
  const s = sanitizeInput(searchInput.value.toLowerCase(), 50);
  const c = catSelect.value;
  
  db.ref("products").once("value", snap => {
    const d = snap.val() || {};
    let htmlCards = [];
    
    Object.keys(d).forEach(k => {
      const p = d[k];
      
      // 🔒 التحقق من صحة البيانات
      if (!p || !p.name || !p.price || !p.seller || !p.phone) {
        return;
      }
      
      const price = parseFloat(p.price);
      
      if (isNaN(price) || price < 0) {
        return;
      }
      
      if ((!c || p.category === c) && p.name.toLowerCase().includes(s)) {
        if (budget && price > budget) return;
        
        // 🔒 Escape جميع البيانات
        const safeName = escapeHTML(p.name);
        const safeSeller = escapeHTML(p.seller);
        const safePhone = escapeHTML(p.phone);
        const safeCategory = escapeHTML(p.category || 'غير محدد');
        const safeProvince = escapeHTML(p.province || 'غير محدد');
        const safeDelivery = escapeHTML(p.delivery || 'لا');
        
        const sellerSection = userDisplayName ? 
          `<div class="seller">
            👤 <span class="seller-link" onclick="viewProfile('${escapeHTML(p.uid)}', '${safeSeller}')">${safeSeller}</span> | ☎ ${safePhone}
            <br><small style="color:#9ca3af; font-size:11px;">انقر على الاسم لعرض البروفايل</small>
          </div>` :
          `<div class="seller">
            👤 ${safeSeller} | ☎ ${safePhone}
          </div>`;
        
        htmlCards.push({
          uid: p.uid,
          key: k,
          html: `
            <div class="card" onclick="showDetails('${escapeHTML(k)}')">
              <h3>${safeName}</h3>
              <span class="price">${price.toLocaleString('ar-SA')} د.ع</span>
              <div class="meta">
                <span>${safeCategory}</span>
                <span>${safeProvince}</span>
                <span>توصيل: ${safeDelivery}</span>
              </div>
              ${sellerSection}
              <div class="actions">
                ${p.uid === userUID ? `
                  <button class="edit" onclick="event.stopPropagation(); editProduct('${escapeHTML(k)}')">تعديل</button>
                  <button class="del" onclick="event.stopPropagation(); deleteProduct('${escapeHTML(k)}')">حذف</button>
                ` : ""}
              </div>
            </div>
          `
        });
      }
    });

    // ترتيب منشورات المستخدم أولاً
    if (userUID) {
      htmlCards = htmlCards.sort((a,b) => b.uid === userUID ? 1 : -1);
    }

    // Pagination
    const totalPages = Math.ceil(htmlCards.length / postsPerPage);
    if (currentPage > totalPages && totalPages > 0) currentPage = 1;
    const start = (currentPage - 1) * postsPerPage;
    const pageItems = htmlCards.slice(start, start + postsPerPage);

    let finalHTML = pageItems.map(p => p.html).join("") || "<p class='empty'>لا توجد إعلانات</p>";
    
    const productsDiv = document.getElementById("products");
    if (productsDiv) {
      productsDiv.innerHTML = finalHTML;
    }

    renderPagination(totalPages);
  }).catch(error => {
    console.error("Load error:", error);
    const productsDiv = document.getElementById("products");
    if (productsDiv) {
      productsDiv.innerHTML = "<p class='empty'>حدث خطأ في التحميل</p>";
    }
  });
}

// ===== Pagination =====
function renderPagination(total){
  let html = "";
  for(let i = 1; i <= total; i++){
    html += `
      <button onclick="goPage(${i})" style="
        margin:3px;
        padding:6px 10px;
        border-radius:5px;
        border:none;
        cursor:pointer;
        background:${i === currentPage ? '#38bdf8' : '#1f2937'};
        color:${i === currentPage ? '#000' : '#fff'};
      ">
        ${i}
      </button>`;
  }
  
  const paginationDiv = document.getElementById('pagination');
  if (paginationDiv) {
    paginationDiv.innerHTML = html;
  }
}

function goPage(p){
  if (p < 1) return;
  currentPage = p;
  loadProducts();
}

// ===== 🔒 Delete Product (محمي) =====
function deleteProduct(k){ 
  if (!k || typeof k !== 'string') {
    alert('معرف غير صالح');
    return;
  }
  
  if (!confirm("حذف الإعلان؟ لا يمكن التراجع.")) {
    return;
  }
  
  db.ref("products/" + k).once('value', (snapshot) => {
    const product = snapshot.val();
    
    if (!product) {
      alert('الإعلان غير موجود');
      return;
    }
    
    // 🔒 التحقق من الصلاحية
    if (product.uid !== userUID) {
      alert('ليس لديك صلاحية');
      return;
    }
    
    // تقليل العداد
    if (product.uid) {
      db.ref('users/' + product.uid).once('value', (userSnapshot) => {
        const userData = userSnapshot.val();
        if (userData) {
          const currentCount = userData.totalProducts || 0;
          if (currentCount > 0) {
            db.ref('users/' + product.uid).update({
              totalProducts: currentCount - 1
            });
          }
        }
      });
    }
    
    // حذف المنتج
    db.ref("products/" + k).remove().then(() => {
      loadProducts();
    }).catch(error => {
      console.error("Delete error:", error);
      alert('حدث خطأ أثناء الحذف');
    });
  });
}

// ===== Edit Product =====
function editProduct(k){
  if (!k || typeof k !== 'string') {
    alert('معرف غير صالح');
    return;
  }
  
  db.ref("products/" + k).once("value", s => {
    const product = s.val();
    
    if (!product) {
      alert('الإعلان غير موجود');
      return;
    }
    
    // 🔒 التحقق من الصلاحية
    if (product.uid !== userUID) {
      alert('ليس لديك صلاحية');
      return;
    }
    
    showPublish(product, k);
  });
}

// ===== 🔒 Show Publish (محمي) =====
function showPublish(p = null, k = null){
  closeSidebar();
  
  const sellerName = userDisplayName || (p ? escapeHTML(p.seller) : "");
  const sellerField = userDisplayName ? 
    `<input id="seller" placeholder="اسم البائع" value="${sellerName}" disabled style="background:#374151; color:#9ca3af; cursor:not-allowed;">
     <small style="color:#38bdf8; font-size:12px;">اسم البائع هو اسم المستخدم المسجل</small>` :
    `<input id="seller" placeholder="اسم البائع" value="${sellerName}" maxlength="30">`;
  
  document.getElementById("content").innerHTML = `
    <div class="form-box">
      <h2>${p ? "تعديل إعلان" : "نشر إعلان جديد"}</h2>
      <input id="name" placeholder="اسم القطعة" value="${p ? escapeHTML(p.name) : ""}" maxlength="50" required>
      <input id="price" type="number" placeholder="السعر (1000 دينار كحد أدنى)" value="${p ? p.price : ""}" min="1000" max="10000000" required>
      <select id="category">
        ${categories.map(c => `<option ${p && p.category === c ? "selected" : ""}>${escapeHTML(c)}</option>`).join("")}
      </select>
      ${sellerField}
      <input id="phone" placeholder="رقم الهاتف (07xxxxxxxxx)" value="${p ? escapeHTML(p.phone) : ""}" maxlength="11" required>
      <small style="color:#9ca3af; font-size:12px;">مثال: 07501234567</small>
      <input id="province" placeholder="المحافظة" value="${p ? escapeHTML(p.province) : ""}" maxlength="30" required>
      <select id="delivery">
        <option ${p && p.delivery === "نعم" ? "selected" : ""}>نعم</option>
        <option ${p && p.delivery === "لا" ? "selected" : ""}>لا</option>
      </select>
      <button onclick="save('${k || ""}')">💾 حفظ</button>
    </div>`;
}

// ===== 🔒 Save (محمي بالكامل) =====
function save(k){
  // 🔒 التحقق من جميع الحقول
  const nameInput = document.getElementById("name");
  const priceInput = document.getElementById("price");
  const phoneInput = document.getElementById("phone");
  const provinceInput = document.getElementById("province");
  
  if (!nameInput || !priceInput || !phoneInput || !provinceInput) {
    alert('خطأ في النموذج');
    return;
  }
  
  const name = sanitizeInput(nameInput.value, 50);
  const price = priceInput.value.trim();
  const phone = phoneInput.value.trim();
  const province = sanitizeInput(provinceInput.value, 30);
  
  // 🔒 التحقق من الاسم
  if (!name || name.length < 3) {
    alert("اسم القطعة يجب أن يكون 3 أحرف على الأقل");
    nameInput.focus();
    return;
  }
  
  // 🔒 التحقق من السعر
  const priceValidation = validatePrice(price);
  if (!priceValidation.valid) {
    alert(priceValidation.message);
    priceInput.focus();
    return;
  }
  
  // 🔒 التحقق من الهاتف
  const phoneValidation = validateIraqiPhone(phone);
  if (!phoneValidation.valid) {
    alert(phoneValidation.message);
    phoneInput.focus();
    return;
  }
  
  // 🔒 التحقق من المحافظة
  if (!province || province.length < 2) {
    alert("المحافظة مطلوبة");
    provinceInput.focus();
    return;
  }
  
  const seller = userDisplayName || sanitizeInput(document.getElementById("seller").value, 30);
  
  if (!seller || seller.length < 2) {
    alert("اسم البائع مطلوب");
    return;
  }
  
  // 🔒 إنشاء البيانات المحمية
  const data = {
    name: name,
    price: priceValidation.value,
    category: document.getElementById("category").value,
    seller: seller,
    phone: phone,
    province: province,
    delivery: document.getElementById("delivery").value,
    uid: userUID,
    timestamp: firebase.database.ServerValue.TIMESTAMP
  };
  
  const ref = k ? db.ref("products/" + k) : db.ref("products").push();
  
  ref.set(data).then(() => {
    // تحديث عداد المنتجات للنشر الجديد فقط
    if (!k && userUID) {
      db.ref('users/' + userUID).once('value', (snapshot) => {
        const userData = snapshot.val();
        if (userData) {
          const currentCount = userData.totalProducts || 0;
          db.ref('users/' + userUID).update({
            totalProducts: currentCount + 1,
            lastActive: firebase.database.ServerValue.TIMESTAMP
          });
        }
      });
    }
    
    showHome();
  }).catch(error => {
    console.error("Save error:", error);
    alert("حدث خطأ أثناء حفظ الإعلان");
  });
}

// ===== 🔒 Show Details (محمي) =====
function showDetails(k){
  if (!k || typeof k !== 'string') {
    alert('معرف غير صالح');
    return;
  }
  
  db.ref("products/" + k).once("value", snap => {
    const p = snap.val();
    
    if (!p) {
      alert('الإعلان غير موجود');
      return;
    }
    
    // 🔒 Escape جميع البيانات
    const safeName = escapeHTML(p.name || 'غير معروف');
    const safePrice = parseFloat(p.price) || 0;
    const safeCategory = escapeHTML(p.category || 'غير محدد');
    const safeSeller = escapeHTML(p.seller || 'غير معروف');
    const safePhone = escapeHTML(p.phone || 'غير متوفر');
    const safeProvince = escapeHTML(p.province || 'غير محدد');
    const safeDelivery = escapeHTML(p.delivery || 'لا');
    
    const sellerWithLink = userDisplayName ? 
      `<p><strong>البائع:</strong> <span class="seller-link" onclick="viewProfile('${escapeHTML(p.uid)}', '${safeSeller}')" style="font-weight:bold;">${safeSeller}</span></p>
       <p><small style="color:#38bdf8;">انقر على اسم البائع لعرض ملفه الشخصي</small></p>` :
      `<p><strong>البائع:</strong> ${safeSeller}</p>`;
    
    document.getElementById("detailsContent").innerHTML = `
      <h2>${safeName}</h2>
      <p><strong>السعر:</strong> ${safePrice.toLocaleString('ar-SA')} د.ع</p>
      <p><strong>القسم:</strong> ${safeCategory}</p>
      ${sellerWithLink}
      <p><strong>رقم الهاتف:</strong> ${safePhone}</p>
      <p><strong>المحافظة:</strong> ${safeProvince}</p>
      <p><strong>التوصيل:</strong> ${safeDelivery}</p>
      ${p.uid === userUID ? `<p style="color:#38bdf8; font-size:14px; margin-top:10px;">هذا إعلانك</p>` : ""}
    `;
    
    document.getElementById("detailsDialog").style.display = "block";
  }).catch(error => {
    console.error("Details error:", error);
    alert('حدث خطأ في تحميل التفاصيل');
  });
}

function closeDetails(){
  document.getElementById("detailsDialog").style.display = "none";
}

// ===== Auth UI =====
function updateAuthUI() {
  const authSection = document.getElementById("authSection");
  if (!authSection) return;
  
  if (currentUser && userDisplayName) {
    const displayName = escapeHTML(userFullName || userDisplayName);
    const username = escapeHTML(userDisplayName);
    
    authSection.innerHTML = `
      <div class="user-info">
        <p class="profile-link" onclick="viewMyProfile()">👤 ${displayName}</p>
        <small style="color:#9ca3af; font-size:12px;">@${username}</small>
        <button class="logout-btn" onclick="logoutUser()">تسجيل خروج</button>
      </div>
    `;
  } else {
    authSection.innerHTML = `
      <button class="auth-btn" onclick="window.location.href='login.html'">🔐 تسجيل دخول</button>
      <button class="auth-btn" onclick="window.location.href='register.html'">📝 إنشاء حساب</button>
    `;
  }
}

function logoutUser() {
  firebase.auth().signOut()
    .then(() => {
      currentUser = null;
      userDisplayName = null;
      userFullName = null;
      updateAuthUI();
      showHome();
    })
    .catch((error) => {
      console.error("Logout error:", error);
      alert("حدث خطأ أثناء تسجيل الخروج");
    });
}

// ===== Profile Functions =====
function viewProfile(userId, sellerName) {
  if (!userId || typeof userId !== 'string') return;
  
  if (sellerName) {
    sessionStorage.setItem('profileSellerName', sanitizeInput(sellerName, 50));
  }
  
  window.location.href = `profile.html?id=${encodeURIComponent(userId)}`;
}

function viewMyProfile() {
  if (currentUser && currentUser.uid) {
    window.location.href = `profile.html?id=${encodeURIComponent(currentUser.uid)}`;
  } else {
    alert('يرجى تسجيل الدخول أولاً');
    window.location.href = 'login.html';
  }
}

// ===== Auth State =====
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    currentUser = user;
    userUID = user.uid;
    
    db.ref("users/" + user.uid).once("value", snapshot => {
      const userData = snapshot.val();
      if (userData) {
        userDisplayName = userData.username;
        userFullName = userData.fullName || userData.username;
        updateAuthUI();
        
        db.ref("users/" + user.uid).update({
          lastActive: firebase.database.ServerValue.TIMESTAMP
        });
      }
    });
  } else {
    currentUser = null;
    userDisplayName = null;
    userFullName = null;
    updateAuthUI();
  }
});

// ===== Init =====
document.addEventListener("DOMContentLoaded", function(){
  showHome();
  updateAuthUI();
  
  // 🔒 منع النقر الأيمن على الحقول الحساسة فقط
  document.addEventListener('contextmenu', function(e) {
    if (e.target.tagName === 'INPUT' && e.target.type === 'password') {
      e.preventDefault();
    }
  });
  
  // 🔒 منع فحص الكود
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
      e.preventDefault();
    }
  });
});