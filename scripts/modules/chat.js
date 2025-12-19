import { DatabaseService, StorageService, auth } from '../firebase/firebase-init.js';
import { CONFIG } from '../core/config.js';
import { showToast } from '../ui/toast.js';
import { showModal } from '../ui/modal.js';

class ChatManager {
    constructor() {
        this.currentChat = null;
        this.messages = [];
        this.listeners = [];
        this.typingTimeout = null;
        this.unsubscribeFunctions = [];
    }
    
    async startChat(userId) {
        try {
            const currentUser = auth.currentUser;
            const participants = [currentUser.uid, userId].sort();
            const chatId = participants.join('_');
            
            // Check if chat exists
            const chatRef = ref(database, `chats/${chatId}`);
            const chatSnapshot = await get(chatRef);
            
            if (!chatSnapshot.exists()) {
                // Create new chat
                await DatabaseService.createChat(currentUser.uid, userId);
            }
            
            this.currentChat = {
                id: chatId,
                participants: participants,
                type: 'private'
            };
            
            this.loadMessages(chatId);
            this.listenToTyping(chatId);
            this.listenToUserStatus(userId);
            
            return chatId;
        } catch (error) {
            console.error('Error starting chat:', error);
            showToast('حدث خطأ في بدء المحادثة', 'error');
            throw error;
        }
    }
    
    async loadMessages(chatId) {
        try {
            const messagesRef = ref(database, `chats/${chatId}/messages`);
            const messagesQuery = query(messagesRef, orderByChild('timestamp'), limitToLast(50));
            
            const unsubscribe = onChildAdded(messagesQuery, (snapshot) => {
                const message = snapshot.val();
                this.addMessage(message);
                this.markAsRead(message);
            });
            
            this.unsubscribeFunctions.push(unsubscribe);
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }
    
    async sendMessage(content, type = 'text', metadata = {}) {
        if (!this.currentChat) return;
        
        try {
            const messageData = {
                content: content,
                type: type,
                metadata: metadata
            };
            
            if (type === 'image' || type === 'file') {
                messageData.fileInfo = metadata.fileInfo;
            }
            
            const messageId = await DatabaseService.sendMessage(this.currentChat.id, messageData);
            
            // Play sound if enabled
            if (localStorage.getItem('soundEnabled') !== 'false') {
                this.playMessageSound();
            }
            
            return messageId;
        } catch (error) {
            console.error('Error sending message:', error);
            showToast('حدث خطأ في إرسال الرسالة', 'error');
            throw error;
        }
    }
    
    async sendImage(file) {
        try {
            const fileInfo = await StorageService.uploadMessageFile(
                file, 
                this.currentChat.id, 
                auth.currentUser.uid
            );
            
            return await this.sendMessage('', 'image', {
                fileInfo: fileInfo,
                caption: ''
            });
        } catch (error) {
            showToast(error.message, 'error');
            throw error;
        }
    }
    
    async sendFile(file) {
        try {
            const fileInfo = await StorageService.uploadMessageFile(
                file, 
                this.currentChat.id, 
                auth.currentUser.uid
            );
            
            return await this.sendMessage(file.name, 'file', {
                fileInfo: fileInfo,
                size: file.size
            });
        } catch (error) {
            showToast(error.message, 'error');
            throw error;
        }
    }
    
    async sendVoiceMessage(blob, duration) {
        try {
            // Convert blob to file
            const file = new File([blob], `voice_${Date.now()}.webm`, {
                type: 'audio/webm'
            });
            
            const fileInfo = await StorageService.uploadMessageFile(
                file, 
                this.currentChat.id, 
                auth.currentUser.uid
            );
            
            return await this.sendMessage('رسالة صوتية', 'voice', {
                fileInfo: fileInfo,
                duration: duration
            });
        } catch (error) {
            showToast('حدث خطأ في إرسال الرسالة الصوتية', 'error');
            throw error;
        }
    }
    
    async startTyping() {
        if (!this.currentChat) return;
        
        const typingRef = ref(database, `typing/${this.currentChat.id}/${auth.currentUser.uid}`);
        await set(typingRef, true);
        
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }
        
        this.typingTimeout = setTimeout(() => {
            this.stopTyping();
        }, CONFIG.CHAT.TYPING_TIMEOUT);
    }
    
    async stopTyping() {
        if (!this.currentChat) return;
        
        const typingRef = ref(database, `typing/${this.currentChat.id}/${auth.currentUser.uid}`);
        await set(typingRef, false);
    }
    
    listenToTyping(chatId) {
        const typingRef = ref(database, `typing/${chatId}`);
        
        const unsubscribe = onValue(typingRef, (snapshot) => {
            if (snapshot.exists()) {
                const typingData = snapshot.val();
                const otherUserId = Object.keys(typingData).find(id => id !== auth.currentUser.uid);
                
                if (otherUserId && typingData[otherUserId]) {
                    this.onTypingStart(otherUserId);
                } else {
                    this.onTypingStop();
                }
            }
        });
        
        this.unsubscribeFunctions.push(unsubscribe);
    }
    
    listenToUserStatus(userId) {
        const unsubscribe = DatabaseService.listenToUserStatus(userId, (userData) => {
            this.onUserStatusChange(userData);
        });
        
        this.unsubscribeFunctions.push(unsubscribe);
    }
    
    async markAsRead(message) {
        if (message.senderId === auth.currentUser.uid) return;
        
        try {
            const messageRef = ref(database, `chats/${this.currentChat.id}/messages/${message.id}`);
            await update(messageRef, {
                status: 'read',
                readAt: Date.now()
            });
        } catch (error) {
            console.error('Error marking message as read:', error);
        }
    }
    
    async deleteMessage(messageId) {
        if (!this.currentChat) return;
        
        try {
            const messageRef = ref(database, `chats/${this.currentChat.id}/messages/${messageId}`);
            await update(messageRef, {
                deleted: true,
                content: 'تم حذف هذه الرسالة',
                deletedAt: Date.now()
            });
        } catch (error) {
            console.error('Error deleting message:', error);
            showToast('حدث خطأ في حذف الرسالة', 'error');
        }
    }
    
    async clearChat() {
        if (!this.currentChat) return;
        
        const confirmed = await showModal({
            title: 'تأكيد الحذف',
            message: 'هل أنت متأكد من حذف جميع الرسائل؟ لا يمكن التراجع عن هذا الإجراء.',
            buttons: [
                { text: 'إلغاء', type: 'secondary' },
                { text: 'حذف', type: 'danger' }
            ]
        });
        
        if (confirmed) {
            try {
                const messagesRef = ref(database, `chats/${this.currentChat.id}/messages`);
                await set(messagesRef, null);
                showToast('تم حذف جميع الرسائل', 'success');
            } catch (error) {
                console.error('Error clearing chat:', error);
                showToast('حدث خطأ في حذف الرسائل', 'error');
            }
        }
    }
    
    async getChatInfo(chatId) {
        try {
            const chatRef = ref(database, `chats/${chatId}`);
            const chatSnapshot = await get(chatRef);
            
            if (chatSnapshot.exists()) {
                const chatData = chatSnapshot.val();
                
                // Get user info for participants
                const participantsInfo = await Promise.all(
                    chatData.participants.map(async (userId) => {
                        return await DatabaseService.getUser(userId);
                    })
                );
                
                return {
                    ...chatData,
                    participantsInfo: participantsInfo.filter(p => p !== null)
                };
            }
            
            return null;
        } catch (error) {
            console.error('Error getting chat info:', error);
            return null;
        }
    }
    
    playMessageSound() {
        const sound = document.getElementById('messageSound');
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(console.error);
        }
    }
    
    // Event handlers (to be implemented by UI)
    addMessage(message) {}
    onTypingStart(userId) {}
    onTypingStop() {}
    onUserStatusChange(userData) {}
    
    cleanup() {
        this.unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
        this.unsubscribeFunctions = [];
        
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }
        
        if (this.currentChat) {
            this.stopTyping();
        }
        
        this.currentChat = null;
        this.messages = [];
    }
}

export default ChatManager;