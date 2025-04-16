import { auth, firestore } from './config.js';
import { doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

const profileContainer = document.querySelector('.profile-container');
const profileUsername = document.querySelector('.profile-username');
const profileEmail = document.querySelector('.profile-email');
const profileAvatar = document.querySelector('.profile-avatar');
const levelBadge = document.querySelector('.profile-level-badge');
const pointsValue = document.querySelector('.points-stat .stat-value');
const quizzesValue = document.querySelector('.quizzes-stat .stat-value');
const badgesValue = document.querySelector('.badges-stat .stat-value');
const profileTabs = document.querySelectorAll('.profile-tab');
const tabContents = document.querySelectorAll('.profile-tab-content');
const achievementsGrid = document.querySelector('.achievements-grid');
const badgesGrid = document.querySelector('.badges-grid');
const historyList = document.querySelector('.history-list');
const logoutBtn = document.getElementById('logout-btn');

let currentUser = null;
let userData = null;

const badgeDefinitions = {
    first_quiz: {
        name: 'First Quiz',
        description: 'Complete your first quiz',
        icon: 'fa-flag-checkered',
        tier: 'bronze'
    },
    expert: {
        name: 'Expert',
        description: 'Score 90% or higher on a quiz',
        icon: 'fa-award',
        tier: 'silver'
    },
    hot_streak: {
        name: 'Hot Streak',
        description: 'Answer 5+ questions correctly in a row',
        icon: 'fa-fire',
        tier: 'gold'
    },
    speed_demon: {
        name: 'Speed Demon',
        description: 'Complete a quiz with high accuracy in record time',
        icon: 'fa-bolt',
        tier: 'silver'
    },
    quiz_master: {
        name: 'Quiz Master',
        description: 'Complete 10 quizzes with high scores',
        icon: 'fa-crown',
        tier: 'gold'
    },
    perfect_score: {
        name: 'Perfect Score',
        description: 'Answer all questions correctly in a quiz',
        icon: 'fa-star',
        tier: 'platinum'
    },
    newcomer: {
        name: 'Newcomer',
        description: 'Join the SkillUp platform',
        icon: 'fa-user',
        tier: 'bronze'
    },
    persistent: {
        name: 'Persistent',
        description: 'Complete quizzes on 3 consecutive days',
        icon: 'fa-calendar-check',
        tier: 'silver'
    }
};

const achievementDefinitions = [
    {
        id: 'complete_profile',
        name: 'Profile Complete',
        description: 'Fill out all your profile information',
        icon: 'fa-user-check',
        condition: (userData) => userData.profileCompleted
    },
    {
        id: 'first_perfect',
        name: 'First Perfect Score',
        description: 'Score 100% on any quiz',
        icon: 'fa-star',
        condition: (userData) => {
            const quizzes = userData.quizzes || {};
            return Object.values(quizzes).some(quiz => 
                quiz.score === quiz.totalQuestions
            );
        }
    },
    {
        id: 'quiz_variety',
        name: 'Knowledge Explorer',
        description: 'Complete quizzes in at least 3 different categories',
        icon: 'fa-compass',
        condition: (userData) => {
            const quizzes = userData.quizzes || {};
            const categories = new Set();
            
            Object.values(quizzes).forEach(quiz => {
                categories.add(quiz.categoryId);
            });
            
            return categories.size >= 3;
        }
    },
    {
        id: 'level_5',
        name: 'Rising Star',
        description: 'Reach level 5',
        icon: 'fa-chart-line',
        condition: (userData) => userData.level >= 5
    },
    {
        id: 'level_10',
        name: 'Knowledge Expert',
        description: 'Reach level 10',
        icon: 'fa-brain',
        condition: (userData) => userData.level >= 10
    },
    {
        id: 'five_quizzes',
        name: 'Quiz Enthusiast',
        description: 'Complete 5 quizzes',
        icon: 'fa-tasks',
        condition: (userData) => userData.quizzesTaken >= 5
    },
    {
        id: 'ten_quizzes',
        name: 'Quiz Veteran',
        description: 'Complete 10 quizzes',
        icon: 'fa-graduation-cap',
        condition: (userData) => userData.quizzesTaken >= 10
    },
    {
        id: 'twenty_quizzes',
        name: 'Quiz Master',
        description: 'Complete 20 quizzes',
        icon: 'fa-crown',
        condition: (userData) => userData.quizzesTaken >= 20
    }
];

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        
        const userRef = doc(firestore, 'users', user.uid);
        
        onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                userData = docSnap.data();
                updateProfileUI(userData);
                loadQuizHistory();
                loadAchievements();
                loadBadges();
            } else {
                console.log("No user data found!");
                showToast("No user data found. Please try logging in again.", "error");
            }
        });
    } else {
        window.location.href = '../pages/login.html';
    }
});

function updateProfileUI(data) {
    profileUsername.textContent = data.username || currentUser.displayName || 'Anonymous';
    profileEmail.textContent = data.email || currentUser.email;
    
    if (data.photoURL || currentUser.photoURL) {
        profileAvatar.innerHTML = `<img src="${data.photoURL || currentUser.photoURL}" alt="User avatar">`;
    } else {
        profileAvatar.textContent = (data.username || currentUser.displayName || 'A').charAt(0);
    }
    
    levelBadge.textContent = data.level || 1;
    
    pointsValue.textContent = data.points || 0;
    quizzesValue.textContent = data.quizzesTaken || 0;
    badgesValue.textContent = (data.badges || []).length;
}

function loadQuizHistory() {
    if (!userData || !userData.quizzes) {
        historyList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <p>No quiz history yet. Start taking quizzes to see your progress here!</p>
            </div>
        `;
        return;
    }
    
    historyList.innerHTML = '';
    
    let quizzes = [];
    if (Array.isArray(userData.quizzes)) {
        quizzes = [...userData.quizzes];
    } else {
        quizzes = Object.entries(userData.quizzes).map(([id, quiz]) => ({
            id,
            ...quiz
        }));
    }
    
    quizzes.sort((a, b) => {
        return new Date(b.completedAt || 0) - new Date(a.completedAt || 0);
    });
    
    if (quizzes.length === 0) {
        historyList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <p>No quiz history yet. Start taking quizzes to see your progress here!</p>
            </div>
        `;
        return;
    }
    
    quizzes.forEach(quiz => {
        const date = new Date(quiz.completedAt || Date.now());
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        
        historyItem.innerHTML = `
            <div class="history-info">
                <div class="history-icon">
                    <i class="fas fa-clipboard-check"></i>
                </div>
                <div class="history-details">
                    <h3>${quiz.categoryName || 'Quiz'}</h3>
                    <div class="history-date">${formattedDate}</div>
                </div>
            </div>
            <div class="history-score">${quiz.score || 0}/${quiz.totalQuestions || 0}</div>
        `;
        
        historyList.appendChild(historyItem);
    });
}

function loadAchievements() {
    achievementsGrid.innerHTML = '';
    
    achievementDefinitions.forEach(achievement => {
        const isUnlocked = achievement.condition(userData);
        
        const achievementCard = document.createElement('div');
        achievementCard.className = `achievement-card ${isUnlocked ? '' : 'locked'}`;
        
        achievementCard.innerHTML = `
            ${!isUnlocked ? '<i class="fas fa-lock locked-icon"></i>' : ''}
            <div class="achievement-icon">
                <i class="fas ${achievement.icon}"></i>
            </div>
            <div class="achievement-name">${achievement.name}</div>
            <div class="achievement-description">${achievement.description}</div>
            ${isUnlocked ? `<div class="achievement-date">Unlocked</div>` : ''}
        `;
        
        achievementsGrid.appendChild(achievementCard);
    });
}

function loadBadges() {
    badgesGrid.innerHTML = '';
    
    const userBadges = userData.badges || [];
    
    Object.entries(badgeDefinitions).forEach(([badgeId, badge]) => {
        const isUnlocked = userBadges.includes(badgeId);
        
        const badgeCard = document.createElement('div');
        badgeCard.className = `badge-card ${isUnlocked ? '' : 'locked'}`;
        
        badgeCard.innerHTML = `
            <div class="badge-icon badge-tier-${badge.tier}">
                <i class="fas ${badge.icon}"></i>
            </div>
            <div class="badge-name">${badge.name}</div>
            <div class="badge-tier">${capitalize(badge.tier)}</div>
            ${!isUnlocked ? `
                <div class="badge-progress">
                    <div class="progress-fill" style="width: 0%"></div>
                </div>
                <div class="progress-text">Locked</div>
            ` : ''}
        `;
        
        badgesGrid.appendChild(badgeCard);
    });
}

profileTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        profileTabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
    });
});

logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = '../pages/login.html';
    }).catch(error => {
        showToast(error.message, 'error');
    });
});

function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function showToast(message, type = 'info') {
    const toastContainer = document.querySelector('.toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';
    
    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

function createParticles() {
    const particles = document.querySelector('.floating-particles');
    const particleCount = 30;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        const size = Math.random() * 6 + 2;
        const left = Math.random() * 100;
        const animationDuration = Math.random() * 20 + 10;
        const animationDelay = Math.random() * 10;
        
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${left}%`;
        particle.style.animationDuration = `${animationDuration}s`;
        particle.style.animationDelay = `${animationDelay}s`;
        
        const colors = ['#f1c40f', '#e74c3c', '#2ecc71', '#3498db', '#9b59b6'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        particle.style.backgroundColor = randomColor;
        
        particles.appendChild(particle);
    }
}

document.addEventListener('DOMContentLoaded', createParticles);
