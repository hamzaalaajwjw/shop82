import { 
    database, 
    ref, 
    push, 
    set, 
    get, 
    onChildAdded, 
    query, 
    orderByChild, 
    serverTimestamp 
} from './firebase-config.js';
import { currentUser } from './auth.js';

let currentChatId = null;
let currentChatUser = null;

// عناصر DOM
const messageInput = document.getElementById('messageInput');
const sendMessageBtn = document.getElementById('sendMessageBtn');
const messagesContainer = document.getElementById('messagesContainer');
const chatScreen = document.getElementById('chatScreen');
const welcomeScreen = document.getElementById('welcomeScreen');
const backToChatsBtn = document.getElementById('backToChats');
const newChatBtn = document.getElementById('newChatBtn');
const searchModal = document.getElementById('searchModal');
const closeModalBtn = document.querySelector('.close-modal');
const globalSearchInput = document.getElementById('globalSearch');

// إرسال رسالة
sendMessageBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || !currentChatId || !currentUser) return;
    
    const chatRef = ref(database, `chats/${currentChatId}/messages`);
    const newMessageRef = push(chatRef);
    
    await set(newMessageRef, {
        senderId: currentUser.uid,
        text: message,
        timestamp: serverTimestamp(),
        read: false
    });
    
    // تحديث آخر رسالة في المحادثة
    const chatInfoRef = ref(database, `chats/${currentChatId}`);
    await set(chatInfoRef, {
        lastMessage: message,
        lastMessageTime: serverTimestamp(),
        participants: [currentUser.uid, currentChatUser.uid],
        updatedAt: serverTimestamp()
    });
    
    messageInput.value = '';
    messageInput.focus();
}

// فتح محادثة
async function openChat(userId) {
    try {
        // الحصول على بيانات المستخدم
        const userSnapshot = await get(ref(database, `users/${userId}`));
        if (!userSnapshot.exists()) {
            showNotification('المستخدم غير موجود', 'error');
            return;
        }
        
        currentChatUser = userSnapshot.val();
        
        // تحديث واجهة المحادثة
        document.getElementById('chatUserName').textContent = currentChatUser.name;
        document.getElementById('chatUserPhoto').src = currentChatUser.photoURL;
        document.getElementById('chatUserStatus').textContent = currentChatUser.status || 'غير متصل';
        
        // البحث عن المحادثة الموجودة أو إنشاء جديدة
        const chatId = await findOrCreateChat(currentUser.uid, userId);
        currentChatId = chatId;
        
        // إظهار شاشة المحادثة
        welcomeScreen.classList.add('hidden');
        chatScreen.classList.remove('hidden');
        
        // تحميل الرسائل
        loadMessages(chatId);
        
        // إغلاق نافذة البحث إذا كانت مفتوحة
        searchModal.classList.add('hidden');
        
    } catch (error) {
        console.error('Error opening chat:', error);
        showNotification('حدث خطأ أثناء فتح المحادثة', 'error');
    }
}

// البحث عن محادثة موجودة أو إنشاء جديدة
async function findOrCreateChat(userId1, userId2) {
    // إنشاء معرف فريد للمحادثة (مرتب أبجدياً)
    const participants = [userId1, userId2].sort();
    const chatId = participants.join('_');
    
    // التحقق من وجود المحادثة
    const chatRef = ref(database, `chats/${chatId}`);
    const snapshot = await get(chatRef);
    
    if (!snapshot.exists()) {
        // إنشاء محادثة جديدة
        await set(chatRef, {
            participants: participants,
            createdAt: serverTimestamp(),
            lastMessage: '',
            lastMessageTime: null
        });
    }
    
    return chatId;
}

// تحميل الرسائل
function loadMessages(chatId) {
    messagesContainer.innerHTML = '';
    
    const messagesRef = ref(database, `chats/${chatId}/messages`);
    const messagesQuery = query(messagesRef, orderByChild('timestamp'));
    
    onChildAdded(messagesQuery, (snapshot) => {
        const message = snapshot.val();
        displayMessage(message);
    });
}

// عرض الرسالة
function displayMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    
    const isSent = message.senderId === currentUser.uid;
    messageElement.classList.add(isSent ? 'sent' : 'received');
    
    const time = message.timestamp ? 
        new Date(message.timestamp).toLocaleTimeString('ar-EG', { 
            hour: '2-digit', 
            minute: '2-digit' 
        }) : 'الآن';
    
    messageElement.innerHTML = `
        <div class="message-text">${message.text}</div>
        <div class="message-time">${time}</div>
    `;
    
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// زر المحادثة الجديدة
newChatBtn.addEventListener('click', () => {
    searchModal.classList.remove('hidden');
    globalSearchInput.focus();
});

// العودة إلى قائمة المحادثات
backToChatsBtn.addEventListener('click', () => {
    chatScreen.classList.add('hidden');
    welcomeScreen.classList.remove('hidden');
    currentChatId = null;
    currentChatUser = null;
});

// إغلاق نافذة البحث
closeModalBtn.addEventListener('click', () => {
    searchModal.classList.add('hidden');
});

// البحث عن المستخدمين
globalSearchInput.addEventListener('input', debounce(searchUsers, 300));

async function searchUsers() {
    const searchTerm = globalSearchInput.value.trim().toLowerCase();
    if (!searchTerm) {
        document.querySelector('.search-results').innerHTML = '';
        return;
    }
    
    try {
        const usersRef = ref(database, 'users');
        const snapshot = await get(usersRef);
        const resultsContainer = document.querySelector('.search-results');
        resultsContainer.innerHTML = '';
        
        if (snapshot.exists()) {
            const users = snapshot.val();
            const filteredUsers = Object.values(users).filter(user => 
                user.uid !== currentUser.uid &&
                (user.name.toLowerCase().includes(searchTerm) || 
                 user.email.toLowerCase().includes(searchTerm))
            );
            
            filteredUsers.forEach(user => {
                const userElement = document.createElement('div');
                userElement.className = 'contact-item';
                userElement.innerHTML = `
                    <img src="${user.photoURL}" alt="${user.name}">
                    <div style="flex: 1;">
                        <h4>${user.name}</h4>
                        <p>${user.email}</p>
                    </div>
                    <button class="btn-secondary start-chat-btn" data-userid="${user.uid}">
                        <i class="fas fa-comment"></i> محادثة
                    </button>
                `;
                resultsContainer.appendChild(userElement);
                
                // إضافة حدث للمحادثة
                userElement.querySelector('.start-chat-btn').addEventListener('click', () => {
                    openChat(user.uid);
                });
            });
        }
    } catch (error) {
        console.error('Error searching users:', error);
    }
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

// عرض الإشعارات (نفس الوظيفة في auth.js)
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

export { openChat };