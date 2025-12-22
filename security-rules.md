# 🔐 قواعد أمان Firebase - تطبيق الدردشة

## 📋 قواعد قاعدة البيانات (Realtime Database)

```json
{
  "rules": {
    "usernames": {
      "$username": {
        ".read": "auth != null",
        ".write": "auth != null && (!data.exists() || data.val() === auth.uid)",
        ".validate": "newData.isString() && newData.val().length > 2"
      }
    },
    
    "users": {
      "$uid": {
        ".read": "auth != null && (auth.uid === $uid || root.child('users').child(auth.uid).child('role').val() === 'admin')",
        ".write": "auth != null && auth.uid === $uid",
        ".validate": "newData.hasChildren(['username', 'email', 'createdAt'])"
      }
    },
    
    "chats": {
      "$chatId": {
        ".read": "auth != null && root.child('members').child($chatId).child(auth.uid).val() === true",
        ".write": "auth != null && root.child('members').child($chatId).child(auth.uid).val() === true",
        
        "participants": {
          ".validate": "newData.hasChild(auth.uid)"
        },
        
        "lastMessage": {
          ".validate": "newData.isString()"
        }
      }
    },
    
    "members": {
      "$chatId": {
        "$uid": {
          ".read": "auth != null",
          ".write": "auth != null && (auth.uid === $uid || !data.exists())",
          ".validate": "newData.val() === true || newData.val() === null"
        }
      }
    },
    
    "messages": {
      "$chatId": {
        "$messageId": {
          ".read": "auth != null && root.child('members').child($chatId).child(auth.uid).val() === true",
          ".write": "auth != null && 
                     root.child('members').child($chatId).child(auth.uid).val() === true &&
                     newData.child('senderId').val() === auth.uid &&
                     newData.hasChildren(['text', 'senderId', 'timestamp'])",
          
          "text": {
            ".validate": "newData.isString() && newData.val().length > 0 && newData.val().length < 1000"
          },
          
          "senderId": {
            ".validate": "newData.val() === auth.uid"
          },
          
          "timestamp": {
            ".validate": "newData.isNumber() && newData.val() <= now"
          },
          
          "$other": {
            ".validate": false
          }
        }
      }
    }
  }
}