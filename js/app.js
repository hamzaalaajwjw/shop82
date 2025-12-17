// ملف app.js - رفع الإعلانات وعرض المقبولة

// تعريف Firebase database و storage const db = firebase.database(); const storage = firebase.storage();

// إضافة إعلان جديد const form = document.getElementById('addForm'); if (form) { form.addEventListener('submit', function(e) { e.preventDefault();

const name = document.getElementById('name').value;
const category = document.getElementById('category').value;
const price = document.getElementById('price').value;
const description = document.getElementById('description').value;
const whatsapp = document.getElementById('whatsapp').value;
const imageFile = document.getElementById('image').files[0];

// التحقق من اختيار صورة
if (!imageFile) {
  alert('اختر صورة للإعلان');
  return;
}

const imageRef = storage.ref('products/' + Date.now() + '_' + imageFile.name);

imageRef.put(imageFile).then(() => {
  imageRef.getDownloadURL().then((url) => {
    db.ref('products').push({
      name,
      category,
      price,
      description,
      whatsapp,
      image: url,
      status: 'approved'
    });

    document.getElementById('msg').innerText = 'تم إرسال الإعلان بانتظار الموافقة';
    form.reset();
  });
});

}); }

// عرض الإعلانات المقبولة const productsDiv = document.getElementById('products'); if (productsDiv) { db.ref('products').on('value', (snapshot) => { productsDiv.innerHTML = ''; snapshot.forEach((child) => { const data = child.val(); if (data.status === 'approved') { productsDiv.innerHTML += <div class="card"> <img src="${data.image}"> <h3>${data.name}</h3> <p>${data.category}</p> <p class="price">${data.price} IQD</p> <p>${data.description}</p> <a class="whatsapp" target="_blank" href="https://wa.me/${data.whatsapp}?text=مرحبا شفت إعلانك على a3len بخصوص ${data.name}">تواصل واتساب</a> </div>; } }); }); }

