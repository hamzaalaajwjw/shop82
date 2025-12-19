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
firebase.auth().signInAnonymously().catch(err=>console.error(err));
let userUID = null;
firebase.auth().onAuthStateChanged(u=>{if(u) userUID = u.uid;});

const categories = ["CPU","GPU","RAM","Motherboard","Storage","Power Supply","Case","Cooler","Accessories"];
let budget = null;

/* ===== Pagination Variables ===== */
let currentPage = 1;
const postsPerPage = 6;

// ===== إضافة متغيرات نظام المصادقة =====
let currentUser = null;
let userDisplayName = null;

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
        htmlCards.push({uid:p.uid,key:k,html:`
          <div class="card">
            <h3>${p.name}</h3>
            <span class="price">${p.price} د.ع</span>
            <div class="meta">
              <span>${p.category}</span>
              <span>${p.province}</span>
              <span>توصيل: ${p.delivery}</span>
            </div>
            <div class="seller">
              👤 ${p.seller} | ☎ ${p.phone}
            </div>
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

// CRUD
function deleteProduct(k){if(confirm("حذف الإعلان؟")) db.ref("products/"+k).remove().then(loadProducts)}
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

function save(k){
  const data={
    name:document.getElementById("name").value,
    price:document.getElementById("price").value,
    category:document.getElementById("category").value,
    seller: userDisplayName || document.getElementById("seller").value, // استخدام اسم المستخدم المسجل
    phone:document.getElementById("phone").value,
    province:document.getElementById("province").value,
    delivery:document.getElementById("delivery").value,
    uid:userUID
  };
  (k?db.ref("products/"+k):db.ref("products").push()).set(data).then(showHome);
}

// ===== إضافة دوال نظام المصادقة =====
function updateAuthUI() {
  const authSection = document.getElementById("authSection");
  if (!authSection) return;
  
  if (currentUser && userDisplayName) {
    // المستخدم مسجل الدخول
    authSection.innerHTML = `
      <div class="user-info">
        <p>👤 ${userDisplayName}</p>
        <button class="logout-btn" onclick="logoutUser()">تسجيل خروج</button>
      </div>
    `;
  } else {
    // المستخدم غير مسجل
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
      updateAuthUI();
      showHome();
    })
    .catch((error) => {
      console.error("Logout error:", error);
      alert("حدث خطأ أثناء تسجيل الخروج");
    });
}

// متابعة حالة المصادقة
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    currentUser = user;
    userUID = user.uid;
    
    // الحصول على اسم المستخدم من قاعدة البيانات
    db.ref("users/" + user.uid).once("value", snapshot => {
      const userData = snapshot.val();
      if (userData) {
        userDisplayName = userData.username;
        updateAuthUI();
      }
    });
  } else {
    // المستخدم غير مسجل
    currentUser = null;
    userDisplayName = null;
    updateAuthUI();
  }
});

// Init
document.addEventListener("DOMContentLoaded",function(){
  showHome();
  updateAuthUI();
});
