// 📄 functions.js - وظائف مساعدة محسنة

import { database } from './firebase-config.js';
import { ref, get, query, orderByChild, limitToLast } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ===== البحث عن مستخدم باستخدام اسم المستخدم =====
export async function findUserByUsername(username) {
    try {
        console.log('🔍 بدء البحث عن مستخدم:', username);
        
        const usersRef = ref(database, 'users');
        const snapshot = await get(usersRef);
        
        if (!snapshot.exists()) {
            console.log('❌ لا يوجد مستخدمين في قاعدة البيانات');
            return null;
        }
        
        const allUsers = snapshot.val();
        
        // البحث في جميع المستخدمين
        for (const userId in allUsers) {
            const user = allUsers[userId];
            if (user.username && user.username.toLowerCase() === username.toLowerCase()) {
                console.log('✅ وجد المستخدم:', user.username);
                return {
                    id: userId,
                    ...user
                };
            }
        }
        
        console.log('❌ لم يتم العثور على المستخدم');
        return null;
        
    } catch (error) {
        console.error('❌ خطأ في البحث عن مستخدم:', error);
        return null;
    }
}

// ===== البحث المتقدم عن المستخدمين =====
export async function searchUsers(searchTerm, options = {}) {
    try {
        const {
            limit = 20,
            excludeCurrentUser = true,
            currentUserId = null
        } = options;
        
        if (!searchTerm || searchTerm.length < 2) {
            return { success: true, results: [], message: 'اكتب حرفين على الأقل' };
        }
        
        console.log('🔍 بحث متقدم عن:', searchTerm);
        
        const usersRef = ref(database, 'users');
        const snapshot = await get(usersRef);
        
        if (!snapshot.exists()) {
            return { success: true, results: [], message: 'لا يوجد مستخدمين' };
        }
        
        const allUsers = snapshot.val();
        const results = [];
        const searchTermLower = searchTerm.toLowerCase();
        
        for (const userId in allUsers) {
            const user = allUsers[userId];
            
            // تخطي المستخدم الحالي إذا مطلوب
            if (excludeCurrentUser && userId === currentUserId) {
                continue;
            }
            
            let matchScore = 0;
            
            // البحث في اسم المستخدم
            if (user.username && user.username.toLowerCase().includes(searchTermLower)) {
                matchScore += 3;
                if (user.username.toLowerCase() === searchTermLower) {
                    matchScore += 5; // تطابق تام
                }
            }
            
            // البحث في البريد الإلكتروني
            if (user.email && user.email.toLowerCase().includes(searchTermLower)) {
                matchScore += 2;
            }
            
            // إذا وجد تطابق
            if (matchScore > 0) {
                results.push({
                    id: userId,
                    ...user,
                    matchScore: matchScore,
                    lastActive: user.lastLogin || user.createdAt
                });
            }
            
            // التوقف عند الوصول للحد
            if (results.length >= limit) {
                break;
            }
        }
        
        // ترتيب النتائج حسب درجة المطابقة
        results.sort((a, b) => b.matchScore - a.matchScore);
        
        console.log('✅ تم العثور على', results.length, 'نتيجة');
        
        return {
            success: true,
            results: results,
            count: results.length,
            searchTerm: searchTerm
        };
        
    } catch (error) {
        console.error('❌ خطأ في البحث:', error);
        return {
            success: false,
            error: error.message,
            results: [],
            message: 'حدث خطأ أثناء البحث'
        };
    }
}

// ===== التحقق من توفر اسم المستخدم =====
export async function isUsernameAvailable(username) {
    try {
        if (!username || username.length < 3) {
            return { available: false, message: 'اسم المستخدم قصير جداً' };
        }
        
        const usernameRef = ref(database, 'usernames/' + username);
        const snapshot = await get(usernameRef);
        
        const available = !snapshot.exists();
        
        return {
            available: available,
            message: available ? 'الاسم متاح' : 'الاسم محجوز'
        };
        
    } catch (error) {
        console.error('خطأ في التحقق من اسم المستخدم:', error);
        return { available: false, message: 'حدث خطأ أثناء التحقق' };
    }
}

// ===== تنسيق التاريخ =====
export function formatDate(timestamp, format = 'relative') {
    if (!timestamp) return 'غير معروف';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (format === 'relative') {
        // إذا كان أقل من دقيقة
        if (diff < 60000) {
            return 'الآن';
        }
        
        // إذا كان أقل من ساعة
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `قبل ${minutes} دقيقة${minutes > 1 ? 'ات' : ''}`;
        }
        
        // إذا كان أقل من 24 ساعة
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `قبل ${hours} ساعة${hours > 1 ? 'ات' : ''}`;
        }
        
        // إذا كان أقل من أسبوع
        if (diff < 604800000) {
            const days = Math.floor(diff / 86400000);
            return `قبل ${days} يوم${days > 1 ? 'ات' : ''}`;
        }
        
        // أكثر من أسبوع
        return date.toLocaleDateString('ar-EG', {
            day: 'numeric',
            month: 'short',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    }
    
    if (format === 'full') {
        return date.toLocaleString('ar-EG', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    if (format === 'time') {
        return date.toLocaleTimeString('ar-EG', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    if (format === 'date') {
        return date.toLocaleDateString('ar-EG', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }
    
    return date.toLocaleString('ar-EG');
}

// ===== تقصير النص الطويل =====
export function truncateText(text, maxLength = 30, ellipsis = '...') {
    if (!text || text.length <= maxLength) return text || '';
    
    // الحفاظ على الكلمات كاملة إذا أمكن
    if (text.length > maxLength) {
        const truncated = text.substring(0, maxLength);
        const lastSpace = truncated.lastIndexOf(' ');
        
        if (lastSpace > maxLength * 0.7) {
            return text.substring(0, lastSpace) + ellipsis;
        }
    }
    
    return text.substring(0, maxLength) + ellipsis;
}

// ===== تحسين أول حرف =====
export function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

// ===== إنشاء اسم عرضي =====
export function generateDisplayName(username) {
    if (!username) return 'مستخدم';
    
    // إزالة الأرقام والرموز الخاصة
    const cleanName = username.replace(/[0-9_\-\.]/g, ' ');
    
    if (cleanName.trim().length > 0) {
        return capitalizeFirstLetter(cleanName.trim());
    }
    
    return username;
}

// ===== التحقق من صحة البريد الإلكتروني =====
export function validateEmail(email) {
    if (!email) return { valid: false, message: 'البريد الإلكتروني مطلوب' };
    
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const valid = re.test(email);
    
    return {
        valid: valid,
        message: valid ? '' : 'بريد إلكتروني غير صالح'
    };
}

// ===== التحقق من قوة كلمة المرور =====
export function validatePassword(password) {
    if (!password) return { valid: false, message: 'كلمة المرور مطلوبة' };
    
    const errors = [];
    
    if (password.length < 6) {
        errors.push('6 أحرف على الأقل');
    }
    
    if (!/\d/.test(password)) {
        errors.push('رقم واحد على الأقل');
    }
    
    if (!/[a-zA-Z]/.test(password)) {
        errors.push('حرف إنجليزي واحد على الأقل');
    }
    
    const valid = errors.length === 0;
    
    return {
        valid: valid,
        message: valid ? 'قوية' : 'ضعيفة: ' + errors.join('، '),
        errors: errors
    };
}

// ===== إنشاء رمز لون عشوائي =====
export function generateColorCode(str) {
    if (!str) return '#667eea';
    
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colors = [
        '#667eea', '#764ba2', '#f093fb', '#f5576c',
        '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
        '#fa709a', '#fee140', '#a8edea', '#fed6e3'
    ];
    
    return colors[Math.abs(hash) % colors.length];
}

// ===== إنشاء الحروف الأولى من الاسم =====
export function getInitials(name) {
    if (!name) return 'م';
    
    const words = name.split(' ');
    let initials = '';
    
    for (let i = 0; i < Math.min(words.length, 2); i++) {
        if (words[i] && words[i][0]) {
            initials += words[i][0];
        }
    }
    
    return initials.toUpperCase() || 'م';
}

// ===== تحميل الصورة بأمان =====
export function safeImageLoad(imgElement, url, fallbackUrl = null) {
    return new Promise((resolve) => {
        imgElement.onload = () => resolve(true);
        imgElement.onerror = () => {
            if (fallbackUrl) {
                imgElement.src = fallbackUrl;
            }
            resolve(false);
        };
        imgElement.src = url;
    });
}

// ===== نسخ النص إلى الحافظة =====
export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return { success: true };
    } catch (error) {
        console.error('خطأ في النسخ:', error);
        
        // طريقة بديلة
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        } finally {
            document.body.removeChild(textArea);
        }
    }
}

// ===== تخزين مؤقت محلي =====
export class CacheManager {
    constructor(prefix = 'chat_', ttl = 3600000) { // ساعة واحدة افتراضياً
        this.prefix = prefix;
        this.ttl = ttl;
    }
    
    set(key, data) {
        try {
            const item = {
                data: data,
                timestamp: Date.now()
            };
            localStorage.setItem(this.prefix + key, JSON.stringify(item));
            return true;
        } catch (error) {
            console.error('خطأ في التخزين:', error);
            return false;
        }
    }
    
    get(key) {
        try {
            const itemStr = localStorage.getItem(this.prefix + key);
            if (!itemStr) return null;
            
            const item = JSON.parse(itemStr);
            
            // التحقق من انتهاء الصلاحية
            if (Date.now() - item.timestamp > this.ttl) {
                this.delete(key);
                return null;
            }
            
            return item.data;
        } catch (error) {
            console.error('خطأ في القراءة:', error);
            return null;
        }
    }
    
    delete(key) {
        try {
            localStorage.removeItem(this.prefix + key);
            return true;
        } catch (error) {
            console.error('خطأ في الحذف:', error);
            return false;
        }
    }
    
    clear() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.prefix)) {
                    localStorage.removeItem(key);
                }
            });
            return true;
        } catch (error) {
            console.error('خطأ في المسح:', error);
            return false;
        }
    }
}

// ===== تسجيل الأخطاء =====
export class ErrorLogger {
    constructor(serviceName = 'ChatApp') {
        this.serviceName = serviceName;
    }
    
    log(error, context = {}) {
        const errorData = {
            timestamp: new Date().toISOString(),
            service: this.serviceName,
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack,
                code: error.code
            },
            context: context,
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        console.error(`[${this.serviceName}]`, errorData);
        
        // يمكن إضافة إرسال الأخطاء لخادم هنا
        // this.sendToServer(errorData);
        
        return errorData;
    }
    
    async sendToServer(errorData) {
        try {
            // إرسال الأخطاء لخادم مركزي
            // يمكن استخدام Firebase أو خدمة خارجية
            console.log('إرسال الخطأ للخادم:', errorData);
        } catch (sendError) {
            console.error('فشل إرسال الخطأ:', sendError);
        }
    }
}

// تصدير مثيلات مفيدة
export const userCache = new CacheManager('user_', 300000); // 5 دقائق
export const chatCache = new CacheManager('chat_', 60000); // دقيقة واحدة
export const errorLogger = new ErrorLogger('ChatApp');
