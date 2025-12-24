import { auth, database } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    ref, 
    set, 
    get, 
    child 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// عناصر DOM
const loginSection = document.getElementById('loginSection');
const registerSection = document.getElementById('registerSection');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const showRegister = document.getElementById('showRegister');
const showLogin = document.getElementById('showLogin');
const errorMessage = document.getElementById('errorMessage');
const debugInfo = document.getElementById('debugInfo');
const loading = document.getElementById('loading');

// ===== تبديل النماذج =====
showRegister.addEventListener('click', (e) => {
    e.preventDefault();
    loginSection.style.display = 'none';
    registerSection.style.display = 'block';
    clearError();
});

showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    registerSection.style.display = 'none';
    loginSection.style.display = 'block';
    clearError();
});

// ===== إظهار/إخفاء التحميل =====
function showLoading() {
    loading.style.display = 'block';
    document.querySelectorAll('button[type="submit"]').forEach(btn => {
        btn.disabled = true;
    });
}

function hideLoading() {
    loading.style.display = 'none';
    document.querySelectorAll('button[type="submit"]').forEach(btn => {
        btn.disabled = false;
    });
}

// ===== عرض الخطأ =====
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    setTimeout(() => {
        errorMessage.style.opacity = '1';
    }, 10);
}

function clearError() {
    errorMessage.style.opacity = '0';
    setTimeout(() => {
        errorMessage.style.display = 'none';
        errorMessage.textContent = '';
    }, 300);
}

// ===== تحديث معلومات التصحيح =====
function updateDebugInfo(message, type = 'info') {
    const colors = {
        info: '#2196F3',
        success: '#4CAF50',
        error: '#f44336',
        warning: '#ff9800'
    };
    
    debugInfo.innerHTML = `
        <div style="color: ${colors[type]}; margin: 5px 0; padding: 5px; background: #f5f5f5; border-radius: 4px;">
            [${new Date().toLocaleTimeString()}] ${message}
        </div>
    ` + debugInfo.innerHTML;
}

// ===== فحص قاعدة البيانات =====
async function checkDatabase() {
    try {
        updateDebugInfo('🔍 فحص قاعدة البيانات...', 'info');
        
        // فحص اتصال Firebase
        const connectedRef = ref(database, '.info/connected');
        onAuthStateChanged(auth, (user) => {
            if (user) {
                updateDebugInfo(`✅ متصل بـ Firebase - المستخدم: ${user.email}`, 'success');
            }
        });
        
        // فحص البيانات الموجودة
        const snapshot = await get(ref(database, 'users'));
        const userCount = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
        updateDebugInfo(`📊 عدد المستخدمين المسجلين: ${userCount}`, 'info');
        
    } catch (error) {
        updateDebugInfo(`❌ خطأ في الاتصال: ${error.message}`, 'error');
    }
}

// ===== إنشاء حساب =====
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('registerUsername').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    
    // التحقق من المدخلات
    if (username.length < 3) {
        showError('اسم المستخدم يجب أن يكون 3 أحرف على الأقل');
        return;
    }
    
    if (username.length > 20) {
        showError('اسم المستخدم يجب أن لا يزيد عن 20 حرف');
        return;
    }
    
    if (/\s/.test(username)) {
        showError('اسم المستخدم لا يجب أن يحتوي على مسافات');
        return;
    }
    
    if (!email.includes('@')) {
        showError('البريد الإلكتروني غير صالح');
        return;
    }
    
    if (password.length < 6) {
        showError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        return;
    }
    
    if (password !== confirmPassword) {
        showError('كلمات المرور غير متطابقة');
        return;
    }
    
    showLoading();
    clearError();
    updateDebugInfo(`🚀 بدء إنشاء حساب: ${username}`, 'info');
    
    try {
        // 1. التحقق من عدم وجود اسم المستخدم
        updateDebugInfo(`🔍 التحقق من اسم المستخدم: ${username}`, 'info');
        const usernameRef = ref(database, 'usernames/' + username);
        const usernameExists = await get(usernameRef);
        
        if (usernameExists.exists()) {
            showError('اسم المستخدم محجوز مسبقاً');
            updateDebugInfo(`❌ الاسم ${username} محجوز مسبقاً`, 'error');
            hideLoading();
            return;
        }
        
        updateDebugInfo(`✅ الاسم ${username} متاح`, 'success');
        
        // 2. إنشاء الحساب في Authentication
        updateDebugInfo(`🔄 إنشاء حساب Authentication...`, 'info');
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        updateDebugInfo(`✅ تم إنشاء الحساب: ${user.uid}`, 'success');
        
        // 3. حفظ بيانات المستخدم
        updateDebugInfo(`💾 حفظ بيانات المستخدم...`, 'info');
        
        // بيانات المستخدم
        const userData = {
            uid: user.uid,
            username: username,
            email: email,
            createdAt: Date.now(),
            lastLogin: Date.now(),
            status: 'active'
        };
        
        // حفظ في مسارين
        await Promise.all([
            // 1. حفظ اسم المستخدم
            set(ref(database, 'usernames/' + username), user.uid),
            
            // 2. حفظ بيانات المستخدم الكاملة
            set(ref(database, 'users/' + user.uid), userData),
            
            // 3. حفظ بالبريد الإلكتروني كمرجع
            set(ref(database, 'emails/' + email.replace(/\./g, '_')), user.uid)
        ]);
        
        updateDebugInfo(`✅ تم حفظ جميع البيانات`, 'success');
        
        // 4. تسجيل الدخول التلقائي
        updateDebugInfo(`🔑 تسجيل الدخول التلقائي...`, 'info');
        await signInWithEmailAndPassword(auth, email, password);
        
        // 5. حفظ في localStorage
        localStorage.setItem('currentUser', JSON.stringify(userData));
        localStorage.setItem('username', username);
        
        updateDebugInfo(`🎉 تم التسجيل بنجاح!`, 'success');
        
        // 6. التوجيه للصفحة الرئيسية
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
        
    } catch (error) {
        console.error('خطأ في التسجيل:', error);
        updateDebugInfo(`❌ خطأ: ${error.message}`, 'error');
        
        let errorMsg = 'حدث خطأ أثناء إنشاء الحساب';
        
        switch(error.code) {
            case 'auth/email-already-in-use':
                errorMsg = 'البريد الإلكتروني مستخدم مسبقاً';
                break;
            case 'auth/invalid-email':
                errorMsg = 'بريد إلكتروني غير صالح';
                break;
            case 'auth/operation-not-allowed':
                errorMsg = 'التسجيل غير مفعل في الوقت الحالي';
                break;
            case 'auth/weak-password':
                errorMsg = 'كلمة المرور ضعيفة جداً';
                break;
        }
        
        showError(errorMsg);
        hideLoading();
    }
});

// ===== تسجيل الدخول =====
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const loginInput = document.getElementById('loginInput').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!loginInput || !password) {
        showError('الرجاء ملء جميع الحقول');
        return;
    }
    
    showLoading();
    clearError();
    updateDebugInfo(`🔑 محاولة تسجيل الدخول: ${loginInput}`, 'info');
    
    try {
        let email = loginInput;
        
        // إذا كان الإدخال ليس بريداً إلكترونياً، ابحث عنه كاسم مستخدم
        if (!loginInput.includes('@')) {
            updateDebugInfo(`🔍 البحث عن اسم المستخدم: ${loginInput}`, 'info');
            
            // البحث في قاعدة البيانات
            const usersRef = ref(database, 'users');
            const snapshot = await get(usersRef);
            
            if (!snapshot.exists()) {
                showError('لا يوجد مستخدمين مسجلين');
                hideLoading();
                return;
            }
            
            let foundUser = null;
            const users = snapshot.val();
            
            for (const uid in users) {
                if (users[uid].username === loginInput) {
                    foundUser = users[uid];
                    break;
                }
            }
            
            if (!foundUser) {
                showError('اسم المستخدم غير موجود');
                updateDebugInfo(`❌ لم يتم العثور على: ${loginInput}`, 'error');
                hideLoading();
                return;
            }
            
            email = foundUser.email;
            updateDebugInfo(`✅ وجد المستخدم: ${foundUser.username} -> ${email}`, 'success');
        }
        
        // تسجيل الدخول
        updateDebugInfo(`🔄 تسجيل الدخول بـ ${email}`, 'info');
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // الحصول على بيانات المستخدم
        const userRef = ref(database, 'users/' + user.uid);
        const userSnapshot = await get(userRef);
        
        if (userSnapshot.exists()) {
            const userData = userSnapshot.val();
            localStorage.setItem('currentUser', JSON.stringify(userData));
            localStorage.setItem('username', userData.username);
            
            // تحديث آخر دخول
            await set(child(userRef, 'lastLogin'), Date.now());
        }
        
        updateDebugInfo(`✅ تم تسجيل الدخول بنجاح!`, 'success');
        
        // التوجيه للصفحة الرئيسية
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
        
    } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
        updateDebugInfo(`❌ خطأ: ${error.message}`, 'error');
        
        let errorMsg = 'حدث خطأ أثناء تسجيل الدخول';
        
        switch(error.code) {
            case 'auth/user-not-found':
                errorMsg = 'المستخدم غير موجود';
                break;
            case 'auth/wrong-password':
                errorMsg = 'كلمة المرور غير صحيحة';
                break;
            case 'auth/invalid-credential':
                errorMsg = 'بيانات الدخول غير صحيحة';
                break;
            case 'auth/too-many-requests':
                errorMsg = 'تم تجاوز عدد المحاولات، حاول لاحقاً';
                break;
        }
        
        showError(errorMsg);
        hideLoading();
    }
});

// ===== فحص حالة المصادقة =====
onAuthStateChanged(auth, (user) => {
    if (user) {
        updateDebugInfo(`👤 مسجل كـ ${user.email}`, 'success');
        
        // إذا كان المستخدم مسجلاً بالفعل، توجيهه للصفحة الرئيسية
        if (window.location.pathname.includes('auth.html')) {
            updateDebugInfo(`🔄 توجيه للصفحة الرئيسية...`, 'info');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        }
    } else {
        updateDebugInfo('❌ غير مسجل', 'error');
    }
});

// ===== فحص عند التحميل =====
window.addEventListener('load', () => {
    updateDebugInfo('📱 تحميل صفحة التسجيل', 'info');
    checkDatabase();
});

// ===== دالة مساعدة لعرض البيانات =====
window.showDatabase = async function() {
    updateDebugInfo('📊 جلب جميع البيانات...', 'info');
    
    try {
        // جلب usernames
        const usernamesRef = ref(database, 'usernames');
        const usernames = await get(usernamesRef);
        
        // جلب users
        const usersRef = ref(database, 'users');
        const users = await get(usersRef);
        
        console.log('=== قاعدة البيانات ===');
        console.log('📋 أسماء المستخدمين:', usernames.val() || {});
        console.log('👥 المستخدمون:', users.val() || {});
        console.log('💾 localStorage:', localStorage.getItem('currentUser'));
        console.log('===================');
        
        updateDebugInfo('✅ تم جلب البيانات (انظر الكونسول)', 'success');
        
    } catch (error) {
        updateDebugInfo(`❌ خطأ: ${error.message}`, 'error');
    }
};

// للتحقق من البيانات، افتح الكونسول (F12) واكتب:
// showDatabase()
