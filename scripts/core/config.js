// Configuration Management
export const CONFIG = {
    APP: {
        NAME: "شات برو",
        VERSION: "2.0.0",
        BUILD: "2024.01.01",
        DEBUG: true
    },
    
    FIREBASE: {
        API_KEY: "AIzaSyAl3XunFOwHpGw-4_VYyETMtoLgk4mnRpQ",
        AUTH_DOMAIN: "a3len-3ad54.firebaseapp.com",
        DATABASE_URL: "https://a3len-3ad54-default-rtdb.firebaseio.com",
        PROJECT_ID: "a3len-3ad54",
        STORAGE_BUCKET: "a3len-3ad54.firebasestorage.app",
        MESSAGING_SENDER_ID: "767338034080",
        APP_ID: "1:767338034080:web:801d77fb74c0aa56e92ac5"
    },
    
    STORAGE: {
        MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
        ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'audio/mpeg'],
        MAX_IMAGE_SIZE: 2048,
        COMPRESSION_QUALITY: 0.8
    },
    
    CHAT: {
        MESSAGE_LIMIT: 50,
        TYPING_TIMEOUT: 2000,
        READ_RECEIPT_DELAY: 1000,
        DELETE_AFTER: 30 // days
    },
    
    UI: {
        THEMES: ['light', 'dark', 'blue', 'green', 'purple'],
        ANIMATION_DURATION: 300,
        TOAST_DURATION: 5000,
        MODAL_ANIMATION: 'slide'
    },
    
    SECURITY: {
        PASSWORD_MIN_LENGTH: 8,
        SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
        MAX_LOGIN_ATTEMPTS: 5,
        BLOCK_DURATION: 15 * 60 * 1000 // 15 minutes
    }
};

// Cache Configuration
export const CACHE_CONFIG = {
    VERSION: 'v1',
    CACHE_NAME: 'chat-pro-cache',
    OFFLINE_PAGE: '/offline.html',
    ASSETS: [
        '/',
        '/index.html',
        '/src/styles/main.css',
        '/src/scripts/app.js',
        '/public/images/icons/icon-192x192.png',
        '/public/images/icons/icon-512x512.png'
    ]
};

// API Endpoints
export const API = {
    USERS: '/api/users',
    MESSAGES: '/api/messages',
    GROUPS: '/api/groups',
    UPLOAD: '/api/upload',
    NOTIFICATIONS: '/api/notifications'
};

// Localization
export const STRINGS = {
    AR: {
        WELCOME: "مرحباً بك في شات برو",
        LOGIN: "تسجيل الدخول",
        SIGNUP: "إنشاء حساب",
        SEARCH: "بحث...",
        ONLINE: "متصل",
        OFFLINE: "غير متصل",
        TYPING: "يكتب الآن...",
        SEEN: "تمت المشاهدة",
        SENDING: "جاري الإرسال...",
        SENT: "تم الإرسال",
        DELIVERED: "تم التوصيل",
        ERROR: "حدث خطأ",
        SUCCESS: "تمت العملية بنجاح"
    },
    EN: {
        WELCOME: "Welcome to Chat Pro",
        LOGIN: "Login",
        SIGNUP: "Sign Up",
        SEARCH: "Search...",
        ONLINE: "Online",
        OFFLINE: "Offline",
        TYPING: "Typing...",
        SEEN: "Seen",
        SENDING: "Sending...",
        SENT: "Sent",
        DELIVERED: "Delivered",
        ERROR: "Error",
        SUCCESS: "Success"
    }
};

// Utility function to get current language
export function getCurrentLanguage() {
    return localStorage.getItem('language') || 'ar';
}

// Theme management
export function getCurrentTheme() {
    return localStorage.getItem('theme') || 'light';
}

export function setTheme(theme) {
    localStorage.setItem('theme', theme);
    document.body.className = theme + '-mode';
}