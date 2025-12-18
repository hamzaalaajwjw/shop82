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
firebase.auth().signInAnonymously();
const db = firebase.database();

function loadProducts(){
  const search = searchInput.value.toLowerCase();
  const cat = categoryFilter.value;
  const del = deliveryFilter.value;

  db.ref("products").once("value", snap=>{
    products.innerHTML = "";
    snap.forEach(c=>{
      const p = c.val();
      if(
        (!cat || p.category===cat) &&
        (!del || p.delivery===del) &&
        (p.name.toLowerCase().includes(search))
      ){
        products.innerHTML += `
          <div class="card">
            <h3>${p.name}</h3>
            <div class="price">${p.price} د.ع</div>
            <div class="meta">${p.category} • ${p.city}</div>
            <div class="meta">بائع: ${p.seller}</div>
            <div class="meta">📞 ${p.phone}</div>
            <div class="meta">توصيل: ${p.delivery}</div>
          </div>`;
      }
    });
  });
}

function openPublish(){ publishModal.style.display="flex"; }
function closePublish(){ publishModal.style.display="none"; }

function publish(){
  db.ref("products").push({
    name:p_name.value,
    price:p_price.value,
    seller:p_seller.value,
    phone:p_phone.value,
    city:p_city.value,
    category:p_category.value,
    delivery:p_delivery.value
  });
  closePublish();
  loadProducts();
}

loadProducts();
