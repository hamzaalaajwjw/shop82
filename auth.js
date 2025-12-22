import { auth, database } from './firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { ref, set, get, child } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// تبديل التبويبات
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
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const errorElement = document.getElementById('registerError');
    
    if (password.length < 6) {
        errorElement.textContent = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
        return;
    }
    
    if (username.length < 3) {
        errorElement.textContent = 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل';
        return;
    }
    
    errorElement.textContent = '';
    
    try {
        // 1. إنشاء حساب في Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // 2. التحقق من عدم وجود اسم المستخدم مسبقاً
        const usernameRef = ref(database, 'usernames/' + username);
        const usernameSnapshot = await get(usernameRef);
        
        if (usernameSnapshot.exists()) {
            errorElement.textContent = 'اسم المستخدم محجوز مسبقاً';
            // حذف الحساب لأن اسم المستخدم محجوز
            await user.delete();
            return;
        }
        
        // 3. حفظ اسم المستخدم كـ "محجوز"
        await set(usernameRef, user.uid);
        
        // 4. حفظ معلومات المستخدم في قاعدة البيانات
        const userData = {
            username: username,
            email: email,
            createdAt: Date.now(),
            uid: user.uid
        };
        
        await set(ref(database, 'users/' + user.uid), userData);
        
        // 5. التوجه للصفحة الرئيسية
        window.location.href = 'index.html';
        
    } catch (error) {
        console.error('خطأ في التسجيل:', error);
        let errorMessage = 'حدث خطأ أثناء إنشاء الحساب';
        
        switch(error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'البريد الإلكتروني مستخدم مسبقاً';
                break;
            case 'auth/invalid-email':
                errorMessage = 'بريد إلكتروني غير صالح';
                break;
            case 'auth/weak-password':
                errorMessage = 'كلمة المرور ضعيفة جداً';
                break;
        }
        
        errorElement.textContent = errorMessage;
    }
});

// ===== تسجيل الدخول =====
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorElement = document.getElementById('loginError');
    
    errorElement.textContent = '';
    
    try {
        // الحصول على البريد الإلكتروني من اسم المستخدم
        const usersRef = ref(database, 'users');
        const usersSnapshot = await get(usersRef);
        
        let userEmail = null;
        let userData = null;
        
        usersSnapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            if (data.username === username) {
                userEmail = data.email;
                userData = data;
            }
        });
        
        if (!userEmail) {
            errorElement.textContent = 'اسم المستخدم غير موجود';
            return;
        }
        
        // تسجيل الدخول باستخدام البريد الإلكتروني
        const userCredential = await signInWithEmailAndPassword(auth, userEmail, password);
        console.log('تم تسجيل الدخول بنجاح');
        
        // حفظ بيانات المستخدم في localStorage للاستخدام لاحقاً
        if (userData) {
            localStorage.setItem('currentUser', JSON.stringify(userData));
        }
        
        // التوجه للصفحة الرئيسية
        window.location.href = 'index.html';
        
    } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
        let errorMessage = 'حدث خطأ أثناء تسجيل الدخول';
        
        switch(error.code) {
            case 'auth/user-not-found':
                errorMessage = 'المستخدم غير موجود';
                break;
            case 'auth/wrong-password':
                errorMessage = 'كلمة المرور غير صحيحة';
                break;
            case 'auth/invalid-credential':
                errorMessage = 'بيانات الدخول غير صحيحة';
                break;
        }
        
        errorElement.textContent = errorMessage;
    }
});

// التحقق من تسجيل الدخول عند تحميل الصفحة
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

onAuthStateChanged(auth, (user) => {
    if (user && window.location.pathname.includes('auth.html')) {
        // إذا كان المستخدم مسجلاً بالفعل، توجيهه للصفحة الرئيسية
        window.location.href = 'index.html';
    }
});