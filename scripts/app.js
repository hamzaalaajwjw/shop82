import { currentUser } from './auth.js';
import { loadChatsAndContacts } from './users.js';

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // تحديث حالة الاتصال عند تحميل الصفحة
    if (navigator.onLine) {
        document.getElementById('currentUserStatus').textContent = 'متصل';
        document.getElementById('currentUserStatus').className = 'status online';
    }
    
    // إدارة التنقل بين الأقسام
    setupNavigation();
    
    // البحث عن المستخدمين في الشريط الجانبي
    setupSidebarSearch();
    
    // تحديث المحادثات والجهات اتصال
    if (currentUser) {
        loadChatsAndContacts();
    }
}

function setupNavigation() {
    const menuItems = document.querySelectorAll('.menu-item');
    
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            
            // تحديث العنصر النشط في القائمة
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // إخفاء جميع الشاشات
            document.querySelectorAll('.main-content > div').forEach(div => {
                div.classList.add('hidden');
            });
            
            // إظهار الشاشة المختارة
            document.getElementById(`${section}Screen`).classList.remove('hidden');
        });
    });
}

function setupSidebarSearch() {
    const searchInput = document.getElementById('searchUsers');
    
    searchInput.addEventListener('input', debounce(async (e) => {
        const searchTerm = e.target.value.toLowerCase();
        if (!searchTerm) {
            // إذا كان البحث فارغاً، إعادة تحميل المحادثات
            if (currentUser) {
                loadChatsAndContacts();
            }
            return;
        }
        
        try {
            // البحث في المحادثات والمستخدمين
            // (يمكن توسيعه ليشمل بحثاً أكثر تقدماً)
            const chatsList = document.querySelector('.chats-list');
            const chatItems = chatsList.querySelectorAll('.chat-item');
            
            chatItems.forEach(item => {
                const userName = item.querySelector('h4').textContent.toLowerCase();
                const lastMessage = item.querySelector('p').textContent.toLowerCase();
                
                if (userName.includes(searchTerm) || lastMessage.includes(searchTerm)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
            
        } catch (error) {
            console.error('Error in search:', error);
        }
    }, 300));
}

// دالة debounce للبحث
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// إضافة جهة اتصال
document.getElementById('addContactBtn')?.addEventListener('click', () => {
    const searchModal = document.getElementById('searchModal');
    searchModal.classList.remove('hidden');
    
    // تفعيل البحث في جهات الاتصال
    const globalSearch = document.getElementById('globalSearch');
    globalSearch.focus();
});