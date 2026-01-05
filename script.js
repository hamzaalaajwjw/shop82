// ===== تهيئة Supabase =====
const supabaseUrl = 'https://dnclbdvdzvtdjpgxwnrl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuY2xiZHZkenZ0ZGpwZ3h3bnJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyMjY5OTcsImV4cCI6MjA4MjgwMjk5N30.alGg61mAPLLqLM2LlQRq2K2o_eOOnJwNuaIJiAXB7Wg';

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// ===== Firebase Config =====
const firebaseConfig = {
  apiKey: "AIzaSyAl3XunFOwHpGw-4_VYyETMtoLgk4mnRpQ",
  authDomain: "a3len-3ad54.firebasestorage.app",
  databaseURL: "https://a3len-3ad54-default-rtdb.firebaseio.com",
  projectId: "a3len-3ad54",
  storageBucket: "a3len-3ad54.firebasestorage.app",
  messagingSenderId: "767338034080",
  appId: "1:767338034080:web:801d77fb74c0aa56e92ac5"
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

// ===== متغيرات عامة =====
let userUID = null;
let currentUser = null;
let userDisplayName = null;
let userFullName = null;
let isAdmin = false;
let budget = null;
let currentPage = 1;
const postsPerPage = 6;

// ===== متغيرات رفع الصور =====
let selectedImages = [];
let imagePreviewUrls = [];

// ===== الأقسام والمحافظات =====
const categories = ["CPU","GPU","RAM","Motherboard","Storage","Power Supply","Case","Cooler","Accessories"];
const provinces = ["بغداد","البصرة","الموصل","أربيل","دهوك","السليمانية","نينوى","الأنبار","ذي قار","بابل","كربلاء","واسط","الديوانية","القادسية","صلاح الدين","المثنى","ميسان","النجف","كركوك"];

// ===== نظام إدارة الصور =====
class ImageManager {
    static async uploadProductImages(productId, images) {
        const imageUrls = [];
        
        for (let i = 0; i < images.length; i++) {
            const file = images[i];
            const fileName = `product_${productId}_${Date.now()}_${i}.jpg`;
            const path = `products/${productId}/${fileName}`;
            
            // رفع الصورة إلى Supabase
            const { data, error } = await supabaseClient.storage
                .from('ads-images')
                .upload(`products/${fileName}`, file, {
                    cacheControl: '3600',
                    upsert: true
                });
            
            if (error) {
                console.error('Error uploading image:', error);
                continue;
            }
            
            // الحصول على رابط الصورة
            const { data: urlData } = supabaseClient.storage
                .from('ads-images')
                .getPublicUrl(`products/${fileName}`);
            
            if (urlData?.publicUrl) {
                imageUrls.push(urlData.publicUrl);
            }
        }
        
        return imageUrls;
    }
    
    static async deleteProductImages(productId) {
        try {
            // قائمة الملفات في المجلد الخاص بالمنتج
            const { data: files, error } = await supabaseClient.storage
                .from('ads-images')
                .list(`products/${productId}`);
            
            if (error) {
                console.error('Error listing files:', error);
                return;
            }
            
            // حذف جميع الملفات
            if (files && files.length > 0) {
                const filePaths = files.map(file => `products/${productId}/${file.name}`);
                await supabaseClient.storage
                    .from('ads-images')
                    .remove(filePaths);
            }
            
            console.log('Product images deleted successfully');
        } catch (error) {
            console.error('Error deleting images:', error);
        }
    }
    
    static createImageSlider(images, productId) {
        if (!images || images.length === 0) {
            return '<div class="no-image">🚫 لا توجد صور متاحة</div>';
        }
        
        let sliderHTML = `
            <div class="product-images" id="slider-${productId}">
                <div class="images-slider">
        `;
        
        images.forEach((img, index) => {
            sliderHTML += `
                <img src="${img}" class="slider-image" alt="صورة المنتج ${index + 1}" 
                     onerror="this.onerror=null; this.src='https://via.placeholder.com/300x180/1f2937/9ca3af?text=لا+توجد+صورة';">
            `;
        });
        
        sliderHTML += `
                </div>
                <div class="image-counter">1 / ${images.length}</div>
        `;
        
        if (images.length > 1) {
            sliderHTML += `
                <div class="slider-nav">
                    <button class="slider-btn prev-btn" onclick="ImageManager.prevSlide('${productId}')">❮</button>
                    <button class="slider-btn next-btn" onclick="ImageManager.nextSlide('${productId}')">❯</button>
                </div>
            `;
        }
        
        sliderHTML += '</div>';
        
        // تهيئة السلايدر بعد إضافته إلى DOM
        setTimeout(() => {
            const slider = document.querySelector(`#slider-${productId} .images-slider`);
            if (slider) {
                slider.style.transform = 'translateX(0%)';
            }
        }, 100);
        
        return sliderHTML;
    }
    
    static nextSlide(productId) {
        const slider = document.querySelector(`#slider-${productId} .images-slider`);
        if (!slider) return;
        
        const totalSlides = slider.children.length;
        const currentSlide = Math.abs(parseInt(slider.style.transform?.match(/-?\d+/)?.[0] || 0) / 100);
        const nextSlide = (currentSlide + 1) % totalSlides;
        
        slider.style.transform = `translateX(-${nextSlide * 100}%)`;
        
        const counter = document.querySelector(`#slider-${productId} .image-counter`);
        if (counter) {
            counter.textContent = `${nextSlide + 1} / ${totalSlides}`;
        }
    }
    
    static prevSlide(productId) {
        const slider = document.querySelector(`#slider-${productId} .images-slider`);
        if (!slider) return;
        
        const totalSlides = slider.children.length;
        const currentSlide = Math.abs(parseInt(slider.style.transform?.match(/-?\d+/)?.[0] || 0) / 100);
        const prevSlide = (currentSlide - 1 + totalSlides) % totalSlides;
        
        slider.style.transform = `translateX(-${prevSlide * 100}%)`;
        
        const counter = document.querySelector(`#slider-${productId} .image-counter`);
        if (counter) {
            counter.textContent = `${prevSlide + 1} / ${totalSlides}`;
        }
    }
}

// ===== دوال إدارة الصور =====
function handleImageSelect(event) {
    const files = Array.from(event.target.files);
    
    // التحقق من عدد الصور
    if (files.length > 2) {
        alert("يمكنك رفع صورتين فقط كحد أقصى");
        return;
    }
    
    // التحقق من نوع الملفات
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const invalidFiles = files.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
        alert("يجب أن تكون الملفات من نوع صورة (JPEG, PNG, WebP)");
        return;
    }
    
    // تحديث الصور المحددة
    selectedImages = files.slice(0, 2);
    
    // عرض المعاينة
    displayImagePreview();
}

function displayImagePreview() {
    const previewContainer = document.getElementById('imagePreview');
    if (!previewContainer) return;
    
    // مسح المعاينة السابقة
    imagePreviewUrls = [];
    previewContainer.innerHTML = '';
    
    if (selectedImages.length === 0) {
        previewContainer.innerHTML = '<div style="color:#9ca3af; text-align:center; padding:20px;">لم يتم اختيار أي صور</div>';
        return;
    }
    
    // إنشاء معاينة للصور المختارة
    selectedImages.forEach((file, index) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const url = e.target.result;
            imagePreviewUrls.push(url);
            
            const previewItem = document.createElement('div');
            previewItem.className = 'image-preview-item';
            previewItem.innerHTML = `
                <img src="${url}" class="preview-image" alt="معاينة الصورة ${index + 1}">
                <button class="remove-image-btn" onclick="removeImage(${index})">×</button>
            `;
            
            previewContainer.appendChild(previewItem);
        };
        
        reader.readAsDataURL(file);
    });
}

function removeImage(index) {
    selectedImages.splice(index, 1);
    imagePreviewUrls.splice(index, 1);
    displayImagePreview();
    
    // تحديث input file
    const imageInput = document.getElementById('images');
    if (imageInput) {
        imageInput.value = '';
    }
}

// ===== دوال Sidebar =====
function toggleSidebar(){document.querySelector(".sidebar").classList.toggle("active")}
function closeSidebar(){document.querySelector(".sidebar").classList.remove("active")}

// ===== دالة الصفحة الرئيسية =====
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

// ===== دوال الميزانية =====
function showBudgetDialog(){document.getElementById("budgetDialog").classList.add("show")}
function closeBudget(){document.getElementById("budgetDialog").classList.remove("show")}
function applyBudget(){
  const val=parseFloat(document.getElementById("maxBudget").value);
  budget=!isNaN(val)?val:null;
  closeBudget();
  loadProducts();
}

// ===== دالة تحميل المنتجات مع الصور =====
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
        
        // عرض الصور في البطاقة
        const imagesHTML = p.images && p.images.length > 0 
            ? ImageManager.createImageSlider(p.images, k)
            : '<div class="no-image">🚫 لا توجد صور متاحة</div>';
        
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
            ${imagesHTML}
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
  }).catch(error => {
    console.error("Error loading products:", error);
    document.getElementById("products").innerHTML = "<p class='empty'>حدث خطأ في تحميل الإعلانات</p>";
  });
}

// ===== دوال الترقيم =====
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

// ===== دالة حذف المنتج مع الصور =====
async function deleteProduct(k){ 
  if(!confirm("هل أنت متأكد من حذف الإعلان؟ سيتم حذف جميع الصور أيضاً.")) {
    return;
  }
  
  // الحصول على بيانات المنتج أولاً
  const snapshot = await db.ref("products/" + k).once('value');
  const product = snapshot.val();
  
  if (!product) {
    alert("الإعلان غير موجود");
    return;
  }
  
  // التحقق من الصلاحية
  if (product.uid !== userUID && !isAdmin) {
    alert("ليس لديك صلاحية لحذف هذا الإعلان");
    return;
  }
  
  try {
    // حذف الصور من Supabase
    if (product.images && product.images.length > 0) {
      await ImageManager.deleteProductImages(k);
    }
    
    // تقليل عداد منتجات المستخدم
    if (product.uid) {
      const userSnapshot = await db.ref('users/' + product.uid).once('value');
      const userData = userSnapshot.val();
      if (userData) {
        const currentCount = userData.totalProducts || 0;
        if (currentCount > 0) {
          await db.ref('users/' + product.uid).update({
            totalProducts: currentCount - 1
          });
        }
      }
    }
    
    // حذف المنتج من Firebase
    await db.ref("products/"+k).remove();
    
    alert("تم حذف الإعلان والصور بنجاح");
    loadProducts();
    
  } catch (error) {
    console.error("Delete error:", error);
    alert("حدث خطأ أثناء حذف الإعلان");
  }
}

// ===== دالة تعديل المنتج =====
function editProduct(k){
  db.ref("products/"+k).once("value", s => {
    const product = s.val();
    if (product) {
      // التحقق من الصلاحية
      if (product.uid !== userUID && !isAdmin) {
        alert("ليس لديك صلاحية لتعديل هذا الإعلان");
        return;
      }
      showPublish(product, k);
    }
  });
}

// ===== دالة عرض النشر مع نظام الصور =====
function showPublish(p=null,k=null){
  closeSidebar();
  
  // استخدام اسم المستخدم إذا كان مسجلاً
  const sellerName = userDisplayName || (p ? p.seller : "");
  const sellerField = userDisplayName ? 
    `<input id="seller" placeholder="اسم البائع" value="${sellerName}" disabled style="background:#374151; color:#9ca3af; cursor:not-allowed;">
     <small style="color:#38bdf8; font-size:12px;">اسم البائع هو اسم المستخدم المسجل</small>` :
    `<input id="seller" placeholder="اسم البائع" value="${sellerName}">`;
  
  // إعادة تعيين الصور المختارة
  selectedImages = [];
  imagePreviewUrls = [];
  
  document.getElementById("content").innerHTML=`
    <div class="form-box">
      <h2>${p?"تعديل إعلان":"نشر إعلان جديد"}</h2>
      <input id="name" placeholder="اسم القطعة" value="${p?p.name:""}" required>
      <input id="price" type="number" placeholder="السعر" value="${p?p.price:""}" required min="0">
      <select id="category">${categories.map(c=>`<option ${p&&p.category===c?"selected":""}>${c}</option>`).join("")}</select>
      ${sellerField}
      <input id="phone" placeholder="رقم الهاتف" value="${p?p.phone:""}" pattern="[0][0-9]{10}" required>
      <select id="province">
        <option value="">اختر المحافظة</option>
        ${provinces.map(pr=>`<option ${p&&p.province===pr?"selected":""}>${pr}</option>`).join("")}
      </select>
      <select id="delivery">
        <option ${p&&p.delivery==="نعم"?"selected":""}>نعم</option>
        <option ${p&&p.delivery==="لا"?"selected":""}>لا</option>
      </select>
      
      <!-- رفع الصور -->
      <div class="image-upload-container">
        <label class="file-input-label">
          <i class="fas fa-images"></i> اختر صور الإعلان (حد أقصى 2)
          <input type="file" id="images" accept="image/*" multiple onchange="handleImageSelect(event)">
        </label>
        <small style="color:#9ca3af; font-size:12px; display:block; margin-top:5px;">
          يمكنك رفع صورتين كحد أقصى (JPEG, PNG, WebP)
        </small>
        <div class="image-preview" id="imagePreview">
          ${p && p.images && p.images.length > 0 ? 
            p.images.map((img, idx) => `
              <div class="image-preview-item">
                <img src="${img}" class="preview-image" alt="صورة ${idx + 1}">
                <small style="display:block; text-align:center; color:#9ca3af;">الصورة الحالية ${idx + 1}</small>
              </div>
            `).join('') : 
            '<div style="color:#9ca3af; text-align:center; padding:20px;">لم يتم اختيار أي صور</div>'
          }
        </div>
      </div>
      
      <button onclick="saveProduct('${k||""}')">💾 ${p?"تحديث":"نشر"}</button>
    </div>`;
}

// ===== دالة حفظ المنتج مع رفع الصور =====
async function saveProduct(k){
  // التحقق من البيانات الأساسية
  const phone = document.getElementById("phone").value.trim();
  if(!/^[0][0-9]{10}$/.test(phone)){
    alert("رقم الهاتف يجب أن يكون 11 رقم ويبدأ بصفر.");
    return;
  }
  
  const province = document.getElementById("province").value;
  if (!province) {
    alert("يرجى اختيار المحافظة");
    return;
  }

  // استخدام اسم المستخدم المسجل إذا كان متوفراً
  const seller = userDisplayName || document.getElementById("seller").value;
  
  if (!seller || seller.length < 2) {
    alert("اسم البائع مطلوب (2 أحرف على الأقل)");
    return;
  }

  const name = document.getElementById("name").value.trim();
  const price = document.getElementById("price").value.trim();
  
  if (!name || !price) {
    alert("جميع الحقول مطلوبة");
    return;
  }

  try {
    let imageUrls = [];
    
    // إذا كان تعديلاً، احتفظ بالصور الحالية
    if (k) {
      const productRef = db.ref("products/" + k);
      const snapshot = await productRef.once("value");
      const existingProduct = snapshot.val();
      if (existingProduct && existingProduct.images) {
        imageUrls = existingProduct.images;
      }
    }
    
    // إذا تم اختيار صور جديدة، رفعها إلى Supabase
    if (selectedImages.length > 0) {
      if (k) {
        // حذف الصور القديمة أولاً
        await ImageManager.deleteProductImages(k);
      }
      
      // رفع الصور الجديدة
      imageUrls = await ImageManager.uploadProductImages(k || 'temp', selectedImages);
    }
    
    // تحضير بيانات المنتج
    const data = {
      name: name,
      price: parseFloat(price),
      category: document.getElementById("category").value,
      seller: seller,
      phone: phone,
      province: province,
      delivery: document.getElementById("delivery").value,
      uid: userUID,
      timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    // إضافة الصور إذا كانت موجودة
    if (imageUrls.length > 0) {
      data.images = imageUrls;
    }
    
    const ref = k ? db.ref("products/"+k) : db.ref("products").push();
    
    await ref.set(data);
    
    // تحديث عداد منتجات المستخدم (للإعلانات الجديدة فقط)
    if (!k && userUID) {
      const userSnapshot = await db.ref('users/' + userUID).once('value');
      const userData = userSnapshot.val();
      
      if (userData) {
        const currentCount = userData.totalProducts || 0;
        await db.ref('users/' + userUID).update({
          totalProducts: currentCount + 1,
          lastActive: firebase.database.ServerValue.TIMESTAMP
        });
      } else {
        await db.ref('users/' + userUID).update({
          totalProducts: 1,
          lastActive: firebase.database.ServerValue.TIMESTAMP
        });
      }
    }
    
    alert(k ? "تم تحديث الإعلان بنجاح" : "تم نشر الإعلان بنجاح");
    
    // إعادة تعيين المتغيرات
    selectedImages = [];
    imagePreviewUrls = [];
    
    showHome();
    
  } catch (error) {
    console.error("Error saving product:", error);
    alert("حدث خطأ أثناء حفظ الإعلان");
  }
}

// ===== دالة عرض التفاصيل مع الصور =====
function showDetails(k){
  db.ref("products/"+k).once("value",snap=>{
    const p = snap.val();
    if(!p) return;
    
    // عرض الصور في التفاصيل
    const imagesHTML = p.images && p.images.length > 0 
      ? ImageManager.createImageSlider(p.images, k + '-details')
      : '<div class="no-image">🚫 لا توجد صور متاحة</div>';
    
    const sellerWithLink = userDisplayName ? 
      `<p><strong>البائع:</strong> <span class="seller-link" onclick="viewProfile('${p.uid}', '${p.seller}')" style="font-weight:bold;">${p.seller}</span></p>
       <p><small style="color:#38bdf8;">انقر على اسم البائع لعرض ملفه الشخصي</small></p>` :
      `<p><strong>البائع:</strong> ${p.seller}</p>`;
    
    document.getElementById("detailsContent").innerHTML = `
      <h2>${p.name}</h2>
      ${imagesHTML}
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

// ===== دوال المصادقة =====
function updateAuthUI() {
  const authSection = document.getElementById("authSection");
  if (!authSection) return;
  
  if (currentUser && userDisplayName) {
    // المستخدم مسجل الدخول
    const displayName = userFullName || userDisplayName;
    
    // الحصول على بيانات المستخدم
    db.ref("users/" + currentUser.uid).once("value", snapshot => {
      const userData = snapshot.val();
      const totalProducts = userData ? userData.totalProducts || 0 : 0;
      const isVerified = userData ? userData.isVerified || false : false;
      const isAdminUser = userData ? userData.isAdmin || false : false;
      
      authSection.innerHTML = `
        <div class="user-info">
          <p class="profile-link" onclick="viewMyProfile()">
            <span class="user-name-wrapper">
              ${isVerified ? '<span class="verified-badge">✓</span>' : ''}
              ${displayName}
              ${isAdminUser ? '<span class="admin-badge">مدير</span>' : ''}
            </span>
          </p>
          <small style="color:#9ca3af; font-size:12px;">@${userDisplayName}</small>
          <small style="color:#9ca3af; font-size:11px; display:block; margin:5px 0;">${totalProducts} إعلان</small>
          <button class="logout-btn" onclick="logoutUser()">تسجيل خروج</button>
          ${isAdminUser ? `
          <button onclick="showAdminPanel()" style="
            width: 100%;
            padding: 8px;
            background: #8b5cf6;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            margin-top: 5px;
          ">لوحة التحكم</button>` : ''}
        </div>
      `;
    });
  } else {
    // المستخدم غير مسجل
    authSection.innerHTML = `
      <button class="auth-btn" onclick="window.location.href='login.html'">🔐 تسجيل دخول</button>
      <button class="auth-btn" onclick="window.location.href='register.html'">📝 إنشاء حساب</button>
    `;
  }
}

function logoutUser() {
  if (confirm("هل أنت متأكد من تسجيل الخروج؟")) {
    auth.signOut().then(() => {
      currentUser = null;
      userDisplayName = null;
      userFullName = null;
      isAdmin = false;
      updateAuthUI();
      showHome();
    }).catch((error) => {
      console.error("Logout error:", error);
      alert("حدث خطأ أثناء تسجيل الخروج");
    });
  }
}

// ===== دوال نظام الملف الشخصي =====
function viewProfile(userId, sellerName) {
  if (sellerName) {
    localStorage.setItem('profileSellerName', sellerName);
  }
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

function showAdminPanel() {
  if (isAdmin) {
    window.location.href = 'admin.html';
  } else {
    alert("ليس لديك صلاحية الوصول");
  }
}

// ===== متابعة حالة المصادقة =====
auth.onAuthStateChanged((user) => {
  if (user) {
    currentUser = user;
    userUID = user.uid;
    
    // الحصول على بيانات المستخدم من قاعدة البيانات
    db.ref("users/" + user.uid).once("value", snapshot => {
      const userData = snapshot.val();
      if (userData) {
        userDisplayName = userData.username;
        userFullName = userData.fullName || userData.username;
        isAdmin = userData.isAdmin || false;
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
    isAdmin = false;
    updateAuthUI();
  }
});

// ===== تهيئة التطبيق =====
document.addEventListener("DOMContentLoaded",function(){
  // تسجيل دخول مجهول
  auth.signInAnonymously().catch(err=>console.error(err));
  
  // بدء الصفحة الرئيسية
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
    .product-images {
      margin: 10px 0;
      position: relative;
      overflow: hidden;
      border-radius: 8px;
      background: #1a1a1a;
    }
    .images-slider {
      display: flex;
      transition: transform 0.3s ease;
    }
    .slider-image {
      min-width: 100%;
      height: 180px;
      object-fit: cover;
      border-radius: 8px;
    }
    .image-counter {
      position: absolute;
      bottom: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 12px;
    }
    .slider-nav {
      position: absolute;
      top: 50%;
      width: 100%;
      display: flex;
      justify-content: space-between;
      padding: 0 10px;
      transform: translateY(-50%);
    }
    .slider-btn {
      background: rgba(0, 0, 0, 0.5);
      color: white;
      border: none;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      transition: background 0.3s;
    }
    .slider-btn:hover {
      background: rgba(0, 0, 0, 0.8);
    }
    .no-image {
      width: 100%;
      height: 180px;
      background: linear-gradient(135deg, #1f2937, #374151);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #9ca3af;
      font-size: 14px;
      text-align: center;
      padding: 20px;
    }
    .image-upload-container {
      margin: 15px 0;
    }
    .image-preview {
      display: flex;
      gap: 10px;
      margin-top: 10px;
      flex-wrap: wrap;
    }
    .preview-image {
      width: 120px;
      height: 120px;
      border-radius: 8px;
      object-fit: cover;
      border: 2px solid #374151;
      cursor: pointer;
      transition: transform 0.2s, border-color 0.2s;
    }
    .preview-image:hover {
      transform: scale(1.05);
      border-color: #38bdf8;
    }
    .remove-image-btn {
      position: absolute;
      top: -8px;
      right: -8px;
      background: #ef4444;
      color: white;
      border: none;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      font-size: 12px;
      cursor: pointer;
      display: none;
    }
    .image-preview-item {
      position: relative;
    }
    .image-preview-item:hover .remove-image-btn {
      display: block;
    }
    .file-input-label {
      display: inline-block;
      background: #1f2937;
      color: #e5e7eb;
      padding: 10px 15px;
      border-radius: 6px;
      cursor: pointer;
      text-align: center;
      margin: 5px 0;
      border: 2px dashed #374151;
      transition: all 0.3s;
    }
    .file-input-label:hover {
      background: #374151;
      border-color: #38bdf8;
    }
    .file-input-label i {
      margin-left: 5px;
      color: #38bdf8;
    }
    #images {
      display: none;
    }
  `;
  document.head.appendChild(style);
});
