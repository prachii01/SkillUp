import { db, leaderboardRef } from './config.js';
const auth = window.auth;
import { onValue, ref, get, query, orderByChild, limitToLast } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

const leaderboardCardsContainer = document.querySelector('.leaderboard-cards');
const leaderboardTable = document.querySelector('.leaderboard-table tbody');
const weeklyWinnersList = document.querySelector('.winners-list');
const filterBtn = document.querySelector('.filter-btn');
const filterMenu = document.querySelector('.filter-menu');
const filterOptions = document.querySelectorAll('.filter-option');

let currentUser = null;
let leaderboardData = [];
let currentFilter = 'all-time';

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        
        loadLeaderboard();
        
        const userRef = ref(db, `users/${user.uid}`);
        
        onValue(userRef, (snapshot) => {
            const userData = snapshot.val();
            if (userData) {
                updateUserUI(userData);
            }
        });
    } else {
        window.location.href = '../pages/login.html';
    }
});

async function updateLeaderboard(points, totalPoints, displayName, photoURL) {
    if (!currentUser) return;
    
    try {
        const leaderboardRef = ref(db, `leaderboard/${currentUser.uid}`);
        const userRef = ref(db, `users/${currentUser.uid}`);
        // Calculate level based on points
        const level = calculateLevel(totalPoints);
        // Prepare leaderboard data
        const leaderboardData = {
            uid: currentUser.uid,
            displayName: displayName || currentUser.displayName || 'Anonymous',
            photoURL: photoURL || currentUser.photoURL,
            points: totalPoints,
            level: level,
            lastUpdated: new Date().toISOString(),
            recentPoints: points
        };
        // Update leaderboard
        await set(leaderboardRef, leaderboardData);
        // Also update users collection to keep in sync
        console.log('[User Update] About to update user:', currentUser.uid, { level, totalPoints });
        await update(userRef, {
            level: level,
            totalPoints: totalPoints,
            allTimePoints: totalPoints // for compatibility
        });
        console.log('[User Update] User updated:', currentUser.uid, { level, totalPoints });
        console.log('Leaderboard and user profile updated successfully');
    } catch (error) {
        console.error('Error updating leaderboard and user profile:', error);
        // Continue without failing if leaderboard update fails
    }
}

function loadLeaderboard() {
    const leaderboardQuery = query(leaderboardRef, orderByChild('points'), limitToLast(50));
    
    try {
        onValue(leaderboardQuery, (snapshot) => {
            const data = snapshot.val();
            
            if (data) {
                leaderboardData = Object.entries(data).map(([key, value]) => ({
                    uid: key,
                    ...value
                })).sort((a, b) => b.points - a.points);
                
                filterLeaderboard(currentFilter);
            } else {
                handleEmptyLeaderboard();
            }
        }, (error) => {
            console.error('Firebase read failed:', error);
            showToast('Error loading leaderboard data', 'error');
            handleEmptyLeaderboard();
        });
    } catch (error) {
        console.error('Error in loadLeaderboard:', error);
        showToast('Error loading leaderboard data', 'error');
        handleEmptyLeaderboard();
    }
}

function filterLeaderboard(filter) {
    let filteredData = [...leaderboardData];
    
    if (filter === 'weekly') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        filteredData = filteredData.filter(user => {
            const lastUpdated = new Date(user.lastUpdated);
            return lastUpdated >= oneWeekAgo;
        });
    } else if (filter === 'monthly') {
        const oneMonthAgo = new Date();
        oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
        
        filteredData = filteredData.filter(user => {
            const lastUpdated = new Date(user.lastUpdated);
            return lastUpdated >= oneMonthAgo;
        });
    }
    
    updateLeaderboardUI(filteredData);
    
    updateFilterText(filter);
}

function updateLeaderboardUI(data) {
    leaderboardCardsContainer.innerHTML = '';
    leaderboardTable.innerHTML = '';
    
    if (data.length === 0) {
        handleEmptyLeaderboard();
        return;
    }
    
    const top3 = data.slice(0, 3);
    
    top3.forEach((user, index) => {
        const rankCard = document.createElement('div');
        rankCard.className = 'rank-card';
        
        rankCard.innerHTML = `
            <div class="rank-position rank-${index + 1}">
                <div class="rank-circle">
                    <div class="rank-number">${index + 1}</div>
                </div>
                <div class="rank-avatar">
                    ${user.photoURL 
                        ? `<img src="${user.photoURL}" alt="User avatar">` 
                        : (user.displayName || 'A').charAt(0)}
                </div>
            </div>
            <div class="rank-username">${user.displayName || 'Anonymous'}</div>
            <div class="rank-stats">
                <div class="rank-stat">
                    <div class="stat-value">${user.points}</div>
                    <div class="stat-label">Points</div>
                </div>
                <div class="rank-stat">
                    <div class="stat-value">${user.level || 1}</div>
                    <div class="stat-label">Level</div>
                </div>
            </div>
            <div class="rank-badges">
                ${generateRandomBadges(3)}
            </div>
        `;
        
        leaderboardCardsContainer.appendChild(rankCard);
    });
    
    data.forEach((user, index) => {
        const isCurrentUser = user.uid === currentUser.uid;
        
        const tableRow = document.createElement('tr');
        tableRow.className = `rank-${index + 1} ${isCurrentUser ? 'current-user' : ''}`;
        
        tableRow.innerHTML = `
            <td>
                <div class="user-rank">
                    <div class="rank-number">${index + 1}</div>
                    ${generateRankChange()}
                </div>
            </td>
            <td>
                <div class="user-info">
                    <div class="user-avatar">
                        ${user.photoURL 
                            ? `<img src="${user.photoURL}" alt="User avatar">` 
                            : (user.displayName || 'A').charAt(0)}
                    </div>
                    <div>
                        <div class="user-name">${user.displayName || 'Anonymous'}</div>
                        <div class="user-level">Level ${user.level || 1}</div>
                    </div>
                </div>
            </td>
            <td class="points-cell">${user.points}</td>
            <td>
                <div class="badges-cell">
                    ${generateRandomBadges(3)}
                </div>
            </td>
        `;
        
        leaderboardTable.appendChild(tableRow);
    });
    
    generateWeeklyWinners();
}

function handleEmptyLeaderboard() {
    leaderboardCardsContainer.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-trophy"></i>
            <p>No leaderboard data available yet. Be the first to take a quiz and appear here!</p>
        </div>
    `;
    
    leaderboardTable.innerHTML = `
        <tr>
            <td colspan="4" class="empty-state">No leaderboard data available</td>
        </tr>
    `;
    
    weeklyWinnersList.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-medal"></i>
            <p>No weekly winners yet!</p>
        </div>
    `;
}

function generateWeeklyWinners() {
    weeklyWinnersList.innerHTML = '';
    
    const winners = leaderboardData.slice(0, 5);
    
    const currentDate = new Date();
    
    for (let i = 0; i < Math.min(5, winners.length); i++) {
        const weekDate = new Date(currentDate);
        weekDate.setDate(weekDate.getDate() - (i * 7));
        
        const weekStart = new Date(weekDate);
        weekStart.setDate(weekDate.getDate() - 6);
        
        const weekEnd = new Date(weekDate);
        
        const formattedWeekStart = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const formattedWeekEnd = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        const winnerCard = document.createElement('div');
        winnerCard.className = 'winner-card';
        
        winnerCard.innerHTML = `
            <div class="winner-week">${formattedWeekStart} - ${formattedWeekEnd}</div>
            <div class="winner-info">
                <div class="winner-avatar">
                    ${winners[i].photoURL 
                        ? `<img src="${winners[i].photoURL}" alt="User avatar">` 
                        : (winners[i].displayName || 'A').charAt(0)}
                </div>
                <div class="winner-details">
                    <h3>${winners[i].displayName || 'Anonymous'}</h3>
                    <div class="winner-level">Level ${winners[i].level || 1}</div>
                </div>
            </div>
            <div class="winner-achievement">
                <div class="achievement-icon">
                    <i class="fas fa-trophy"></i>
                </div>
                <div class="achievement-details">
                    <div class="achievement-name">Weekly Champion</div>
                    <div class="achievement-description">${winners[i].points} points</div>
                </div>
            </div>
        `;
        
        weeklyWinnersList.appendChild(winnerCard);
    }
}

function generateRandomBadges(count) {
    const badges = [
        '<i class="fas fa-award"></i>',
        '<i class="fas fa-star"></i>',
        '<i class="fas fa-crown"></i>',
        '<i class="fas fa-bolt"></i>',
        '<i class="fas fa-fire"></i>'
    ];
    
    let badgeHTML = '';
    
    for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(Math.random() * badges.length);
        badgeHTML += `<div class="badge-icon">${badges[randomIndex]}</div>`;
    }
    
    return badgeHTML;
}

function generateRankChange() {
    const types = ['up', 'down', 'none'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    
    if (randomType === 'up') {
        return `<div class="rank-change rank-change-up"><i class="fas fa-arrow-up"></i>${Math.floor(Math.random() * 3) + 1}</div>`;
    } else if (randomType === 'down') {
        return `<div class="rank-change rank-change-down"><i class="fas fa-arrow-down"></i>${Math.floor(Math.random() * 3) + 1}</div>`;
    }
    
    return '';
}

function updateFilterText(filter) {
    const filterText = document.querySelector('.filter-btn span');
    
    switch (filter) {
        case 'weekly':
            filterText.textContent = 'This Week';
            break;
        case 'monthly':
            filterText.textContent = 'This Month';
            break;
        default:
            filterText.textContent = 'All Time';
    }
}

filterBtn.addEventListener('click', () => {
    filterMenu.classList.toggle('active');
});

document.addEventListener('click', (e) => {
    if (!filterBtn.contains(e.target) && !filterMenu.contains(e.target)) {
        filterMenu.classList.remove('active');
    }
});

filterOptions.forEach(option => {
    option.addEventListener('click', () => {
        filterOptions.forEach(opt => opt.classList.remove('active'));
        
        option.classList.add('active');
        
        const filter = option.getAttribute('data-filter');
        
        currentFilter = filter;
        filterLeaderboard(filter);
        
        filterMenu.classList.remove('active');
    });
});

function updateUserUI(userData) {
    const usernameElement = document.querySelector('.username');
    if (usernameElement) {
        usernameElement.textContent = currentUser.displayName || 'Anonymous';
    }
    
    const levelElement = document.querySelector('.level-badge span');
    if (levelElement) {
        levelElement.textContent = `LVL ${userData.level || 1}`;
    }
    
    const pointsElement = document.querySelector('.points span');
    if (pointsElement) {
        pointsElement.textContent = userData.points || 0;
    }
    
    const avatarElement = document.querySelector('.avatar');
    if (avatarElement) {
        if (currentUser.photoURL) {
            avatarElement.innerHTML = `<img src="${currentUser.photoURL}" alt="User avatar">`;
        } else {
            avatarElement.textContent = (currentUser.displayName || 'A').charAt(0);
        }
    }
}

function createFloatingParticles() {
    const container = document.querySelector('.floating-particles');
    if (!container) return;
    
    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        
        const size = Math.random() * 4 + 2;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        
        particle.style.opacity = Math.random() * 0.6 + 0.2;
        
        const duration = Math.random() * 20 + 10;
        particle.style.animation = `float ${duration}s infinite linear`;
        
        particle.style.animationDelay = `${Math.random() * 10}s`;
        
        container.appendChild(particle);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    createFloatingParticles();
});
