import { auth, database } from './firebase-config.js';
import { onAuthStateChanged, updatePassword, reauthenticateWithCredential, EmailAuthProvider, deleteUser } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { ref, get, set, remove, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

let currentUser = null;

// ===== تحميل بيانات الملف الشخصي =====
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'auth.html';
        return;
    }
    
    currentUser = user;
    await loadProfileData(user.uid);
    await loadUserStats(user.uid);
    setupProfileEventListeners();
});

// ===== تحميل البيانات الأساسية =====
async function loadProfileData(uid) {
    try {
        const userRef = ref(database, 'users/' + uid);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
            const userData = snapshot.val();
            
            // عرض البيانات
            document.getElementById('profileUsername').textContent = userData.username || 'غير محدد';
            document.getElementById('profileEmail').textContent = userData.email || 'غير محدد';
            
            // تحويل تاريخ الانضمام
            if (userData.createdAt) {
                const joinDate = new Date(userData.createdAt).toLocaleDateString('ar-EG', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                document.getElementById('profileJoinDate').textContent = joinDate;
            }
        }
    } catch (error) {
        console.error('خطأ في تحميل بيانات الملف الشخصي:', error);
    }
}

// ===== تحميل الإحصائيات =====
async function loadUserStats(uid) {
    try {
        // حساب عدد المحادثات
        const membersRef = ref(database, 'members');
        const snapshot = await get(membersRef);
        const allMembers = snapshot.val() || {};
        
        let chatCount = 0;
        Object.keys(allMembers).forEach(chatId => {
            if (allMembers[chatId][uid]) {
                chatCount++;
            }
        });
        
        document.getElementById('profileChatsCount').textContent = chatCount;
        document.getElementById('activeChats').textContent = chatCount;
        
        // حساب عدد الرسائل (هذه عملية معقدة، يمكن تبسيطها)
        // سنكتفي بعد المحادثات النشطة حالياً
        
    } catch (error) {
        console.error('خطأ في تحميل الإحصائيات:', error);
    }
}

// ===== إعداد مستمعي الأحداث =====
function setupProfileEventListeners() {
    // تعديل الملف الشخصي
    document.getElementById('editProfileBtn').addEventListener('click', () => {
        document.getElementById('editModal').style.display = 'flex';
        loadCurrentProfileData();
    });
    
    // إلغاء التعديل
    document.getElementById('cancelEditBtn').addEventListener('click', () => {
        document.getElementById('editModal').style.display = 'none';
    });
    
    // حفظ التعديلات
    document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateProfile();
    });
    
    // تغيير كلمة المرور
    document.getElementById('changePasswordBtn').addEventListener('click', async () => {
        const newPassword = prompt('أدخل كلمة المرور الجديدة (6 أحرف على الأقل):');
        
        if (!newPassword || newPassword.length < 6) {
            alert('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
            return;
        }
        
        try {
            await updatePassword(currentUser, newPassword);
            alert('تم تغيير كلمة المرور بنجاح');
        } catch (error) {
            console.error('خطأ في تغيير كلمة المرور:', error);
            alert('حدث خطأ في تغيير كلمة المرور');
        }
    });
    
    // حذف الحساب
    document.getElementById('deleteAccountBtn').addEventListener('click', async () => {
        const confirmDelete = confirm('⚠️ هل أنت متأكد من حذف الحساب؟\n\nهذا الإجراء لا يمكن التراجع عنه وسيتم حذف جميع بياناتك بشكل نهائي.');
        
        if (!confirmDelete) return;
        
        const password = prompt('أدخل كلمة المرور للتأكيد:');
        
        if (!password) {
            alert('يجب إدخال كلمة المرور');
            return;
        }
        
        try {
            // إعادة المصادقة
            const credential = EmailAuthProvider.credential(currentUser.email, password);
            await reauthenticateWithCredential(currentUser, credential);
            
            // حذف بيانات المستخدم من قاعدة البيانات
            await deleteUserData(currentUser.uid);
            
            // حذف الحساب من Firebase Authentication
            await deleteUser(currentUser);
            
            alert('تم حذف الحساب بنجاح');
            window.location.href = 'auth.html';
            
        } catch (error) {
            console.error('خطأ في حذف الحساب:', error);
            
            if (error.code === 'auth/wrong-password') {
                alert('كلمة المرور غير صحيحة');
            } else {
                alert('حدث خطأ في حذف الحساب');
            }
        }
    });
}

// ===== تحميل البيانات الحالية للتعديل =====
async function loadCurrentProfileData() {
    try {
        const userRef = ref(database, 'users/' + currentUser.uid);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
            const userData = snapshot.val();
            document.getElementById('editUsername').value = userData.username || '';
            document.getElementById('editBio').value = userData.bio || '';
        }
    } catch (error) {
        console.error('خطأ في تحميل البيانات:', error);
    }
}

// ===== تحديث الملف الشخصي =====
async function updateProfile() {
    const newUsername = document.getElementById('editUsername').value.trim();
    
    if (!newUsername || newUsername.length < 3) {
        alert('اسم المستخدم يجب أن يكون 3 أحرف على الأقل');
        return;
    }
    
    try {
        // التحقق من عدم وجود اسم المستخدم مسبقاً (إذا كان مختلفاً)
        const currentUserData = await get(ref(database, 'users/' + currentUser.uid));
        const currentUsername = currentUserData.val()?.username;
        
        if (newUsername !== currentUsername) {
            const usernameRef = ref(database, 'usernames/' + newUsername);
            const usernameSnapshot = await get(usernameRef);
            
            if (usernameSnapshot.exists()) {
                alert('اسم المستخدم محجوز مسبقاً');
                return;
            }
            
            // تحديث جدول أسماء المستخدمين
            await set(ref(database, 'usernames/' + newUsername), currentUser.uid);
            
            // حذف الاسم القديم
            if (currentUsername) {
                await remove(ref(database, 'usernames/' + currentUsername));
            }
        }
        
        // تحديث بيانات المستخدم
        const updates = {
            username: newUsername,
            bio: document.getElementById('editBio').value.trim() || null
        };
        
        await set(ref(database, 'users/' + currentUser.uid + '/username'), newUsername);
        
        if (updates.bio) {
            await set(ref(database, 'users/' + currentUser.uid + '/bio'), updates.bio);
        }
        
        // تحديث الاسم في جميع المحادثات
        await updateUsernameInAllChats(newUsername);
        
        // تحديث العرض مباشرة
        document.getElementById('profileUsername').textContent = newUsername;
        
        // تحديث localStorage
        const currentUserDataStr = localStorage.getItem('currentUser');
        if (currentUserDataStr) {
            const currentUserData = JSON.parse(currentUserDataStr);
            currentUserData.username = newUsername;
            localStorage.setItem('currentUser', JSON.stringify(currentUserData));
        }
        
        alert('تم تحديث الملف الشخصي بنجاح');
        document.getElementById('editModal').style.display = 'none';
        
    } catch (error) {
        console.error('خطأ في تحديث الملف الشخصي:', error);
        alert('حدث خطأ في تحديث الملف الشخصي');
    }
}

// ===== تحديث اسم المستخدم في جميع المحادثات =====
async function updateUsernameInAllChats(newUsername) {
    try {
        // البحث عن جميع المحادثات التي يشارك فيها المستخدم
        const membersRef = ref(database, 'members');
        const snapshot = await get(membersRef);
        const allMembers = snapshot.val() || {};
        
        const updatePromises = [];
        
        Object.keys(allMembers).forEach(chatId => {
            if (allMembers[chatId][currentUser.uid]) {
                const chatParticipantRef = ref(database, `chats/${chatId}/participants/${currentUser.uid}/username`);
                updatePromises.push(set(chatParticipantRef, newUsername));
            }
        });
        
        await Promise.all(updatePromises);
        
    } catch (error) {
        console.error('خطأ في تحديث الاسم في المحادثات:', error);
    }
}

// ===== حذف بيانات المستخدم =====
async function deleteUserData(uid) {
    try {
        // حذف بيانات المستخدم
        await remove(ref(database, 'users/' + uid));
        
        // حذف اسم المستخدم
        const userRef = ref(database, 'users/' + uid);
        const userSnapshot = await get(userRef);
        const username = userSnapshot.val()?.username;
        
        if (username) {
            await remove(ref(database, 'usernames/' + username));
        }
        
        // حذف المستخدم من جميع المحادثات
        const membersRef = ref(database, 'members');
        const snapshot = await get(membersRef);
        const allMembers = snapshot.val() || {};
        
        const deletePromises = [];
        
        Object.keys(allMembers).forEach(chatId => {
            if (allMembers[chatId][uid]) {
                // حذف المستخدم من الأعضاء
                deletePromises.push(remove(ref(database, `members/${chatId}/${uid}`)));
                
                // حذف المستخدم من المشاركين
                deletePromises.push(remove(ref(database, `chats/${chatId}/participants/${uid}`)));
            }
        });
        
        await Promise.all(deletePromises);
        
        // حذف الرسائل الشخصية
        await deleteUserMessages(uid);
        
    } catch (error) {
        console.error('خطأ في حذف بيانات المستخدم:', error);
        throw error;
    }
}

// ===== حذف رسائل المستخدم =====
async function deleteUserMessages(uid) {
    try {
        // هذه عملية معقدة وقد تحتاج لتحسين
        // في الإصدار الأولي، يمكننا ترك الرسائل كمجهولة المصدر
        
        // يمكن حذف جميع رسائل المستخدم باستخدام Cloud Functions
        // أو تغيير اسم المرسل إلى "مستخدم محذوف"
        
        const messagesRef = ref(database, 'messages');
        const snapshot = await get(messagesRef);
        const allMessages = snapshot.val() || {};
        
        const updatePromises = [];
        
        Object.keys(allMessages).forEach(chatId => {
            Object.keys(allMessages[chatId]).forEach(messageId => {
                if (allMessages[chatId][messageId].senderId === uid) {
                    const messageRef = ref(database, `messages/${chatId}/${messageId}/senderName`);
                    updatePromises.push(set(messageRef, 'مستخدم محذوف'));
                }
            });
        });
        
        await Promise.all(updatePromises);
        
    } catch (error) {
        console.error('خطأ في حذف رسائل المستخدم:', error);
    }
}