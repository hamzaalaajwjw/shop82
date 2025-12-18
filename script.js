// Firebase config
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

// تسجيل دخول أنونيموس
firebase.auth().signInAnonymously().catch(err=>console.error(err));

let userUID = null;
firebase.auth().onAuthStateChanged(u=>{
  if(u) userUID = u.uid;
});

// باقي الكود كما هو (عرض المنتجات، النشر، التقييمات...)
const categories = ["CPU","GPU","RAM","Motherboard","Storage","Power Supply","Case","Cooler","Accessories"];

// Sidebar
function toggleSidebar(){
  document.querySelector(".sidebar").classList.toggle("active");
}

// Home / Products
function showHome(){
  document.getElementById("content").innerHTML = `
    <div class="search-bar">
      <input id="search" placeholder="🔍 ابحث عن قطعة..." onkeyup="loadProducts()">
      <select id="cat" onchange="loadProducts()">
        <option value="">كل الأقسام</option>
        ${categories.map(c=>`<option>${c}</option>`).join("")}
      </select>
    </div>
    <div class="cards" id="products"></div>
  `;
  loadProducts();
}

function loadProducts(){
  const s = document.getElementById("search").value.toLowerCase();
  const c = document.getElementById("cat").value;
  db.ref("products").once("value", snap=>{
    let html = "";
    const d = snap.val() || {};
    Object.keys(d).forEach(k=>{
      const p = d[k];
      if((!c || p.category===c) && p.name.toLowerCase().includes(s)){
        html += `
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
            <button class="edit" onclick="editProduct('${k}')">تعديل</button>
            <button class="del" onclick="deleteProduct('${k}')">حذف</button>
          </div>
        </div>`;
      }
    });
    document.getElementById("products").innerHTML = html || "<p class='empty'>لا توجد إعلانات</p>";
  });
}

function deleteProduct(k){
  if(confirm("حذف الإعلان؟")) db.ref("products/"+k).remove().then(loadProducts);
}

function editProduct(k){
  db.ref("products/"+k).once("value",s=>showPublish(s.val(),k));
}

function showPublish(p=null,k=null){
  document.getElementById("content").innerHTML = `
    <div class="form-box">
      <h2>${p?"تعديل إعلان":"نشر إعلان جديد"}</h2>
      <input id="name" placeholder="اسم القطعة" value="${p?p.name:""}">
      <input id="price" type="number" placeholder="السعر" value="${p?p.price:""}">
      <select id="category">${categories.map(c=>`<option ${p&&p.category===c?"selected":""}>${c}</option>`).join("")}</select>
      <input id="seller" placeholder="اسم البائع" value="${p?p.seller:""}">
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
  const data={name:name.value, price:price.value, category:category.value,
              seller:seller.value, phone:phone.value,
              province:province.value, delivery:delivery.value};
  (k?db.ref("products/"+k):db.ref("products").push()).set(data).then(showHome);
}

showHome();}

// حفظ التقييم
function saveRating(score){
    if(!userUID || !currentUniversity) return;
    const ref = db.ref("ratings/"+currentUniversity.replace(/\./g,''));
    ref.transaction(c=>{
        if(!c) return {sum:score,count:1,users:{[userUID]:score},avg:score};
        if(c.users && c.users[userUID]){
            c.sum = c.sum - c.users[userUID] + score;
        } else {
            c.sum += score;
            c.count++;
        }
        c.users[userUID] = score;
        c.avg = c.sum / c.count;
        return c;
    });
    closeModal();
}

// نجوم الديالوك
document.querySelectorAll(".rate-stars span").forEach(star=>{
    star.onclick = ()=>{
        const rate = Number(star.dataset.rate);
        document.querySelectorAll(".rate-stars span").forEach(s=>{
            s.classList.toggle("active", Number(s.dataset.rate) <= rate);
        });
        saveRating(rate);
    };
});

// إغلاق الديالوك
function closeModal(){
    document.getElementById("rateModal").style.display = "none";
    document.querySelectorAll(".rate-stars span").forEach(s=>s.classList.remove("active"));
}

document.getElementById("rateModal").onclick = e=>{
    if(e.target.id === "rateModal") closeModal();
};

provinceEl.onchange = render;
searchEl.onkeyup = render;

render();

