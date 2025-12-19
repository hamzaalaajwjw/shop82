import { 
    auth, 
    database, 
    ref, 
    set, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from './firebase-config.js';

let currentUser = null;

// عناصر DOM
const authScreen = document.getElementById('authScreen');
const appScreen = document.getElementById('appScreen');
const loadingScreen = document.getElementById('loading');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const authTabs = document.querySelectorAll('.auth-tab');
const logoutBtn = document.getElementById('logoutBtn');

// تبديل بين تسجيل الدخول وإنشاء حساب
authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        
        // تحديث الأزرار النشطة
        authTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // إظهار النموذج المناسب
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.remove('active');
        });
        document.getElementById(`${tabName}Form`).classList.add('active');
    });
});

// تسجيل الدخول
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        currentUser = userCredential.user;
        showNotification('تم تسجيل الدخول بنجاح!', 'success');
    } catch (error) {
        showNotification(getErrorMessage(error.code), 'error');
    }
});

// إنشاء حساب جديد
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const photoURL = document.getElementById('signupPhoto').value || 
                     `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // حفظ بيانات المستخدم في قاعدة البيانات
        await set(ref(database, 'users/' + user.uid), {
            uid: user.uid,
            name: name,
            email: email,
            photoURL: photoURL,
            status: 'متصل الآن',
            createdAt: Date.now()
        });
        
        showNotification('تم إنشاء الحساب بنجاح!', 'success');
    } catch (error) {
        showNotification(getErrorMessage(error.code), 'error');
    }
});

// تسجيل الخروج
logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        showNotification('تم تسجيل الخروج', 'info');
    } catch (error) {
        showNotification('حدث خطأ أثناء تسجيل الخروج', 'error');
    }
});

// مراقبة حالة المصادقة
onAuthStateChanged(auth, (user) => {
    loadingScreen.classList.add('hidden');
    
    if (user) {
        currentUser = user;
        loadUserData(user.uid);
        authScreen.classList.add('hidden');
        appScreen.classList.remove('hidden');
    } else {
        currentUser = null;
        authScreen.classList.remove('hidden');
        appScreen.classList.add('hidden');
    }
});

// تحميل بيانات المستخدم
async function loadUserData(uid) {
    try {
        const snapshot = await get(ref(database, 'users/' + uid));
        if (snapshot.exists()) {
            const userData = snapshot.val();
            updateUIWithUserData(userData);
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// تحديث واجهة المستخدم ببيانات المستخدم
function updateUIWithUserData(userData) {
    document.getElementById('currentUserName').textContent = userData.name;
    document.getElementById('currentUserPhoto').src = userData.photoURL;
    document.getElementById('profileName').value = userData.name;
    document.getElementById('profileEmail').value = userData.email;
    document.getElementById('profilePhoto').src = userData.photoURL;
    if (userData.status) {
        document.getElementById('profileStatus').value = userData.status;
    }
}

// عرض الإشعارات
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = 'notification';
    
    switch(type) {
        case 'success':
            notification.style.background = '#4CAF50';
            break;
        case 'error':
            notification.style.background = '#f44336';
            break;
        case 'warning':
            notification.style.background = '#ff9800';
            break;
        default:
            notification.style.background = '#2196F3';
    }
    
    notification.classList.remove('hidden');
    
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

// تحويل أخطاء Firebase إلى رسائل عربية
function getErrorMessage(errorCode) {
    const messages = {
        'auth/email-already-in-use': 'البريد الإلكتروني مستخدم بالفعل',
        'auth/invalid-email': 'البريد الإلكتروني غير صالح',
        'auth/weak-password': 'كلمة المرور ضعيفة، يجب أن تكون 6 أحرف على الأقل',
        'auth/user-not-found': 'المستخدم غير موجود',
        'auth/wrong-password': 'كلمة المرور غير صحيحة',
        'auth/too-many-requests': 'محاولات كثيرة جداً، حاول مرة أخرى لاحقاً'
    };
    
    return messages[errorCode] || 'حدث خطأ غير متوقع';
}

export { currentUser };