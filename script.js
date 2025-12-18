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

// الجامعات (كل المحافظات)
const allUniversities = {
  "بغداد":["جامعة بغداد","الجامعة المستنصرية","الجامعة التقنية","الجامعة العراقية","جامعة تكنولوجيا المعلومات والاتصالات","جامعة النهرين","الجامعة التقنية الوسطى","جامعة البيان","جامعة التراث","كلية المنصور الجامعة","كلية الرافدين الجامعة","كلية المأمون الجامعة","كلية بغداد للعلوم الاقتصادية الجامعة","كلية الأسراء الجامعة","الجامعة الأمريكية في العراق","كلية دجلة الجامعة","كلية الأمَل الجامعة","كلية الرشيد الجامعة","كلية الكتب الجامعة"],
  "اربيل":["جامعة صلاح الدين – أربيل","جامعة السليمانية","جامعة دهوك","جامعة هولير للطب","جامعة كوية","جامعة زاخو","جامعة رابارين","جامعة حلبجة","جامعة غربيان","جامعة اربيل التقنية","جامعة السليمانية التقنية","جامعة دهوك التقنية","الجامعة الأمريكية في كردستان","الجامعة اللبنانية الفرنسية","جامعة المعرفة","جامعة جيهان – أربيل"],
  "البصرة":["جامعة البصرة","كلية شط العرب الجامعة","كلية الكونوز الجامعة"],
  "الموصل":["جامعة الموصل","جامعة الحدباء – كلية الحدباء الجامعة"],
  "كربلاء":["جامعة أهل البيت","كلية الصفوة الجامعة","كلية الحسين الجامعة"],
  "النجف":["جامعة الكوفة","الجامعة الإسلامية – النجف","جامعة الكفيل","كلية الشيخ الطوسي الجامعة"],
  "واسط":["جامعة واسط"],
  "ذي قار":["جامعة ذي قار"],
  "المثنى":["جامعة المثنى"],
  "القادسية":["جامعة القادسية"],
  "ميسان":["جامعة ميسان"],
  "بابل":["جامعة بابل","الجامعة الإسلامية – بابل","كلية العشتار الجامعة","جامعة القاسم الخضراء","كلية المستقبل الجامعة"],
  "الديوانية":["جامعة القادسية"],
  "دهوك":["جامعة دهوك"],
  "السليمانية":["جامعة السليمانية"],
  "ديالى":["جامعة ديالى","كلية اليرموك الجامعة"],
  "الأنبار":["جامعة الأنبار","كلية المعارف الجامعة"],
  "صلاح الدين":["جامعة تكريت","جامعة سوران"],
  "نينوى":["جامعة الموصل","جامعة الحدباء – كلية الحدباء الجامعة"]
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
    if(p === "بغداد") opt.selected = true;
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
