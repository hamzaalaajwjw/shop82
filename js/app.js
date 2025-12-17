// ملف app.js - رفع الإعلانات وعرضها مباشرة بدون صور

// تعريف Firebase database
const db = firebase.database();

// إضافة إعلان جديد
const form = document.getElementById('addForm');
if (form) {
  form.addEventListener('submit', function(e) {
    e.preventDefault();

    // جمع البيانات من النموذج
    const name = document.getElementById('name').value;
    const category = document.getElementById('category').value;
    const price = document.getElementById('price').value;
    const description = document.getElementById('description').value;
    const whatsapp = document.getElementById('whatsapp').value;

    // تحقق من تعبئة جميع الحقول
    if (!name || !category || !price || !description || !whatsapp) {
      alert('يرجى تعبئة جميع الحقول');
      return;
    }

    // رفع البيانات مباشرة مع الحالة approved
    db.ref('products').push({
      name: name,
      category: category,
      price: price,
      description: description,
      whatsapp: whatsapp,
      status: 'approved'
    })
    .then(() => {
      document.getElementById('msg').innerText = 'تم إرسال الإعلان وظهر مباشرة على الصفحة';
      form.reset();
    })
    .catch((error) => {
      console.error('خطأ عند رفع الإعلان:', error);
      document.getElementById('msg').innerText = 'حدث خطأ يرجى المحاولة مرة أخرى';
    });
  });
}

// عرض الإعلانات
const productsDiv = document.getElementById('products');
if (productsDiv) {
  db.ref('products').on('value', (snapshot) => {
    productsDiv.innerHTML = '';
    snapshot.forEach((child) => {
      const data = child.val();
      if (data.status === 'approved') {
        productsDiv.innerHTML += `
          <div class="card">
            <h3>${data.name}</h3>
            <p>${data.category}</p>
            <p class="price">${data.price} IQD</p>
            <p>${data.description}</p>
            <a class="whatsapp" target="_blank" href="https://wa.me/${data.whatsapp}?text=مرحبا شفت إعلانك على a3len بخصوص ${data.name}">تواصل واتساب</a>
          </div>
        `;
      }
    });
  });
}
