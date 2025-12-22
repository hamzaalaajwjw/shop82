// 📄 chat-service.js - خدمة متقدمة لإدارة المحادثات

import { database } from './firebase-config.js';
import { ref, set, get, push, remove, onValue, query, orderByChild, limitToLast } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

class ChatService {
    constructor(currentUserId) {
        this.currentUserId = currentUserId;
        this.listeners = [];
    }
    
    // ===== إنشاء محادثة جديدة =====
    async createChat(otherUserId, otherUsername) {
        try {
            // التحقق من وجود محادثة مسبقاً
            const existingChatId = await this.findExistingChat(otherUserId);
            if (existingChatId) {
                return { success: true, chatId: existingChatId, isNew: false };
            }
            
            // إنشاء محادثة جديدة
            const newChatRef = push(ref(database, 'chats'));
            const newChatId = newChatRef.key;
            
            const chatData = {
                id: newChatId,
                participants: {
                    [this.currentUserId]: {
                        username: await this.getCurrentUsername(),
                        joinedAt: Date.now()
                    },
                    [otherUserId]: {
                        username: otherUsername,
                        joinedAt: Date.now()
                    }
                },
                type: 'private',
                createdAt: Date.now(),
                lastUpdate: Date.now(),
                lastMessage: 'بدون رسائل',
                lastSenderId: null
            };
            
            await set(newChatRef, chatData);
            
            // إضافة الأعضاء
            await set(ref(database, 'members/' + newChatId), {
                [this.currentUserId]: true,
                [otherUserId]: true
            });
            
            return { success: true, chatId: newChatId, isNew: true };
            
        } catch (error) {
            console.error('خطأ في إنشاء المحادثة:', error);
            return { success: false, error: error.message };
        }
    }
    
    // ===== البحث عن محادثة موجودة =====
    async findExistingChat(otherUserId) {
        try {
            const membersRef = ref(database, 'members');
            const snapshot = await get(membersRef);
            const allMembers = snapshot.val() || {};
            
            for (const chatId in allMembers) {
                const members = allMembers[chatId];
                if (members[this.currentUserId] && members[otherUserId]) {
                    return chatId;
                }
            }
            
            return null;
        } catch (error) {
            console.error('خطأ في البحث عن المحادثة:', error);
            return null;
        }
    }
    
    // ===== إرسال رسالة =====
    async sendMessage(chatId, messageText) {
        try {
            const newMessageRef = push(ref(database, 'messages/' + chatId));
            
            const messageData = {
                text: messageText,
                senderId: this.currentUserId,
                senderName: await this.getCurrentUsername(),
                timestamp: Date.now(),
                type: 'text',
                status: 'sent'
            };
            
            await set(newMessageRef, messageData);
            
            // تحديث آخر رسالة في المحادثة
            await this.updateChatLastMessage(chatId, messageText, this.currentUserId);
            
            return { success: true, messageId: newMessageRef.key };
            
        } catch (error) {
            console.error('خطأ في إرسال الرسالة:', error);
            return { success: false, error: error.message };
        }
    }
    
    // ===== تحديث آخر رسالة =====
    async updateChatLastMessage(chatId, messageText, senderId) {
        try {
            const chatRef = ref(database, 'chats/' + chatId);
            
            await set(child(chatRef, 'lastMessage'), messageText);
            await set(child(chatRef, 'lastUpdate'), Date.now());
            await set(child(chatRef, 'lastSenderId'), senderId);
            
        } catch (error) {
            console.error('خطأ في تحديث آخر رسالة:', error);
        }
    }
    
    // ===== جلب المحادثات الأخيرة =====
    async getRecentChats(limit = 20) {
        try {
            const userChats = await this.getUserChats();
            const chatsWithData = [];
            
            for (const chatId of userChats) {
                const chatRef = ref(database, 'chats/' + chatId);
                const snapshot = await get(chatRef);
                
                if (snapshot.exists()) {
                    const chatData = snapshot.val();
                    chatsWithData.push({
                        id: chatId,
                        ...chatData
                    });
                }
            }
            
            // ترتيب حسب آخر تحديث
            return chatsWithData.sort((a, b) => b.lastUpdate - a.lastUpdate).slice(0, limit);
            
        } catch (error) {
            console.error('خطأ في جلب المحادثات:', error);
            return [];
        }
    }
    
    // ===== جلب محادثات المستخدم =====
    async getUserChats() {
        try {
            const membersRef = ref(database, 'members');
            const snapshot = await get(membersRef);
            const allMembers = snapshot.val() || {};
            
            const userChats = [];
            
            for (const chatId in allMembers) {
                if (allMembers[chatId][this.currentUserId]) {
                    userChats.push(chatId);
                }
            }
            
            return userChats;
        } catch (error) {
            console.error('خطأ في جلب محادثات المستخدم:', error);
            return [];
        }
    }
    
    // ===== الاستماع للتحديثات في الوقت الحقيقي =====
    subscribeToChats(callback) {
        const membersRef = ref(database, 'members');
        
        const unsubscribe = onValue(membersRef, async (snapshot) => {
            const allMembers = snapshot.val() || {};
            const userChats = [];
            
            for (const chatId in allMembers) {
                if (allMembers[chatId][this.currentUserId]) {
                    userChats.push(chatId);
                }
            }
            
            callback(userChats);
        });
        
        this.listeners.push(unsubscribe);
        return unsubscribe;
    }
    
    // ===== الحصول على اسم المستخدم الحالي =====
    async getCurrentUsername() {
        try {
            const userRef = ref(database, 'users/' + this.currentUserId);
            const snapshot = await get(userRef);
            
            if (snapshot.exists()) {
                return snapshot.val().username || 'مستخدم';
            }
            
            return 'مستخدم';
        } catch (error) {
            console.error('خطأ في جلب اسم المستخدم:', error);
            return 'مستخدم';
        }
    }
    
    // ===== تنظيف المستمعين =====
    cleanup() {
        this.listeners.forEach(unsubscribe => unsubscribe());
        this.listeners = [];
    }
    
    // ===== جلب معلومات المستخدم =====
    async getUserInfo(userId) {
        try {
            const userRef = ref(database, 'users/' + userId);
            const snapshot = await get(userRef);
            
            if (snapshot.exists()) {
                return snapshot.val();
            }
            
            return null;
        } catch (error) {
            console.error('خطأ في جلب معلومات المستخدم:', error);
            return null;
        }
    }
    
    // ===== جلب رسائل المحادثة =====
    async getChatMessages(chatId, limit = 50) {
        try {
            const messagesRef = ref(database, 'messages/' + chatId);
            const messagesQuery = query(messagesRef, orderByChild('timestamp'), limitToLast(limit));
            
            const snapshot = await get(messagesQuery);
            const messages = [];
            
            snapshot.forEach((childSnapshot) => {
                messages.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            
            // ترتيب تصاعدي (من الأقدم للأحدث)
            return messages.sort((a, b) => a.timestamp - b.timestamp);
            
        } catch (error) {
            console.error('خطأ في جلب الرسائل:', error);
            return [];
        }
    }
}

export default ChatService;