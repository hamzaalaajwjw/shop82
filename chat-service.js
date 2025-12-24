// 📄 chat-service.js - خدمة محسنة لإدارة المحادثات

import { database } from './firebase-config.js';
import { ref, set, get, push, remove, onValue, query, orderByChild, limitToLast, child } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

class ChatService {
    constructor(currentUserId) {
        this.currentUserId = currentUserId;
        this.listeners = [];
        this.subscriptions = new Map();
    }
    
    // ===== إنشاء محادثة جديدة =====
    async createChat(otherUserId, otherUsername) {
        try {
            console.log('🔄 بدء إنشاء محادثة مع:', otherUsername);
            
            // التحقق من وجود محادثة مسبقاً
            const existingChatId = await this.findExistingChat(otherUserId);
            if (existingChatId) {
                console.log('✅ وجدت محادثة موجودة:', existingChatId);
                return { success: true, chatId: existingChatId, isNew: false };
            }
            
            // إنشاء محادثة جديدة
            const newChatRef = push(ref(database, 'chats'));
            const newChatId = newChatRef.key;
            
            const currentUsername = await this.getCurrentUsername();
            
            const chatData = {
                id: newChatId,
                participants: {
                    [this.currentUserId]: {
                        username: currentUsername,
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
                lastSenderId: null,
                participantIds: [this.currentUserId, otherUserId]
            };
            
            await set(newChatRef, chatData);
            console.log('✅ تم إنشاء المحادثة:', newChatId);
            
            // إضافة الأعضاء
            await set(ref(database, 'members/' + newChatId), {
                [this.currentUserId]: true,
                [otherUserId]: true
            });
            
            return { 
                success: true, 
                chatId: newChatId, 
                isNew: true,
                data: chatData 
            };
            
        } catch (error) {
            console.error('❌ خطأ في إنشاء المحادثة:', error);
            return { 
                success: false, 
                error: error.message,
                code: error.code 
            };
        }
    }
    
    // ===== البحث عن محادثة موجودة =====
    async findExistingChat(otherUserId) {
        try {
            const membersRef = ref(database, 'members');
            const snapshot = await get(membersRef);
            
            if (!snapshot.exists()) return null;
            
            const allMembers = snapshot.val();
            
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
            if (!messageText.trim()) {
                return { success: false, error: 'الرسالة فارغة' };
            }
            
            const newMessageRef = push(ref(database, 'messages/' + chatId));
            
            const messageData = {
                text: messageText.trim(),
                senderId: this.currentUserId,
                senderName: await this.getCurrentUsername(),
                timestamp: Date.now(),
                type: 'text',
                status: 'sent',
                chatId: chatId
            };
            
            await set(newMessageRef, messageData);
            
            // تحديث آخر رسالة في المحادثة
            await this.updateChatLastMessage(chatId, messageText.trim(), this.currentUserId);
            
            return { 
                success: true, 
                messageId: newMessageRef.key,
                data: messageData
            };
            
        } catch (error) {
            console.error('❌ خطأ في إرسال الرسالة:', error);
            return { 
                success: false, 
                error: error.message,
                code: error.code 
            };
        }
    }
    
    // ===== تحديث آخر رسالة =====
    async updateChatLastMessage(chatId, messageText, senderId) {
        try {
            const chatRef = ref(database, 'chats/' + chatId);
            
            await Promise.all([
                set(child(chatRef, 'lastMessage'), messageText),
                set(child(chatRef, 'lastUpdate'), Date.now()),
                set(child(chatRef, 'lastSenderId'), senderId)
            ]);
            
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
                    
                    // إضافة معلومات إضافية
                    const otherUserId = this.getOtherParticipant(chatData.participants);
                    const otherUserInfo = await this.getUserInfo(otherUserId);
                    
                    chatsWithData.push({
                        id: chatId,
                        ...chatData,
                        otherUser: otherUserInfo,
                        unreadCount: await this.getUnreadCount(chatId)
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
            
            if (!snapshot.exists()) return [];
            
            const allMembers = snapshot.val();
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
        const userChatsRef = ref(database, 'members');
        
        const unsubscribe = onValue(userChatsRef, async (snapshot) => {
            if (!snapshot.exists()) {
                callback([]);
                return;
            }
            
            const allMembers = snapshot.val();
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
    
    // ===== الاستماع لمحادثة محددة =====
    subscribeToChat(chatId, callback) {
        const chatRef = ref(database, 'chats/' + chatId);
        
        const unsubscribe = onValue(chatRef, (snapshot) => {
            if (snapshot.exists()) {
                callback(snapshot.val());
            } else {
                callback(null);
            }
        });
        
        this.subscriptions.set(chatId, unsubscribe);
        return unsubscribe;
    }
    
    // ===== الاستماع لرسائل محادثة =====
    subscribeToMessages(chatId, callback) {
        const messagesRef = ref(database, 'messages/' + chatId);
        const messagesQuery = query(messagesRef, orderByChild('timestamp'), limitToLast(100));
        
        const unsubscribe = onValue(messagesQuery, (snapshot) => {
            const messages = [];
            
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    messages.push({
                        id: childSnapshot.key,
                        ...childSnapshot.val()
                    });
                });
                
                // ترتيب تصاعدي
                messages.sort((a, b) => a.timestamp - b.timestamp);
            }
            
            callback(messages);
        });
        
        this.subscriptions.set(`messages_${chatId}`, unsubscribe);
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
            
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    messages.push({
                        id: childSnapshot.key,
                        ...childSnapshot.val()
                    });
                });
                
                // ترتيب تصاعدي
                messages.sort((a, b) => a.timestamp - b.timestamp);
            }
            
            return messages;
            
        } catch (error) {
            console.error('خطأ في جلب الرسائل:', error);
            return [];
        }
    }
    
    // ===== الحصول على المستخدم الآخر =====
    getOtherParticipant(participants) {
        for (const userId in participants) {
            if (userId !== this.currentUserId) {
                return userId;
            }
        }
        return null;
    }
    
    // ===== الحصول على عدد الرسائل غير المقروءة =====
    async getUnreadCount(chatId) {
        try {
            // في هذا الإصدار المبسط، نرجع 0
            // يمكن تطويره ليتتبع الرسائل المقروءة
            return 0;
        } catch (error) {
            console.error('خطأ في جلب عدد غير المقروء:', error);
            return 0;
        }
    }
    
    // ===== تحديث حالة القراءة =====
    async markAsRead(chatId) {
        try {
            // يمكن إضافة منطق تحديث حالة القراءة هنا
            console.log('📖 تحديث حالة القراءة للمحادثة:', chatId);
        } catch (error) {
            console.error('خطأ في تحديث حالة القراءة:', error);
        }
    }
    
    // ===== حذف محادثة =====
    async deleteChat(chatId) {
        try {
            await Promise.all([
                remove(ref(database, 'chats/' + chatId)),
                remove(ref(database, 'members/' + chatId)),
                remove(ref(database, 'messages/' + chatId))
            ]);
            
            return { success: true };
        } catch (error) {
            console.error('خطأ في حذف المحادثة:', error);
            return { success: false, error: error.message };
        }
    }
    
    // ===== تنظيف جميع المستمعين =====
    cleanup() {
        // تنظيف مستمعي المحادثات
        this.listeners.forEach(unsubscribe => unsubscribe());
        this.listeners = [];
        
        // تنظيف المشتركين
        this.subscriptions.forEach(unsubscribe => unsubscribe());
        this.subscriptions.clear();
    }
}

export default ChatService;
