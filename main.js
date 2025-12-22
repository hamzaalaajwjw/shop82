import { auth, database } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { ref, onValue, get, set, push, child, query, orderByChild, equalTo, onChildAdded, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// متغيرات عامة
let currentUser = null;
let currentChatId = null;
let chatUsers = {};

// ===== التحقق من تسجيل الدخول =====
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        // إذا لم يكن مسجلاً، توجيهه لصفحة التسجيل
        window.location.href = 'auth.html';
        return;
    }
    
    // الحصول على بيانات المستخدم
    currentUser = await getUserData(user.uid);
    
    if (currentUser) {
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        loadUserChats();
        setupEventListeners();
    }
});

// ===== الحصول على بيانات المستخدم =====
async function getUserData(uid) {
    try {
        const userRef = ref(database, 'users/' + uid);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
            return snapshot.val();
        } else {
            // إذا لم توجد بيانات المستخدم، تسجيل خروجه
            await signOut(auth);
            window.location.href = 'auth.html';
            return null;
        }
    } catch (error) {
        console.error('خطأ في جلب بيانات المستخدم:', error);
        return null;
    }
}

// ===== تحميل محادثات المستخدم =====
async function loadUserChats() {
    const chatsList = document.getElementById('chatsList');
    
    // مسح القائمة الحالية
    chatsList.innerHTML = '<div class="loading">جاري تحميل المحادثات...</div>';
    
    try {
        // البحث عن المحادثات التي يشارك فيها المستخدم
        const membersRef = ref(database, 'members');
        onValue(membersRef, (snapshot) => {
            const allMembers = snapshot.val() || {};
            const userChats = [];
            
            // البحث عن المحادثات التي تحتوي على المستخدم الحالي
            Object.keys(allMembers).forEach(chatId => {
                if (allMembers[chatId][currentUser.uid]) {
                    userChats.push(chatId);
                }
            });
            
            if (userChats.length === 0) {
                chatsList.innerHTML = '<div class="empty-state">لا توجد محادثات بعد. ابدأ محادثة جديدة!</div>';
                return;
            }
            
            // جلب معلومات كل محادثة
            loadChatsInfo(userChats);
        });
    } catch (error) {
        console.error('خطأ في تحميل المحادثات:', error);
        chatsList.innerHTML = '<div class="error">حدث خطأ في تحميل المحادثات</div>';
    }
}

// ===== تحميل معلومات المحادثات =====
async function loadChatsInfo(chatIds) {
    const chatsList = document.getElementById('chatsList');
    chatsList.innerHTML = '';
    
    for (const chatId of chatIds) {
        try {
            const chatRef = ref(database, 'chats/' + chatId);
            const snapshot = await get(chatRef);
            
            if (snapshot.exists()) {
                const chatData = snapshot.val();
                const chatItem = createChatItem(chatId, chatData);
                chatsList.appendChild(chatItem);
            }
        } catch (error) {
            console.error('خطأ في تحميل معلومات المحادثة:', error);
        }
    }
}

// ===== إنشاء عنصر محادثة =====
function createChatItem(chatId, chatData) {
    const div = document.createElement('div');
    div.className = 'chat-item';
    div.dataset.chatId = chatId;
    
    // البحث عن اسم المستخدم الآخر
    const otherUserId = Object.keys(chatData.participants || {}).find(uid => uid !== currentUser.uid);
    const otherUsername = chatData.participants?.[otherUserId]?.username || 'مستخدم';
    
    div.innerHTML = `
        <div class="chat-info">
            <h4>${otherUsername}</h4>
            <p>${chatData.lastMessage || 'بدون رسائل'}</p>
        </div>
    `;
    
    div.addEventListener('click', () => {
        openChat(chatId, otherUserId, otherUsername);
    });
    
    return div;
}

// ===== فتح محادثة =====
async function openChat(chatId, otherUserId, otherUsername) {
    currentChatId = chatId;
    
    // تحديث واجهة المحادثة
    document.getElementById('chatInfo').innerHTML = `
        <h3>${otherUsername}</h3>
        <p>مستخدم نشط</p>
    `;
    
    // تمكين إرسال الرسائل
    document.getElementById('messageInput').disabled = false;
    document.getElementById('sendBtn').disabled = false;
    
    // تحميل الرسائل السابقة
    loadMessages(chatId);
    
    // الاستماع للرسائل الجديدة
    listenForNewMessages(chatId);
    
    // تحديث النشاط في قائمة المحادثات
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.chatId === chatId) {
            item.classList.add('active');
        }
    });
}

// ===== تحميل الرسائل =====
function loadMessages(chatId) {
    const messagesContainer = document.getElementById('messagesContainer');
    messagesContainer.innerHTML = '<div class="loading">جاري تحميل الرسائل...</div>';
    
    const messagesRef = ref(database, 'messages/' + chatId);
    
    onValue(messagesRef, (snapshot) => {
        const messages = snapshot.val() || {};
        messagesContainer.innerHTML = '';
        
        // تحويل الرسائل لمصفوفة وترتيبها زمنياً
        const messagesArray = Object.keys(messages).map(key => ({
            id: key,
            ...messages[key]
        })).sort((a, b) => a.timestamp - b.timestamp);
        
        // عرض الرسائل
        messagesArray.forEach(message => {
            const messageDiv = createMessageElement(message);
            messagesContainer.appendChild(messageDiv);
        });
        
        // التمرير للأسفل
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}

// ===== الاستماع للرسائل الجديدة =====
function listenForNewMessages(chatId) {
    const messagesRef = ref(database, 'messages/' + chatId);
    
    onChildAdded(messagesRef, (snapshot) => {
        const message = snapshot.val();
        message.id = snapshot.key;
        
        // إذا كانت الرسالة جديدة (وليس عند التحميل الأول)
        if (!document.querySelector(`[data-message-id="${message.id}"]`)) {
            const messageDiv = createMessageElement(message);
            document.getElementById('messagesContainer').appendChild(messageDiv);
            
            // التمرير للأسفل
            const container = document.getElementById('messagesContainer');
            container.scrollTop = container.scrollHeight;
            
            // تحديث آخر رسالة في قائمة المحادثات
            updateLastMessage(chatId, message.text);
        }
    });
}

// ===== إنشاء عنصر رسالة =====
function createMessageElement(message) {
    const div = document.createElement('div');
    div.className = `message ${message.senderId === currentUser.uid ? 'sent' : 'received'}`;
    div.dataset.messageId = message.id;
    
    const time = new Date(message.timestamp).toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    div.innerHTML = `
        <div class="message-text">${message.text}</div>
        <div class="message-time">${time}</div>
    `;
    
    return div;
}

// ===== إرسال رسالة =====
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const messageText = input.value.trim();
    
    if (!messageText || !currentChatId || !currentUser) {
        return;
    }
    
    try {
        const newMessageRef = push(ref(database, 'messages/' + currentChatId));
        
        const messageData = {
            text: messageText,
            senderId: currentUser.uid,
            senderName: currentUser.username,
            timestamp: Date.now()
        };
        
        await set(newMessageRef, messageData);
        
        // تحديث آخر رسالة في المحادثة
        await updateLastMessage(currentChatId, messageText);
        
        // مسح حقل الإدخال
        input.value = '';
        
    } catch (error) {
        console.error('خطأ في إرسال الرسالة:', error);
        alert('حدث خطأ أثناء إرسال الرسالة');
    }
}

// ===== تحديث آخر رسالة =====
async function updateLastMessage(chatId, lastMessage) {
    try {
        const chatRef = ref(database, 'chats/' + chatId);
        await set(child(chatRef, 'lastMessage'), lastMessage);
        await set(child(chatRef, 'lastUpdate'), Date.now());
    } catch (error) {
        console.error('خطأ في تحديث آخر رسالة:', error);
    }
}

// ===== البحث عن مستخدم =====
async function searchUser(username) {
    const searchResults = document.getElementById('searchResults');
    searchResults.innerHTML = '<div class="loading">جاري البحث...</div>';
    
    if (!username || username.length < 2) {
        searchResults.innerHTML = '<div class="empty-state">اكتب 3 أحرف على الأقل للبحث</div>';
        return;
    }
    
    try {
        const usersRef = ref(database, 'users');
        const snapshot = await get(usersRef);
        
        const results = [];
        snapshot.forEach((childSnapshot) => {
            const user = childSnapshot.val();
            if (user.username.toLowerCase().includes(username.toLowerCase()) && user.uid !== currentUser.uid) {
                results.push(user);
            }
        });
        
        searchResults.innerHTML = '';
        
        if (results.length === 0) {
            searchResults.innerHTML = '<div class="empty-state">لا توجد نتائج للبحث</div>';
            return;
        }
        
        results.forEach(user => {
            const userDiv = document.createElement('div');
            userDiv.className = 'user-result';
            userDiv.innerHTML = `
                <strong>${user.username}</strong>
                <button class="start-chat-btn" data-user-id="${user.uid}" data-username="${user.username}">
                    بدء محادثة
                </button>
            `;
            searchResults.appendChild(userDiv);
        });
        
        // إضافة مستمعي الأحداث للأزرار الجديدة
        document.querySelectorAll('.start-chat-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const userId = e.target.dataset.userId;
                const username = e.target.dataset.username;
                await createOrOpenChat(userId, username);
            });
        });
        
    } catch (error) {
        console.error('خطأ في البحث:', error);
        searchResults.innerHTML = '<div class="error">حدث خطأ أثناء البحث</div>';
    }
}

// ===== إنشاء أو فتح محادثة =====
async function createOrOpenChat(otherUserId, otherUsername) {
    try {
        // البحث عن محادثة موجودة
        const membersRef = ref(database, 'members');
        const snapshot = await get(membersRef);
        const allMembers = snapshot.val() || {};
        
        let existingChatId = null;
        
        Object.keys(allMembers).forEach(chatId => {
            const members = allMembers[chatId];
            if (members[currentUser.uid] && members[otherUserId]) {
                existingChatId = chatId;
            }
        });
        
        if (existingChatId) {
            // فتح المحادثة الموجودة
            openChat(existingChatId, otherUserId, otherUsername);
            closeSearchModal();
            return;
        }
        
        // إنشاء محادثة جديدة
        const newChatRef = push(ref(database, 'chats'));
        const newChatId = newChatRef.key;
        
        // بيانات المحادثة
        const chatData = {
            id: newChatId,
            participants: {
                [currentUser.uid]: {
                    username: currentUser.username,
                    joinedAt: Date.now()
                },
                [otherUserId]: {
                    username: otherUsername,
                    joinedAt: Date.now()
                }
            },
            createdAt: Date.now(),
            lastUpdate: Date.now(),
            lastMessage: 'بدون رسائل'
        };
        
        await set(newChatRef, chatData);
        
        // إضافة الأعضاء
        await set(ref(database, 'members/' + newChatId), {
            [currentUser.uid]: true,
            [otherUserId]: true
        });
        
        // فتح المحادثة الجديدة
        openChat(newChatId, otherUserId, otherUsername);
        closeSearchModal();
        
        // إعادة تحميل قائمة المحادثات
        loadUserChats();
        
    } catch (error) {
        console.error('خطأ في إنشاء المحادثة:', error);
        alert('حدث خطأ في إنشاء المحادثة');
    }
}

// ===== إعداد مستمعي الأحداث =====
function setupEventListeners() {
    // إرسال رسالة
    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('messageInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // تسجيل الخروج
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
            await signOut(auth);
            localStorage.removeItem('currentUser');
            window.location.href = 'auth.html';
        } catch (error) {
            console.error('خطأ في تسجيل الخروج:', error);
        }
    });
    
    // البحث عن مستخدم
    document.getElementById('searchUser').addEventListener('input', (e) => {
        searchUser(e.target.value);
    });
    
    // فتح نافذة البحث
    document.getElementById('newChatBtn').addEventListener('click', () => {
        document.getElementById('searchModal').style.display = 'flex';
        document.getElementById('usernameSearch').focus();
    });
    
    // البحث في النافذة المنبثقة
    document.getElementById('usernameSearch').addEventListener('input', (e) => {
        searchUser(e.target.value);
    });
    
    // إغلاق نافذة البحث
    document.getElementById('closeSearchBtn').addEventListener('click', closeSearchModal);
    
    // إغلاق النافذة بالضغط خارجها
    document.getElementById('searchModal').addEventListener('click', (e) => {
        if (e.target.id === 'searchModal') {
            closeSearchModal();
        }
    });
}

// ===== إغلاق نافذة البحث =====
function closeSearchModal() {
    document.getElementById('searchModal').style.display = 'none';
    document.getElementById('usernameSearch').value = '';
    document.getElementById('searchResults').innerHTML = '';
}

// ===== تهيئة الصفحة =====
// التحقق مما إذا كان هناك مستخدم في localStorage (للتحميل السريع)
const savedUser = localStorage.getItem('currentUser');
if (savedUser) {
    currentUser = JSON.parse(savedUser);
}