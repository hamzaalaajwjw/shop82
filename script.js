const allUniversities = {
    "بغداد": [
        {name:"جامعة بغداد", rating:0},
        {name:"الجامعة المستنصرية", rating:0},
        {name:"الجامعة التكنولوجية", rating:0},
        {name:"جامعة النهرين", rating:0},
        {name:"الجامعة العراقية", rating:0},
        {name:"جامعة تكنولوجيا المعلومات والاتصالات", rating:0},
        {name:"جامعة الكرخ للعلوم", rating:0},
        {name:"الجامعة التقنية الوسطى", rating:0},
        {name:"جامعة البيان", rating:0},
        {name:"جامعة التراث", rating:0},
        {name:"كلية المنصور الجامعة", rating:0},
        {name:"كلية الرافدين الجامعة", rating:0},
        {name:"كلية المأمون الجامعة", rating:0},
        {name:"كلية بغداد للعلوم الاقتصادية الجامعة", rating:0},
        {name:"ديوالى (Dijlah University College)", rating:0},
        {name:"جامعة أورك", rating:0},
        {name:"كلية الإمام جعفر الصادق الجامعة", rating:0},
        {name:"كلية الأمثل (Al-Amal University College)", rating:0},
        {name:"كلية الإمام الأعظم الجامعة", rating:0},
        {name:"كلية النخبة (Al-Nukhba University College)", rating:0}
    ],
    "اربيل": [
        {name:"جامعة أربيل", rating:0},
        {name:"الجامعة الكردية الدولية", rating:0},
        {name:"جامعة صلاح الدين", rating:0},
        {name:"كلية دجلة الجامعة - أربيل", rating:0}
    ],
    "البصرة": [
        {name:"جامعة البصرة", rating:0},
        {name:"الجامعة التقنية الجنوبية", rating:0},
        {name:"كلية البصرة الجامعة", rating:0},
        {name:"كلية أهل البصرة الجامعة", rating:0}
    ],
    "الموصل": [
        {name:"جامعة الموصل", rating:0},
        {name:"الجامعة التقنية الشمالية", rating:0},
        {name:"كلية الموصل الجامعة", rating:0},
        {name:"جامعة الإمام الأعظم - الموصل", rating:0}
    ]
};

let universities = [];
const listDiv = document.getElementById("list");

function loadRatings(){
    for(const prov in allUniversities){
        allUniversities[prov].forEach(u=>{
            const saved = localStorage.getItem(u.name);
            if(saved) u.rating = Number(saved);
        });
    }
}

function showList(items){
    listDiv.innerHTML="";
    if(items.length===0){ listDiv.innerHTML="<p>ماكو نتائج...</p>"; return; }
    items.forEach((u,i)=>{
        const div = document.createElement("div");
        div.className="university";
        div.style.animationDelay = `${i*0.05}s`;
        div.innerHTML = `
            <strong>${u.name}</strong>
            <div class="stars">
                ${[1,2,3,4,5].map(i=> `<span onclick="rate('${u.name}',${i})">${i<=u.rating?'★':'☆'}</span>`).join('')}
            </div>
        `;
        listDiv.appendChild(div);
    });
}

function rate(name,value){
    const uni = universities.find(u=>u.name===name);
    uni.rating = value;
    localStorage.setItem(name,value);
    showList(universities);
}

function filterList(){
    const query = document.getElementById("search").value.toLowerCase();
    const filtered = universities.filter(u=>u.name.toLowerCase().includes(query));
    showList(filtered);
}

function sortByRating(){
    const sorted = [...universities].sort((a,b)=>b.rating-a.rating);
    showList(sorted);
}

function changeProvince(){
    const prov = document.getElementById("province").value;
    universities = allUniversities[prov];
    document.getElementById("search").value = "";
    showList(universities);
}

// بداية
loadRatings();
changeProvince(); // الافتراضية بغداد
