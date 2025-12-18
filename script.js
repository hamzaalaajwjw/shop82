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
firebase.auth().signInAnonymously();

let userUID = null;
firebase.auth().onAuthStateChanged(u=>{ if(u) userUID = u.uid; });

// الجامعات
const allUniversities = {
  "بغداد":["جامعة بغداد","الجامعة المستنصرية","الجامعة التقنية","الجامعة العراقية"],
  "اربيل":["جامعة صلاح الدين – أربيل","جامعة السليمانية"],
  "البصرة":["جامعة البصرة"],
  "الموصل":["جامعة الموصل"],
  "كربلاء":["جامعة أهل البيت"],
  "النجف":["جامعة الكوفة"]
};

// عناصر الصفحة
const provinceEl = document.getElementById("province");
const listEl = document.getElementById("list");
const searchEl = document.getElementById("search");
let currentUniversity = null;

// المحافظات
Object.keys(allUniversities).forEach(p=>{
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = p;
    provinceEl.appendChild(opt);
});

// عرض الجامعات
function render(){
    listEl.innerHTML="";
    const prov = provinceEl.value;
    const filter = searchEl.value || "";

    allUniversities[prov]
    .filter(u => u.includes(filter))
    .forEach(name=>{
        const li = document.createElement("li");

        // عدد التقييمات والمقيمين
        const infoEl = document.createElement("span");
        infoEl.className = "rating-info";
        infoEl.textContent = "0 تقييم (0 مقيم)";
        li.appendChild(infoEl);

        // اسم الجامعة
        const nameEl = document.createElement("span");
        nameEl.className = "uni-name";
        nameEl.textContent = name;
        li.appendChild(nameEl);

        // زر التقييم
        const btn = document.createElement("span");
        btn.className = "rating-btn";
        btn.textContent = "★";
        btn.onclick = ()=>openRate(name);
        li.appendChild(btn);

        listEl.appendChild(li);

        // تحميل التقييم من Firebase
        loadRating(name, infoEl);
    });
}

// فتح الديالوك
function openRate(name){
    currentUniversity = name;
    document.getElementById("rateModal").style.display = "flex";
}

// تحميل التقييم
function loadRating(name, infoEl){
    db.ref("ratings/"+name.replace(/\./g,'')).on("value", s=>{
        const d = s.val();
        if(d){
            const usersCount = d.users ? Object.keys(d.users).length : 0;
            infoEl.textContent = `${d.count} تقييم (${usersCount} مقيم) ⭐ ${d.avg.toFixed(1)}`;
        }
    });
}

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
