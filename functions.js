// 📄 functions.js - ملف الوظائف المساعدة

import { database } from './firebase-config.js';
import { ref, get, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ===== البحث عن مستخدم باستخدام اسم المستخدم =====
export async function findUserByUsername(username) {
    try {
        const usersRef = ref(database, 'users');
        const usersQuery = query(usersRef, orderByChild('username'), equalTo(username));
        const snapshot = await get(usersQuery);
        
        if (snapshot.exists()) {
            let user = null;
            snapshot.forEach((childSnapshot) => {
                user = {
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                };
            });
            return user;
        }
        return null;
    } catch (error) {
        console.error('خطأ في البحث عن مستخدم:', error);
        return null;
    }
}

// ===== التحقق من توفر اسم المستخدم =====
export async function isUsernameAvailable(username) {
    try {
        const usernameRef = ref(database, 'usernames/' + username);
        const snapshot = await get(usernameRef);
        return !snapshot.exists();
    } catch (error) {
        console.error('خطأ في التحقق من اسم المستخدم:', error);
        return false;
    }
}

// ===== تنسيق التاريخ =====
export function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // إذا كان أقل من دقيقة
    if (diff < 60000) {
        return 'الآن';
    }
    
    // إذا كان أقل من ساعة
    if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `قبل ${minutes} دقيقة`;
    }
    
    // إذا كان اليوم نفسه
    if (date.getDate() === now.getDate() && 
        date.getMonth() === now.getMonth() && 
        date.getFullYear() === now.getFullYear()) {
        return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    }
    
    // إذا كان الأمس
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.getDate() === yesterday.getDate() && 
        date.getMonth() === yesterday.getMonth() && 
        date.getFullYear() === yesterday.getFullYear()) {
        return 'أمس';
    }
    
    // أكثر من يوم
    return date.toLocaleDateString('ar-EG', { 
        day: 'numeric', 
        month: 'short' 
    });
}

// ===== تقصير النص الطويل =====
export function truncateText(text, maxLength = 30) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// ===== تحويل أول حرف لحالة كبيرة =====
export function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// ===== التحقق من صحة البريد الإلكتروني =====
export function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// ===== التحقق من قوة كلمة المرور =====
export function validatePassword(password) {
    if (password.length < 6) return 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    if (!/\d/.test(password)) return 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل';
    return null; // لا يوجد أخطاء
}