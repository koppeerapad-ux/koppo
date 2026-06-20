import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// ⚠️ แทนที่ค่าเหล่านี้ด้วย Firebase config ของคุณ
// หรับขั้นตอนวิธี ดูเพิ่มเติม: https://console.firebase.google.com
const firebaseConfig = {
  apiKey: "AIzaSyB1qA9l7ZTlkDpMApiOauMDPLh6yC3P070",
  authDomain: "testweb67-9c814.firebaseapp.com",
  projectId: "testweb67-9c814",
  storageBucket: "testweb67-9c814.firebasestorage.app",
  messagingSenderId: "596233645386",
  appId: "1:596233645386:web:04b825f8729d959b7b25b3",
  measurementId: "G-1HR0YC2BLN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
