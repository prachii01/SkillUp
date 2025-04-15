// Import Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, collection } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-analytics.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAUKoe1HYnPegyvE5TCTIqiSMuUTmsNDf4",
    authDomain: "skillup-20e96.firebaseapp.com",
    projectId: "skillup-20e96",
    storageBucket: "skillup-20e96.firebasestorage.app",
    messagingSenderId: "113191325506",
    appId: "1:113191325506:web:1adeb457a43d8c3ffc82db",
    measurementId: "G-YMQSC8SF7Z"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

// Firestore collections references
const usersCollection = collection(db, 'users');
const quizzesCollection = collection(db, 'quizzes');
const leaderboardCollection = collection(db, 'leaderboard');

export { 
    auth, 
    db, 
    analytics,
    usersCollection,
    quizzesCollection,
    leaderboardCollection
};
