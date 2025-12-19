// Firebase Config
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

// ===== إضافة نظام تذكر تسجيل الدخول =====
let rememberMe = localStorage.getItem('rememberMe') === 'true';

// تعديل عملية تسجيل الدخول المجهول
if (rememberMe) {
    // إذا كان هناك UID مخزن، استخدمه
    const savedUID = localStorage.getItem('userUID');
    if (savedUID) {
        userUID = savedUID;
        // يمكنك هنا محاولة إعادة المصادقة إذا لزم الأمر
        firebase.auth().signInAnonymously().catch(err => console.error(err));
    } else {
        firebase.auth().signInAnonymously().catch(err => console.error(err));
    }
} else {
    firebase.auth().signInAnonymously().catch(err => console.error(err));
}

let userUID = null;
firebase.auth().onAuthStateChanged(u => {
    if (u) {
        userUID = u.uid;
        // حفظ UID إذا كان تذكر الدخول مفعل
        if (rememberMe) {
            localStorage.setItem('userUID', u.uid);
        }
    }
});

const categories = ["CPU","GPU","RAM","Motherboard","Storage","Power Supply","Case","Cooler","Accessories"];
let budget = null;

/* ===== Pagination Variables ===== */
let currentPage = 1;
const postsPerPage = 6;

// ===== إضافة متغيرات نظام المصادقة =====
let currentUser = null;
let userDisplayName = null;
let userFullName = null;

// ===== إضافة دالة تذكرني =====
function toggleRememberMe() {
    rememberMe = !rememberMe;
    localStorage.setItem('rememberMe', rememberMe);
    
    if (rememberMe && userUID) {
        localStorage.setItem('userUID', userUID);
    } else {
        localStorage.removeItem('userUID');
    }
    
    updateRememberMeButton();
}

function updateRememberMeButton() {
    const btn = document.getElementById('rememberMeBtn');
    if (btn) {
        btn.innerHTML = rememberMe ? 
            '✅ تذكر تسجيل الدخول مفعل' : 
            '🔲 تذكر تسجيل الدخول';
        btn.style.backgroundColor = rememberMe ? '#059669' : '#374151';
    }
}

// ===== تعديل دالة logoutUser لحذف البيانات المخزنة =====
function logoutUser() {
    // حذف بيانات التذكر من localStorage
    localStorage.removeItem('userUID');
    localStorage.removeItem('rememberMe');
    rememberMe = false;
    
    firebase.auth().signOut()
        .then(() => {
            currentUser = null;
            userDisplayName = null;
            userFullName = null;
            userUID = null;
            updateAuthUI();
            showHome();
        })
        .catch((error) => {
            console.error("Logout error:", error);
            alert("حدث خطأ أثناء تسجيل الخروج");
        });
}

// ===== تحديث دالة updateAuthUI لتضمين زر التذكر =====
function updateAuthUI() {
    const authSection = document.getElementById("authSection");
    if (!authSection) return;
    
    if (currentUser && userDisplayName) {
        // المستخدم مسجل الدخول
        const displayName = userFullName || userDisplayName;
        authSection.innerHTML = `
            <div class="user-info">
                <p class="profile-link" onclick="viewMyProfile()">👤 ${displayName}</p>
                <small style="color:#9ca3af; font-size:12px;">@${userDisplayName}</small>
                <div style="margin-top:10px;">
                    <button id="rememberMeBtn" class="remember-btn" onclick="toggleRememberMe()">
                        ${rememberMe ? '✅ تذكر تسجيل الدخول مفعل' : '🔲 تذكر تسجيل الدخول'}
                    </button>
                    <button class="logout-btn" onclick="logoutUser()">تسجيل خروج</button>
                </div>
            </div>
        `;
        updateRememberMeButton();
    } else {
        // المستخدم غير مسجل
        authSection.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:10px;">
                <div>
                    <input type="checkbox" id="rememberCheckbox" ${rememberMe ? 'checked' : ''} 
                           onchange="toggleRememberMe()">
                    <label for="rememberCheckbox" style="font-size:14px; color:#9ca3af;">تذكرني</label>
                </div>
                <div style="display:flex; gap:10px;">
                    <button class="auth-btn" onclick="window.location.href='login.html'">🔐 تسجيل دخول</button>
                    <button class="auth-btn" onclick="window.location.href='register.html'">📝 إنشاء حساب</button>
                </div>
            </div>
        `;
    }
}

// Sidebar
function toggleSidebar(){document.querySelector(".sidebar").classList.toggle("active")}
function closeSidebar(){document.querySelector(".sidebar").classList.remove("active")}

// Home
function showHome(){
  closeSidebar();
  document.getElementById("content").innerHTML = `
    <div class="search-bar">
      <input id="search" placeholder="🔍 ابحث عن قطعة..." onkeyup="loadProducts()">
      <select id="cat" onchange="loadProducts()">
        <option value="">كل الأقسام</option>
        ${categories.map(c=>`<option>${c}</option>`).join("")}
      </select>
      <button onclick="showBudgetDialog()" class="budget-btn">ميزانيتك 💰</button>
    </div>
    <div class="cards" id="products"></div>
    <div id="pagination" style="text-align:center;margin:20px"></div>
  `;
  loadProducts();
}

// Budget Dialog
function showBudgetDialog(){document.getElementById("budgetDialog").classList.add("show")}
function closeBudget(){document.getElementById("budgetDialog").classList.remove("show")}
function applyBudget(){
  const val=parseFloat(document.getElementById("maxBudget").value);
  budget=!isNaN(val)?val:null;
  closeBudget();
  loadProducts();
}

// Load Products
function loadProducts(){
  const s=document.getElementById("search").value.toLowerCase();
  const c=document.getElementById("cat").value;
  db.ref("products").once("value",snap=>{
    const d=snap.val()||{};
    let htmlCards=[];
    Object.keys(d).forEach(k=>{
      const p=d[k];
      const price=parseFloat(p.price)||0;
      if((!c||p.category===c)&&p.name.toLowerCase().includes(s)){
        if(budget&&price>budget) return;
        
        // ===== إضافة زر الملف الشخصي للبائع =====
        const sellerSection = userDisplayName ? 
          `<div class="seller">
            👤 <span class="seller-link" onclick="viewProfile('${p.uid}', '${p.seller}')">${p.seller}</span> | ☎ ${p.phone}
            <br><small style="color:#9ca3af; font-size:11px;">انقر على الاسم لعرض البروفايل</small>
          </div>` :
          `<div class="seller">
            👤 ${p.seller} | ☎ ${p.phone}
          </div>`;
        
        htmlCards.push({uid:p.uid,key:k,html:`
          <div class="card" onclick="showDetails('${k}')">
            <h3>${p.name}</h3>
            <span class="price">${p.price} د.ع</span>
            <div class="meta">
              <span>${p.category}</span>
              <span>${p.province}</span>
              <span>توصيل: ${p.delivery}</span>
            </div>
            ${sellerSection}
            <div class="actions">
              ${p.uid===userUID?`<button class="edit" onclick="editProduct('${k}')">تعديل</button>
              <button class="del" onclick="deleteProduct('${k}')">حذف</button>`:""}
            </div>
          </div>`});
      }
    });

    // ترتيب منشورات المستخدم أولاً
    if(userUID){
      htmlCards = htmlCards.sort((a,b)=> b.uid===userUID ? 1 : -1);
    }

    // Pagination
    const totalPages = Math.ceil(htmlCards.length / postsPerPage);
    if(currentPage > totalPages) currentPage = 1;
    const start = (currentPage-1)*postsPerPage;
    const pageItems = htmlCards.slice(start, start+postsPerPage);

    let finalHTML = pageItems.map(p=>p.html).join("") || "<p class='empty'>لا توجد إعلانات</p>";
    document.getElementById("products").innerHTML = finalHTML;

    renderPagination(totalPages);
  });
}

// Render Pagination Buttons
function renderPagination(total){
  let html = "";
  for(let i=1;i<=total;i++){
    html += `
      <button onclick="goPage(${i})"
        style="
          margin:3px;
          padding:6px 10px;
          border-radius:5px;
          border:none;
          cursor:pointer;
          background:${i===currentPage?'#38bdf8':'#1f2937'};
          color:${i===currentPage?'#000':'#fff'};
        ">
        ${i}
      </button>`;
  }
  document.getElementById("pagination").innerHTML = html;
}

function goPage(p){
  currentPage = p;
  loadProducts();
}

// ===== تحديث دالة deleteProduct لتحديث العداد =====
function deleteProduct(k){ 
  if(confirm("حذف الإعلان؟")) {
    // الحصول على بيانات المنتج أولاً
    db.ref("products/" + k).once('value', (snapshot) => {
      const product = snapshot.val();
      if (product) {
        // تقليل عداد منتجات المستخدم
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
        db.ref("products/"+k).remove().then(() => {
          loadProducts();
        });
      }
    });
  } 
}

function editProduct(k){db.ref("products/"+k).once("value",s=>showPublish(s.val(),k))}

// ===== تعديل دالة showPublish لدعم المصادقة =====
function showPublish(p=null,k=null){
  closeSidebar();
  
  // استخدام اسم المستخدم إذا كان مسجلاً
  const sellerName = userDisplayName || (p ? p.seller : "");
  const sellerField = userDisplayName ? 
    `<input id="seller" placeholder="اسم البائع" value="${sellerName}" disabled style="background:#374151; color:#9ca3af; cursor:not-allowed;">
     <small style="color:#38bdf8; font-size:12px;">اسم البائع هو اسم المستخدم المسجل</small>` :
    `<input id="seller" placeholder="اسم البائع" value="${sellerName}">`;
  
  document.getElementById("content").innerHTML=`
    <div class="form-box">
      <h2>${p?"تعديل إعلان":"نشر إعلان جديد"}</h2>
      <input id="name" placeholder="اسم القطعة" value="${p?p.name:""}">
      <input id="price" type="number" placeholder="السعر" value="${p?p.price:""}">
      <select id="category">${categories.map(c=>`<option ${p&&p.category===c?"selected":""}>${c}</option>`).join("")}</select>
      ${sellerField}
      <input id="phone" placeholder="رقم الهاتف" value="${p?p.phone:""}">
      <input id="province" placeholder="المحافظة" value="${p?p.province:""}">
      <select id="delivery">
        <option ${p&&p.delivery==="نعم"?"selected":""}>نعم</option>
        <option ${p&&p.delivery==="لا"?"selected":""}>لا</option>
      </select>
      <button onclick="save('${k||""}')">💾 حفظ</button>
    </div>`;
}

// ===== تحديث دالة save لإضافة عداد المنتجات =====
function save(k){
  const phone = document.getElementById("phone").value.trim();
  if(!/^[0][0-9]{10}$/.test(phone)){
    alert("رقم الهاتف يجب أن يكون 11 رقم ويبدأ بصفر.");
    return;
  }

  // استخدام اسم المستخدم المسجل إذا كان متوفراً
  const seller = userDisplayName || document.getElementById("seller").value;

  const data = {
    name: document.getElementById("name").value,
    price: document.getElementById("price").value,
    category: document.getElementById("category").value,
    seller: seller,
    phone: phone,
    province: document.getElementById("province").value,
    delivery: document.getElementById("delivery").value,
    uid: userUID,
    timestamp: firebase.database.ServerValue.TIMESTAMP
  };
  
  const ref = k ? db.ref("products/"+k) : db.ref("products").push();
  
  ref.set(data).then(() => {
    // ===== تحديث عداد منتجات المستخدم (للإعلانات الجديدة فقط) =====
    if (!k && userUID) {
      db.ref('users/' + userUID).once('value', (snapshot) => {
        const userData = snapshot.val();
        if (userData) {
          const currentCount = userData.totalProducts || 0;
          db.ref('users/' + userUID).update({
            totalProducts: currentCount + 1,
            lastActive: firebase.database.ServerValue.TIMESTAMP
          });
        } else {
          // إذا لم يكن للمستخدم بيانات، إنشاءها
          db.ref('users/' + userUID).update({
            totalProducts: 1,
            lastActive: firebase.database.ServerValue.TIMESTAMP
          });
        }
      });
    }
    showHome();
  }).catch(error => {
    console.error("Error saving product:", error);
    alert("حدث خطأ أثناء حفظ الإعلان");
  });
}

// ===== إضافة دالة showDetails لعرض تفاصيل المنتج =====
function showDetails(k){
  db.ref("products/"+k).once("value",snap=>{
    const p = snap.val();
    if(!p) return;
    
    // ===== إضافة زر الملف الشخصي في نافذة التفاصيل =====
    const sellerWithLink = userDisplayName ? 
      `<p><strong>البائع:</strong> <span class="seller-link" onclick="viewProfile('${p.uid}', '${p.seller}')" style="font-weight:bold;">${p.seller}</span></p>
       <p><small style="color:#38bdf8;">انقر على اسم البائع لعرض ملفه الشخصي</small></p>` :
      `<p><strong>البائع:</strong> ${p.seller}</p>`;
    
    document.getElementById("detailsContent").innerHTML = `
      <h2>${p.name}</h2>
      <p><strong>السعر:</strong> ${p.price} د.ع</p>
      <p><strong>القسم:</strong> ${p.category}</p>
      ${sellerWithLink}
      <p><strong>رقم الهاتف:</strong> ${p.phone}</p>
      <p><strong>المحافظة:</strong> ${p.province}</p>
      <p><strong>التوصيل:</strong> ${p.delivery}</p>
      ${p.uid === userUID ? `<p style="color:#38bdf8; font-size:14px; margin-top:10px;">هذا إعلانك</p>` : ""}
    `;
    document.getElementById("detailsDialog").style.display="block";
  });
}

function closeDetails(){
  document.getElementById("detailsDialog").style.display="none";
}

// متابعة حالة المصادقة
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    currentUser = user;
    userUID = user.uid;
    
    // حفظ UID إذا كان تذكر الدخول مفعل
    if (rememberMe) {
      localStorage.setItem('userUID', user.uid);
    }
    
    // الحصول على بيانات المستخدم من قاعدة البيانات
    db.ref("users/" + user.uid).once("value", snapshot => {
      const userData = snapshot.val();
      if (userData) {
        userDisplayName = userData.username;
        userFullName = userData.fullName || userData.username;
        updateAuthUI();
        
        // تحديث وقت آخر نشاط
        db.ref("users/" + user.uid).update({
          lastActive: firebase.database.ServerValue.TIMESTAMP
        });
      }
    });
  } else {
    // المستخدم غير مسجل
    currentUser = null;
    userDisplayName = null;
    userFullName = null;
    
    // إذا كان تذكر الدخول غير مفعل، حذف UID المخزن
    if (!rememberMe) {
      localStorage.removeItem('userUID');
      userUID = null;
    }
    
    updateAuthUI();
  }
});

// ===== إضافة دوال نظام الملف الشخصي =====
function viewProfile(userId, sellerName) {
  // حفظ اسم البائع للاستخدام لاحقاً
  if (sellerName) {
    localStorage.setItem('profileSellerName', sellerName);
  }
  
  // الانتقال لصفحة الملف الشخصي
  window.location.href = `profile.html?id=${userId}`;
}

function viewMyProfile() {
  if (currentUser && currentUser.uid) {
    window.location.href = `profile.html?id=${currentUser.uid}`;
  } else {
    alert('يرجى تسجيل الدخول أولاً');
    window.location.href = 'login.html';
  }
}

// Init
document.addEventListener("DOMContentLoaded",function(){
  // تحميل إعدادات التذكر من localStorage
  const savedRememberMe = localStorage.getItem('rememberMe');
  if (savedRememberMe !== null) {
    rememberMe = savedRememberMe === 'true';
  }
  
  showHome();
  updateAuthUI();
  
  // إضافة أنماط إضافية لروابط البائعين
  const style = document.createElement('style');
  style.textContent = `
    .seller-link {
      color: #38bdf8;
      cursor: pointer;
      text-decoration: underline;
      transition: color 0.2s;
    }
    .seller-link:hover {
      color: #0ea5e9;
      text-decoration: none;
    }
    .profile-link {
      color: #38bdf8;
      cursor: pointer;
      transition: color 0.2s;
    }
    .profile-link:hover {
      color: #0ea5e9;
    }
    .remember-btn {
      background: #374151;
      color: white;
      border: 1px solid #4b5563;
      padding: 5px 10px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 12px;
      margin-right: 5px;
      transition: background 0.3s;
    }
    .remember-btn:hover {
      background: #4b5563;
    }
  `;
  document.head.appendChild(style);
});
