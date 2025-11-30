// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    onSnapshot, 
    serverTimestamp,
    orderBy,
    query,
    where,
    deleteDoc,
    doc,
    updateDoc,
    arrayUnion,
    arrayRemove,
    getDocs,
    writeBatch
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    getMessaging, 
    getToken, 
    onMessage,
    isSupported 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";

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
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// Initialize Firebase Messaging
let messaging = null;
let currentFCMToken = null;

// DOM elements
const authModal = document.getElementById('authModal');
const appContainer = document.getElementById('appContainer');
const loadingScreen = document.getElementById('loadingScreen');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const tabBtns = document.querySelectorAll('.tab-btn');
const authTabs = document.querySelectorAll('.auth-tab');
const notificationBtn = document.getElementById('notificationBtn');
const notificationModal = document.getElementById('notificationModal');
const testNotificationBtn = document.getElementById('testNotificationBtn');
const pushNotificationContainer = document.getElementById('pushNotificationContainer');

// User elements
const sidebarUserName = document.getElementById('sidebarUserName');
const userProfilePic = document.getElementById('userProfilePic');
const logoutBtn = document.getElementById('logoutBtn');

// Chat elements
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const currentRoomName = document.getElementById('currentRoomName');
const roomCodeDisplay = document.getElementById('roomCodeDisplay');
const deleteRoomBtn = document.getElementById('deleteRoomBtn');
const createRoomBtn = document.getElementById('createRoomBtn');
const roomCodeInput = document.getElementById('roomCodeInput');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const publicRooms = document.getElementById('publicRooms');
const privateRooms = document.getElementById('privateRooms');
const typingIndicator = document.getElementById('typingIndicator');
const reactionBtn = document.getElementById('reactionBtn');
const reactionPicker = document.getElementById('reactionPicker');
const roomModal = document.getElementById('roomModal');
const newRoomName = document.getElementById('newRoomName');
const confirmCreateRoom = document.getElementById('confirmCreateRoom');
const cancelCreateRoom = document.getElementById('cancelCreateRoom');

// New elements for authentication and features
const loginId = document.getElementById('loginId');
const loginPassword = document.getElementById('loginPassword');
const regName = document.getElementById('regName');
const regUserId = document.getElementById('regUserId');
const regEmail = document.getElementById('regEmail');
const regPassword = document.getElementById('regPassword');
const regConfirmPassword = document.getElementById('regConfirmPassword');
const userIdValidation = document.getElementById('userIdValidation');
const passwordValidation = document.getElementById('passwordValidation');
const searchUsers = document.getElementById('searchUsers');
const searchResults = document.getElementById('searchResults');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const sidebar = document.getElementById('sidebar');
const draftIndicator = document.getElementById('draftIndicator');

// Dropdown menu elements
const menuBtn = document.getElementById('menuBtn');
const dropdownContent = document.getElementById('dropdownContent');
const closeDropdown = document.getElementById('closeDropdown');
const membersList = document.getElementById('membersList');

// Global variables
let currentUser = null;
let currentRoomId = '';
let currentRoomType = '';
let currentRoomCreator = '';
let currentRoomData = null;
let typingTimeout;
let messageListener = null;
let typingListener = null;
let onlineStatusListener = null;
let roomMembersListener = null;
let notificationListener = null;
let draftSaveTimeout = null;
let sidebarOverlay = null;

// Public rooms configuration
const PUBLIC_ROOMS = [
    { id: 'general', name: 'General Chat', type: 'public' },
    { id: 'random', name: 'Random Talk', type: 'public' },
    { id: 'help', name: 'Help & Support', type: 'public' }
];

// Initialize the application
async function initApp() {
    await initializeMessaging();
    checkAuthState();
    setupEventListeners();
    setupNotificationHandler();
    setupMobileKeyboardBehavior();
    setupMobileMenu();
}

// Setup mobile menu with overlay
function setupMobileMenu() {
    // Get overlay element
    sidebarOverlay = document.getElementById('sidebarOverlay');
    
    // Overlay click handler
    sidebarOverlay.addEventListener('click', () => {
        closeSidebar();
    });
    
    // Close sidebar when clicking on main content (except the mobile menu button)
    document.querySelector('.main-content').addEventListener('click', (e) => {
        if (!e.target.closest('#mobileMenuBtn') && window.innerWidth <= 768) {
            closeSidebar();
        }
    });
}

// Toggle sidebar with overlay
function toggleSidebar() {
    sidebar.classList.toggle('open');
    sidebarOverlay.classList.toggle('active');
    
    // Prevent body scroll when sidebar is open
    if (sidebar.classList.contains('open')) {
        document.body.classList.add('modal-open');
    } else {
        document.body.classList.remove('modal-open');
    }
}

// Close sidebar function
function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
    document.body.classList.remove('modal-open');
}

// Setup mobile keyboard behavior
function setupMobileKeyboardBehavior() {
    // Handle viewport changes on mobile
    if ('visualViewport' in window) {
        const visualViewport = window.visualViewport;
        
        visualViewport.addEventListener('resize', function() {
            // When keyboard opens, scroll to keep input visible
            if (visualViewport.height < window.innerHeight) {
                setTimeout(() => {
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }, 100);
            }
        });
    }

    // Handle focus on message input
    messageInput.addEventListener('focus', function() {
        // Small delay to ensure keyboard is fully open
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 300);
    });
}

// Initialize Firebase Messaging
async function initializeMessaging() {
    try {
        // Register service worker
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                console.log('Service Worker registered:', registration);
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }

        const isSupportedBrowser = await isSupported();
        if (isSupportedBrowser) {
            messaging = getMessaging(app);
            console.log('Firebase Messaging is supported');
            
            // Request notification permission
            await requestNotificationPermission();
        } else {
            console.log('Firebase Messaging is not supported in this browser');
        }
    } catch (error) {
        console.error('Error initializing messaging:', error);
    }
}

// Request notification permission
async function requestNotificationPermission() {
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('Notification permission granted.');
            await setupFCMToken();
            updateNotificationUI('granted');
        } else if (permission === 'denied') {
            console.log('Notification permission denied.');
            updateNotificationUI('denied');
        } else {
            console.log('Notification permission default.');
            updateNotificationUI('default');
        }
    } catch (error) {
        console.error('Error requesting notification permission:', error);
    }
}

// Setup FCM token
async function setupFCMToken() {
    try {
        if (!messaging) return;
        
        // Get the FCM token
        currentFCMToken = await getToken(messaging, {
            vapidKey: 'BLkCj9b5Y7p1nHxQ2sT8wVzR0mFcA6dE3gL4hN7jK1pX9yM5qW8rT2vB6nZ4cF7a' // Replace with your VAPID key
        });
        
        if (currentFCMToken) {
            console.log('FCM Token:', currentFCMToken);
            await saveFCMToken(currentFCMToken);
        } else {
            console.log('No registration token available.');
        }
        
        // Handle foreground messages
        setupForegroundMessages();
        
    } catch (error) {
        console.error('Error getting FCM token:', error);
    }
}

// Save FCM token to user's document
async function saveFCMToken(token) {
    if (!currentUser) return;
    
    try {
        const usersQuery = query(
            collection(db, 'users'),
            where('userId', '==', currentUser.userId)
        );
        
        const querySnapshot = await getDocs(usersQuery);
        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            await updateDoc(doc(db, 'users', userDoc.id), {
                fcmTokens: arrayUnion(token),
                updatedAt: serverTimestamp()
            });
        }
    } catch (error) {
        console.error('Error saving FCM token:', error);
    }
}

// Setup foreground message handler
function setupForegroundMessages() {
    if (!messaging) return;
    
    onMessage(messaging, (payload) => {
        console.log('Received foreground message: ', payload);
        
        // Only show notification if the app is in background or user is not in the same room
        if (document.hidden || payload.data?.roomId !== currentRoomId) {
            showLocalNotification(payload);
        }
    });
}

// Show local notification
function showLocalNotification(payload) {
    const title = payload.notification?.title || 'New Message';
    const body = payload.notification?.body || 'You have a new message';
    
    if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(title, {
            body: body,
            icon: 'https://ui-avatars.com/api/?name=Chat&background=3498db&color=fff&size=192',
            badge: 'https://ui-avatars.com/api/?name=C&background=e74c3c&color=fff&size=72',
            tag: payload.data?.roomId || 'chat-notification',
            data: payload.data
        });
        
        notification.onclick = () => {
            window.focus();
            notification.close();
            
            // Navigate to the room if needed
            if (payload.data?.roomId && payload.data.roomId !== currentRoomId) {
                joinRoomById(payload.data.roomId);
            }
        };
    }
}

// Update notification UI
function updateNotificationUI(status) {
    if (status === 'granted') {
        notificationBtn.classList.add('has-notifications');
        notificationBtn.title = 'Notifications enabled';
    } else {
        notificationBtn.classList.remove('has-notifications');
        notificationBtn.title = 'Enable notifications';
    }
}

// Setup notification handler for incoming messages
function setupNotificationHandler() {
    // Listen for messages and show notifications
    if (currentUser) {
        setupMessageNotifications();
    }
}

// Setup message notifications
function setupMessageNotifications() {
    notificationListener = onSnapshot(collection(db, 'messages'), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const message = change.doc.data();
                
                // Don't notify for own messages or if in the same room
                if (message.username === currentUser.userId || message.roomId === currentRoomId) {
                    return;
                }
                
                // Show notification for new messages in other rooms
                if (document.hidden || message.roomId !== currentRoomId) {
                    showMessageNotification(message);
                }
            }
        });
    });
}

// Show message notification
function showMessageNotification(message) {
    const roomName = getRoomNameForNotification(message.roomId);
    const title = `New message in ${roomName}`;
    const body = `${message.userDisplayName || message.username}: ${message.text}`;
    
    // Show in-app notification
    showInAppNotification(title, body, message.roomId);
    
    // Show browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
        const notification = new Notification(title, {
            body: body.length > 100 ? body.substring(0, 100) + '...' : body,
            icon: 'https://ui-avatars.com/api/?name=Chat&background=3498db&color=fff&size=192',
            badge: 'https://ui-avatars.com/api/?name=C&background=e74c3c&color=fff&size=72',
            tag: message.roomId,
            data: { roomId: message.roomId }
        });
        
        notification.onclick = () => {
            window.focus();
            notification.close();
            
            // Navigate to the room
            if (message.roomId !== currentRoomId) {
                joinRoomById(message.roomId);
            }
        };
    }
}

// Show in-app notification
function showInAppNotification(title, body, roomId) {
    const notification = document.createElement('div');
    notification.className = 'push-notification';
    notification.innerHTML = `
        <h4>${title}</h4>
        <p>${body}</p>
        <button class="close" onclick="this.parentElement.remove()">&times;</button>
    `;
    
    notification.addEventListener('click', () => {
        if (roomId && roomId !== currentRoomId) {
            joinRoomById(roomId);
        }
        notification.remove();
    });
    
    pushNotificationContainer.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Get room name for notification
function getRoomNameForNotification(roomId) {
    if (roomId === 'general') return 'General Chat';
    if (roomId === 'random') return 'Random Talk';
    if (roomId === 'help') return 'Help & Support';
    return 'Private Chat';
}

// Join room by ID
async function joinRoomById(roomId) {
    try {
        const roomsQuery = query(
            collection(db, 'rooms'),
            where('code', '==', roomId)
        );
        
        const querySnapshot = await getDocs(roomsQuery);
        if (!querySnapshot.empty) {
            const roomDoc = querySnapshot.docs[0];
            const roomData = roomDoc.data();
            joinRoom(roomData.code, roomData.name, roomData.type, roomData.creator, {
                id: roomDoc.id,
                ...roomData
            });
        }
    } catch (error) {
        console.error('Error joining room by ID:', error);
    }
}

// Send push notification to room members
async function sendPushNotification(message, roomData) {
    if (!roomData || !roomData.members) return;
    
    try {
        // Get FCM tokens of all room members except the sender
        const membersToNotify = roomData.members.filter(member => member !== currentUser.userId);
        
        if (membersToNotify.length === 0) return;
        
        // Create notification in database
        await addDoc(collection(db, 'notifications'), {
            type: 'new_message',
            roomId: currentRoomId,
            roomName: roomData.name,
            message: message.text,
            sender: currentUser.userId,
            senderName: currentUser.name,
            recipients: membersToNotify,
            timestamp: serverTimestamp()
        });
        
    } catch (error) {
        console.error('Error sending push notification:', error);
    }
}

// Test notification
async function testNotification() {
    if (currentUser) {
        await sendTestNotification();
    }
}

// Send test notification
async function sendTestNotification() {
    try {
        showInAppNotification('Test Notification', 'This is a test notification from the chat app', currentRoomId);
        
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Test Notification', {
                body: 'This is a test notification from the chat app',
                icon: 'https://ui-avatars.com/api/?name=Chat&background=3498db&color=fff&size=192'
            });
        }
        
    } catch (error) {
        console.error('Error sending test notification:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Auth tab switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            switchAuthTab(tab);
        });
    });

    // Form submissions
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);

    // User ID validation
    regUserId.addEventListener('blur', checkUserIdAvailability);

    // Password confirmation validation
    regConfirmPassword.addEventListener('input', validatePasswordConfirmation);

    // Logout
    logoutBtn.addEventListener('click', handleLogout);

    // Mobile menu
    mobileMenuBtn.addEventListener('click', toggleSidebar);

    // Search users
    searchUsers.addEventListener('input', handleSearchUsers);

    // Notification button
    notificationBtn.addEventListener('click', () => {
        notificationModal.style.display = 'flex';
    });

    // Test notification button
    testNotificationBtn.addEventListener('click', testNotification);

    // Close modals
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            e.target.closest('.modal').style.display = 'none';
        });
    });

    // Dropdown menu
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownContent.classList.toggle('show');
        if (dropdownContent.classList.contains('show') && currentRoomId) {
            loadRoomMembers();
        }
    });

    closeDropdown.addEventListener('click', () => {
        dropdownContent.classList.remove('show');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!menuBtn.contains(e.target) && !dropdownContent.contains(e.target)) {
            dropdownContent.classList.remove('show');
        }
    });

    // Existing chat event listeners
    createRoomBtn.addEventListener('click', () => {
        if (!currentUser) {
            alert('Please login first');
            return;
        }
        roomModal.style.display = 'flex';
        newRoomName.focus();
    });

    confirmCreateRoom.addEventListener('click', createPrivateRoom);
    cancelCreateRoom.addEventListener('click', () => {
        roomModal.style.display = 'none';
        newRoomName.value = '';
    });

    joinRoomBtn.addEventListener('click', joinRoomByCode);
    roomCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinRoomByCode();
    });

    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Draft message functionality
    messageInput.addEventListener('input', () => {
        if (currentRoomId && currentUser) {
            updateTypingStatus();
            saveDraftMessage();
        }
    });

    reactionBtn.addEventListener('click', () => {
        reactionPicker.style.display = reactionPicker.style.display === 'none' ? 'flex' : 'none';
    });

    document.querySelectorAll('.reaction-option').forEach(option => {
        option.addEventListener('click', (e) => {
            const emoji = e.target.getAttribute('data-emoji');
            reactionPicker.style.display = 'none';
        });
    });

    // Close reaction picker when clicking outside
    document.addEventListener('click', (e) => {
        if (!reactionBtn.contains(e.target) && !reactionPicker.contains(e.target)) {
            reactionPicker.style.display = 'none';
        }
    });

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

// Save draft message to localStorage
function saveDraftMessage() {
    if (!currentRoomId || !currentUser) return;
    
    const messageText = messageInput.value.trim();
    const draftKey = `draft_${currentUser.userId}_${currentRoomId}`;
    
    // Clear previous timeout
    if (draftSaveTimeout) {
        clearTimeout(draftSaveTimeout);
    }
    
    // Set new timeout to save after 1 second of inactivity
    draftSaveTimeout = setTimeout(() => {
        if (messageText) {
            localStorage.setItem(draftKey, messageText);
            showDraftIndicator();
        } else {
            localStorage.removeItem(draftKey);
            hideDraftIndicator();
        }
    }, 1000);
}

// Show draft indicator
function showDraftIndicator() {
    draftIndicator.style.display = 'flex';
    setTimeout(() => {
        draftIndicator.style.display = 'none';
    }, 2000);
}

// Hide draft indicator
function hideDraftIndicator() {
    draftIndicator.style.display = 'none';
}

// Load draft message from localStorage
function loadDraftMessage() {
    if (!currentRoomId || !currentUser) return;
    
    const draftKey = `draft_${currentUser.userId}_${currentRoomId}`;
    const draftMessage = localStorage.getItem(draftKey);
    
    if (draftMessage) {
        messageInput.value = draftMessage;
        // Don't show indicator when loading draft
    }
}

// Clear draft message
function clearDraftMessage() {
    if (!currentRoomId || !currentUser) return;
    
    const draftKey = `draft_${currentUser.userId}_${currentRoomId}`;
    localStorage.removeItem(draftKey);
    hideDraftIndicator();
}

// Auth tab switching
function switchAuthTab(tab) {
    tabBtns.forEach(btn => btn.classList.remove('active'));
    authTabs.forEach(tab => tab.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`${tab}Tab`).classList.add('active');
}

// Check if user ID is available
async function checkUserIdAvailability() {
    const userId = regUserId.value.trim();
    if (!userId) return;

    try {
        const usersQuery = query(collection(db, 'users'), where('userId', '==', userId));
        const querySnapshot = await getDocs(usersQuery);
        
        if (querySnapshot.empty) {
            userIdValidation.textContent = 'User ID is available';
            userIdValidation.className = 'validation-message success';
        } else {
            userIdValidation.textContent = 'User ID already exists';
            userIdValidation.className = 'validation-message error';
        }
    } catch (error) {
        console.error('Error checking user ID:', error);
    }
}

// Validate password confirmation
function validatePasswordConfirmation() {
    const password = regPassword.value;
    const confirmPassword = regConfirmPassword.value;

    if (confirmPassword && password !== confirmPassword) {
        passwordValidation.textContent = 'Passwords do not match';
        passwordValidation.className = 'validation-message error';
    } else if (confirmPassword && password === confirmPassword) {
        passwordValidation.textContent = 'Passwords match';
        passwordValidation.className = 'validation-message success';
    } else {
        passwordValidation.textContent = '';
    }
}

// Handle user registration
async function handleRegister(e) {
    e.preventDefault();

    const name = regName.value.trim();
    const userId = regUserId.value.trim();
    const email = regEmail.value.trim();
    const password = regPassword.value;
    const confirmPassword = regConfirmPassword.value;

    // Validation
    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }

    if (!userId || !name || !email || !password) {
        alert('Please fill all fields');
        return;
    }

    try {
        // Check if user ID already exists
        const usersQuery = query(collection(db, 'users'), where('userId', '==', userId));
        const querySnapshot = await getDocs(usersQuery);
        
        if (!querySnapshot.empty) {
            alert('User ID already exists');
            return;
        }

        // Create user document
        await addDoc(collection(db, 'users'), {
            name,
            userId,
            email,
            password,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp()
        });

        // Auto-login after registration
        currentUser = { name, userId, email };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showApp();
        setupUserPresence();

        // Clear form
        registerForm.reset();
        userIdValidation.textContent = '';
        passwordValidation.textContent = '';

    } catch (error) {
        console.error('Error registering user:', error);
        alert('Error creating account. Please try again.');
    }
}

// Handle user login
async function handleLogin(e) {
    e.preventDefault();

    const loginIdentifier = loginId.value.trim();
    const password = loginPassword.value;

    if (!loginIdentifier || !password) {
        alert('Please fill all fields');
        return;
    }

    try {
        // Search by user ID or email
        const usersQuery = query(
            collection(db, 'users'),
            where('userId', '==', loginIdentifier)
        );

        const querySnapshot = await getDocs(usersQuery);
        
        if (querySnapshot.empty) {
            // Try searching by email
            const emailQuery = query(
                collection(db, 'users'),
                where('email', '==', loginIdentifier)
            );
            const emailSnapshot = await getDocs(emailQuery);
            
            if (emailSnapshot.empty) {
                alert('User not found');
                return;
            }
            
            // Check password for email match
            const userDoc = emailSnapshot.docs[0];
            const userData = userDoc.data();
            
            if (userData.password !== password) {
                alert('Invalid password');
                return;
            }
            
            currentUser = {
                name: userData.name,
                userId: userData.userId,
                email: userData.email,
                id: userDoc.id
            };
            
        } else {
            // Check password for user ID match
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();
            
            if (userData.password !== password) {
                alert('Invalid password');
                return;
            }
            
            currentUser = {
                name: userData.name,
                userId: userData.userId,
                email: userData.email,
                id: userDoc.id
            };
        }

        // Update last login
        if (currentUser.id) {
            await updateDoc(doc(db, 'users', currentUser.id), {
                lastLogin: serverTimestamp()
            });
        }

        // Save user and show app
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showApp();
        setupUserPresence();

        // Clear form
        loginForm.reset();

    } catch (error) {
        console.error('Error logging in:', error);
        alert('Error logging in. Please try again.');
    }
}

// Check if user is already logged in
function checkAuthState() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showApp();
        setupUserPresence();
    } else {
        showAuthModal();
    }
}

// Show authentication modal
function showAuthModal() {
    authModal.style.display = 'flex';
    appContainer.style.display = 'none';
    loadingScreen.style.display = 'none';
}

// Show main application
function showApp() {
    authModal.style.display = 'none';
    appContainer.style.display = 'flex';
    loadingScreen.style.display = 'none';
    
    // Update user info in sidebar
    sidebarUserName.textContent = currentUser.name;
    userProfilePic.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=3498db&color=fff`;
    
    // Initialize chat features
    initializePublicRooms();
    loadUserRooms();
}

// Handle logout
function handleLogout() {
    if (currentUser) {
        // Update user offline status
        updateUserPresence('offline');
    }
    
    currentUser = null;
    localStorage.removeItem('currentUser');
    showAuthModal();
    
    // Clean up listeners
    if (messageListener) messageListener();
    if (typingListener) typingListener();
    if (onlineStatusListener) onlineStatusListener();
    if (roomMembersListener) roomMembersListener();
    if (notificationListener) notificationListener();
}

// Setup user presence system
function setupUserPresence() {
    if (!currentUser) return;

    // Set user as online
    updateUserPresence('online');

    // Listen for online status changes
    window.addEventListener('beforeunload', () => {
        updateUserPresence('offline');
    });

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            updateUserPresence('away');
        } else {
            updateUserPresence('online');
        }
    });
}

// Update user presence status
async function updateUserPresence(status) {
    if (!currentUser) return;

    try {
        const presenceRef = doc(db, 'presence', currentUser.userId);
        await updateDoc(presenceRef, {
            status: status,
            lastSeen: serverTimestamp(),
            userId: currentUser.userId,
            userName: currentUser.name
        }, { merge: true });
    } catch (error) {
        // Document might not exist, create it
        await addDoc(collection(db, 'presence'), {
            status: status,
            lastSeen: serverTimestamp(),
            userId: currentUser.userId,
            userName: currentUser.name
        });
    }
}

// Search users and create private chat
async function handleSearchUsers(e) {
    const searchTerm = e.target.value.trim();
    
    if (!searchTerm) {
        searchResults.style.display = 'none';
        return;
    }

    try {
        // Search by user ID
        const userIdQuery = query(
            collection(db, 'users'),
            where('userId', '>=', searchTerm),
            where('userId', '<=', searchTerm + '\uf8ff')
        );

        const querySnapshot = await getDocs(userIdQuery);
        
        searchResults.innerHTML = '';
        searchResults.style.display = 'block';

        if (querySnapshot.empty) {
            searchResults.innerHTML = '<div class="search-result-item">No users found</div>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const userData = doc.data();
            if (userData.userId === currentUser.userId) return; // Don't show current user
            
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            resultItem.innerHTML = `
                <strong>${userData.name}</strong>
                <div>@${userData.userId}</div>
                <small>Click to start private chat</small>
            `;
            resultItem.addEventListener('click', async () => {
                await startPrivateChat(userData);
                searchResults.style.display = 'none';
                searchUsers.value = '';
            });
            
            searchResults.appendChild(resultItem);
        });

    } catch (error) {
        console.error('Error searching users:', error);
    }
}

// Start private chat with a user
async function startPrivateChat(targetUser) {
    try {
        // Generate a unique room ID for the private chat
        const roomId = generatePrivateRoomId(currentUser.userId, targetUser.userId);
        
        // Check if private chat already exists
        const existingRoomQuery = query(
            collection(db, 'rooms'),
            where('privateId', '==', roomId)
        );
        
        const existingRoomSnapshot = await getDocs(existingRoomQuery);
        
        let roomData;
        
        if (existingRoomSnapshot.empty) {
            // Create new private chat room
            const roomDocRef = await addDoc(collection(db, 'rooms'), {
                name: `Private: ${currentUser.name} & ${targetUser.name}`,
                code: generateRoomCode(),
                privateId: roomId,
                type: 'private',
                creator: currentUser.userId,
                creatorName: currentUser.name,
                createdAt: serverTimestamp(),
                members: [currentUser.userId, targetUser.userId],
                isPrivateChat: true,
                participants: {
                    [currentUser.userId]: currentUser.name,
                    [targetUser.userId]: targetUser.name
                }
            });
            
            roomData = {
                id: roomDocRef.id,
                name: `Private: ${targetUser.name}`,
                code: roomId,
                type: 'private',
                creator: currentUser.userId,
                isPrivateChat: true
            };
        } else {
            // Use existing private chat
            const existingRoom = existingRoomSnapshot.docs[0];
            roomData = {
                id: existingRoom.id,
                ...existingRoom.data()
            };
        }
        
        // Join the private room
        joinRoom(roomData.code, roomData.name, 'private', roomData.creator, roomData);
        
    } catch (error) {
        console.error('Error starting private chat:', error);
        alert('Error starting private chat. Please try again.');
    }
}

// Generate unique private room ID
function generatePrivateRoomId(userId1, userId2) {
    const sortedIds = [userId1, userId2].sort();
    return `private_${sortedIds[0]}_${sortedIds[1]}`;
}

// Load room members for dropdown
function loadRoomMembers() {
    if (!currentRoomId || !currentRoomData) return;

    membersList.innerHTML = '';

    // For private rooms, show specific members
    if (currentRoomData.members && currentRoomData.members.length > 0) {
        let onlineMembers = 0;
        
        currentRoomData.members.forEach(memberId => {
            // In a real app, you'd check online status from presence collection
            const isOnline = Math.random() > 0.5; // Mock online status
            
            if (isOnline) onlineMembers++;
            
            const memberItem = document.createElement('div');
            memberItem.className = 'member-item';
            memberItem.innerHTML = `
                <div class="member-status ${isOnline ? 'online' : 'offline'}"></div>
                <div class="member-info">
                    <div class="member-name">${currentRoomData.participants?.[memberId] || memberId}</div>
                    <div class="member-id">@${memberId}</div>
                </div>
            `;
            membersList.appendChild(memberItem);
        });
    } else {
        membersList.innerHTML = '<div class="no-members">No members in this room</div>';
    }
}

// Generate 6-digit room code
function generateRoomCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Create private room
async function createPrivateRoom() {
    const roomName = newRoomName.value.trim();
    if (!roomName) {
        alert('Please enter a room name');
        return;
    }

    const roomCode = generateRoomCode();
    
    try {
        const roomDocRef = await addDoc(collection(db, 'rooms'), {
            name: roomName,
            code: roomCode,
            type: 'private',
            creator: currentUser.userId,
            creatorName: currentUser.name,
            createdAt: serverTimestamp(),
            members: [currentUser.userId],
            isPrivateChat: false
        });

        roomModal.style.display = 'none';
        newRoomName.value = '';
        loadUserRooms();
        
        // Join the newly created room
        const roomData = {
            id: roomDocRef.id,
            name: roomName,
            code: roomCode,
            type: 'private',
            creator: currentUser.userId,
            members: [currentUser.userId]
        };
        joinRoom(roomCode, roomName, 'private', currentUser.userId, roomData);
        
    } catch (error) {
        console.error('Error creating room:', error);
        alert('Error creating room. Please try again.');
    }
}

// Join room with code
async function joinRoomByCode() {
    const roomCode = roomCodeInput.value.trim();
    if (!roomCode || roomCode.length !== 6) {
        alert('Please enter a valid 6-digit room code');
        return;
    }

    try {
        const roomsQuery = query(
            collection(db, 'rooms'), 
            where('code', '==', roomCode)
        );
        
        const querySnapshot = await getDocs(roomsQuery);
        
        if (querySnapshot.empty) {
            alert('Room not found. Please check the code.');
            return;
        }

        const roomDoc = querySnapshot.docs[0];
        const roomData = roomDoc.data();
        
        // Check if user is already a member
        if (!roomData.members.includes(currentUser.userId)) {
            // Add user to room members
            await updateDoc(doc(db, 'rooms', roomDoc.id), {
                members: arrayUnion(currentUser.userId)
            });
        }

        roomCodeInput.value = '';
        joinRoom(roomData.code, roomData.name, roomData.type, roomData.creator, {
            id: roomDoc.id,
            ...roomData
        });
        
    } catch (error) {
        console.error('Error joining room:', error);
        alert('Error joining room. Please try again.');
    }
}

// Initialize public rooms
function initializePublicRooms() {
    publicRooms.innerHTML = '';
    PUBLIC_ROOMS.forEach(room => {
        const roomElement = createRoomElement(room.id, room.name, 'public', '');
        publicRooms.appendChild(roomElement);
    });
}

// Load user's rooms (only rooms they've joined)
async function loadUserRooms() {
    if (!currentUser) return;

    try {
        const roomsQuery = query(
            collection(db, 'rooms'),
            where('members', 'array-contains', currentUser.userId)
        );
        
        onSnapshot(roomsQuery, (snapshot) => {
            privateRooms.innerHTML = '';
            snapshot.forEach((doc) => {
                const roomData = doc.data();
                const roomElement = createRoomElement(
                    roomData.code, 
                    roomData.name, 
                    roomData.type, 
                    roomData.creator,
                    roomData.code,
                    roomData
                );
                privateRooms.appendChild(roomElement);
            });
        });
    } catch (error) {
        console.error('Error loading user rooms:', error);
    }
}

// Create room element
function createRoomElement(roomId, roomName, roomType, creator, roomCode = '', roomData = null) {
    const roomElement = document.createElement('div');
    roomElement.className = 'room-item';
    
    let displayName = roomName;
    // For private chats, show the other person's name
    if (roomData?.isPrivateChat && roomData.participants) {
        const otherUserId = Object.keys(roomData.participants).find(id => id !== currentUser.userId);
        if (otherUserId) {
            displayName = roomData.participants[otherUserId];
        }
    }
    
    roomElement.innerHTML = `
        <div class="room-name">${displayName}</div>
        ${roomCode && roomType === 'private' && !roomData?.isPrivateChat ? `<div class="room-code">${roomCode}</div>` : ''}
        ${roomData?.isPrivateChat ? `<div class="room-type">Private</div>` : ''}
    `;
    
    roomElement.addEventListener('click', () => {
        joinRoom(roomId, displayName, roomType, creator, roomData);
    });
    
    return roomElement;
}

// Join room function
function joinRoom(roomId, roomName, roomType, creator, roomData = null) {
    // Clean up previous listeners
    if (messageListener) messageListener();
    if (typingListener) typingListener();
    if (onlineStatusListener) onlineStatusListener();
    
    currentRoomId = roomId;
    currentRoomType = roomType;
    currentRoomCreator = creator;
    currentRoomData = roomData;
    
    // Update UI
    let displayName = roomName;
    if (roomData?.isPrivateChat && roomData.participants) {
        const otherUserId = Object.keys(roomData.participants).find(id => id !== currentUser.userId);
        if (otherUserId) {
            displayName = roomData.participants[otherUserId];
        }
    }
    
    currentRoomName.textContent = displayName;
    roomCodeDisplay.textContent = roomType === 'private' ? 
        (roomData?.isPrivateChat ? 'Private Chat' : `Room Code: ${roomId}`) : 
        'Public Room';
    
    // Show/hide delete button for room creator
    deleteRoomBtn.style.display = (currentRoomType === 'private' && currentRoomCreator === currentUser.userId && !roomData?.isPrivateChat) ? 'block' : 'none';
    
    // Enable input
    messageInput.disabled = false;
    sendButton.disabled = false;
    reactionBtn.disabled = false;
    
    // Load draft message for this room
    loadDraftMessage();
    
    messageInput.focus();
    
    // Load messages
    loadMessages();
    
    // Set up typing indicator
    setupTypingIndicator();
    
    // Update active room in sidebar
    document.querySelectorAll('.room-item').forEach(item => {
        item.classList.remove('active');
    });

    // Close sidebar on mobile after selecting room
    if (window.innerWidth <= 768) {
        closeSidebar();
    }
}

// Load messages
function loadMessages() {
    messagesContainer.innerHTML = '<div class="loading">Loading messages...</div>';
    
    const messagesQuery = query(collection(db, 'messages'), orderBy('timestamp', 'asc'));

    messageListener = onSnapshot(messagesQuery, 
        (snapshot) => {
            messagesContainer.innerHTML = '';
            
            if (snapshot.empty) {
                messagesContainer.innerHTML = '<div class="no-messages">No messages yet. Start the conversation!</div>';
                return;
            }
            
            // Filter messages by roomId on client side
            const roomMessages = [];
            snapshot.forEach((doc) => {
                const message = doc.data();
                if (message.roomId === currentRoomId) {
                    roomMessages.push({...message, id: doc.id});
                }
            });
            
            if (roomMessages.length === 0) {
                messagesContainer.innerHTML = '<div class="no-messages">No messages in this room yet. Start the conversation!</div>';
                return;
            }
            
            // Sort by timestamp (client-side)
            roomMessages.sort((a, b) => {
                if (!a.timestamp || !b.timestamp) return 0;
                return a.timestamp.toDate() - b.timestamp.toDate();
            });
            
            // Display messages
            roomMessages.forEach(message => {
                displayMessage(message, message.id);
            });
            
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        },
        (error) => {
            console.error('Error loading messages:', error);
            messagesContainer.innerHTML = `
                <div class="error">
                    <p>Error loading messages: ${error.message}</p>
                </div>
            `;
        }
    );
}

// Display message
function displayMessage(message, messageId) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.username === currentUser.userId ? 'own' : 'other'}`;
    messageDiv.id = messageId;
    
    const messageHeader = document.createElement('div');
    messageHeader.className = 'message-header';
    
    const messageUsername = document.createElement('span');
    messageUsername.className = 'message-username';
    messageUsername.textContent = message.username === currentUser.userId ? 'You' : (message.userDisplayName || message.username);
    
    const messageTime = document.createElement('span');
    messageTime.className = 'message-time';
    
    // Safe timestamp handling
    try {
        if (message.timestamp && message.timestamp.toDate) {
            const date = message.timestamp.toDate();
            messageTime.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            messageTime.textContent = 'Just now';
        }
    } catch (error) {
        console.warn('Error parsing timestamp:', error);
        messageTime.textContent = 'Just now';
    }
    
    messageHeader.appendChild(messageUsername);
    messageHeader.appendChild(messageTime);
    
    const messageText = document.createElement('div');
    messageText.className = 'message-text';
    messageText.textContent = message.text;
    
    const messageActions = document.createElement('div');
    messageActions.className = 'message-actions';
    
    // Add delete button for user's own messages
    if (message.username === currentUser.userId) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-message-btn';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.title = 'Delete message';
        deleteBtn.addEventListener('click', () => deleteMessage(messageId));
        messageActions.appendChild(deleteBtn);
    }
    
    messageDiv.appendChild(messageHeader);
    messageDiv.appendChild(messageText);
    messageDiv.appendChild(messageActions);
    
    messagesContainer.appendChild(messageDiv);
}

// Delete message
async function deleteMessage(messageId) {
    if (!confirm('Are you sure you want to delete this message?')) {
        return;
    }

    try {
        await deleteDoc(doc(db, 'messages', messageId));
    } catch (error) {
        console.error('Error deleting message:', error);
        alert('Error deleting message. Please try again.');
    }
}

// Setup typing indicator
function setupTypingIndicator() {
    const typingRef = collection(db, 'typing');
    
    typingListener = onSnapshot(
        query(typingRef, where('roomId', '==', currentRoomId)),
        (snapshot) => {
            const typingUsers = [];
            snapshot.forEach((doc) => {
                const typingData = doc.data();
                if (typingData.username !== currentUser.userId && typingData.timestamp) {
                    // Check if typing was within last 3 seconds
                    const typingTime = typingData.timestamp.toDate();
                    const now = new Date();
                    if ((now - typingTime) < 3000) {
                        // Get display name for typing user
                        const displayName = currentRoomData?.participants?.[typingData.username] || typingData.username;
                        typingUsers.push(displayName);
                    }
                }
            });
            
            if (typingUsers.length > 0) {
                const names = typingUsers.join(', ');
                typingIndicator.textContent = `${names} ${typingUsers.length === 1 ? 'is' : 'are'} typing...`;
            } else {
                typingIndicator.textContent = '';
            }
        }
    );
}

// Update typing status
async function updateTypingStatus() {
    const typingRef = collection(db, 'typing');
    
    // Add typing status
    await addDoc(typingRef, {
        roomId: currentRoomId,
        username: currentUser.userId,
        userDisplayName: currentUser.name,
        timestamp: serverTimestamp()
    });
    
    // Clear previous timeout
    clearTimeout(typingTimeout);
    
    // Set timeout to automatically clear typing status after 2 seconds
    typingTimeout = setTimeout(() => {
        // Typing status will expire naturally based on timestamp check
    }, 2000);
}

// Modified sendMessage function to include notifications and draft clearing
async function sendMessage() {
    const messageText = messageInput.value.trim();
    
    if (!messageText || !currentUser || !currentRoomId) {
        return;
    }

    sendButton.disabled = true;
    sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        await addDoc(collection(db, 'messages'), {
            text: messageText,
            username: currentUser.userId,
            userDisplayName: currentUser.name,
            roomId: currentRoomId,
            timestamp: serverTimestamp(),
            reactions: {}
        });
        
        // Clear draft when message is sent
        clearDraftMessage();
        
        // Send push notification to other room members
        if (currentRoomData) {
            await sendPushNotification({ text: messageText }, currentRoomData);
        }
        
        messageInput.value = '';
        messageInput.focus();
        reactionPicker.style.display = 'none';
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Error sending message. Please try again.');
    } finally {
        sendButton.disabled = false;
        sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
    }
}

// Delete room function
deleteRoomBtn.addEventListener('click', async () => {
    if (currentRoomType !== 'private' || currentRoomCreator !== currentUser.userId) {
        alert('Only the room creator can delete this room');
        return;
    }

    if (!confirm('Are you sure you want to delete this room and all its messages? This action cannot be undone.')) {
        return;
    }

    try {
        // Find the room document
        const roomsQuery = query(
            collection(db, 'rooms'),
            where('code', '==', currentRoomId)
        );
        
        const querySnapshot = await getDocs(roomsQuery);
        
        if (querySnapshot.empty) {
            alert('Room not found');
            return;
        }

        const roomDoc = querySnapshot.docs[0];
        
        // Delete all messages in the room
        const messagesQuery = query(
            collection(db, 'messages'),
            where('roomId', '==', currentRoomId)
        );
        
        const messagesSnapshot = await getDocs(messagesQuery);
        const batch = writeBatch(db);
        
        messagesSnapshot.forEach((messageDoc) => {
            batch.delete(messageDoc.ref);
        });
        
        // Delete the room
        batch.delete(roomDoc.ref);
        await batch.commit();
        
        // Clear current room
        currentRoomId = '';
        currentRoomName.textContent = 'Select a Room';
        roomCodeDisplay.textContent = '';
        messagesContainer.innerHTML = `
            <div class="welcome-message">
                <i class="fas fa-comments fa-3x"></i>
                <h3>Room deleted successfully</h3>
                <p>Select another room to continue chatting</p>
            </div>
        `;
        
        deleteRoomBtn.style.display = 'none';
        messageInput.disabled = true;
        sendButton.disabled = true;
        reactionBtn.disabled = true;
        
    } catch (error) {
        console.error('Error deleting room:', error);
        alert('Error deleting room. Please try again.');
    }
});

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', initApp);

// Make functions available globally for HTML onclick
window.testNotification = testNotification;
window.requestNotificationPermission = requestNotificationPermission;

console.log('Advanced Chat App with Mobile Optimization and Dropdown Menu Initialized');
