// main.js - الملف الرئيسي لتطبيق الدردشة

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getDatabase, ref, set, push, onValue, update, remove, query, orderByChild, equalTo } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

// استيراد إعدادات Firebase من ملف الإعدادات
import { firebaseConfig } from './firebase-config.js';

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// حالة التطبيق
let currentUser = null;
let currentChat = null;
let chats = [];
let users = [];

// DOM Elements
const elements = {
    // الشاشات
    authScreen: document.getElementById('authScreen'),
    mainScreen: document.getElementById('mainScreen'),
    loadingScreen: document.getElementById('loadingScreen'),
    
    // عناصر المصادقة
    loginTab: document.getElementById('loginTab'),
    registerTab: document.getElementById('registerTab'),
    loginForm: document.getElementById('loginForm'),
    registerForm: document.getElementById('registerForm'),
    loginEmail: document.getElementById('loginEmail'),
    loginPassword: document.getElementById('loginPassword'),
    registerName: document.getElementById('registerName'),
    registerEmail: document.getElementById('registerEmail'),
    registerPassword: document.getElementById('registerPassword'),
    registerConfirmPassword: document.getElementById('registerConfirmPassword'),
    
    // عناصر التطبيق الرئيسي
    menuBtn: document.getElementById('menuBtn'),
    sidebar: document.getElementById('sidebar'),
    newChatBtn: document.getElementById('newChatBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    searchUser: document.getElementById('searchUser'),
    chatsList: document.getElementById('chatsList'),
    chatHeader: document.getElementById('chatHeader'),
    messagesContainer: document.getElementById('messagesContainer'),
    messageInput: document.getElementById('messageInput'),
    sendBtn: document.getElementById('sendBtn'),
    startNewChatBtn: document.getElementById('startNewChatBtn'),
    
    // النماذج المنبثقة
    searchModal: document.getElementById('searchModal'),
    usernameSearch: document.getElementById('usernameSearch'),
    searchResults: document.getElementById('searchResults'),
    closeSearchBtn: document.getElementById('closeSearchBtn'),
    cancelSearchBtn: document.getElementById('cancelSearchBtn')
};

// ===== الدوال المساعدة =====

// إظهار/إخفاء الشاشات
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// إظهار/إخفاء التحميل
function showLoading() {
    elements.loadingScreen.style.display = 'flex';
}

function hideLoading() {
    elements.loadingScreen.style.display = 'none';
}

// إظهار إشعار
function showNotification(type, title, message) {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icon = type === 'success' ? 'check-circle' : 
                 type === 'error' ? 'exclamation-circle' : 'info-circle';
    
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="fas fa-${icon}"></i>
        </div>
        <div class="notification-content">
            <div class="notification-title">${title}</div>
            <div class="notification-message">${message}</div>
        </div>
    `;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'notificationSlide 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// تحقق من صحة البريد الإلكتروني
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// تحقق من قوة كلمة المرور
function isStrongPassword(password) {
    return password.length >= 6;
}

// توليد لون عشوائي للمستخدم
function generateUserColor(name) {
    const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
}

// تهيئة تطبيق الدردشة
async function initializeChatApp() {
    try {
        showLoading();
        
        // مراقبة حالة المصادقة
        onAuthStateChanged(auth, (user) => {
            if (user) {
                currentUser = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || user.email.split('@')[0]
                };
                showScreen('mainScreen');
                loadUserChats();
                updateUserOnlineStatus(true);
            } else {
                currentUser = null;
                showScreen('authScreen');
            }
            hideLoading();
        });
        
        // إعداد مستمعات الأحداث
        setupEventListeners();
        
    } catch (error) {
        console.error('خطأ في تهيئة التطبيق:', error);
        showNotification('error', 'خطأ', 'حدث خطأ في تهيئة التطبيق');
        hideLoading();
    }
}

// إعداد مستمعات الأحداث
function setupEventListeners() {
    // أحداث المصادقة
    elements.loginTab.addEventListener('click', () => switchAuthTab('login'));
    elements.registerTab.addEventListener('click', () => switchAuthTab('register'));
    elements.loginForm.addEventListener('submit', handleLogin);
    elements.registerForm.addEventListener('submit', handleRegister);
    
    // أحداث التطبيق الرئيسي
    elements.menuBtn.addEventListener('click', toggleSidebar);
    elements.newChatBtn.addEventListener('click', showSearchModal);
    elements.logoutBtn.addEventListener('click', handleLogout);
    elements.startNewChatBtn.addEventListener('click', showSearchModal);
    
    // أحداث البحث
    elements.searchUser.addEventListener('input', filterChats);
    elements.usernameSearch.addEventListener('input', searchUsers);
    elements.closeSearchBtn.addEventListener('click', hideSearchModal);
    elements.cancelSearchBtn.addEventListener('click', hideSearchModal);
    
    // أحداث الرسائل
    elements.sendBtn.addEventListener('click', sendMessage);
    elements.messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // إغلاق النماذج المنبثقة عند النقر خارجها
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            hideSearchModal();
        }
    });
    
    // إظهار/إخفاء كلمة المرور
    document.querySelectorAll('.show-password').forEach(btn => {
        btn.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            const icon = this.querySelector('i');
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });
}

// ===== دوال المصادقة =====

function switchAuthTab(tab) {
    elements.loginTab.classList.toggle('active', tab === 'login');
    elements.registerTab.classList.toggle('active', tab === 'register');
    elements.loginForm.classList.toggle('active', tab === 'login');
    elements.registerForm.classList.toggle('active', tab === 'register');
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = elements.loginEmail.value.trim();
    const password = elements.loginPassword.value;
    
    // التحقق من صحة المدخلات
    if (!isValidEmail(email)) {
        showNotification('error', 'خطأ', 'يرجى إدخال بريد إلكتروني صحيح');
        return;
    }
    
    if (!isStrongPassword(password)) {
        showNotification('error', 'خطأ', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        return;
    }
    
    try {
        showLoading();
        await signInWithEmailAndPassword(auth, email, password);
        showNotification('success', 'تم بنجاح', 'تم تسجيل الدخول بنجاح');
    } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
        let message = 'حدث خطأ في تسجيل الدخول';
        if (error.code === 'auth/user-not-found') {
            message = 'المستخدم غير موجود';
        } else if (error.code === 'auth/wrong-password') {
            message = 'كلمة المرور غير صحيحة';
        } else if (error.code === 'auth/too-many-requests') {
            message = 'تم محاولة الدخول عدة مرات، يرجى المحاولة لاحقاً';
        }
        showNotification('error', 'خطأ', message);
    } finally {
        hideLoading();
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const name = elements.registerName.value.trim();
    const email = elements.registerEmail.value.trim();
    const password = elements.registerPassword.value;
    const confirmPassword = elements.registerConfirmPassword.value;
    
    // التحقق من صحة المدخلات
    if (name.length < 2) {
        showNotification('error', 'خطأ', 'الاسم يجب أن يكون حرفين على الأقل');
        return;
    }
    
    if (!isValidEmail(email)) {
        showNotification('error', 'خطأ', 'يرجى إدخال بريد إلكتروني صحيح');
        return;
    }
    
    if (!isStrongPassword(password)) {
        showNotification('error', 'خطأ', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        return;
    }
    
    if (password !== confirmPassword) {
        showNotification('error', 'خطأ', 'كلمات المرور غير متطابقة');
        return;
    }
    
    try {
        showLoading();
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // تحديث اسم العرض للمستخدم
        await updateProfile(userCredential.user, {
            displayName: name
        });
        
        // حفظ معلومات المستخدم في قاعدة البيانات
        await set(ref(database, `users/${userCredential.user.uid}`), {
            uid: userCredential.user.uid,
            email: email,
            displayName: name,
            createdAt: Date.now(),
            lastSeen: Date.now(),
            online: true
        });
        
        showNotification('success', 'تم بنجاح', 'تم إنشاء الحساب بنجاح');
        switchAuthTab('login');
    } catch (error) {
        console.error('خطأ في التسجيل:', error);
        let message = 'حدث خطأ في إنشاء الحساب';
        if (error.code === 'auth/email-already-in-use') {
            message = 'البريد الإلكتروني مستخدم بالفعل';
        } else if (error.code === 'auth/weak-password') {
            message = 'كلمة المرور ضعيفة';
        }
        showNotification('error', 'خطأ', message);
    } finally {
        hideLoading();
    }
}

async function handleLogout() {
    try {
        showLoading();
        await updateUserOnlineStatus(false);
        await signOut(auth);
        showNotification('success', 'تم بنجاح', 'تم تسجيل الخروج بنجاح');
        currentUser = null;
        currentChat = null;
        chats = [];
        clearChatUI();
    } catch (error) {
        console.error('خطأ في تسجيل الخروج:', error);
        showNotification('error', 'خطأ', 'حدث خطأ في تسجيل الخروج');
    } finally {
        hideLoading();
    }
}

// ===== دوال المحادثات =====

async function loadUserChats() {
    if (!currentUser) return;
    
    try {
        const userChatsRef = ref(database, `userChats/${currentUser.uid}`);
        onValue(userChatsRef, (snapshot) => {
            chats = [];
            const data = snapshot.val();
            
            if (data) {
                Object.keys(data).forEach(chatId => {
                    chats.push({
                        id: chatId,
                        ...data[chatId]
                    });
                });
                
                // ترتيب المحادثات حسب الوقت
                chats.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
            }
            
            renderChatsList();
        });
    } catch (error) {
        console.error('خطأ في تحميل المحادثات:', error);
    }
}

function renderChatsList() {
    elements.chatsList.innerHTML = '';
    
    if (chats.length === 0) {
        elements.chatsList.innerHTML = `
            <div class="empty-chats">
                <i class="fas fa-comment-slash"></i>
                <p>لا توجد محادثات</p>
                <button class="btn-secondary" id="startNewChatBtn">
                    ابدأ محادثة جديدة
                </button>
            </div>
        `;
        document.getElementById('startNewChatBtn').addEventListener('click', showSearchModal);
        return;
    }
    
    chats.forEach(chat => {
        const chatElement = document.createElement('div');
        chatElement.className = `chat-item ${currentChat?.id === chat.id ? 'active' : ''}`;
        chatElement.dataset.chatId = chat.id;
        
        const otherUserName = chat.participants?.find(p => p.uid !== currentUser.uid)?.displayName || 'مستخدم';
        const lastMessage = chat.lastMessage || 'لا توجد رسائل';
        const lastMessageTime = chat.lastMessageTime ? formatTime(chat.lastMessageTime) : '';
        
        chatElement.innerHTML = `
            <div class="chat-avatar" style="background: ${generateUserColor(otherUserName)}">
                ${otherUserName.charAt(0).toUpperCase()}
            </div>
            <div class="chat-info">
                <h4>${otherUserName}</h4>
                <p>${lastMessage}</p>
            </div>
            <div class="chat-time">${lastMessageTime}</div>
        `;
        
        chatElement.addEventListener('click', () => selectChat(chat));
        elements.chatsList.appendChild(chatElement);
    });
}

async function selectChat(chat) {
    try {
        currentChat = chat;
        updateChatHeader();
        loadChatMessages();
        renderChatsList();
        elements.messageInput.disabled = false;
        elements.sendBtn.disabled = false;
        elements.messageInput.focus();
    } catch (error) {
        console.error('خطأ في اختيار المحادثة:', error);
    }
}

function updateChatHeader() {
    if (!currentChat) return;
    
    const otherUser = currentChat.participants?.find(p => p.uid !== currentUser.uid);
    
    elements.chatHeader.innerHTML = `
        <div class="chat-info">
            <div class="chat-avatar" style="background: ${generateUserColor(otherUser?.displayName || '')}">
                ${otherUser?.displayName?.charAt(0).toUpperCase() || 'م'}
            </div>
            <div class="chat-details">
                <h3>${otherUser?.displayName || 'مستخدم'}</h3>
                <p>${otherUser?.online ? 'متصل الآن' : 'غير متصل'}</p>
            </div>
        </div>
    `;
}

// ===== دوال الرسائل =====

async function loadChatMessages() {
    if (!currentChat || !currentUser) return;
    
    try {
        const messagesRef = ref(database, `messages/${currentChat.id}`);
        onValue(messagesRef, (snapshot) => {
            const messages = [];
            const data = snapshot.val();
            
            if (data) {
                Object.keys(data).forEach(messageId => {
                    messages.push({
                        id: messageId,
                        ...data[messageId]
                    });
                });
                
                // ترتيب الرسائل حسب الوقت
                messages.sort((a, b) => a.timestamp - b.timestamp);
            }
            
            renderMessages(messages);
            scrollToBottom();
        });
    } catch (error) {
        console.error('خطأ في تحميل الرسائل:', error);
    }
}

function renderMessages(messages) {
    elements.messagesContainer.innerHTML = '';
    
    if (messages.length === 0) {
        elements.messagesContainer.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">
                    <i class="fas fa-comments"></i>
                </div>
                <p>ابدأ المحادثة بإرسال رسالة</p>
            </div>
        `;
        return;
    }
    
    messages.forEach(message => {
        const messageElement = document.createElement('div');
        const isSent = message.senderId === currentUser.uid;
        messageElement.className = `message ${isSent ? 'sent' : 'received'}`;
        
        const time = formatTime(message.timestamp);
        
        messageElement.innerHTML = `
            <div class="message-text">${message.text}</div>
            <div class="message-time">${time}</div>
        `;
        
        elements.messagesContainer.appendChild(messageElement);
    });
}

async function sendMessage() {
    if (!currentChat || !currentUser) return;
    
    const messageText = elements.messageInput.value.trim();
    if (!messageText) return;
    
    try {
        const message = {
            text: messageText,
            senderId: currentUser.uid,
            senderName: currentUser.displayName,
            timestamp: Date.now()
        };
        
        // إضافة الرسالة
        const messagesRef = ref(database, `messages/${currentChat.id}`);
        const newMessageRef = push(messagesRef);
        await set(newMessageRef, message);
        
        // تحديث آخر رسالة في المحادثة
        await update(ref(database, `userChats/${currentUser.uid}/${currentChat.id}`), {
            lastMessage: messageText,
            lastMessageTime: Date.now()
        });
        
        // تحديث للمستخدم الآخر
        const otherUser = currentChat.participants.find(p => p.uid !== currentUser.uid);
        if (otherUser) {
            await update(ref(database, `userChats/${otherUser.uid}/${currentChat.id}`), {
                lastMessage: messageText,
                lastMessageTime: Date.now()
            });
        }
        
        // مسح حقل الإدخال
        elements.messageInput.value = '';
        elements.messageInput.focus();
        
    } catch (error) {
        console.error('خطأ في إرسال الرسالة:', error);
        showNotification('error', 'خطأ', 'حدث خطأ في إرسال الرسالة');
    }
}

// ===== دوال البحث =====

function showSearchModal() {
    elements.searchModal.classList.add('active');
    elements.usernameSearch.focus();
}

function hideSearchModal() {
    elements.searchModal.classList.remove('active');
    elements.usernameSearch.value = '';
    elements.searchResults.innerHTML = `
        <div class="empty-results">
            <i class="fas fa-search"></i>
            <p>اكتب للبحث عن مستخدمين</p>
        </div>
    `;
}

async function searchUsers() {
    const searchTerm = elements.usernameSearch.value.trim().toLowerCase();
    if (searchTerm.length < 2) {
        elements.searchResults.innerHTML = `
            <div class="empty-results">
                <i class="fas fa-search"></i>
                <p>اكتب حرفين على الأقل للبحث</p>
            </div>
        `;
        return;
    }
    
    try {
        const usersRef = ref(database, 'users');
        const usersQuery = query(usersRef);
        
        onValue(usersQuery, (snapshot) => {
            const allUsers = [];
            const data = snapshot.val();
            
            if (data) {
                Object.keys(data).forEach(userId => {
                    if (userId !== currentUser.uid) {
                        allUsers.push({
                            id: userId,
                            ...data[userId]
                        });
                    }
                });
            }
            
            // فلترة المستخدمين حسب مصطلح البحث
            const filteredUsers = allUs
