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
const auth = firebase.auth();
const db = firebase.database();

/* تسجيل */
function register(){
  auth.createUserWithEmailAndPassword(email.value,password.value)
    .then(res=>{
      db.ref("users/"+res.user.uid).set({username:username.value});
      location.href="index.html";
    })
    .catch(e=>alert(e.message));
}

/* دخول */
function login(){
  auth.signInWithEmailAndPassword(email.value,password.value)
    .then(()=> location.href="index.html")
    .catch(e=>alert(e.message));
}

/* نشر */
function publishAd(){
  if(!name.value || !price.value || !seller.value) return alert("يرجى تعبئة الحقول الأساسية");
  db.ref("products").push({
    name:name.value,
    price:price.value,
    seller:seller.value,
    phone:phone.value,
    city:city.value,
    category:category.value,
    delivery:delivery.value,
    uid:auth.currentUser.uid
  }).then(()=>location.href="index.html")
    .catch(e=>alert(e.message));
}

/* عرض */
if(document.getElementById("products")){
  db.ref("products").on("value",s=>{
    products.innerHTML="";
    s.forEach(c=>{
      const p=c.val();
      products.innerHTML+=`
      <div class="card">
        <h3>${p.name}</h3>
        <div class="price">${p.price} د.ع</div>
        <div class="meta">${p.category} • ${p.city}</div>
        <div class="meta">📞 ${p.phone}</div>
        <div class="meta">توصيل: ${p.delivery}</div>
      </div>`;
    });
  });
}
