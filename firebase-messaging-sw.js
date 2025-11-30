// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBtZDK-PFicfTaGNm3NkAUwev191cY-RJM",
    authDomain: "chatting-f6db0.firebaseapp.com",
    projectId: "chatting-f6db0",
    storageBucket: "chatting-f6db0.firebasestorage.app",
    messagingSenderId: "991102743547",
    appId: "1:991102743547:web:505a474b980ebe0d14115e",
    measurementId: "G-SGC7990D0R"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
const messaging = firebase.messaging();

// Get the correct base path for GitHub Pages
const getBasePath = () => {
    return self.location.pathname.split('/').slice(0, -1).join('/') || './';
};

const basePath = getBasePath();

// Cache important resources with correct paths
const CACHE_NAME = 'chat-app-v1';
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                return response || fetch(event.request);
            }
        )
    );
});

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('Received background message: ', payload);
    
    const notificationTitle = payload.notification?.title || 'New Message';
    const notificationOptions = {
        body: payload.notification?.body || 'You have a new message',
        icon: 'https://ui-avatars.com/api/?name=Chat&background=3498db&color=fff&size=192',
        badge: './icon-192x192.png',
        tag: payload.data?.roomId || 'chat-notification',
        data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    const roomId = event.notification.data?.roomId;
    
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            // Try to focus existing window
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.postMessage({
                        type: 'NAVIGATE_TO_ROOM',
                        roomId: roomId
                    });
                    return client.focus();
                }
            }
            // Open new window if none exists
            if (clients.openWindow) {
                return clients.openWindow('./');
            }
        })
    );
});
