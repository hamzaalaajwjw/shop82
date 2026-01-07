// ===== نظام الحماية الرئيسي =====
class SecuritySystem {
    static init() {
        // منع فحص الكود
        this.preventCodeInspection();
        // إضافة رؤوس الحماية
        this.addSecurityHeaders();
        // حماية ضد هجمات CSRF
        this.initCSRFProtection();
        // مراقبة النشاط المشبوه
        this.monitorSuspiciousActivity();
    }

    static preventCodeInspection() {
        // منع فحص الكود
        document.addEventListener('contextmenu', e => e.preventDefault());
        document.addEventListener('keydown', e => {
            if (e.ctrlKey && (e.key === 'u' || e.key === 's' || e.key === 'i')) {
                e.preventDefault();
            }
        });
    }

    static addSecurityHeaders() {
        // إضافة meta tags للأمان
        const metaTags = `
            <meta http-equiv="Content-Security-Policy" 
                  content="default-src 'self'; 
                          script-src 'self' https://www.gstatic.com; 
                          style-src 'self' 'unsafe-inline'; 
                          img-src 'self' data: https:; 
                          connect-src 'self' https://*.supabase.co https://*.firebaseio.com https://*.googleapis.com;">
            <meta http-equiv="X-Frame-Options" content="DENY">
            <meta http-equiv="X-Content-Type-Options" content="nosniff">
            <meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin">
        `;
        document.head.insertAdjacentHTML('beforeend', metaTags);
    }

    static initCSRFProtection() {
        // توليد توكن CSRF
        window.csrfToken = this.generateToken();
        localStorage.setItem('csrf_token', window.csrfToken);
        
        // حماية جميع الطلبات
        const originalFetch = window.fetch;
        window.fetch = function(url, options = {}) {
            options.headers = options.headers || {};
            options.headers['X-CSRF-Token'] = window.csrfToken;
            options.headers['X-Requested-With'] = 'XMLHttpRequest';
            return originalFetch(url, options);
        };
    }

    static generateToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    static monitorSuspiciousActivity() {
        // مراقبة تغييرات DOM المشبوهة
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.addedNodes.length) {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1 && node.innerHTML && 
                            node.innerHTML.includes('script') && 
                            !node.innerHTML.includes('<script src=')) {
                            console.warn('⚠️ نشاط DOM مشبوه تم اكتشافه');
                            this.logSecurityEvent('suspicious_dom_modification', {
                                html: node.innerHTML.substring(0, 100)
                            });
                        }
                    });
                }
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    static logSecurityEvent(type, details) {
        const event = {
            type,
            details,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        // إرسال الحدث للخادم
        if (window.userUID) {
            db.ref(`securityLogs/${window.userUID}`).push(event);
        }
    }

    static validatePhone(phone) {
        return /^07[0-9]{9}$/.test(phone);
    }

    static validateName(name) {
        return /^[\p{L}\s]{2,50}$/u.test(name);
    }

    static sanitizeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    static escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

// ===== تهيئة Supabase =====
const supabaseClient = supabase.createClient(
    'https://dnclbdvdzvtdjpgxwnrl.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuY2xiZHZkenZ0ZGpwZ3h3bnJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyMjY5OTcsImV4cCI6MjA4MjgwMjk5N30.alGg61mAPLLqLM2LlQRq2K2o_eOOnJwNuaIJiAXB7Wg'
);

// ===== نظام التخزين المؤقت الآمن =====
class SecureCache {
    constructor() {
        this.cache = new Map();
        this.maxSize = 100;
        this.encryptionKey = null;
    }

    set(key, value, ttl = 300000) {
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
        this.cache.set(key, {
            value: this.encrypt(JSON.stringify(value)),
            expiry: Date.now() + ttl
        });
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }
        return JSON.parse(this.decrypt(item.value));
    }

    encrypt(data) {
        return btoa(unescape(encodeURIComponent(data)));
    }

    decrypt(data) {
        return decodeURIComponent(escape(atob(data)));
    }

    clear() {
        this.cache.clear();
    }
}

// ===== نظام Rate Limiting =====
class RateLimiter {
    constructor(limits = { publish: 3600000, login: 5 }) {
        this.limits = limits;
        this.attempts = new Map();
    }

    can(action, userId) {
        const key = `${action}_${userId}`;
        const now = Date.now();
        const userAttempts = this.attempts.get(key) || [];

        // تنظيف المحاولات القديمة
        const recentAttempts = userAttempts.filter(time => now - time < this.limits[action]);
        this.attempts.set(key, recentAttempts);

        if (recentAttempts.length >= this.limits[action]) {
            return false;
        }

        recentAttempts.push(now);
        return true;
    }

    reset(action, userId) {
        const key = `${action}_${userId}`;
        this.attempts.delete(key);
    }
}

// ===== تهيئة Firebase =====
const firebaseConfig = {
    apiKey: "AIzaSyAl3XunFOwHpGw-4_VYyETMtoLgk4mnRpQ",
    authDomain: "a3len-3ad54.firebasestorage.app",
    databaseURL: "https://a3len-3ad54-default-rtdb.firebaseio.com",
    projectId: "a3len-3ad54",
    storageBucket: "a3len-3ad54.firebasestorage.app",
    messagingSenderId: "767338034080",
    appId: "1:767338034080:web:801d77fb74c0aa56e92ac5"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

// ===== متغيرات آمنة =====
let userUID = null;
let currentUser = null;
let userDisplayName = null;
let userFullName = null;
let isAdmin = false;
let budget = null;
let currentPage = 1;
const postsPerPage = 6;

// ===== أنظمة الحماية =====
const securitySystem = new SecuritySystem();
const secureCache = new SecureCache();
const rateLimiter = new RateLimiter();

// ===== نظام رفع الصور الآمن =====
class SecureImageManager {
    static validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    static maxSize = 5 * 1024 * 1024;

    static async uploadProductImages(images) {
        const imageUrls = [];
        
        for (let i = 0; i < Math.min(images.length, 5); i++) {
            const file = images[i];
            
            // التحقق من النوع والحجم
            if (!this.validateFile(file)) {
                continue;
            }

            // ضغط الصورة
            const compressedFile = await this.compressImage(file);
            const fileName = `product_${Date.now()}_${i}_${this.generateHash(compressedFile)}.jpg`;
            
            try {
                const { data, error } = await supabaseClient.storage
                    .from('ads-images')
                    .upload(`products/${fileName}`, compressedFile, {
                        cacheControl: '3600',
                        upsert: false,
                        contentType: 'image/jpeg'
                    });
                
                if (error) {
                    this.logSecurityEvent('image_upload_failed', { error: error.message });
                    continue;
                }
                
                const { data: urlData } = supabaseClient.storage
                    .from('ads-images')
                    .getPublicUrl(`products/${fileName}`);
                
                if (urlData?.publicUrl) {
                    imageUrls.push(urlData.publicUrl);
                }
            } catch (error) {
                console.error('Upload error:', error);
            }
        }
        
        return imageUrls;
    }
    
    static validateFile(file) {
        if (!this.validTypes.includes(file.type)) {
            throw new Error('نوع الملف غير مسموح');
        }
        if (file.size > this.maxSize) {
            throw new Error('حجم الملف كبير جداً');
        }
        return true;
    }
    
    static async compressImage(file, quality = 0.8) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // تحديد الأبعاد
                    let width = img.width;
                    let height = img.height;
                    const maxWidth = 1200;
                    const maxHeight = 1200;
                    
                    if (width > maxWidth || height > maxHeight) {
                        if (width > height) {
                            height *= maxWidth / width;
                            width = maxWidth;
                        } else {
                            width *= maxHeight / height;
                            height = maxHeight;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    canvas.toBlob((blob) => {
                        resolve(new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        }));
                    }, 'image/jpeg', quality);
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    static generateHash(file) {
        let hash = 0;
        const str = file.name + file.size + file.lastModified;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash).toString(36);
    }
    
    static createImageDisplay(images) {
        if (!images || images.length === 0) {
            return '<div class="no-image">🚫 لا توجد صور متاحة</div>';
        }
        
        const safeImages = images.map(img => SecuritySystem.sanitizeHTML(img));
        
        return `
            <div class="product-images">
                <img src="${safeImages[0]}" 
                     class="slider-image" 
                     alt="صورة المنتج"
                     loading="lazy"
                     onerror="this.src='https://via.placeholder.com/300x180/1f2937/9ca3af?text=لا+توجد+صورة'">
            </div>
        `;
    }
    
    static logSecurityEvent(type, details) {
        if (window.userUID) {
            db.ref(`securityLogs/${window.userUID}`).push({
                type,
                details,
                timestamp: Date.now()
            });
        }
    }
}

// ===== نظام التحقق من المدخلات =====
class InputValidator {
    static validateProduct(product) {
        const errors = [];
        
        if (!product.name || product.name.length < 3 || product.name.length > 50) {
            errors.push('اسم المنتج يجب أن يكون بين 3 و 50 حرفاً');
        }
        
        if (!product.price || product.price < 100 || product.price > 10000000) {
            errors.push('السعر يجب أن يكون بين 100 و 10,000,000 دينار');
        }
        
        if (!product.phone || !SecuritySystem.validatePhone(product.phone)) {
            errors.push('رقم الهاتف يجب أن يبدأ بـ 07 ويتكون من 11 رقماً');
        }
        
        if (!product.seller || !SecuritySystem.validateName(product.seller)) {
            errors.push('اسم البائع يجب أن يحتوي على أحرف عربية فقط');
        }
        
        return errors;
    }
    
    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input
            .trim()
            .replace(/[<>]/g, '')
            .substring(0, 500);
    }
    
    static validateImages(images) {
        if (images.length > 5) {
            throw new Error('لا يمكن رفع أكثر من 5 صور');
        }
        
        images.forEach(file => {
            SecureImageManager.validateFile(file);
        });
        
        return true;
    }
}

// ===== دوال إدارة الصور الآمنة =====
function handleImageSelect(event) {
    const files = Array.from(event.target.files);
    
    if (files.length > 5) {
        alert("يمكنك رفع 5 صور كحد أقصى");
        event.target.value = '';
        return;
    }
    
    try {
        InputValidator.validateImages(files);
        selectedImages = files;
        displayImagePreview();
    } catch (error) {
        alert(error.message);
        event.target.value = '';
    }
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

// ===== نظام المصادقة المحسن =====
function updateAuthUI() {
    const authSection = document.getElementById("authSection");
    if (!authSection) return;
    
    if (currentUser && userDisplayName) {
        db.ref("users/" + currentUser.uid).once("value", snapshot => {
            const userData = snapshot.val();
            if (!userData) return;
            
            const displayName = userData.fullName || userDisplayName;
            const totalProducts = userData.totalProducts || 0;
            const isVerified = userData.isVerified || false;
            const isAdminUser = userData.isAdmin || false;
            
            authSection.innerHTML = `
                <div class="user-info">
                    <p class="profile-link" onclick="viewMyProfile()">
                        <span class="user-name-wrapper">
                            ${isVerified ? '<span class="verified-badge">✓</span>' : ''}
                            ${SecuritySystem.sanitizeHTML(displayName)}
                            ${isAdminUser ? '<span class="admin-badge">مدير</span>' : ''}
                        </span>
                    </p>
                    <small style="color:#9ca3af; font-size:12px;">@${SecuritySystem.sanitizeHTML(userDisplayName)}</small>
                    <small style="color:#9ca3af; font-size:11px; display:block; margin:5px 0;">${totalProducts} إعلان</small>
                    <button class="logout-btn" onclick="logoutUser()">تسجيل خروج</button>
                    ${isAdminUser ? `
                    <button onclick="showAdminPanel()" class="admin-panel-btn">
                        لوحة التحكم
                    </button>` : ''}
                </div>
            `;
        });
    } else {
        authSection.innerHTML = `
            <button class="auth-btn" onclick="goToLogin()">🔐 تسجيل دخول</button>
            <button class="auth-btn" onclick="goToRegister()">📝 إنشاء حساب</button>
        `;
    }
}

function goToLogin() {
    window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
}

function goToRegister() {
    window.location.href = 'register.html?redirect=' + encodeURIComponent(window.location.href);
}

async function logoutUser() {
    if (confirm("هل أنت متأكد من تسجيل الخروج؟")) {
        await auth.signOut();
        currentUser = null;
        userDisplayName = null;
        userFullName = null;
        isAdmin = false;
        secureCache.clear();
        updateAuthUI();
        showHome();
    }
}

// ===== نظام تحميل المنتجات الآمن =====
async function loadProducts() {
    const searchInput = document.getElementById("search");
    const catSelect = document.getElementById("cat");
    
    const searchTerm = searchInput ? SecuritySystem.escapeRegex(searchInput.value.toLowerCase()) : '';
    const category = catSelect ? catSelect.value : '';
    
    const cacheKey = `products_${searchTerm}_${category}_${currentPage}`;
    const cached = secureCache.get(cacheKey);
    
    if (cached) {
        document.getElementById("products").innerHTML = cached;
        return;
    }
    
    try {
        const snapshot = await db.ref("products").once("value");
        const products = snapshot.val() || {};
        let htmlCards = [];
        
        Object.keys(products).forEach(k => {
            const p = products[k];
            if (!p) return;
            
            const price = parseFloat(p.price) || 0;
            const name = p.name ? p.name.toLowerCase() : '';
            
            if ((!category || p.category === category) && name.includes(searchTerm)) {
                if (budget && price > budget) return;
                
                const imagesHTML = p.images && p.images.length > 0 
                    ? SecureImageManager.createImageDisplay(p.images)
                    : '<div class="no-image">🚫 لا توجد صور متاحة</div>';
                
                const safeName = SecuritySystem.sanitizeHTML(p.name);
                const safeSeller = SecuritySystem.sanitizeHTML(p.seller);
                const safePhone = SecuritySystem.sanitizeHTML(p.phone);
                
                htmlCards.push({
                    uid: p.uid,
                    key: k,
                    html: `
                        <div class="card" onclick="showDetails('${k}')">
                            ${imagesHTML}
                            <h3>${safeName}</h3>
                            <span class="price">${parseInt(price).toLocaleString('ar-SA')} د.ع</span>
                            <div class="meta">
                                <span>${p.category || 'غير محدد'}</span>
                                <span>${p.province || 'غير محدد'}</span>
                                <span>توصيل: ${p.delivery || 'لا'}</span>
                            </div>
                            <div class="seller">
                                👤 <span class="seller-link" onclick="viewProfile('${p.uid || ''}', '${safeSeller}')">
                                    ${safeSeller}
                                </span> | ☎ ${safePhone}
                            </div>
                            <div class="actions">
                                ${(p.uid === userUID || isAdmin) ? `
                                <button class="edit" onclick="editProduct('${k}');event.stopPropagation();">تعديل</button>
                                <button class="del" onclick="deleteProduct('${k}');event.stopPropagation();">حذف</button>` : ""}
                            </div>
                        </div>
                    `
                });
            }
        });
        
        if (userUID) {
            htmlCards.sort((a, b) => (b.uid === userUID ? 1 : -1));
        }
        
        const totalPages = Math.ceil(htmlCards.length / postsPerPage);
        if (currentPage > totalPages) currentPage = 1;
        const start = (currentPage - 1) * postsPerPage;
        const pageItems = htmlCards.slice(start, start + postsPerPage);
        
        const finalHTML = pageItems.map(p => p.html).join("") || 
            "<p class='empty'>لا توجد إعلانات</p>";
        
        document.getElementById("products").innerHTML = finalHTML;
        secureCache.set(cacheKey, finalHTML, 30000);
        renderPagination(totalPages);
        
    } catch (error) {
        console.error("Error loading products:", error);
        document.getElementById("products").innerHTML = 
            "<p class='empty'>حدث خطأ في تحميل الإعلانات</p>";
    }
}

// ===== نظام النشر الآمن =====
async function saveProduct(k) {
    const name = InputValidator.sanitizeInput(document.getElementById("name").value);
    const price = document.getElementById("price").value;
    const phone = document.getElementById("phone").value;
    const province = document.getElementById("province").value;
    
    const product = {
        name,
        price: parseFloat(price),
        category: document.getElementById("category").value,
        seller: userDisplayName || InputValidator.sanitizeInput(document.getElementById("seller").value),
        phone,
        province,
        delivery: document.getElementById("delivery").value,
        status: document.getElementById("status").value || "available",
        uid: userUID
    };
    
    const errors = InputValidator.validateProduct(product);
    if (errors.length > 0) {
        alert(errors.join('\n'));
        return;
    }
    
    if (!rateLimiter.can('publish', userUID)) {
        alert('يجب الانتظار ساعة قبل نشر إعلان جديد');
        return;
    }
    
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = 'جاري الحفظ...';
    
    try {
        let imageUrls = [];
        
        if (selectedImages.length > 0) {
            imageUrls = await SecureImageManager.uploadProductImages(selectedImages);
        } else if (k) {
            const existing = await db.ref("products/" + k).once("value");
            const existingProduct = existing.val();
            if (existingProduct && existingProduct.images) {
                imageUrls = existingProduct.images.slice(0, 5);
            }
        }
        
        const productData = {
            ...product,
            images: imageUrls,
            lastUpdated: Date.now()
        };
        
        if (!k) {
            productData.createdAt = Date.now();
            productData.timestamp = Date.now();
        }
        
        const ref = k ? db.ref("products/" + k) : db.ref("products").push();
        await ref.set(productData);
        
        if (!k) {
            await db.ref("users/" + userUID).update({
                lastPublish: Date.now()
            });
            
            db.ref("users/" + userUID).once("value", snapshot => {
                const userData = snapshot.val();
                const currentCount = userData?.totalProducts || 0;
                db.ref("users/" + userUID).update({
                    totalProducts: currentCount + 1
                });
            });
        }
        
        alert(k ? "تم تحديث الإعلان بنجاح" : "تم نشر الإعلان بنجاح");
        
        selectedImages = [];
        imagePreviewUrls = [];
        secureCache.clear();
        
        showHome();
        
    } catch (error) {
        console.error("Error saving product:", error);
        alert("حدث خطأ أثناء حفظ الإعلان");
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = k ? "💾 تحديث" : "💾 نشر";
    }
}

// ===== نظام الحماية ضد CSRF =====
function verifyCSRFToken() {
    const storedToken = localStorage.getItem('csrf_token');
    const currentToken = window.csrfToken;
    
    if (!storedToken || storedToken !== currentToken) {
        SecuritySystem.logSecurityEvent('csrf_token_mismatch', {
            stored: storedToken?.substring(0, 10),
            current: currentToken?.substring(0, 10)
        });
        throw new Error('طلب غير مصرح به');
    }
    return true;
}

// ===== تهيئة النظام =====
document.addEventListener("DOMContentLoaded", function() {
    // بدء أنظمة الحماية
    SecuritySystem.init();
    
    // مصادقة Firebase
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            userUID = user.uid;
            
            db.ref("users/" + user.uid).once("value", snapshot => {
                const userData = snapshot.val();
                if (userData) {
                    userDisplayName = userData.username;
                    userFullName = userData.fullName;
                    isAdmin = userData.isAdmin === true;
                    
                    // تحديث نشاط المستخدم
                    db.ref("users/" + user.uid).update({
                        lastActive: Date.now(),
                        lastLogin: Date.now()
                    });
                    
                    // تسجيل نشاط الدخول
                    db.ref("userActivity/" + user.uid).push().set({
                        type: 'login',
                        timestamp: Date.now(),
                        ip: 'unknown',
                        device: navigator.userAgent
                    });
                }
                updateAuthUI();
            });
        } else {
            currentUser = null;
            userDisplayName = null;
            userFullName = null;
            isAdmin = false;
            updateAuthUI();
        }
    });
    
    // بدء الصفحة الرئيسية
    showHome();
});

// ===== أنماط إضافية =====
const securityStyles = `
    .security-warning {
        background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.1));
        border: 1px solid rgba(239, 68, 68, 0.3);
        color: #ef4444;
        padding: 12px;
        border-radius: 8px;
        margin: 10px 0;
        font-size: 13px;
        text-align: center;
        animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.8; }
    }
    
    .admin-panel-btn {
        width: 100%;
        padding: 8px;
        background: linear-gradient(135deg, #8b5cf6, #7c3aed);
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        margin-top: 5px;
        transition: all 0.3s;
    }
    
    .admin-panel-btn:hover {
        background: linear-gradient(135deg, #7c3aed, #6d28d9);
        transform: translateY(-1px);
    }
    
    .encrypted-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: rgba(56, 189, 248, 0.1);
        border: 1px solid rgba(56, 189, 248, 0.3);
        color: #38bdf8;
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 10px;
        margin-left: 5px;
    }
`;

const styleElement = document.createElement('style');
styleElement.textContent = securityStyles;
document.head.appendChild(styleElement);
