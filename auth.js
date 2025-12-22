import { auth, database } from './firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, setPersistence, browserLocalPersistence, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { ref, set, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// تأكد من استمرارية الجلسة
setPersistence(auth, browserLocalPersistence)
    .then(() => {
        console.log("✅ تم تفعيل استمرارية تسجيل الدخول");
    })
    .catch((error) => {
        console.error("❌ خطأ في استمرارية الجلسة:", error);
    });

// ===== تبديل التبويبات =====
document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', () => {
        const tab = button.getAttribute('data-tab');
        
        // إزالة النشاط من جميع الأزرار
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // إضافة النشاط للزر المحدد
        button.classList.add('active');
        
        // إخفاء جميع النماذج
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.remove('active');
        });
        
        // إظهار النموذج المحدد
        document.getElementById(tab + 'Form').classList.add('active');
    });
});

// ===== إنشاء حساب جديد =====
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('registerUsername').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const errorElement = document.getElementById('registerError');
    
    // التحقق من صحة المدخلات
    if (password.length < 6) {
        errorElement.textContent = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
        return;
    }
    
    if (username.length < 3) {
        errorElement.textContent = 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل';
        return;
    }
    
    if (!email.includes('@') || !email.includes('.')) {
        errorElement.textContent = 'بريد إلكتروني غير صالح';
        return;
    }
    
    errorElement.textContent = '';
    
    // عرض رسالة تحميل
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'جاري إنشاء الحساب...';
    submitBtn.disabled = true;
    
    try {
        console.log('🔄 بدء إنشاء حساب...');
        
        // 1. التحقق من عدم وجود اسم المستخدم مسبقاً
        const usernameRef = ref(database, 'usernames/' + username);
        const usernameSnapshot = await get(usernameRef);
        
        if (usernameSnapshot.exists()) {
            errorElement.textContent = '⚠️ اسم المستخدم محجوز مسبقاً، اختر اسماً آخر';
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            return;
        }
        
        // 2. إنشاء حساب في Firebase Authentication
        console.log('🔄 إنشاء حساب في Authentication...');
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log('✅ تم إنشاء حساب Authentication:', user.uid);
        
        // 3. حفظ اسم المستخدم كـ "محجوز" في قاعدة البيانات
        await set(usernameRef, user.uid);
        console.log('✅ تم حجز اسم المستخدم:', username);
        
        // 4. حفظ معلومات المستخدم في قاعدة البيانات
        const userData = {
            uid: user.uid,
            username: username,
            email: email,
            createdAt: Date.now(),
            lastLogin: Date.now(),
            status: 'active'
        };
        
        await set(ref(database, 'users/' + user.uid), userData);
        console.log('✅ تم حفظ بيانات المستخدم');
        
        // 5. تسجيل دخول تلقائي بعد الإنشاء
        console.log('🔄 تسجيل الدخول تلقائياً...');
        await signInWithEmailAndPassword(auth, email, password);
        
        // 6. حفظ بيانات المستخدم في localStorage
        localStorage.setItem('currentUser', JSON.stringify(userData));
        console.log('✅ تم حفظ المستخدم في localStorage');
        
        // 7. إعادة التوجيه للصفحة الرئيسية
        console.log('🔄 التوجيه للصفحة الرئيسية...');
        submitBtn.textContent = '✅ تم! جاري التوجيه...';
        
        // انتظر قليلاً ثم توجيه
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        
    } catch (error) {
        console.error('❌ خطأ في التسجيل:', error);
        let errorMessage = 'حدث خطأ أثناء إنشاء الحساب';
        
        switch(error.code) {
            case 'auth/email-already-in-use':
                errorMessage = '📧 البريد الإلكتروني مستخدم مسبقاً';
                break;
            case 'auth/invalid-email':
                errorMessage = '📧 بريد إلكتروني غير صالح';
                break;
            case 'auth/weak-password':
                errorMessage = '🔐 كلمة المرور ضعيفة جداً';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = '⛔ التسجيل بالإيميل غير مفعل في Firebase';
                break;
            default:
                errorMessage = `❌ ${error.message}`;
        }
        
        errorElement.textContent = errorMessage;
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});

// ===== تسجيل الدخول =====
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorElement = document.getElementById('loginError');
    
    errorElement.textContent = '';
    
    // عرض رسالة تحميل
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'جاري تسجيل الدخول...';
    submitBtn.disabled = true;
    
    try {
        console.log('🔄 بدء تسجيل الدخول...');
        
        // 1. الحصول على البريد الإلكتروني من اسم المستخدم
        const usersRef = ref(database, 'users');
        const usersSnapshot = await get(usersRef);
        
        let userEmail = null;
        let userData = null;
        
        usersSnapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            if (data.username && data.username.toLowerCase() === username.toLowerCase()) {
                userEmail = data.email;
                userData = data;
                console.log('✅ وجد المستخدم:', data.username);
            }
        });
        
        if (!userEmail) {
            errorElement.textContent = '👤 اسم المستخدم غير موجود';
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            return;
        }
        
        // 2. تسجيل الدخول باستخدام البريد الإلكتروني
        console.log('🔄 تسجيل الدخول باستخدام الإيميل:', userEmail);
        const userCredential = await signInWithEmailAndPassword(auth, userEmail, password);
        const user = userCredential.user;
        console.log('✅ تم تسجيل الدخول بنجاح:', user.uid);
        
        // 3. تحديث وقت آخر دخول
        if (userData) {
            await set(ref(database, 'users/' + user.uid + '/lastLogin'), Date.now());
            userData.lastLogin = Date.now();
            
            // 4. حفظ بيانات المستخدم في localStorage
            localStorage.setItem('currentUser', JSON.stringify(userData));
            console.log('✅ تم حفظ المستخدم في localStorage');
        }
        
        // 5. التوجيه للصفحة الرئيسية
        submitBtn.textContent = '✅ تم! جاري التوجيه...';
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
        
    } catch (error) {
        console.error('❌ خطأ في تسجيل الدخول:', error);
        let errorMessage = 'حدث خطأ أثناء تسجيل الدخول';
        
        switch(error.code) {
            case 'auth/user-not-found':
                errorMessage = '👤 المستخدم غير موجود';
                break;
            case 'auth/wrong-password':
                errorMessage = '🔐 كلمة المرور غير صحيحة';
                break;
            case 'auth/invalid-credential':
                errorMessage = '⚠️ بيانات الدخول غير صحيحة';
                break;
            case 'auth/too-many-requests':
                errorMessage = '⏳ حاول مرة أخرى بعد قليل';
                break;
            case 'auth/user-disabled':
                errorMessage = '🚫 تم تعطيل هذا الحساب';
                break;
            default:
                errorMessage = `❌ ${error.message}`;
        }
        
        errorElement.textContent = errorMessage;
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});

// ===== التحقق من حالة المصادقة =====
onAuthStateChanged(auth, (user) => {
    console.log('🔍 حالة المصادقة الحالية:', user ? 'مستخدم مسجل' : 'لا يوجد مستخدم');
    
    // إذا كان المستخدم مسجلاً بالفعل وهو في صفحة auth، توجيهه للصفحة الرئيسية
    if (user && window.location.pathname.includes('auth.html')) {
        console.log('✅ المستخدم مسجل بالفعل، توجيه لـ index.html');
        window.location.href = 'index.html';
    }
    
    // إذا لم يكن مسجلاً وهو في index.html، توجيهه للتسجيل
    if (!user && window.location.pathname.includes('index.html')) {
        console.log('❌ لا يوجد مستخدم، توجيه لـ auth.html');
        window.location.href = 'auth.html';
    }
});

// ===== فحص localStorage للمساعدة في التصحيح =====
console.log('📦 localStorage الحالي:', {
    currentUser: localStorage.getItem('currentUser'),
    authState: auth.currentUser ? 'مسجل' : 'غير مسجل'
});
