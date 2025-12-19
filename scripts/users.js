import { 
    database, 
    ref, 
    get, 
    update, 
    query, 
    orderByChild, 
    onChildChanged, 
    onChildAdded 
} from './firebase-config.js';
import { currentUser } from './auth.js';
import { openChat } from './chat.js';

// تحديث الملف الشخصي
document.getElementById('saveProfileBtn').addEventListener('click', async () => {
    if (!currentUser) return;
    
    const name = document.getElementById('profileName').value;
    const status = document.getElementById('profileStatus').value;
    
    try {
        await update(ref(database, 'users/' + currentUser.uid), {
            name: name,
            status: status,
            updatedAt: Date.now()
        });
        
        // تحديث العرض في الشريط الجانبي
        document.getElementById('currentUserName').textContent = name;
        
        showNotification('تم حفظ التغييرات بنجاح', 'success');
    } catch (error) {
        showNotification('حدث خطأ أثناء حفظ التغييرات', 'error');
    }
});

// تحميل جهات الاتصال والمحادثات
async function loadChatsAndContacts() {
    if (!currentUser) return;
    
    // تحميل المحادثات
    loadUserChats();
    
    // تحميل جميع المستخدمين (جهات الاتصال)
    loadAllUsers();
}

async function loadUserChats() {
    try {
        const chatsRef = ref(database, 'chats');
        const snapshot = await get(chatsRef);
        const chatsList = document.querySelector('.chats-list');
        
        if (!snapshot.exists()) {
            chatsList.innerHTML = '<p class="no-chats">لا توجد محادثات بعد</p>';
            return;
        }
        
        const chats = snapshot.val();
        chatsList.innerHTML = '';
        
        // تصفية المحادثات الخاصة بالمستخدم الحالي
        const userChats = Object.entries(chats).filter(([chatId, chat]) => 
            chat.participants.includes(currentUser.uid)
        );
        
        if (userChats.length === 0) {
            chatsList.innerHTML = '<p class="no-chats">لا توجد محادثات بعد</p>';
            return;
        }
        
        // ترتيب المحادثات حسب آخر رسالة
        userChats.sort((a, b) => {
            const timeA = a[1].lastMessageTime || 0;
            const timeB = b[1].lastMessageTime || 0;
            return timeB - timeA;
        });
        
        // عرض المحادثات
        for (const [chatId, chat] of userChats) {
            const otherUserId = chat.participants.find(id => id !== currentUser.uid);
            const userSnapshot = await get(ref(database, `users/${otherUserId}`));
            
            if (userSnapshot.exists()) {
                const userData = userSnapshot.val();
                displayChatItem(chatId, userData, chat);
            }
        }
        
        // الاستماع للتحديثات على المحادثات
        onChildChanged(chatsRef, (snapshot) => {
            const updatedChat = snapshot.val();
            if (updatedChat.participants.includes(currentUser.uid)) {
                updateChatDisplay(snapshot.key, updatedChat);
            }
        });
        
    } catch (error) {
        console.error('Error loading chats:', error);
    }
}

async function displayChatItem(chatId, userData, chat) {
    const chatsList = document.querySelector('.chats-list');
    const time = chat.lastMessageTime ? 
        formatTime(chat.lastMessageTime) : '';
    
    const chatItem = document.createElement('div');
    chatItem.className = 'chat-item';
    chatItem.dataset.chatId = chatId;
    chatItem.dataset.userId = userData.uid;
    
    chatItem.innerHTML = `
        <img src="${userData.photoURL}" alt="${userData.name}">
        <div class="chat-info">
            <h4>${userData.name}</h4>
            <p>${chat.lastMessage || 'ابدأ المحادثة الآن'}</p>
        </div>
        <div class="chat-time">${time}</div>
    `;
    
    chatItem.addEventListener('click', () => {
        openChat(userData.uid);
    });
    
    chatsList.appendChild(chatItem);
}

async function updateChatDisplay(chatId, chat) {
    const otherUserId = chat.participants.find(id => id !== currentUser.uid);
    const userSnapshot = await get(ref(database, `users/${otherUserId}`));
    
    if (userSnapshot.exists()) {
        const userData = userSnapshot.val();
        const chatItem = document.querySelector(`.chat-item[data-chat-id="${chatId}"]`);
        
        if (chatItem) {
            const time = chat.lastMessageTime ? 
                formatTime(chat.lastMessageTime) : '';
            
            chatItem.querySelector('.chat-info p').textContent = chat.lastMessage || 'ابدأ المحادثة الآن';
            chatItem.querySelector('.chat-time').textContent = time;
            
            // نقل المحادثة إلى الأعلى
            const chatsList = document.querySelector('.chats-list');
            chatsList.insertBefore(chatItem, chatsList.firstChild);
        }
    }
}

async function loadAllUsers() {
    try {
        const usersRef = ref(database, 'users');
        const snapshot = await get(usersRef);
        const contactsList = document.querySelector('.contacts-list');
        
        if (!snapshot.exists()) {
            contactsList.innerHTML = '<p>لا يوجد مستخدمين</p>';
            return;
        }
        
        const users = snapshot.val();
        contactsList.innerHTML = '';
        
        // تصفية المستخدم الحالي
        Object.values(users).forEach(user => {
            if (user.uid !== currentUser.uid) {
                const contactItem = document.createElement('div');
                contactItem.className = 'contact-item';
                contactItem.innerHTML = `
                    <img src="${user.photoURL}" alt="${user.name}">
                    <div style="flex: 1;">
                        <h4>${user.name}</h4>
                        <p>${user.status || 'لا توجد حالة'}</p>
                    </div>
                    <button class="btn-secondary start-chat-btn" data-userid="${user.uid}">
                        <i class="fas fa-comment"></i> محادثة
                    </button>
                `;
                contactsList.appendChild(contactItem);
                
                // إضافة حدث للمحادثة
                contactItem.querySelector('.start-chat-btn').addEventListener('click', () => {
                    openChat(user.uid);
                });
            }
        });
        
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function formatTime(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
        return date.toLocaleTimeString('ar-EG', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    } else if (days === 1) {
        return 'أمس';
    } else if (days < 7) {
        return date.toLocaleDateString('ar-EG', { weekday: 'long' });
    } else {
        return date.toLocaleDateString('ar-EG');
    }
}

// تحديث حالة الاتصال
function updateUserStatus(status) {
    if (!currentUser) return;
    
    update(ref(database, 'users/' + currentUser.uid), {
        status: status,
        lastSeen: Date.now()
    });
}

// عند فتح التطبيق
window.addEventListener('online', () => {
    updateUserStatus('متصل الآن');
    document.getElementById('currentUserStatus').textContent = 'متصل';
    document.getElementById('currentUserStatus').className = 'status online';
});

window.addEventListener('offline', () => {
    updateUserStatus('غير متصل');
    document.getElementById('currentUserStatus').textContent = 'غير متصل';
    document.getElementById('currentUserStatus').className = 'status';
});

// عند الخروج من التطبيق
window.addEventListener('beforeunload', () => {
    if (currentUser) {
        updateUserStatus('غير متصل');
    }
});

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

export { loadChatsAndContacts };