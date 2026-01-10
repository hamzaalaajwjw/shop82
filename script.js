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
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
} else {
    firebase.app();
}

const db = firebase.database();
const auth = firebase.auth();

// ===== متغيرات عامة =====
let userUid = null;
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

// ===== نظام مؤقت النشر =====
let canPublish = true;
let publishTimer = null;
let publishTimeLeft = 0;

// ===== نظام توليد الـ Short IDs =====
function generateShortId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// ===== نظام الروابط المباشرة المحسن =====
class LinkManager {
    // توليد رابط مباشر جديد باستخدام Short ID
    static generatePostLink(shortId) {
        const domain = window.location.hostname === 'localhost' 
            ? `${window.location.protocol}//${window.location.host}`
            : 'https://a3len.store';
        
        return `${domain}/p/${shortId}`;
    }
    
    // توليد أو الحصول على Short ID للمنتج
    static async getOrCreateShortId(productId) {
        try {
            // التحقق إذا كان المنتج لديه shortId بالفعل
            const snapshot = await db.ref(`products/${productId}`).once('value');
            const product = snapshot.val();
            
            if (product && product.shortId) {
                return product.shortId;
            }
            
            // إنشاء shortId جديد
            let shortId;
            let exists = true;
            let attempts = 0;
            
            // التأكد من أن الـ shortId فريد
            while (exists && attempts < 10) {
                shortId = generateShortId();
                const shortIdSnapshot = await db.ref(`shortIds/${shortId}`).once('value');
                exists = shortIdSnapshot.exists();
                attempts++;
            }
            
            if (exists) {
                // إذا فشلنا في إنشاء ID فريد، نستخدم ID مشفر من المنتج
                shortId = btoa(productId).replace(/[+/=]/g, '').substring(0, 6);
            }
            
            // حفظ الـ shortId في قاعدة البيانات
            await db.ref(`products/${productId}`).update({ shortId });
            await db.ref(`shortIds/${shortId}`).set(productId);
            
            return shortId;
        } catch (error) {
            console.error('Error getting shortId:', error);
            // Fallback: استخدام ID المشفر
            return btoa(productId).replace(/[+/=]/g, '').substring(0, 6);
        }
    }
    
    // نسخ الرابط إلى الحافظة
    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // Fallback للأنظمة القديمة
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                document.execCommand('copy');
                document.body.removeChild(textArea);
                return true;
            } catch (e) {
                console.error('Fallback copy failed:', e);
                document.body.removeChild(textArea);
                return false;
            }
        }
    }
    
    // عرض نظام الروابط في تفاصيل المنتج
    static async createLinkSection(productId) {
        const shortId = await this.getOrCreateShortId(productId);
        const postLink = this.generatePostLink(shortId);
        
        return `
            <div class="post-link-system">
                <button class="copy-link-btn" onclick="LinkManager.copyLink('${shortId}')" id="copyBtn-${shortId}" title="نسخ رابط الإعلان">
                    <img src="img/copy.png" alt="نسخ">
                    <span>نسخ رابط الإعلان</span>
                </button>
            </div>
        `;
    }
    
    // نسخ الرابط مع تغيير مظهر الزر
    static async copyLink(shortId) {
        const link = this.generatePostLink(shortId);
        const copyBtn = document.getElementById(`copyBtn-${shortId}`);
        
        if (!copyBtn) return;
        
        const originalHTML = copyBtn.innerHTML;
        
        const success = await this.copyToClipboard(link);
        
        if (success) {
            copyBtn.innerHTML = '<img src="img/copy.png" alt="✓" style="filter: brightness(0) saturate(100%) invert(61%) sepia(74%) saturate(444%) hue-rotate(107deg) brightness(91%) contrast(92%);"><span>تم النسخ!</span>';
            copyBtn.classList.add('copied');
            copyBtn.title = 'تم النسخ!';
            
            setTimeout(() => {
                copyBtn.innerHTML = originalHTML;
                copyBtn.classList.remove('copied');
                copyBtn.title = 'نسخ رابط الإعلان';
            }, 1500);
        } else {
            copyBtn.innerHTML = '<img src="img/copy.png" alt="✗" style="filter: brightness(0) saturate(100%) invert(28%) sepia(96%) saturate(6762%) hue-rotate(354deg) brightness(96%) contrast(99%);"><span>فشل النسخ</span>';
            copyBtn.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.1))';
            
            setTimeout(() => {
                copyBtn.innerHTML = originalHTML;
                copyBtn.style.background = '';
            }, 1500);
        }
    }
    
    // التحقق من وجود رابط مباشر في URL
    static async checkForDirectLink() {
        const path = window.location.pathname;
        
        if (path.startsWith('/p/')) {
            const shortId = path.split('/')[2];
            
            if (shortId && shortId.length === 6) {
                // البحث عن المنتج باستخدام الـ shortId
                const snapshot = await db.ref(`shortIds/${shortId}`).once('value');
                const productId = snapshot.val();
                
                if (productId) {
                    // عرض تفاصيل المنتج مباشرة
                    showDetails(productId);
                    return true;
                }
            }
        }
        
        // التحقق من المعلمة القديمة للتوافق
        const urlParams = new URLSearchParams(window.location.search);
        const postId = urlParams.get('post');
        
        if (postId) {
            // عرض تفاصيل المنشور مباشرة
            showDetails(postId);
            return true;
        }
        
        return false;
    }
}

// ===== نظام الموافقة على المنشورات =====
class ApprovalSystem {
    static STATUS = {
        PENDING: 'pending',
        APPROVED: 'approved',
        REJECTED: 'rejected',
        EDITED_PENDING: 'edited_pending'
    };
    
    static async logApprovalAction(adminId, productId, action, reason = '') {
        try {
            const logRef = db.ref('approval_logs').push();
            await logRef.set({
                adminId: adminId,
                productId: productId,
                action: action,
                reason: reason,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            return true;
        } catch (error) {
            console.error('Error logging approval action:', error);
            return false;
        }
    }
    
    static async sendNotification(userId, title, message) {
        try {
            const notificationRef = db.ref('notifications/' + userId).push();
            await notificationRef.set({
                title: title,
                message: message,
                read: false,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            return true;
        } catch (error) {
            console.error('Error sending notification:', error);
            return false;
        }
    }
}

// ===== دالة ضغط الصور باستخدام Canvas API =====
async function compressImage(imageFile) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(event) {
            const img = new Image();
            
            img.onload = function() {
                const MAX_WIDTH = 1200;
                const MAX_HEIGHT = 1200;
                
                let width = img.width;
                let height = img.height;
                
                if (width > MAX_WIDTH || height > MAX_HEIGHT) {
                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height = Math.round(height * (MAX_WIDTH / width));
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width = Math.round(width * (MAX_HEIGHT / height));
                            height = MAX_HEIGHT;
                        }
                    }
                }
                
                let quality = 0.8;
                
                if (imageFile.size > 2 * 1024 * 1024) {
                    quality = 0.6;
                }
                
                if (imageFile.size > 5 * 1024 * 1024) {
                    quality = 0.4;
                }
                
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob(function(blob) {
                    if (!blob) {
                        reject(new Error('فشل في ضغط الصورة'));
                        return;
                    }
                    
                    const compressedFile = new File([blob], imageFile.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    
                    resolve(compressedFile);
                }, 'image/jpeg', quality);
            };
            
            img.onerror = function() {
                reject(new Error('فشل في تحميل الصورة'));
            };
            
            img.src = event.target.result;
        };
        
        reader.onerror = function() {
            reject(new Error('فشل في قراءة الملف'));
        };
        
        reader.readAsDataURL(imageFile);
    });
}

// ===== نظام إدارة الصور =====
class ImageManager {
    static async uploadProductImages(images) {
        const imageUrls = [];
        
        for (let i = 0; i < images.length; i++) {
            let file = images[i];
            
            try {
                if (file.size > 500 * 1024) {
                    file = await compressImage(file);
                }
            } catch (compressError) {
                console.error('⚠️ فشل ضغط الصورة، سيتم رفع الأصل:', compressError.message);
            }
            
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(2, 10);
            const fileName = `${timestamp}_${random}.jpg`;
            
            try {
                const { data, error } = await supabaseClient.storage
                    .from('ads-images')
                    .upload(`products/${fileName}`, file);
                
                if (error) {
                    console.error('❌ فشل الرفع:', error.message);
                    continue;
                }
                
                const { data: urlData } = await supabaseClient.storage
                    .from('ads-images')
                    .getPublicUrl(`products/${fileName}`);
                
                if (urlData?.publicUrl) {
                    imageUrls.push(urlData.publicUrl);
                }
                
            } catch (err) {
                console.error('❌ خطأ غير متوقع:', err.message || err);
            }
        }
        
        return imageUrls;
    }
    
    static async deleteImage(imageUrl) {
        try {
            const urlParts = imageUrl.split('/');
            const fileName = urlParts[urlParts.length - 1];
            
            if (!fileName) {
                console.error('❌ لا يمكن استخراج اسم الملف من الرابط:', imageUrl);
                return false;
            }
            
            const { error } = await supabaseClient.storage
                .from('ads-images')
                .remove([`products/${fileName}`]);
            
            if (error) {
                console.error('❌ فشل حذف الصورة:', error.message);
                return false;
            }
            
            return true;
        } catch (err) {
            console.error('❌ خطأ غير متوقع في حذف الصورة:', err.message || err);
            return false;
        }
    }
    
    static createImageDisplay(images) {
        if (!images || images.length === 0) {
            return '<div class="no-image">🚫 لا توجد صور متاحة</div>';
        }
        
        return `
            <div class="product-images">
                <img src="${images[0]}" class="slider-image" alt="صورة المنتج" 
                     onerror="this.onerror=null; this.src='https://via.placeholder.com/300x180/1f2937/9ca3af?text=لا+توجد+صورة'">
            </div>
        `;
    }
}

// ===== دوال إدارة الصور =====
function handleImageSelect(event) {
    const files = Array.from(event.target.files);
    
    if (files.length > 1) {
        alert("يمكنك رفع صورة واحدة فقط كحد أقصى");
        event.target.value = '';
        return;
    }
    
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const invalidFiles = files.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
        alert("يجب أن تكون الملفات من نوع صورة (JPEG, PNG, WebP)");
        event.target.value = '';
        return;
    }
    
    const maxSize = 15 * 1024 * 1024;
    const oversizedFiles = files.filter(file => file.size > maxSize);
    
    if (oversizedFiles.length > 0) {
        alert("حجم الصورة كبير جداً. الحد الأقصى 15MB");
        event.target.value = '';
        return;
    }
    
    selectedImages = files.slice(0, 1);
    displayImagePreview();
}

function displayImagePreview() {
    const previewContainer = document.getElementById('imagePreview');
    if (!previewContainer) return;
    
    imagePreviewUrls = [];
    previewContainer.innerHTML = '';
    
    if (selectedImages.length === 0) {
        previewContainer.innerHTML = '<div style="color:#9ca3af; text-align:center; padding:20px;">لم يتم اختيار أي صور</div>';
        return;
    }
    
    selectedImages.forEach((file, index) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const url = e.target.result;
            imagePreviewUrls.push(url);
            
            const previewItem = document.createElement('div');
            previewItem.className = 'image-preview-item';
            previewItem.innerHTML = `
                <img src="${url}" class="preview-image" alt="معاينة الصورة">
                <div style="text-align:center; margin-top:5px; font-size:11px; color:#9ca3af;">
                    ${(file.size / 1024).toFixed(1)}KB
                </div>
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
    
    const imageInput = document.getElementById('images');
    if (imageInput) {
        imageInput.value = '';
    }
}

// ===== دوال Sidebar =====
function toggleSidebar() {
    const sidebar = document.querySelector(".sidebar");
    const overlay = document.querySelector(".overlay");
    
    if (sidebar && overlay) {
        sidebar.classList.toggle("active");
        overlay.classList.toggle("active");
        document.body.style.overflow = sidebar.classList.contains("active") ? "hidden" : "";
    }
}

function closeSidebar() {
    const sidebar = document.querySelector(".sidebar");
    const overlay = document.querySelector(".overlay");
    
    if (sidebar && overlay) {
        sidebar.classList.remove("active");
        overlay.classList.remove("active");
        document.body.style.overflow = "";
    }
}

// ===== دالة الصفحة الرئيسية =====
function showHome() {
    closeSidebar();
    
    // إظهار مؤشر التقدم
    const topProgressBar = document.getElementById('topProgressBar');
    if (topProgressBar) {
        topProgressBar.style.display = 'block';
        const progressBarLine = document.getElementById('progressBarLine');
        if (progressBarLine) {
            progressBarLine.style.width = '0%';
            let progress = 0;
            const interval = setInterval(() => {
                if (progress < 90) {
                    progress += Math.random() * 10;
                    progressBarLine.style.width = `${Math.min(progress, 100)}%`;
                }
            }, 200);
            
            setTimeout(() => {
                clearInterval(interval);
                progressBarLine.style.width = '100%';
                setTimeout(() => {
                    topProgressBar.style.display = 'none';
                }, 300);
            }, 500);
        }
    }
    
    setTimeout(() => {
        const content = document.getElementById("content");
        if (!content) return;
        
        content.innerHTML = `
            <div class="search-bar">
                <input id="search" placeholder="🔍 ابحث عن قطعة..." onkeyup="loadProducts()" maxlength="50">
                <select id="cat" onchange="loadProducts()">
                    <option value="">كل الأقسام</option>
                    ${categories.map(c => `<option value="${c}">${c}</option>`).join("")}
                </select>
                <button onclick="showBudgetDialog()" class="budget-btn">ميزانيتك 💰</button>
            </div>
            <div class="cards" id="products"></div>
            <div id="pagination" style="text-align:center; margin:20px"></div>
        `;
        
        loadProducts();
    }, 300);
}

// ===== دوال الميزانية =====
function showBudgetDialog() {
    const dialog = document.getElementById("budgetDialog");
    if (dialog) {
        dialog.style.display = "block";
        document.body.style.overflow = "hidden";
    }
}

function closeBudget() {
    const dialog = document.getElementById("budgetDialog");
    if (dialog) {
        dialog.style.display = "none";
        document.body.style.overflow = "";
    }
}

function applyBudget() {
    const input = document.getElementById("maxBudget");
    if (!input) return;
    
    const val = parseFloat(input.value);
    
    if (isNaN(val) || val < 0) {
        alert("يرجى إدخال قيمة ميزانية صحيحة");
        return;
    }
    
    if (val > 10000000) {
        alert("القيمة المدخلة كبيرة جداً");
        return;
    }
    
    budget = val;
    closeBudget();
    loadProducts();
}

// ===== دالة تحميل المنتجات =====
function loadProducts() {
    const searchInput = document.getElementById("search");
    const catSelect = document.getElementById("cat");
    
    const s = searchInput ? searchInput.value.toLowerCase() : '';
    const c = catSelect ? catSelect.value : '';
    
    // إظهار مؤشر التحميل
    const productsContainer = document.getElementById('products');
    if (productsContainer) {
        productsContainer.innerHTML = `
            <div class="skeleton-card">
                <div class="skeleton-line" style="height: 20px; width: 70%"></div>
                <div class="skeleton-line" style="height: 16px; width: 40%"></div>
                <div class="skeleton-line" style="height: 12px; width: 60%"></div>
                <div class="skeleton-line" style="height: 12px; width: 50%"></div>
                <div class="skeleton-line" style="height: 12px; width: 80%"></div>
            </div>
            <div class="skeleton-card">
                <div class="skeleton-line" style="height: 20px; width: 70%"></div>
                <div class="skeleton-line" style="height: 16px; width: 40%"></div>
                <div class="skeleton-line" style="height: 12px; width: 60%"></div>
                <div class="skeleton-line" style="height: 12px; width: 50%"></div>
                <div class="skeleton-line" style="height: 12px; width: 80%"></div>
            </div>
            <div class="skeleton-card">
                <div class="skeleton-line" style="height: 20px; width: 70%"></div>
                <div class="skeleton-line" style="height: 16px; width: 40%"></div>
                <div class="skeleton-line" style="height: 12px; width: 60%"></div>
                <div class="skeleton-line" style="height: 12px; width: 50%"></div>
                <div class="skeleton-line" style="height: 12px; width: 80%"></div>
            </div>
        `;
    }
    
    // إظهار مؤشر التقدم
    const topProgressBar = document.getElementById('topProgressBar');
    if (topProgressBar) {
        topProgressBar.style.display = 'block';
        const progressBarLine = document.getElementById('progressBarLine');
        if (progressBarLine) {
            progressBarLine.style.width = '0%';
            let progress = 0;
            const interval = setInterval(() => {
                if (progress < 90) {
                    progress += Math.random() * 10;
                    progressBarLine.style.width = `${Math.min(progress, 100)}%`;
                }
            }, 200);
            
            setTimeout(() => {
                clearInterval(interval);
            }, 1000);
        }
    }
    
    db.ref("products").once("value", snap => {
        const d = snap.val() || {};
        let htmlCards = [];
        
        Object.keys(d).forEach(k => {
            const p = d[k];
            
            if (!p || !p.name || !p.price) {
                return;
            }
            
            const price = parseFloat(p.price) || 0;
            
            // تحديد ما إذا كان يجب عرض الإعلان
            let showPost = false;
            const status = p.status || ApprovalSystem.STATUS.PENDING;
            
            if (userUid) {
                if (isAdmin) {
                    showPost = true;
                }
                else if (p.uid === userUid) {
                    showPost = true;
                }
                else if (status === ApprovalSystem.STATUS.APPROVED) {
                    showPost = true;
                }
            }
            else if (status === ApprovalSystem.STATUS.APPROVED) {
                showPost = true;
            }
            
            if (!showPost) return;
            
            if ((!c || p.category === c) && p.name.toLowerCase().includes(s)) {
                if (budget && price > budget) return;
                
                // تحديد لون وشكل الحالة
                let statusBadge = '';
                let statusClass = '';
                let statusText = '';
                
                // عرض حالة المنتج الفعلية (status2) إذا كانت معتمدة
                if (status === ApprovalSystem.STATUS.APPROVED) {
                    const actualStatus = p.status2 || 'available';
                    
                    switch(actualStatus) {
                        case 'available':
                            statusClass = 'status-available';
                            statusText = '✅ متاح';
                            break;
                        case 'sold':
                            statusClass = 'status-sold';
                            statusText = '✅ مباع';
                            break;
                        case 'reserved':
                            statusClass = 'status-reserved';
                            statusText = '✅ محجوز';
                            break;
                        default:
                            statusClass = 'status-available';
                            statusText = '✅ متاح';
                    }
                } else {
                    // حالات الموافقة الأخرى
                    switch(status) {
                        case ApprovalSystem.STATUS.PENDING:
                            statusClass = 'status-pending';
                            statusText = '⏳ بانتظار الموافقة';
                            break;
                        case ApprovalSystem.STATUS.EDITED_PENDING:
                            statusClass = 'status-pending';
                            statusText = '✏️ تعديل بانتظار الموافقة';
                            break;
                        case ApprovalSystem.STATUS.REJECTED:
                            statusClass = 'status-rejected';
                            statusText = '❌ مرفوض';
                            break;
                        default:
                            statusClass = 'status-available';
                            statusText = '✅ متاح';
                    }
                }
                
                // شريط الانتظار الأصفر للإعلانات المعلقة
                const pendingBar = (status === ApprovalSystem.STATUS.PENDING || status === ApprovalSystem.STATUS.EDITED_PENDING) ? 
                    `<div style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 10px; border-radius: 8px; margin-bottom: 10px; text-align: center; font-size: 13px; font-weight: bold; border: 1px solid rgba(245, 158, 11, 0.3);">
                        ⏳ بانتظار موافقة المسؤول
                    </div>` : '';
                
                statusBadge = `<div class="product-status ${statusClass}">${statusText}</div>`;
                
                // الحصول على معلومات البائع
                let isVerified = false;
                if (p.uid) {
                    db.ref('users/' + p.uid).once('value', (userSnap) => {
                        const userData = userSnap.val();
                        if (userData) {
                            isVerified = userData.isVerified || false;
                        }
                    });
                }
                
                // عرض الصور في البطاقة
                const imagesHTML = p.images && p.images.length > 0 
                    ? ImageManager.createImageDisplay(p.images)
                    : '<div class="no-image">🚫 لا توجد صور متاحة</div>';
                
                // قسم البائع - قابل للنقر إذا كان المستخدم مسجل
                const sellerClickable = userUid ? 'onclick="viewProfile(\'' + p.uid + '\', \'' + (p.seller || '') + '\'); event.stopPropagation();"' : '';
                
                const sellerSection = `
                    <div class="seller" ${sellerClickable} style="${userUid ? 'cursor:pointer;' : ''}">
                        👤 <span style="${userUid ? 'color:#38bdf8; text-decoration:underline;' : ''}">
                            <span class="user-name-wrapper">
                                ${isVerified ? '<span class="verified-badge"><img src="img/verify.png" alt="✓"> موثّق</span>' : ''}
                                ${p.seller || 'غير معروف'}
                            </span>
                        </span> 
                        | ☎ ${p.phone || 'غير متوفر'}
                    </div>
                `;
                
                htmlCards.push({
                    uid: p.uid,
                    key: k,
                    html: `
                        <div class="card" onclick="showDetails('${k}')">
                            ${pendingBar}
                            ${imagesHTML}
                            <h3>${escapeHTML(p.name)}</h3>
                            <span class="price">${formatPrice(p.price)} د.ع</span>
                            ${statusBadge}
                            <div class="meta">
                                <span>${p.category || 'غير محدد'}</span>
                                <span>${p.province || 'غير محدد'}</span>
                                <span>توصيل: ${p.delivery || 'لا'}</span>
                            </div>
                            ${sellerSection}
                            <div class="actions">
                                ${(p.uid === userUid || isAdmin) ? `
                                <button class="edit" onclick="editProduct('${k}');event.stopPropagation();">تعديل</button>
                                <button class="del" onclick="deleteProduct('${k}');event.stopPropagation();">حذف</button>` : ""}
                            </div>
                        </div>
                    `
                });
            }
        });
        
        // ترتيب البطاقات
        if (userUid) {
            htmlCards = htmlCards.sort((a, b) => {
                if (a.uid === userUid && b.uid !== userUid) return -1;
                if (a.uid !== userUid && b.uid === userUid) return 1;
                return 0;
            });
        }
        
        const totalPages = Math.ceil(htmlCards.length / postsPerPage);
        if (currentPage > totalPages) currentPage = 1;
        const start = (currentPage - 1) * postsPerPage;
        const pageItems = htmlCards.slice(start, start + postsPerPage);
        
        let finalHTML = pageItems.map(p => p.html).join("") || "<p class='empty'>لا توجد إعلانات</p>";
        
        if (productsContainer) {
            productsContainer.style.opacity = '0';
            setTimeout(() => {
                productsContainer.innerHTML = finalHTML;
                productsContainer.style.opacity = '1';
                renderPagination(totalPages);
                
                // إخفاء مؤشر التقدم
                if (topProgressBar) {
                    const progressBarLine = document.getElementById('progressBarLine');
                    if (progressBarLine) {
                        progressBarLine.style.width = '100%';
                        setTimeout(() => {
                            topProgressBar.style.display = 'none';
                        }, 300);
                    }
                }
            }, 300);
        }
    }).catch(error => {
        console.error("Error loading products:", error);
        if (productsContainer) {
            productsContainer.innerHTML = "<p class='empty'>حدث خطأ في تحميل الإعلانات</p>";
        }
        // إخفاء مؤشر التقدم في حالة الخطأ
        const topProgressBar = document.getElementById('topProgressBar');
        if (topProgressBar) {
            topProgressBar.style.display = 'none';
        }
        alert("خطأ في تحميل الإعلانات");
    });
}

// ===== دوال الترقيم =====
function renderPagination(total) {
    let html = "";
    for (let i = 1; i <= total; i++) {
        html += `
            <button onclick="goPage(${i})"
                style="
                    margin: 4px;
                    padding: 8px 14px;
                    border-radius: 8px;
                    border: none;
                    cursor: pointer;
                    background: ${i === currentPage ? 'linear-gradient(135deg, #38bdf8, #0ea5e9)' : 'rgba(31, 41, 55, 0.8)'};
                    color: ${i === currentPage ? 'white' : '#e5e7eb'};
                    font-weight: ${i === currentPage ? 'bold' : 'normal'};
                    border: 1px solid ${i === currentPage ? 'rgba(56, 189, 248, 0.4)' : 'rgba(56, 189, 248, 0.2)'};
                ">
                ${i}
            </button>`;
    }
    
    const pagination = document.getElementById('pagination');
    if (pagination) {
        pagination.innerHTML = html;
    }
}

function goPage(p) {
    currentPage = p;
    loadProducts();
}

// ===== دالة حذف المنتج مع حذف الصورة =====
async function deleteProduct(k) {
    if (!confirm("هل أنت متأكد من حذف الإعلان؟ لا يمكن التراجع عن هذا الإجراء.")) {
        return;
    }
    
    // إظهار مؤشر التحميل
    const overlay = document.getElementById('progressOverlay');
    if (overlay) {
        overlay.classList.add('active');
        document.getElementById('progressText').textContent = "جاري حذف الإعلان...";
        document.getElementById('progressSubtext').textContent = "قد يستغرق بضع ثوان";
        document.body.style.overflow = 'hidden';
    }
    
    db.ref("products/" + k).once('value', async (snapshot) => {
        const product = snapshot.val();
        if (!product) {
            if (overlay) overlay.classList.remove('active');
            document.body.style.overflow = '';
            alert("الإعلان غير موجود");
            return;
        }
        
        if (product.uid !== userUid && !isAdmin) {
            if (overlay) overlay.classList.remove('active');
            document.body.style.overflow = '';
            alert("ليس لديك صلاحية لحذف هذا الإعلان");
            return;
        }
        
        // حذف الصور من Supabase
        if (product.images && product.images.length > 0) {
            for (let imageUrl of product.images) {
                await ImageManager.deleteImage(imageUrl);
            }
        }
        
        // تحديث عداد منتجات المستخدم
        if (product.uid) {
            db.ref('users/' + product.uid).once('value', (userSnapshot) => {
                const userData = userSnapshot.val();
                if (userData) {
                    const currentCount = userData.totalProducts || 0;
                    if (currentCount > 0) {
                        db.ref('users/' + product.uid).update({
                            totalProducts: currentCount - 1
                        });
                    }
                }
            });
        }
        
        // حذف المنتج من Firebase
        db.ref("products/" + k).remove().then(() => {
            // إظهار رسالة النجاح
            if (overlay) {
                document.getElementById('progressText').textContent = "تم حذف الإعلان بنجاح";
                document.getElementById('progressSubtext').textContent = "";
                
                setTimeout(() => {
                    overlay.classList.remove('active');
                    document.body.style.overflow = '';
                    loadProducts();
                }, 1500);
            } else {
                loadProducts();
            }
        }).catch(error => {
            console.error("Delete error:", error);
            if (overlay) {
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
            alert("حدث خطأ أثناء حذف الإعلان");
        });
    });
}

// ===== دالة تعديل المنتج =====
function editProduct(k) {
    // إظهار مؤشر التقدم
    const topProgressBar = document.getElementById('topProgressBar');
    if (topProgressBar) {
        topProgressBar.style.display = 'block';
        const progressBarLine = document.getElementById('progressBarLine');
        if (progressBarLine) {
            progressBarLine.style.width = '0%';
            let progress = 0;
            const interval = setInterval(() => {
                if (progress < 90) {
                    progress += Math.random() * 10;
                    progressBarLine.style.width = `${Math.min(progress, 100)}%`;
                }
            }, 200);
            
            setTimeout(() => {
                clearInterval(interval);
                progressBarLine.style.width = '100%';
                setTimeout(() => {
                    topProgressBar.style.display = 'none';
                }, 300);
            }, 500);
        }
    }
    
    db.ref("products/" + k).once("value", s => {
        const product = s.val();
        if (!product) {
            const topProgressBar = document.getElementById('topProgressBar');
            if (topProgressBar) topProgressBar.style.display = 'none';
            alert("الإعلان غير موجود");
            return;
        }
        
        if (product.uid !== userUid && !isAdmin) {
            const topProgressBar = document.getElementById('topProgressBar');
            if (topProgressBar) topProgressBar.style.display = 'none';
            alert("ليس لديك صلاحية لتعديل هذا الإعلان");
            return;
        }
        
        showPublish(product, k);
        const topProgressBar = document.getElementById('topProgressBar');
        if (topProgressBar) topProgressBar.style.display = 'none';
    });
}

// ===== دالة عرض النشر =====
async function showPublish(p = null, k = null) {
    closeSidebar();
    
    // إظهار مؤشر التقدم
    const topProgressBar = document.getElementById('topProgressBar');
    if (topProgressBar) {
        topProgressBar.style.display = 'block';
        const progressBarLine = document.getElementById('progressBarLine');
        if (progressBarLine) {
            progressBarLine.style.width = '0%';
            let progress = 0;
            const interval = setInterval(() => {
                if (progress < 90) {
                    progress += Math.random() * 10;
                    progressBarLine.style.width = `${Math.min(progress, 100)}%`;
                }
            }, 200);
            
            setTimeout(() => {
                clearInterval(interval);
            }, 500);
        }
    }
    
    setTimeout(async () => {
        // التحقق من صلاحية النشر (للنشر الجديد فقط)
        let canPublishNow = true;
        if (!k) {
            canPublishNow = await checkPublishPermission();
        }
        
        const sellerName = userDisplayName || (p ? p.seller : "");
        const sellerField = userDisplayName ? 
            `<input id="seller" placeholder="اسم البائع" value="${sellerName}" disabled style="background:rgba(55, 65, 81, 0.5); color:#9ca3af; cursor:not-allowed;">
             <small style="color:#38bdf8; font-size:12px;">اسم البائع هو اسم المستخدم المسجل</small>` :
            `<input id="seller" placeholder="اسم البائع" value="${sellerName}" maxlength="30">`;
        
        // إعادة تعيين الصور المختارة
        selectedImages = [];
        imagePreviewUrls = [];
        
        const content = document.getElementById("content");
        if (!content) return;
        
        // عرض حالة الإعلان الحالي
        const currentStatus = p ? (p.status || ApprovalSystem.STATUS.PENDING) : ApprovalSystem.STATUS.PENDING;
        let statusMessage = '';
        
        if (currentStatus === ApprovalSystem.STATUS.PENDING) {
            statusMessage = `
                <div class="waiting-approval">
                    <h4>⏳ بانتظار موافقة المسؤول</h4>
                    <p>إعلانك قيد المراجعة وسيظهر للجميع بعد الموافقة عليه</p>
                </div>
            `;
        } else if (currentStatus === ApprovalSystem.STATUS.EDITED_PENDING) {
            statusMessage = `
                <div class="waiting-approval">
                    <h4>✏️ تعديل بانتظار الموافقة</h4>
                    <p>تعديلاتك قيد المراجعة وسيتم تحديث الإعلان بعد الموافقة عليها</p>
                </div>
            `;
        } else if (currentStatus === ApprovalSystem.STATUS.REJECTED) {
            statusMessage = `
                <div class="security-warning">
                    <h4>❌ الإعلان مرفوض</h4>
                    <p>يرجى تعديل الإعلان وإعادة إرساله للمراجعة</p>
                </div>
            `;
        }
        
        content.innerHTML = `
            <div class="form-box">
                <h2>${p ? "تعديل إعلان" : "نشر إعلان جديد"}</h2>
                
                ${statusMessage}
                
                ${!p && !canPublishNow ? `<div id="publishTimer"></div>` : ''}
                
                ${p ? '' : '<small style="color:#9ca3af; margin-bottom:15px; display:block;">يمكنك نشر إعلان واحد كل ساعة</small>'}
                
                <input id="name" placeholder="اسم القطعة" value="${p ? escapeHTML(p.name) : ""}" maxlength="50" required>
                <input id="price" type="number" placeholder="السعر" value="${p ? p.price : ""}" min="0" max="10000000" required>
                <select id="category">${categories.map(c => `<option value="${c}" ${p && p.category === c ? "selected" : ""}>${c}</option>`).join("")}</select>
                ${sellerField}
                <input id="phone" placeholder="رقم الهاتف" value="${p ? p.phone : ""}" pattern="[0][0-9]{10}" required>
                <small style="color:#9ca3af; font-size:12px;">يجب أن يبدأ بـ 0 ويتكون من 11 رقم</small>
                <select id="province">
                    <option value="">اختر المحافظة</option>
                    ${provinces.map(pr => `<option value="${pr}" ${p && p.province === pr ? "selected" : ""}>${pr}</option>`).join("")}
                </select>
                <select id="delivery">
                    <option value="نعم" ${p && p.delivery === "نعم" ? "selected" : ""}>نعم</option>
                    <option value="لا" ${p && p.delivery === "لا" ? "selected" : ""}>لا</option>
                </select>
                
                <!-- إضافة خاصية الحالة (متاح/مباع/محجوز) -->
                <select id="status" ${isAdmin || (p && p.uid === userUid) ? '' : 'disabled'}>
                    <option value="available" ${(p && (p.status2 === "available" || (!p.status2 && p.status === "approved"))) ? "selected" : ""}>متاح</option>
                    <option value="sold" ${p && p.status2 === "sold" ? "selected" : ""}>مباع</option>
                    <option value="reserved" ${p && p.status2 === "reserved" ? "selected" : ""}>محجوز</option>
                </select>
                <small style="color:#9ca3af; font-size:12px;">${isAdmin ? 'تغيير حالة الإعلان' : 'يمكنك تغيير الحالة بعد النشر'}</small>
                
                <!-- رفع الصور - صورة واحدة فقط -->
                <div class="image-upload-container">
                    <label class="file-input-label">
                        📷 اختر صورة الإعلان (صورة واحدة فقط)
                        <input type="file" id="images" accept="image/*" onchange="handleImageSelect(event)">
                    </label>
                    <small style="color:#9ca3af; font-size:12px; display:block; margin-top:5px;">
                        يمكنك رفع صورة واحدة فقط (JPEG, PNG, WebP) - سيتم ضغطها تلقائياً
                    </small>
                    <div class="image-preview" id="imagePreview">
                        ${p && p.images && p.images.length > 0 ? 
                            p.images.slice(0, 1).map((img, idx) => `
                                <div class="image-preview-item">
                                    <img src="${img}" class="preview-image" alt="صورة الإعلان">
                                    <small style="display:block; text-align:center; color:#9ca3af;">الصورة الحالية</small>
                                </div>
                            `).join('') : 
                            '<div style="color:#9ca3af; text-align:center; padding:20px;">لم يتم اختيار أي صور</div>'
                        }
                    </div>
                </div>

                <button onclick="saveProduct('${k || ""}')" id="saveBtn" ${!p && !canPublishNow ? 'disabled class="timer-disabled"' : ''}>
                    💾 ${p ? "تحديث" : "نشر"}
                </button>
                
                ${p ? `<button onclick="showHome()" style="background:linear-gradient(135deg, #6b7280, #4b5563); margin-top:10px;">إلغاء</button>` : ''}
            </div>`;
        
        // تحديث عرض المؤقت إذا كان غير متاح
        if (!p && !canPublishNow) {
            updatePublishTimerDisplay();
        }
        
        // إخفاء مؤشر التقدم
        if (topProgressBar) {
            const progressBarLine = document.getElementById('progressBarLine');
            if (progressBarLine) {
                progressBarLine.style.width = '100%';
                setTimeout(() => {
                    topProgressBar.style.display = 'none';
                }, 300);
            }
        }
    }, 500);
}

// ===== دالة حفظ المنتج مع نظام الموافقة =====
async function saveProduct(k) {
    // التحقق من المؤقت للنشر الجديد فقط
    if (!k) {
        const canPublishNow = await checkPublishPermission();
        if (!canPublishNow) {
            alert("يجب الانتظار قبل نشر إعلان جديد");
            return;
        }
    }
    
    const name = document.getElementById("name")?.value.trim();
    const price = document.getElementById("price")?.value.trim();
    const phone = document.getElementById("phone")?.value.trim();
    const province = document.getElementById("province")?.value;
    const status = document.getElementById("status")?.value || "available";
    
    if (!name || !price || !phone || !province) {
        alert("جميع الحقول مطلوبة");
        return;
    }
    
    if (name.length < 3 || name.length > 50) {
        alert("اسم القطعة يجب أن يكون بين 3 و 50 حرف");
        return;
    }
    
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0 || priceNum > 10000000) {
        alert("السعر يجب أن يكون بين 0 و 10,000,000 دينار");
        return;
    }
    
    if (!/^[0][0-9]{10}$/.test(phone)) {
        alert("رقم الهاتف يجب أن يكون 11 رقم ويبدأ بصفر");
        return;
    }
    
    if (!province) {
        alert("يرجى اختيار المحافظة");
        return;
    }
    
    const seller = userDisplayName || document.getElementById("seller")?.value.trim();
    
    if (!seller || seller.length < 2) {
        alert("اسم البائع مطلوب (2 أحرف على الأقل)");
        return;
    }
    
    const saveBtn = document.getElementById('saveBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<span style="display:inline-block; animation:spin 1s linear infinite;">↻</span> جاري الحفظ...';
    saveBtn.disabled = true;
    
    // إظهار مؤشر التحميل
    const overlay = document.getElementById('progressOverlay');
    if (overlay) {
        overlay.classList.add('active');
        document.getElementById('progressText').textContent = k ? "جاري تحديث الإعلان..." : "جاري نشر الإعلان...";
        document.getElementById('progressSubtext').textContent = "يرجى الانتظار";
        document.body.style.overflow = 'hidden';
    }
    
    try {
        let imageUrls = [];
        let oldImages = [];
        
        // إذا كان تعديلاً، احتفظ بالصورة الحالية
        if (k) {
            const productRef = db.ref("products/" + k);
            const snapshot = await productRef.once("value");
            const existingProduct = snapshot.val();
            if (existingProduct && existingProduct.images && existingProduct.images.length > 0) {
                imageUrls = [existingProduct.images[0]];
                oldImages = [existingProduct.images[0]];
            }
        }
        
        // إذا تم اختيار صور جديدة، حذف القديمة ورفع الجديدة
        if (selectedImages.length > 0) {
            if (overlay) {
                document.getElementById('progressText').textContent = "جاري معالجة الصورة...";
                document.getElementById('progressSubtext').textContent = "سيتم ضغط الصورة تلقائياً";
            }
            
            // حذف الصور القديمة إذا كانت موجودة
            if (oldImages.length > 0) {
                for (let oldImage of oldImages) {
                    await ImageManager.deleteImage(oldImage);
                }
            }
            
            // رفع الصور الجديدة (سيتم ضغطها تلقائياً في uploadProductImages)
            const uploadedUrls = await ImageManager.uploadProductImages(selectedImages.slice(0, 1));
            
            if (uploadedUrls.length > 0) {
                imageUrls = [uploadedUrls[0]];
            }
        }
        
        // تحضير بيانات المنتج
        const data = {
            name: name,
            price: priceNum,
            category: document.getElementById("category").value,
            seller: seller,
            phone: phone,
            province: province,
            delivery: document.getElementById("delivery").value,
            status2: status,
            uid: userUid,
            lastUpdated: firebase.database.ServerValue.TIMESTAMP
        };
        
        // تحديد حالة الإعلان بناءً على ما إذا كان جديداً أو تعديلاً
        if (!k) {
            // إعلان جديد: حالة معلقة
            data.status = ApprovalSystem.STATUS.PENDING;
            data.createdAt = firebase.database.ServerValue.TIMESTAMP;
            data.timestamp = firebase.database.ServerValue.TIMESTAMP;
        } else {
            // تعديل إعلان موجود
            const productRef = db.ref("products/" + k);
            const snapshot = await productRef.once("value");
            const existingProduct = snapshot.val();
            
            // إذا كان الإعلان معتمداً مسبقاً، يصبح التعديل معلقاً
            if (existingProduct && existingProduct.status === ApprovalSystem.STATUS.APPROVED) {
                data.status = ApprovalSystem.STATUS.EDITED_PENDING;
                data.originalData = {
                    name: existingProduct.name,
                    price: existingProduct.price,
                    category: existingProduct.category,
                    seller: existingProduct.seller,
                    phone: existingProduct.phone,
                    province: existingProduct.province,
                    delivery: existingProduct.delivery,
                    status2: existingProduct.status2 || "available",
                    images: existingProduct.images || []
                };
            } else {
                // إذا كان معلقاً سابقاً، يبقى معلقاً
                data.status = existingProduct?.status || ApprovalSystem.STATUS.PENDING;
            }
        }
        
        // إضافة الصور إذا كانت موجودة
        if (imageUrls.length > 0) {
            data.images = imageUrls;
        }
        
        // حفظ المنتج في Firebase
        const ref = k ? db.ref("products/" + k) : db.ref("products").push();
        await ref.set(data);
        
        // تحديث الوقت والحساب للنشر الجديد فقط
        if (!k && userUid) {
            // حفظ وقت النشر الأخير
            saveLastPublishTime();
            
            // تحديث عداد منتجات المستخدم
            db.ref('users/' + userUid).once('value', (snapshot) => {
                const userData = snapshot.val();
                if (userData) {
                    const currentCount = userData.totalProducts || 0;
                    db.ref('users/' + userUid).update({
                        totalProducts: currentCount + 1,
                        lastActive: firebase.database.ServerValue.TIMESTAMP
                    });
                } else {
                    db.ref('users/' + userUid).update({
                        totalProducts: 1,
                        lastActive: firebase.database.ServerValue.TIMESTAMP
                    });
                }
            });
        }
        
        // إرسال إشعار للمسؤول
        if (userUid && isAdmin) {
            // إذا كان المسؤول هو من ينشر، يعتمد مباشرة
            db.ref("products/" + ref.key).update({
                status: ApprovalSystem.STATUS.APPROVED,
                approvedAt: firebase.database.ServerValue.TIMESTAMP,
                approvedBy: userUid
            });
            
            if (overlay) {
                document.getElementById('progressText').textContent = "تم نشر الإعلان بنجاح وتم اعتماده تلقائياً";
                document.getElementById('progressSubtext').textContent = "";
            }
        } else {
            if (overlay) {
                document.getElementById('progressText').textContent = k ? "تم تحديث الإعلان بنجاح وجاري انتظار الموافقة" : "تم نشر الإعلان بنجاح وجاري انتظار الموافقة";
                document.getElementById('progressSubtext').textContent = "";
            }
        }
        
        // إعادة تعيين المتغيرات
        selectedImages = [];
        imagePreviewUrls = [];
        
        setTimeout(() => {
            if (overlay) {
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
            showHome();
        }, 1500);
        
    } catch (error) {
        console.error("Error saving product:", error);
        if (overlay) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
        alert("حدث خطأ أثناء حفظ الإعلان");
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// ===== دالة عرض التفاصيل مع نظام الروابط =====
async function showDetails(k) {
    // إظهار مؤشر التحميل
    const overlay = document.getElementById('progressOverlay');
    if (overlay) {
        overlay.classList.add('active');
        document.getElementById('progressText').textContent = "جاري التحميل...";
        document.getElementById('progressSubtext').textContent = "انتظر قليلاً";
        document.body.style.overflow = 'hidden';
    }
    
    try {
        const snapshot = await db.ref("products/" + k).once("value");
        const p = snapshot.val();
        if (!p) {
            if (overlay) overlay.classList.remove('active');
            document.body.style.overflow = '';
            alert("الإعلان غير موجود أو تم حذفه");
            return;
        }
        
        // التحقق من توثيق البائع
        let isVerified = false;
        if (p.uid) {
            const userSnap = await db.ref('users/' + p.uid).once('value');
            const userData = userSnap.val();
            if (userData) {
                isVerified = userData.isVerified || false;
            }
        }
        
        // عرض الصور في التفاصيل
        const imagesHTML = p.images && p.images.length > 0 
            ? ImageManager.createImageDisplay(p.images)
            : '<div class="no-image">🚫 لا توجد صور متاحة</div>';
        
        const sellerClickable = userUid ? 'onclick="viewProfile(\'' + p.uid + '\', \'' + (p.seller || '') + '\');"' : '';
        
        const sellerWithLink = `
            <p ${sellerClickable} style="${userUid ? 'cursor:pointer;' : ''}">
                <strong>البائع:</strong> 
                <span style="${userUid ? 'color:#38bdf8; text-decoration:underline; font-weight:bold;' : 'font-weight:bold;'}">
                    <span class="user-name-wrapper">
                        ${isVerified ? '<span class="verified-badge"><img src="img/verify.png" alt="✓"> موثّق</span>' : ''}
                        ${p.seller || 'غير معروف'}
                    </span>
                </span>
            </p>
        `;
        
        const approvalStatus = p.status || ApprovalSystem.STATUS.PENDING;
        let approvalStatusText = '';
        
        switch(approvalStatus) {
            case ApprovalSystem.STATUS.PENDING:
                approvalStatusText = '⏳ بانتظار الموافقة';
                break;
            case ApprovalSystem.STATUS.EDITED_PENDING:
                approvalStatusText = '✏️ تعديل بانتظار الموافقة';
                break;
            case ApprovalSystem.STATUS.APPROVED:
                approvalStatusText = '✅ معتمد';
                break;
            case ApprovalSystem.STATUS.REJECTED:
                approvalStatusText = '❌ مرفوض';
                break;
            default:
                approvalStatusText = '✅ معتمد';
        }
        
        // عرض الحالة الفعلية للمنتج
        const actualStatus = p.status2 || 'available';
        let actualStatusText = '';
        let actualStatusColor = '#10b981';
        
        switch(actualStatus) {
            case 'available':
                actualStatusText = 'متاح';
                actualStatusColor = '#10b981';
                break;
            case 'sold':
                actualStatusText = 'مباع';
                actualStatusColor = '#38bdf8';
                break;
            case 'reserved':
                actualStatusText = 'محجوز';
                actualStatusColor = '#f59e0b';
                break;
            default:
                actualStatusText = 'متاح';
                actualStatusColor = '#10b981';
        }
        
        const detailsContent = document.getElementById("detailsContent");
        const linkSection = await LinkManager.createLinkSection(k);
        
        if (detailsContent) {
            detailsContent.innerHTML = `
                <h2>${escapeHTML(p.name)}</h2>
                ${imagesHTML}
                
                <!-- نظام الروابط المباشرة -->
                ${linkSection}
                
                <p><strong>حالة الموافقة:</strong> <span style="font-weight:bold; color:${approvalStatus === ApprovalSystem.STATUS.PENDING || approvalStatus === ApprovalSystem.STATUS.EDITED_PENDING ? '#f59e0b' : approvalStatus === ApprovalSystem.STATUS.REJECTED ? '#ef4444' : '#10b981'}">${approvalStatusText}</span></p>
                <p><strong>حالة المنتج:</strong> <span style="font-weight:bold; color:${actualStatusColor}">${actualStatusText}</span></p>
                <p><strong>السعر:</strong> ${formatPrice(p.price)} د.ع</p>
                <p><strong>القسم:</strong> ${p.category || 'غير محدد'}</p>
                ${sellerWithLink}
                <p><strong>رقم الهاتف:</strong> ${p.phone}</p>
                <p><strong>المحافظة:</strong> ${p.province || 'غير محدد'}</p>
                <p><strong>التوصيل:</strong> ${p.delivery || 'لا'}</p>
                ${p.uid === userUid ? `<p style="color:#38bdf8; font-size:14px; margin-top:10px;">هذا إعلانك</p>` : ""}
            `;
        }
        
        const dialog = document.getElementById("detailsDialog");
        if (dialog) {
            dialog.style.display = "block";
            
            // التحقق إذا كان المستخدم قد فتح المنشور من رابط مباشر
            const isDirectLink = window.location.pathname.startsWith('/p/') || window.location.search.includes('post=');
            const backHomeBtn = dialog.querySelector('.back-home-btn');
            const normalBackBtn = dialog.querySelector('button:not(.back-home-btn)');
            
            if (isDirectLink) {
                if (normalBackBtn) normalBackBtn.style.display = 'none';
                if (backHomeBtn) backHomeBtn.style.display = 'block';
            } else {
                if (normalBackBtn) normalBackBtn.style.display = 'block';
                if (backHomeBtn) backHomeBtn.style.display = 'none';
            }
        }
        
        if (overlay) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    } catch (error) {
        console.error("Error loading details:", error);
        if (overlay) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
        alert("حدث خطأ في تحميل التفاصيل");
    }
}

function closeDetails() {
    const dialog = document.getElementById("detailsDialog");
    if (dialog) {
        dialog.style.display = "none";
    }
}

// ===== دالة الذهاب إلى الصفحة الرئيسية من رابط مباشر =====
function goToHomePage() {
    window.location.href = 'https://a3len.store';
}

// ===== دوال المصادقة =====
function updateAuthUI() {
    const authSection = document.getElementById("authSection");
    
    if (!authSection) return;
    
    if (currentUser && userDisplayName) {
        db.ref("users/" + currentUser.uid).once("value", snapshot => {
            const userData = snapshot.val();
            const displayName = userData ? (userData.fullName || userDisplayName) : userDisplayName;
            
            isAdmin = userData && userData.isAdmin === true;
            const isVerified = userData && userData.isVerified === true;
            
            authSection.innerHTML = `
                <div class="user-info">
                    <p class="profile-link" onclick="viewMyProfile()">
                        <span class="user-name-wrapper">
                            ${isVerified ? '<span class="verified-badge"><img src="img/verify.png" alt="✓"></span>' : ''}
                            ${displayName}
                            ${isAdmin ? '<span class="admin-badge">مدير</span>' : ''}
                        </span>
                    </p>
                    <small style="color:#9ca3af; font-size:12px;">@${userDisplayName}</small>
                    <small style="color:#9ca3af; font-size:11px; display:block; margin:5px 0;">${userData ? userData.totalProducts || 0 : 0} إعلان</small>
                    <button class="logout-btn" onclick="logoutUser()">تسجيل خروج</button>
                </div>
            `;
        });
    } else {
        authSection.innerHTML = `
            <button class="auth-btn" onclick="window.location.href='login.html'">🔐 تسجيل دخول</button>
            <button class="auth-btn" onclick="window.location.href='register.html'">📝 إنشاء حساب</button>
        `;
    }
}

function logoutUser() {
    if (confirm("هل أنت متأكد من تسجيل الخروج؟")) {
        // إظهار مؤشر التحميل
        const overlay = document.getElementById('progressOverlay');
        if (overlay) {
            overlay.classList.add('active');
            document.getElementById('progressText').textContent = "جاري تسجيل الخروج...";
            document.getElementById('progressSubtext').textContent = "انتظر قليلاً";
            document.body.style.overflow = 'hidden';
        }
        
        auth.signOut()
            .then(() => {
                currentUser = null;
                userDisplayName = null;
                userFullName = null;
                isAdmin = false;
                userUid = null;
                updateAuthUI();
                showHome();
                
                if (overlay) {
                    document.getElementById('progressText').textContent = "تم تسجيل الخروج بنجاح";
                    document.getElementById('progressSubtext').textContent = "";
                    
                    setTimeout(() => {
                        overlay.classList.remove('active');
                        document.body.style.overflow = '';
                    }, 1500);
                }
            })
            .catch((error) => {
                console.error("Logout error:", error);
                if (overlay) {
                    overlay.classList.remove('active');
                    document.body.style.overflow = '';
                }
                alert("حدث خطأ أثناء تسجيل الخروج");
            });
    }
}

function viewProfile(userId, sellerName) {
    if (!userUid) {
        alert("يجب تسجيل الدخول أولاً لعرض الملف الشخصي");
        return;
    }
    
    if (sellerName) {
        localStorage.setItem('profileSellerName', sellerName);
    }
    
    // إظهار مؤشر التقدم
    const topProgressBar = document.getElementById('topProgressBar');
    if (topProgressBar) {
        topProgressBar.style.display = 'block';
        const progressBarLine = document.getElementById('progressBarLine');
        if (progressBarLine) {
            progressBarLine.style.width = '0%';
            let progress = 0;
            const interval = setInterval(() => {
                if (progress < 90) {
                    progress += Math.random() * 10;
                    progressBarLine.style.width = `${Math.min(progress, 100)}%`;
                }
            }, 200);
            
            setTimeout(() => {
                clearInterval(interval);
                progressBarLine.style.width = '100%';
                setTimeout(() => {
                    topProgressBar.style.display = 'none';
                    window.location.href = `profile.html?id=${userId}`;
                }, 300);
            }, 500);
        }
    } else {
        window.location.href = `profile.html?id=${userId}`;
    }
}

function viewMyProfile() {
    if (currentUser && currentUser.uid) {
        // إظهار مؤشر التقدم
        const topProgressBar = document.getElementById('topProgressBar');
        if (topProgressBar) {
            topProgressBar.style.display = 'block';
            const progressBarLine = document.getElementById('progressBarLine');
            if (progressBarLine) {
                progressBarLine.style.width = '0%';
                let progress = 0;
                const interval = setInterval(() => {
                    if (progress < 90) {
                        progress += Math.random() * 10;
                        progressBarLine.style.width = `${Math.min(progress, 100)}%`;
                    }
                }, 200);
                
                setTimeout(() => {
                    clearInterval(interval);
                    progressBarLine.style.width = '100%';
                    setTimeout(() => {
                        topProgressBar.style.display = 'none';
                        window.location.href = `profile.html?id=${currentUser.uid}`;
                    }, 300);
                }, 500);
            }
        } else {
            window.location.href = `profile.html?id=${currentUser.uid}`;
        }
    } else {
        alert("يرجى تسجيل الدخول أولاً");
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
    }
}

// ===== دوال نظام مؤقت النشر =====
async function checkPublishPermission() {
    if (!userUid) {
        canPublish = true;
        return true;
    }
    
    return new Promise((resolve) => {
        // التحقق من وقت النشر الأخير في قاعدة بيانات Firebase
        db.ref('users/' + userUid + '/lastPublish').once('value', (userSnap) => {
            const lastPublish = userSnap.val();
            if (!lastPublish) {
                canPublish = true;
                resolve(true);
                return;
            }
            
            const timeDiff = Date.now() - lastPublish;
            const oneHour = 60 * 60 * 1000;
            
            if (timeDiff < oneHour) {
                canPublish = false;
                publishTimeLeft = Math.ceil((oneHour - timeDiff) / 1000);
                startPublishTimer();
                resolve(false);
            } else {
                canPublish = true;
                resolve(true);
            }
        }).catch((error) => {
            console.error("Error checking publish permission:", error);
            canPublish = true;
            resolve(true);
        });
    });
}

function startPublishTimer() {
    if (publishTimer) {
        clearInterval(publishTimer);
    }
    
    updatePublishTimerDisplay();
    
    publishTimer = setInterval(() => {
        if (publishTimeLeft > 0) {
            publishTimeLeft--;
            updatePublishTimerDisplay();
            
            if (publishTimeLeft <= 0) {
                clearInterval(publishTimer);
                canPublish = true;
                updatePublishTimerDisplay();
                
                if (document.getElementById('publishTimer')) {
                    const timerElement = document.getElementById('publishTimer');
                    timerElement.innerHTML = `
                        <div class="publish-timer active">
                            ✓ يمكنك الآن نشر إعلان جديد
                            <br><small style="color:#9ca3af;">انقر على زر النشر لإضافة إعلان</small>
                        </div>
                    `;
                    
                    const saveBtn = document.getElementById('saveBtn');
                    if (saveBtn) {
                        saveBtn.disabled = false;
                        saveBtn.classList.remove('timer-disabled');
                        saveBtn.innerHTML = '💾 نشر';
                    }
                }
            }
        }
    }, 1000);
}

function updatePublishTimerDisplay() {
    const minutes = Math.floor(publishTimeLeft / 60);
    const seconds = publishTimeLeft % 60;
    
    const timerElement = document.getElementById('publishTimer');
    if (timerElement) {
        timerElement.innerHTML = `
            <div class="publish-timer">
                ⏰ يجب الانتظار ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} 
                قبل نشر إعلان جديد
                <br><small style="color:#9ca3af;">لضمان جودة الإعلانات وتجنب التكرار</small>
            </div>
        `;
    }
}

function saveLastPublishTime() {
    if (!userUid) return;
    
    db.ref('users/' + userUid).update({
        lastPublish: Date.now()
    }).then(() => {
        console.log("Publish time saved to Firebase");
    }).catch((error) => {
        console.error("Error saving publish time:", error);
    });
}

// ===== دوال مساعدة =====
function escapeHTML(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatPrice(price) {
    return parseInt(price).toLocaleString('ar-SA');
}

// ===== متابعة حالة المصادقة =====
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        userUid = user.uid;
        
        db.ref("users/" + user.uid).once("value", snapshot => {
            const userData = snapshot.val();
            if (userData) {
                userDisplayName = userData.username;
                userFullName = userData.fullName;
                isAdmin = userData.isAdmin === true;
                updateAuthUI();
                
                db.ref("users/" + user.uid).update({
                    lastActive: firebase.database.ServerValue.TIMESTAMP
                });
            }
        });
    } else {
        currentUser = null;
        userDisplayName = null;
        userFullName = null;
        isAdmin = false;
        userUid = null;
        updateAuthUI();
    }
});

// ===== تهيئة التطبيق =====
document.addEventListener("DOMContentLoaded", async function() {
    // تسجيل دخول مجهول
    auth.signInAnonymously().catch(err => console.error(err));
    
    // التحقق من وجود رابط مباشر في URL
    const hasDirectLink = await LinkManager.checkForDirectLink();
    
    if (!hasDirectLink) {
        showHome();
    }
    
    updateAuthUI();
    
    // إضافة معالجة الضغط على مفتاح ESC لإغلاق القائمة
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeSidebar();
            closeBudget();
            closeDetails();
        }
    });
    
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
        .post-link-system {
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 15px 0;
            padding: 12px;
            background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(17, 24, 39, 0.8));
            border-radius: 10px;
            border: 1px solid rgba(56, 189, 248, 0.2);
        }
        
        .copy-link-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            background: linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(14, 165, 233, 0.1));
            border: 1px solid rgba(56, 189, 248, 0.3);
            color: #38bdf8;
            font-size: 16px;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            width: 100%;
            max-width: 200px;
            margin: 0 auto;
        }
        
        .copy-link-btn:hover {
            background: linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(14, 165, 233, 0.2));
            border-color: #38bdf8;
            transform: scale(1.05);
        }
        
        .copy-link-btn.copied {
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1));
            border-color: rgba(16, 185, 129, 0.3);
            animation: pulse 0.5s;
        }
        
        .copy-link-btn img {
            width: 20px;
            height: 20px;
            filter: brightness(0) saturate(100%) invert(69%) sepia(95%) saturate(492%) hue-rotate(162deg) brightness(98%) contrast(101%);
        }
        
        .copy-link-btn.copied img {
            filter: brightness(0) saturate(100%) invert(61%) sepia(74%) saturate(444%) hue-rotate(107deg) brightness(91%) contrast(92%);
        }
        
        .copy-link-btn.copied span {
            color: #10b981;
        }
        
        .details-dialog .back-home-btn { 
            background: linear-gradient(135deg, #6b7280, #4b5563); 
            margin-top: 10px;
        }
        
        .details-dialog .back-home-btn:hover { 
            background: linear-gradient(135deg, #4b5563, #374151); 
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
});
