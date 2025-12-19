import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    updatePassword,
    sendPasswordResetEmail,
    EmailAuthProvider,
    reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

import {
    getDatabase,
    ref,
    set,
    get,
    update,
    remove,
    push,
    onValue,
    onChildAdded,
    onChildChanged,
    onChildRemoved,
    query,
    orderByChild,
    orderByKey,
    orderByValue,
    limitToLast,
    equalTo,
    startAt,
    endAt,
    serverTimestamp,
    increment
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

import {
    getStorage,
    ref as storageRef,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject,
    listAll
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js";

import {
    getMessaging,
    getToken,
    onMessage,
    isSupported
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging.js";

import { CONFIG } from '../core/config.js';

// Initialize Firebase
const app = initializeApp(CONFIG.FIREBASE);

// Initialize Services
const auth = getAuth(app);
const database = getDatabase(app);
const storage = getStorage(app);
let messaging = null;

// Check if messaging is supported
if (await isSupported()) {
    messaging = getMessaging(app);
}

// Authentication Service
class AuthService {
    static async signUp(email, password, userData) {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Create user profile in database
            const userProfile = {
                uid: user.uid,
                email: email,
                displayName: userData.displayName || email.split('@')[0],
                photoURL: userData.photoURL || this.generateAvatar(userData.displayName || email),
                status: "مرحباً! أنا جديد في شات برو",
                isOnline: true,
                lastSeen: Date.now(),
                createdAt: Date.now(),
                updatedAt: Date.now(),
                settings: {
                    theme: 'light',
                    language: 'ar',
                    notifications: true,
                    sound: true,
                    privacy: {
                        profileVisibility: 'public',
                        lastSeen: 'everyone',
                        readReceipts: true
                    }
                },
                stats: {
                    friendsCount: 0,
                    messagesCount: 0,
                    groupsCount: 0
                }
            };
            
            await set(ref(database, `users/${user.uid}`), userProfile);
            await updateProfile(user, {
                displayName: userProfile.displayName,
                photoURL: userProfile.photoURL
            });
            
            return { success: true, user: userProfile };
        } catch (error) {
            return { success: false, error: this.handleAuthError(error) };
        }
    }
    
    static async signIn(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            await update(ref(database, `users/${userCredential.user.uid}`), {
                isOnline: true,
                lastSeen: Date.now()
            });
            return { success: true };
        } catch (error) {
            return { success: false, error: this.handleAuthError(error) };
        }
    }
    
    static async signOut() {
        try {
            if (auth.currentUser) {
                await update(ref(database, `users/${auth.currentUser.uid}`), {
                    isOnline: false,
                    lastSeen: Date.now()
                });
            }
            await signOut(auth);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    static async updateProfile(updates) {
        try {
            const user = auth.currentUser;
            
            if (updates.displayName || updates.photoURL) {
                await updateProfile(user, {
                    displayName: updates.displayName,
                    photoURL: updates.photoURL
                });
            }
            
            await update(ref(database, `users/${user.uid}`), {
                ...updates,
                updatedAt: Date.now()
            });
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    static generateAvatar(name) {
        const colors = ['FF6B6B', '4ECDC4', '45B7D1', '96CEB4', 'FFEAA7', 'DDA0DD', '98D8C8'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${color}&color=fff&size=256&bold=true`;
    }
    
    static handleAuthError(error) {
        const errors = {
            'auth/email-already-in-use': 'البريد الإلكتروني مستخدم بالفعل',
            'auth/invalid-email': 'البريد الإلكتروني غير صالح',
            'auth/weak-password': 'كلمة المرور ضعيفة. يجب أن تكون 8 أحرف على الأقل',
            'auth/user-not-found': 'المستخدم غير موجود',
            'auth/wrong-password': 'كلمة المرور غير صحيحة',
            'auth/too-many-requests': 'محاولات كثيرة جداً. حاول مرة أخرى لاحقاً',
            'auth/network-request-failed': 'خطأ في الشبكة. تحقق من اتصالك بالإنترنت',
            'auth/user-disabled': 'هذا الحساب معطل'
        };
        
        return errors[error.code] || error.message;
    }
}

// Database Service
class DatabaseService {
    static async getUser(uid) {
        try {
            const snapshot = await get(ref(database, `users/${uid}`));
            return snapshot.exists() ? snapshot.val() : null;
        } catch (error) {
            console.error('Error getting user:', error);
            return null;
        }
    }
    
    static async searchUsers(searchTerm) {
        try {
            const usersRef = ref(database, 'users');
            const snapshot = await get(usersRef);
            
            if (!snapshot.exists()) return [];
            
            const users = [];
            snapshot.forEach((child) => {
                const user = child.val();
                if (user.uid !== auth.currentUser?.uid) {
                    if (user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        user.email?.toLowerCase().includes(searchTerm.toLowerCase())) {
                        users.push(user);
                    }
                }
            });
            
            return users;
        } catch (error) {
            console.error('Error searching users:', error);
            return [];
        }
    }
    
    static async createChat(user1, user2) {
        try {
            const participants = [user1, user2].sort();
            const chatId = participants.join('_');
            
            const chatData = {
                id: chatId,
                participants: participants,
                type: 'private',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastMessage: null,
                unreadCount: { [user1]: 0, [user2]: 0 }
            };
            
            await set(ref(database, `chats/${chatId}`), chatData);
            return chatId;
        } catch (error) {
            console.error('Error creating chat:', error);
            throw error;
        }
    }
    
    static async sendMessage(chatId, message) {
        try {
            const user = auth.currentUser;
            const messageId = push(ref(database, `chats/${chatId}/messages`)).key;
            
            const messageData = {
                id: messageId,
                chatId: chatId,
                senderId: user.uid,
                content: message.content,
                type: message.type || 'text',
                timestamp: Date.now(),
                status: 'sent',
                metadata: message.metadata || {}
            };
            
            if (message.type === 'image' || message.type === 'file') {
                messageData.fileInfo = message.fileInfo;
            }
            
            await set(ref(database, `chats/${chatId}/messages/${messageId}`), messageData);
            
            // Update chat last message
            await update(ref(database, `chats/${chatId}`), {
                lastMessage: messageData,
                updatedAt: Date.now()
            });
            
            return messageId;
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }
    
    static async createGroup(groupData) {
        try {
            const groupId = push(ref(database, 'groups')).key;
            const user = auth.currentUser;
            
            const group = {
                id: groupId,
                name: groupData.name,
                description: groupData.description,
                photoURL: groupData.photoURL || this.generateGroupAvatar(groupData.name),
                creatorId: user.uid,
                admins: [user.uid],
                members: [user.uid, ...groupData.members],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                settings: {
                    privacy: groupData.privacy || 'public',
                    joinPermission: groupData.joinPermission || 'admin',
                    sendMessages: groupData.sendMessages || 'all'
                }
            };
            
            await set(ref(database, `groups/${groupId}`), group);
            
            // Add group to each member's groups
            const updates = {};
            group.members.forEach(memberId => {
                updates[`userGroups/${memberId}/${groupId}`] = true;
            });
            
            await update(ref(database), updates);
            
            return groupId;
        } catch (error) {
            console.error('Error creating group:', error);
            throw error;
        }
    }
    
    static generateGroupAvatar(name) {
        const colors = ['FF6B6B', '4ECDC4', '45B7D1', '96CEB4'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${color}&color=fff&size=256&bold=true`;
    }
    
    static async listenToChat(chatId, callback) {
        const messagesRef = ref(database, `chats/${chatId}/messages`);
        const messagesQuery = query(messagesRef, orderByChild('timestamp'), limitToLast(CONFIG.CHAT.MESSAGE_LIMIT));
        
        return onChildAdded(messagesQuery, (snapshot) => {
            callback(snapshot.val());
        });
    }
    
    static async listenToUserStatus(uid, callback) {
        const userRef = ref(database, `users/${uid}`);
        return onValue(userRef, (snapshot) => {
            if (snapshot.exists()) {
                callback(snapshot.val());
            }
        });
    }
}

// Storage Service
class StorageService {
    static async uploadFile(file, path) {
        try {
            const storageReference = storageRef(storage, path);
            const uploadTask = uploadBytesResumable(storageReference, file);
            
            return new Promise((resolve, reject) => {
                uploadTask.on('state_changed',
                    (snapshot) => {
                        // Progress handling
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        console.log('Upload progress:', progress);
                    },
                    (error) => {
                        reject(error);
                    },
                    async () => {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve(downloadURL);
                    }
                );
            });
        } catch (error) {
            console.error('Error uploading file:', error);
            throw error;
        }
    }
    
    static async uploadProfileImage(file, userId) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            throw new Error('نوع الملف غير مدعوم. يُسمح فقط بصور JPEG، PNG، GIF');
        }
        
        if (file.size > CONFIG.STORAGE.MAX_FILE_SIZE) {
            throw new Error('حجم الملف كبير جداً. الحد الأقصى 10MB');
        }
        
        const timestamp = Date.now();
        const filename = `profile_${userId}_${timestamp}.${file.type.split('/')[1]}`;
        const path = `profile-images/${userId}/${filename}`;
        
        return await this.uploadFile(file, path);
    }
    
    static async uploadMessageFile(file, chatId, senderId) {
        const timestamp = Date.now();
        const fileExtension = file.name.split('.').pop();
        const filename = `msg_${senderId}_${timestamp}.${fileExtension}`;
        const path = `chat-files/${chatId}/${filename}`;
        
        const downloadURL = await this.uploadFile(file, path);
        
        return {
            url: downloadURL,
            name: file.name,
            size: file.size,
            type: file.type,
            extension: fileExtension
        };
    }
}

// Messaging Service (Push Notifications)
class MessagingService {
    static async requestPermission() {
        if (!messaging) return null;
        
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                const token = await getToken(messaging, {
                    vapidKey: 'YOUR_VAPID_KEY_HERE'
                });
                
                if (token) {
                    // Save token to database
                    const user = auth.currentUser;
                    if (user) {
                        await set(ref(database, `notificationTokens/${user.uid}`), token);
                    }
                    return token;
                }
            }
            return null;
        } catch (error) {
            console.error('Error getting notification token:', error);
            return null;
        }
    }
    
    static onMessage(callback) {
        if (!messaging) return;
        
        onMessage(messaging, (payload) => {
            callback(payload);
        });
    }
}

// Export all services
export {
    auth,
    database,
    storage,
    messaging,
    AuthService,
    DatabaseService,
    StorageService,
    MessagingService,
    serverTimestamp
};