// ===================================
// Firebase Configuration
// ===================================

// Firebase設定
const firebaseConfig = {
    apiKey: "AIzaSyD9aOJheNQ7K3D-cPPM40aqSd-pLIv1SHc",
    authDomain: "employee-attendance-syst-fbb21.firebaseapp.com",
    databaseURL: "https://employee-attendance-syst-fbb21-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "employee-attendance-syst-fbb21",
    storageBucket: "employee-attendance-syst-fbb21.firebasestorage.app",
    messagingSenderId: "100253943346",
    appId: "1:100253943346:web:c6ebded5de249ffb9dde2b",
    measurementId: "G-5MKMLSS7F9"
};

// Firebaseを初期化
try {
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase initialized successfully');
    console.log('Database URL:', firebaseConfig.databaseURL);
} catch (error) {
    console.error('Firebase initialization error:', error);
}

// Export globally
window.firebaseConfig = firebaseConfig;
