import { auth, db } from '../js/config.js';
import { ref, onValue, get, set, update } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js";

// DOM Elements
const elements = {
    container: document.querySelector('.profile-container'),
    username: document.querySelector('.profile-username'),
    email: document.querySelector('.profile-email'),
    avatar: document.querySelector('.profile-avatar'),
    levelBadge: document.querySelector('.profile-level-badge'),
    navLevelBadge: document.querySelector('.level-badge span'),
    tabs: document.querySelectorAll('.profile-tab'),
    tabContents: document.querySelectorAll('.profile-tab-content'),
    logoutBtn: document.getElementById('logout-btn'),
    statValues: document.querySelectorAll('.stat-card .stat-value'),
    achievementsGrid: document.querySelector('.achievements-grid'),
    badgesGrid: document.querySelector('.badges-grid'),
    historyList: document.querySelector('.history-list'),
    categoriesGrid: document.querySelector('.categories-grid')
};

// Global state
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

// Initialize profile
async function initializeProfile(user) {
    try {
        console.log('Initializing profile for user:', user.uid);
        currentUser = user;
        
        // Check if user has displayName
        console.log('User details:', {
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            uid: user.uid
        });
        
        const userRef = ref(db, `users/${user.uid}`);
        console.log('Database reference path:', `users/${user.uid}`);
        
        onValue(userRef, (snapshot) => {
            try {
                console.log('Database snapshot exists:', snapshot.exists());
                
                if (snapshot.exists()) {
                    userData = snapshot.val();
                    console.log('User data from DB:', userData);
                    
                    // Update UI components
                    updateProfileUI(userData);
                    loadQuizHistory();
                    loadAchievements();
                    loadBadges();
                    loadCategoryProgress();
                } else {
                    console.error('No user data found in database for uid:', user.uid);
                    // Create basic user data if not exists
                    createBasicUserProfile(user);
                }
            } catch (snapshotError) {
                console.error('Error processing snapshot:', snapshotError);
                showToast('Error processing user data', 'error');
            }
        }, (error) => {
            console.error('Database read error:', error);
            showToast(`Database read error: ${error.message}`, 'error');
        });
    } catch (error) {
        console.error('Error loading profile:', error);
        showToast('Error loading profile: ' + error.message, 'error');
    }
}

// Create basic user profile if not exists
// Check if the function exists and is working
function checkDatabaseConnection() {
    try {
        const testRef = ref(db, '.info/connected');
        onValue(testRef, (snapshot) => {
            const connected = snapshot.val();
            console.log('Firebase connection status:', connected ? 'connected' : 'disconnected');
        });
    } catch (error) {
        console.error('Error checking database connection:', error);
    }
}

// Call function to check database connection
checkDatabaseConnection();

async function createBasicUserProfile(user) {
    try {
        console.log('Creating basic user profile for:', user.uid);
        
        // Make sure we have a valid user ID
        if (!user || !user.uid) {
            console.error('Invalid user object provided to createBasicUserProfile');
            showToast('User authentication error', 'error');
            return;
        }
        
        const userRef = ref(db, `users/${user.uid}`);
        const newUserData = {
            // Basic Info
            email: user.email || '',
            displayName: user.displayName || 'Anonymous',
            photoURL: user.photoURL || null,
            createdAt: new Date().toISOString(),
            lastActive: new Date().toISOString(),
            
            // Progress Stats
            level: 1,
            totalPoints: 0,
            quizzesTaken: 0,
            totalCorrectAnswers: 0,
            accuracy: 0,
            bestStreak: 0,
            currentStreak: 0,
            
            // Collections
            badges: {
                newcomer: { earned: true, date: new Date().toISOString() }
            },
            achievements: {},
            quizHistory: {},
            categoryProgress: {},
            
            // Leaderboard Stats
            weeklyPoints: 0,
            monthlyPoints: 0,
            allTimePoints: 0,
            rank: 'Novice'
        };
        
        console.log('Attempting to write user data:', newUserData);
        
        // Try with set first, then update as fallback
        try {
            await set(userRef, newUserData);
        } catch (setError) {
            console.log('Set failed, trying update instead:', setError);
            await update(userRef, newUserData);
        }
        console.log('Basic user profile created successfully');
        
        // Manually update the userData variable
        userData = newUserData;
        console.log('Manually setting user data and updating UI');
        updateProfileUI(userData);
        loadQuizHistory();
        loadAchievements();
        loadBadges();
        loadCategoryProgress();
    } catch (error) {
        console.error('Error creating basic user profile:', error.code, error.message);
        console.error('Stack trace:', error.stack);
        showToast(`Error creating user profile: ${error.message}`, 'error');
    }
}

// Auth state observer
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log('User authenticated:', user.uid);
        initializeProfile(user);
    } else {
        console.log('No authenticated user, redirecting to login');
        window.location.href = '../pages/login.html';
    }
});

function updateProfileUI(userData) {
    if (!userData) {
        console.error('No user data provided to updateProfileUI');
        return;
    }

    console.log('Updating profile UI with:', userData);

    try {
        // Update profile info using displayName from auth.js
        const displayName = userData.displayName || currentUser?.displayName || 'Anonymous';
        elements.username.textContent = displayName;
        elements.email.textContent = userData.email || currentUser?.email || '';
        
        console.log('Setting username to:', displayName);

        // Update avatar with first letter of username if no photo
        if (userData.photoURL || currentUser?.photoURL) {
            const photoURL = userData.photoURL || currentUser?.photoURL;
            elements.avatar.innerHTML = `<img src="${photoURL}" alt="${displayName}'s avatar">`;
            console.log('Using photo URL for avatar:', photoURL);
        } else {
            elements.avatar.innerHTML = displayName.charAt(0).toUpperCase();
            console.log('Using first letter for avatar:', displayName.charAt(0).toUpperCase());
        }

        // Update level badge - use level field from user data if available
        const level = userData.level || (userData.totalPoints ? Math.max(1, Math.floor(Math.sqrt(userData.totalPoints / 100)) + 1) : 1);
        elements.levelBadge.textContent = level;
        elements.navLevelBadge.textContent = `LVL ${level}`;

        // Update stats with fields that match auth.js
        const totalPoints = userData.totalPoints || 0;
        const quizzesTaken = userData.quizzesTaken || 0;
        const accuracy = userData.accuracy || 0;
        const bestStreak = userData.bestStreak || 0;
        const rank = userData.rank || getRankFromPoints(totalPoints);

        elements.statValues[0].textContent = quizzesTaken;
        elements.statValues[1].textContent = `${accuracy}%`;
        elements.statValues[2].textContent = bestStreak;
        elements.statValues[3].textContent = rank;
    } catch (error) {
        console.error('Error updating profile UI:', error);
        showToast('Error updating profile display', 'error');
    }

    // Load other sections
    
    // Progress Stats
    const statsContainer = document.querySelector('.stats-container');
    statsContainer.innerHTML = `
        <div class="stat-card">
            <i class="fas fa-scroll"></i>
            <div class="stat-value">${userData.quizzesTaken || userData.quizzes_taken || 0}</div>
            <div class="stat-label">Quizzes Taken</div>
        </div>
        <div class="stat-card">
            <i class="fas fa-bullseye"></i>
            <div class="stat-value">${userData.accuracy || userData.correct_percentage || 0}%</div>
            <div class="stat-label">Accuracy</div>
        </div>
        <div class="stat-card">
            <i class="fas fa-fire"></i>
            <div class="stat-value">${userData.bestStreak || userData.best_streak || 0}</div>
            <div class="stat-label">Best Streak</div>
        </div>
        <div class="stat-card">
            <i class="fas fa-crown"></i>
            <div class="stat-value">${userData.rank || getRankFromPoints(userData.totalPoints || userData.total_points || 0) || 'Novice'}</div>
            <div class="stat-label">Current Rank</div>
        </div>
    `;
    
    // Load detailed sections
    loadQuizHistory();
    loadAchievements();
    loadBadges();
    loadCategoryProgress();
}

// Utility functions for profile calculations
function getRankFromPoints(points) {
    if (points >= 10000) return 'Legend';
    if (points >= 5000) return 'Master';
    if (points >= 2500) return 'Expert';
    if (points >= 1000) return 'Advanced';
    if (points >= 500) return 'Intermediate';
    if (points >= 100) return 'Beginner';
    return 'Novice';
}

function calculateLevel(points) {
    // Simple level formula: each level requires more points than the previous
    return Math.max(1, Math.floor(Math.sqrt(points / 100)) + 1);
}

function loadQuizHistory() {
    if (!userData || !userData.quizHistory) {
        elements.historyList.innerHTML = '<div class="empty-state">No quizzes taken yet</div>';
        return;
    }

    const quizzes = Object.entries(userData.quizHistory)
        .map(([key, quiz]) => ({ ...quiz, id: key }))
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

    elements.historyList.innerHTML = quizzes.map(quiz => {
        const avgTime = Math.round(quiz.timeSpent / quiz.totalQuestions);
        const scoreClass = quiz.score >= 90 ? 'excellent' : 
                          quiz.score >= 70 ? 'good' : 
                          quiz.score >= 50 ? 'average' : 'needs-improvement';

        return `
        <div class="history-item ${scoreClass}">
            <div class="quiz-info">
                <div class="quiz-name">${quiz.categoryName}</div>
                <div class="quiz-meta">
                    <span class="quiz-date">${formatDate(quiz.completedAt)}</span>
                    ${quiz.comboMultiplier > 1 ? `<span class="combo">×${quiz.comboMultiplier} Combo!</span>` : ''}
                </div>
            </div>
            <div class="quiz-stats">
                <div class="stat" title="Points Earned">
                    <i class="fas fa-star"></i>
                    <span>${quiz.pointsEarned} pts</span>
                </div>
                <div class="stat" title="Accuracy">
                    <i class="fas fa-bullseye"></i>
                    <span>${Math.round(quiz.score)}%</span>
                </div>
                <div class="stat" title="Questions">
                    <i class="fas fa-check-circle"></i>
                    <span>${quiz.correctAnswers}/${quiz.totalQuestions}</span>
                </div>
                <div class="stat" title="Average Time per Question">
                    <i class="fas fa-clock"></i>
                    <span>${avgTime}s</span>
                </div>
                <div class="stat" title="Best Streak">
                    <i class="fas fa-fire"></i>
                    <span>${quiz.maxStreak}</span>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

function loadAchievements() {
    if (!userData || !userData.achievements) {
        elements.achievementsGrid.innerHTML = '<div class="empty-state">No achievements yet</div>';
        return;
    }
    
    const userAchievements = userData.achievements;
    elements.achievementsGrid.innerHTML = achievementDefinitions.map(achievement => {
        const isUnlocked = userAchievements[achievement.id]?.earned || false;
        const earnedDate = userAchievements[achievement.id]?.date;
        
        return `
            <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}">
                <div class="achievement-icon">
                    <i class="fas ${achievement.icon}"></i>
                </div>
                <div class="achievement-info">
                    <div class="achievement-name">${achievement.name}</div>
                    <div class="achievement-description">${achievement.description}</div>
                    ${isUnlocked ? `
                        <div class="achievement-earned">
                            <i class="fas fa-check-circle"></i>
                            Earned ${formatDate(earnedDate)}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function loadBadges() {
    if (!userData || !userData.badges) {
        elements.badgesGrid.innerHTML = '<div class="empty-state">No badges earned yet</div>';
        return;
    }

    const badges = Object.entries(userData.badges)
        .filter(([_, badge]) => badge.earned)
        .map(([badgeId, badge]) => ({ id: badgeId, ...badge }));

    elements.badgesGrid.innerHTML = badges.map(badge => {
        const definition = badgeDefinitions[badge.id];
        if (!definition) return '';
        
        return `
            <div class="badge-card ${definition.tier}">
                <div class="badge-icon">
                    <i class="fas ${definition.icon}"></i>
                </div>
                <div class="badge-info">
                    <div class="badge-name">${definition.name}</div>
                    <div class="badge-description">${definition.description}</div>
                    <div class="badge-earned">
                        <i class="fas fa-calendar-check"></i>
                        Earned ${formatDate(badge.date)}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function loadCategoryProgress() {
    if (!userData || !userData.categoryProgress) {
        elements.categoriesGrid.innerHTML = '<div class="empty-state">No category progress yet</div>';
        return;
    }

    const categories = Object.entries(userData.categoryProgress)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.totalPoints - a.totalPoints);

    elements.categoriesGrid.innerHTML = categories.map(category => `
        <div class="category-card">
            <div class="category-header">
                <div class="category-name">${category.id}</div>
                <div class="category-points">${category.totalPoints} pts</div>
            </div>
            <div class="category-stats">
                <div class="stat">
                    <i class="fas fa-trophy"></i>
                    <span>Best: ${category.bestScore}%</span>
                </div>
                <div class="stat">
                    <i class="fas fa-scroll"></i>
                    <span>Quizzes: ${category.quizzesTaken}</span>
                </div>
            </div>
            <div class="category-last-played">
                Last played: ${formatDate(category.lastPlayed)}
            </div>
        </div>
    `).join('');
}

elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const tabId = tab.dataset.tab;
        
        elements.tabs.forEach(t => t.classList.remove('active'));
        elements.tabContents.forEach(c => c.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(tabId).classList.add('active');
    });
});

elements.logoutBtn.addEventListener('click', () => {
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
    console.log(`Toast: ${message} (${type})`);
    
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
        
        // Add styles for toast container
        const style = document.createElement('style');
        style.textContent = `
            .toast-container {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            .toast {
                padding: 12px 16px;
                border-radius: 4px;
                color: white;
                font-weight: bold;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                display: flex;
                align-items: center;
                gap: 8px;
                animation: fadeIn 0.3s ease-in;
            }
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .toast.info { background-color: #2196F3; }
            .toast.success { background-color: #4CAF50; }
            .toast.error { background-color: #F44336; }
            .toast.warning { background-color: #FF9800; }
        `;
        document.head.appendChild(style);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Select appropriate icon
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';
    
    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Remove toast after delay
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours === 0) {
            const minutes = Math.floor(diff / (1000 * 60));
            if (minutes === 0) return 'Just now';
            return `${minutes}m ago`;
        }
        return `${hours}h ago`;
    }
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    
    return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
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
