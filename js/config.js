import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getDatabase, ref } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-analytics.js";

const firebaseConfig = {
    apiKey: "AIzaSyAUKoe1HYnPegyvE5TCTIqiSMuUTmsNDf4",
    authDomain: "skillup-20e96.firebaseapp.com",
    projectId: "skillup-20e96",
    storageBucket: "skillup-20e96.firebasestorage.app",
    messagingSenderId: "113191325506",
    appId: "1:113191325506:web:1adeb457a43d8c3ffc82db",
    measurementId: "G-YMQSC8SF7Z",
    databaseURL: "https://skillup-20e96-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const analytics = getAnalytics(app);

const usersRef = ref(db, 'users');
const quizzesRef = ref(db, 'quizzes');
const leaderboardRef = ref(db, 'leaderboard');
const badgesRef = ref(db, 'badges');

export { 
    auth, 
    db,
    analytics,
    usersRef,
    quizzesRef,
    leaderboardRef,
    badgesRef
};
