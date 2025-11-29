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

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('Received background message: ', payload);
    
    const notificationTitle = payload.notification?.title || 'New Message';
    const notificationOptions = {
        body: payload.notification?.body || 'You have a new message',
        icon: 'https://ui-avatars.com/api/?name=Chat&background=3498db&color=fff&size=192',
        badge: 'https://ui-avatars.com/api/?name=C&background=e74c3c&color=fff&size=72',
        tag: payload.data?.roomId || 'chat-notification',
        data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    const roomId = event.notification.data?.roomId;
    if (roomId) {
        event.waitUntil(
            clients.matchAll({ type: 'window' }).then((clientList) => {
                for (const client of clientList) {
                    if (client.url.includes('/') && 'focus' in client) {
                        client.postMessage({
                            type: 'NAVIGATE_TO_ROOM',
                            roomId: roomId
                        });
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
        );
    }
});