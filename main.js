// 📄 main.js - الصفحة الرئيسية المحسنة

import { auth, database } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { ref, get, set, push, child, onValue, off } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import ChatService from './chat-service.js';
import { searchUsers, formatDate, generateColorCode, getInitials, truncateText } from './functions.js';

// متغيرات عامة
let currentUser = null;
let currentChatId = null;
let chatService = null;
let activeListeners = [];

// عناصر DOM
const elements = {
    chatsList: document.getElementById('chatsList'),
    messagesContainer: document.getElementById('messagesContainer'),
    chatInfo: document.getElementById('chatInfo'),
    messageInput: document.getElementById('messageInput'),
    sendBtn: document.getElementById('sendBtn'),
    searchUser: document.getElementById('searchUser'),
    newChatBtn: document.getElementById('newChatBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    searchModal: document.getElementById('searchModal'),
    usernameSearch: document.getElementById('usernameSearch'),
    searchResults: document.getElementById('searchResults'),
    closeSearchBtn: document.getElementById('closeSearchBtn')
};

// ===== التهيئة الرئيسية =====
async function initializeApp() {
    console.log('🚀 بدء تهيئة التطبيق...');
    
    try {
        // التحقق من تسجيل الدخول
        onAuthStateChanged(auth, handleAuthStateChange);
        
        // إعداد مستمعي الأحداث
        setupEventListeners();
        
    } catch (error) {
        console.error('❌ خطأ في تهيئة التطبيق:', error);
        showError('حدث خطأ في تحميل التطبيق');
    }
}

// ===== معالجة تغيير حالة المصادقة =====
async function handleAuthStateChange(user) {
    if (!user) {
        console.log('👤 لم يتم تسجيل الدخول، التوجيه لصفحة التسجيل');
        window.location.href = 'auth.html';
        return;
    }
    
    console.log('✅ مستخدم مسجل:', user.uid);
    
    try {
        // جلب بيانات المستخدم
        currentUser = await getUserData(user.uid);
        
        if (!currentUser) {
            console.error('❌ بيانات المستخدم غير موجودة');
            await signOut(auth);
            return;
        }
        
        // حفظ في localStorage
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // تهيئة خدمة المحادثات
        chatService = new ChatService(currentUser.uid);
        
        // تحميل المحادثات
        await loadUserChats();
        
        // تحديث واجهة المستخدم
        updateUI();
        
    } catch (error) {
        console.error('❌ خطأ في تحميل بيانات المستخدم:', error);
        showError('حدث خطأ في تحميل بياناتك');
    }
}

// ===== جلب بيانات المستخدم =====
async function getUserData(uid) {
    try {
        const userRef = ref(database, 'users/' + uid);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
            return snapshot.val();
        } else {
            console.error('❌ بيانات المستخدم غير موجودة في قاعدة البيانات');
            await signOut(auth);
            return null;
        }
    } catch (error) {
        console.error('❌ خطأ في جلب بيانات المستخدم:', error);
        return null;
    }
}

// ===== تحميل محادثات المستخدم =====
async function loadUserChats() {
    showLoading(elements.chatsList, 'جاري تحميل المحادثات...');
    
    try {
        // استخدام خدمة المحادثات
        const chats = await chatService.getRecentChats();
        
        if (chats.length === 0) {
            showEmptyState(elements.chatsList, 'لا توجد محادثات بعد. ابدأ محادثة جديدة!');
            return;
        }
        
        // عرض المحادثات
        displayChats(chats);
        
        // الاستماع للتحديثات
        subscribeToChatsUpdates();
        
    } catch (error) {
        console.error('❌ خطأ في تحميل المحادثات:', error);
        showErrorState(elements.chatsList, 'حدث خطأ في تحميل المحادثات');
    }
}

// ===== عرض المحادثات =====
function displayChats(chats) {
    elements.chatsList.innerHTML = '';
    
    chats.forEach(chat => {
        const chatElement = createChatElement(chat);
        elements.chatsList.appendChild(chatElement);
    });
}

// ===== إنشاء عنصر محادثة =====
function createChatElement(chat) {
    const otherUser = getOtherParticipant(chat);
    const lastMessageTime = formatDate(chat.lastUpdate);
    
    const div = document.createElement('div');
    div.className = 'chat-item';
    div.dataset.chatId = chat.id;
    div.dataset.userId = otherUser?.id;
    
    const initials = getInitials(otherUser?.username || 'مستخدم');
    const color = generateColorCode(otherUser?.username || '');
    
    div.innerHTML = `
        <div class="chat-avatar" style="background: ${color}">
            ${initials}
        </div>
        <div class="chat-info">
            <h4>${otherUser?.username || 'مستخدم'}</h4>
            <p>${truncateText(chat.lastMessage || 'بدون رسائل', 25)}</p>
        </div>
        <div class="chat-time">${lastMessageTime}</div>
    `;
    
    div.addEventListener('click', () => openChat(chat.id, otherUser));
    
    return div;
}

// ===== الحصول على المستخدم الآخر =====
function getOtherParticipant(chat) {
    if (!chat.participants || !currentUser) return null;
    
    for (const userId in chat.participants) {
        if (userId !== currentUser.uid) {
            return {
                id: userId,
                username: chat.participants[userId]?.username,
                ...(chat.otherUser || {})
            };
        }
    }
    
    return null;
}

// ===== فتح محادثة =====
async function openChat(chatId, otherUser) {
    if (!chatId || !chatService) return;
    
    console.log('💬 فتح المحادثة:', chatId);
    
    // تحديث المحادثة النشطة
    updateActiveChat(chatId);
    currentChatId = chatId;
    
    // تحديث رأس المحادثة
    updateChatHeader(otherUser);
    
    // تمكين إرسال الرسائل
    elements.messageInput.disabled = false;
    elements.sendBtn.disabled = false;
    
    // تحميل الرسائل
    await loadChatMessages(chatId);
    
    // التركيز على حقل الإدخال
    elements.messageInput.focus();
    
    // تحديث حالة القراءة
    await chatService.markAsRead(chatId);
}

// ===== تحديث المحادثة النشطة =====
function updateActiveChat(chatId) {
    // إزالة النشاط من جميع المحادثات
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // إضافة النشاط للمحادثة المحددة
    const activeChat = document.querySelector(`.chat-item[data-chat-id="${chatId}"]`);
    if (activeChat) {
        activeChat.classList.add('active');
    }
}

// ===== تحديث رأس المحادثة =====
function updateChatHeader(otherUser) {
    if (!otherUser) {
        elements.chatInfo.innerHTML = '<h3>اختر محادثة</h3>';
        return;
    }
    
    const initials = getInitials(otherUser.username);
    const color = generateColorCode(otherUser.username);
    
    elements.chatInfo.innerHTML = `
        <div class="chat-header-avatar" style="background: ${color}">
            ${initials}
        </div>
        <div class="chat-header-info">
            <h3>${otherUser.username}</h3>
            <p class="text-success">● متصل الآن</p>
        </div>
    `;
}

// ===== تحميل رسائل المحادثة =====
async function loadChatMessages(chatId) {
    showLoading(elements.messagesContainer, 'جاري تحميل الرسائل...');
    
    try {
        // جلب الرسائل
        const messages = await chatService.getChatMessages(chatId, 100);
        
        if (messages.length === 0) {
            showEmptyState(elements.messagesContainer, 'لا توجد رسائل بعد. ابدأ المحادثة!');
            return;
        }
        
        // عرض الرسائل
        displayMessages(messages);
        
        // الاستماع للرسائل الجديدة
        subscribeToNewMessages(chatId);
        
    } catch (error) {
        console.error('❌ خطأ في تحميل الرسائل:', error);
        showErrorState(elements.messagesContainer, 'حدث خطأ في تحميل الرسائل');
    }
}

// ===== عرض الرسائل =====
function displayMessages(messages) {
    elements.messagesContainer.innerHTML = '';
    
    messages.forEach(message => {
        const messageElement = createMessageElement(message);
        elements.messagesContainer.appendChild(messageElement);
    });
    
    // التمرير للأسفل
    scrollToBottom();
}

// ===== إنشاء عنصر رسالة =====
function createMessageElement(message) {
    const isSent = message.senderId === currentUser.uid;
    const time = formatDate(message.timestamp, 'time');
    
    const div = document.createElement('div');
    div.className = `message ${isSent ? 'sent' : 'received'}`;
    div.dataset.messageId = message.id;
    
    div.innerHTML = `
        <div class="message-text">${message.text}</div>
        <div class="message-time">${time}</div>
    `;
    
    return div;
}

// ===== إرسال رسالة =====
async function sendMessage() {
    const messageText = elements.messageInput.value.trim();
    
    if (!messageText || !currentChatId || !chatService) {
        return;
    }
    
    console.log('📤 إرسال رسالة:', messageText);
    
    // تعطيل الزر أثناء الإرسال
    elements.sendBtn.disabled = true;
    const originalText = elements.sendBtn.textContent;
    elements.sendBtn.textContent = 'جاري الإرسال...';
    
    try {
        // إرسال الرسالة
        const result = await chatService.sendMessage(currentChatId, messageText);
        
        if (result.success) {
            // مسح حقل الإدخال
            elements.messageInput.value = '';
            
            // إعادة تمكين الزر
            elements.sendBtn.textContent = originalText;
            elements.sendBtn.disabled = false;
            
            console.log('✅ تم إرسال الرسالة بنجاح');
        } else {
            throw new Error(result.error || 'فشل إرسال الرسالة');
        }
        
    } catch (error) {
        console.error('❌ خطأ في إرسال الرسالة:', error);
        showError('فشل إرسال الرسالة. حاول مرة أخرى.');
        
        // إعادة تمكين الزر
        elements.sendBtn.textContent = originalText;
        elements.sendBtn.disabled = false;
    }
}

// ===== البحث عن مستخدمين =====
async function searchUsersHandler(searchTerm) {
    if (!searchTerm || searchTerm.length < 2) {
        elements.searchResults.innerHTML = '<div class="empty-state">اكتب حرفين على الأقل للبحث</div>';
        return;
    }
    
    showLoading(elements.searchResults, 'جاري البحث...');
    
    try {
        const result = await searchUsers(searchTerm, {
            limit: 20,
            excludeCurrentUser: true,
            currentUserId: currentUser?.uid
        });
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        if (result.results.length === 0) {
            elements.searchResults.innerHTML = `
                <div class="empty-state">
                    <i>🔍</i>
                    <p>لا توجد نتائج للبحث "${searchTerm}"</p>
                </div>
            `;
            return;
        }
        
        // عرض النتائج
        displaySearchResults(result.results);
        
    } catch (error) {
        console.error('❌ خطأ في البحث:', error);
        elements.searchResults.innerHTML = `
            <div class="error-state">
                <i>❌</i>
                <p>حدث خطأ أثناء البحث</p>
            </div>
        `;
    }
}

// ===== عرض نتائج البحث =====
function displaySearchResults(users) {
    elements.searchResults.innerHTML = '';
    
    users.forEach(user => {
        const userElement = createUserResultElement(user);
        elements.searchResults.appendChild(userElement);
    });
}

// ===== إنشاء عنصر نتيجة بحث =====
function createUserResultElement(user) {
    const initials = getInitials(user.username);
    const color = generateColorCode(user.username);
    const lastActive = formatDate(user.lastActive);
    
    const div = document.createElement('div');
    div.className = 'search-result-item';
    div.dataset.userId = user.id;
    
    div.innerHTML = `
        <div class="result-avatar" style="background: ${color}">
            ${initials}
        </div>
        <div class="result-info">
            <h4>${user.username}</h4>
            <p class="text-muted">نشط ${lastActive}</p>
        </div>
        <button class="start-chat-btn" 
                data-user-id="${user.id}" 
                data-username="${user.username}">
            بدء محادثة
        </button>
    `;
    
    // إضافة مستمع الحدث
    const chatBtn = div.querySelector('.start-chat-btn');
    chatBtn.addEventListener('click', () => startChatWithUser(user.id, user.username));
    
    return div;
}

// ===== بدء محادثة مع مستخدم =====
async function startChatWithUser(userId, username) {
    if (!chatService) return;
    
    console.log('💬 بدء محادثة مع:', username);
    
    showLoading(elements.searchResults, 'جاري إنشاء المحادثة...');
    
    try {
        // إنشاء المحادثة
        const result = await chatService.createChat(userId, username);
        
        if (result.success) {
            // إغلاق نافذة البحث
            closeSearchModal();
            
            // فتح المحادثة
            const otherUser = { id: userId, username: username };
            await openChat(result.chatId, otherUser);
            
            // إعادة تحميل قائمة المحادثات
            await loadUserChats();
            
            console.log('✅ تم إنشاء المحادثة بنجاح');
        } else {
            throw new Error(result.error || 'فشل إنشاء المحادثة');
        }
        
    } catch (error) {
        console.error('❌ خطأ في إنشاء المحادثة:', error);
        showError('فشل إنشاء المحادثة. حاول مرة أخرى.');
    }
}

// ===== الاشتراك في تحديثات المحادثات =====
function subscribeToChatsUpdates() {
    if (!chatService) return;
    
    const unsubscribe = chatService.subscribeToChats(async (chatIds) => {
        if (chatIds.length === 0) {
            showEmptyState(elements.chatsList, 'لا توجد محادثات بعد. ابدأ محادثة جديدة!');
            return;
        }
        
        // جلب معلومات المحادثات المحدثة
        const chats = await chatService.getRecentChats();
        displayChats(chats);
    });
    
    activeListeners.push(unsubscribe);
}

// ===== الاشتراك في رسائل جديدة =====
function subscribeToNewMessages(chatId) {
    if (!chatService) return;
    
    const unsubscribe = chatService.subscribeToMessages(chatId, (messages) => {
        if (messages.length > 0) {
            displayMessages(messages);
        }
    });
    
    activeListeners.push(unsubscribe);
}

// ===== إعداد مستمعي الأحداث =====
function setupEventListeners() {
    // إرسال رسالة
    elements.sendBtn.addEventListener('click', sendMessage);
    elements.messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // تسجيل الخروج
    elements.logoutBtn.addEventListener('click', async () => {
        try {
            // تنظيف المستمعين
            cleanupListeners();
            
            // تسجيل الخروج
            await signOut(auth);
            localStorage.removeItem('currentUser');
            
            console.log('👋 تم تسجيل الخروج');
            window.location.href = 'auth.html';
            
        } catch (error) {
            console.error('❌ خطأ في تسجيل الخروج:', error);
            showError('حدث خطأ أثناء تسجيل الخروج');
        }
    });
    
    // البحث الفوري
    let searchTimeout;
    elements.searchUser.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchUsersHandler(e.target.value.trim());
        }, 300);
    });
    
    // فتح نافذة البحث
    elements.newChatBtn.addEventListener('click', openSearchModal);
    
    // البحث في النافذة المنبثقة
    let modalSearchTimeout;
    elements.usernameSearch.addEventListener('input', (e) => {
        clearTimeout(modalSearchTimeout);
        modalSearchTimeout = setTimeout(() => {
            searchUsersHandler(e.target.value.trim());
        }, 300);
    });
    
    // إغلاق نافذة البحث
    elements.closeSearchBtn.addEventListener('click', closeSearchModal);
    elements.searchModal.addEventListener('click', (e) => {
        if (e.target === elements.searchModal) {
            closeSearchModal();
        }
    });
}

// ===== فتح نافذة البحث =====
function openSearchModal() {
    elements.searchModal.classList.add('show');
    elements.usernameSearch.value = '';
    elements.searchResults.innerHTML = '';
    elements.usernameSearch.focus();
}

// ===== إغلاق نافذة البحث =====
function closeSearchModal() {
    elements.searchModal.classList.remove('show');
    elements.usernameSearch.value = '';
    elements.searchResults.innerHTML = '';
}

// ===== تنظيف المستمعين =====
function cleanupListeners() {
    activeListeners.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
            unsubscribe();
        }
    });
    activeListeners = [];
    
    if (chatService) {
        chatService.cleanup();
    }
}

// ===== تحديث واجهة المستخدم =====
function updateUI() {
    // إضافة تأثيرات تحميل
    document.body.classList.add('loaded');
    
    // تحديث عنوان الصفحة
    if (currentUser) {
        document.title = `دردشة - ${currentUser.username}`;
    }
}

// ===== وظائف مساعدة للعرض =====
function showLoading(container, message = 'جاري التحميل...') {
    container.innerHTML = `
        <div class="loading-state">
            <div class="spinner-small"></div>
            <p>${message}</p>
        </div>
    `;
}

function showEmptyState(container, message = 'لا توجد بيانات') {
    container.innerHTML = `
        <div class="empty-state">
            <i>📭</i>
            <p>${message}</p>
        </div>
    `;
}

function showErrorState(container, message = 'حدث خطأ') {
    container.innerHTML = `
        <div class="error-state">
            <i>❌</i>
            <p>${message}</p>
        </div>
    `;
}

function showError(message) {
    // يمكن إضافة نافذة منبثقة للخطأ
    alert(message);
}

function scrollToBottom() {
    elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
}

// ===== تهيئة عند تحميل الصفحة =====
window.addEventListener('load', initializeApp);

// تنظيف عند إغلاق الصفحة
window.addEventListener('beforeunload', () => {
    cleanupListeners();
});

// ===== تصدير وظائف للمساعدة في التصحيح =====
window.appDebug = {
    getCurrentUser: () => currentUser,
    getCurrentChat: () => currentChatId,
    getChatService: () => chatService,
    reloadChats: () => loadUserChats(),
    clearCache: () => {
        localStorage.removeItem('currentUser');
        console.log('✅ تم مسح الكاش');
    }
};
