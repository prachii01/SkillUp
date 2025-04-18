import { auth, db, usersRef, quizzesRef, leaderboardRef, badgesRef } from './config.js';
import { onValue, ref, set, update, push, get } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

const quizContainer = document.querySelector('.quiz-container');
const quizCategoriesContainer = document.querySelector('.quiz-categories');
const quizActive = document.querySelector('.quiz-active');
const quizResults = document.querySelector('.quiz-results');
const questionCard = document.querySelector('.question-card');
const questionNumber = document.querySelector('.question-number');
const questionText = document.querySelector('.question-text');
const answerOptions = document.querySelector('.answer-options');
const nextButton = document.getElementById('next-btn');
const progressFilled = document.querySelector('.progress-filled');
const timerCountdown = document.querySelector('.timer-countdown');
const resultsTitleElement = document.querySelector('.results-title');
const resultsScoreNumber = document.querySelector('.score-number');
const resultsScorePercentage = document.querySelector('.score-percentage');
const rewardsEarned = document.querySelector('.rewards-earned');
const timeStatValue = document.querySelector('.time-stat .stat-value');
const accuracyStatValue = document.querySelector('.accuracy-stat .stat-value');
const streakStatValue = document.querySelector('.streak-stat .stat-value');

let currentUser = null;
let currentQuiz = null;
let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let timer = null;
let timeLeft = 0;
let totalTime = 0;
let maxStreak = 0;
let currentStreak = 0;
let userAnswers = [];
let categories = [];
let comboMultiplier = 1;
let difficultyLevel = 1;
let achievementProgress = {};

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        const userRef = ref(db, `users/${user.uid}`);
        onValue(userRef, (snapshot) => {
            const userData = snapshot.val();
            if (userData) {
                updateUserUI(userData);
            }
        });
        loadQuizCategories();
    } else {
        window.location.href = '../pages/login.html';
    }
});

function loadQuizCategories() {
    console.log('Loading quiz categories...');
    document.querySelector('.loading-spinner').style.display = 'flex';
    
    // Try to load from Firebase first
    const categoriesRef = ref(db, 'categories');
    onValue(categoriesRef, async (snapshot) => {
        const categoriesData = snapshot.val();
        
        if (categoriesData) {
            console.log('Categories loaded from Firebase');
            categories = Object.keys(categoriesData).map(key => {
                return {
                    id: key,
                    ...categoriesData[key]
                };
            });
            renderCategories();
        } else {
            // If no Firebase data, load from sample_data.json
            console.log('No Firebase data, loading from sample_data.json');
            try {
                const response = await fetch('../data/sample_data.json');
                const data = await response.json();
                
                if (!data || !data.categories) {
                    throw new Error('No sample data found');
                }
                
                categories = Object.keys(data.categories).map(key => {
                    return {
                        id: key,
                        ...data.categories[key]
                    };
                });
                
                // Store sample questions for later use
                window.sampleQuestions = data.questions;
                renderCategories();
            } catch (error) {
                console.error('Error loading sample data:', error);
                showToast('Error loading quiz data', 'error');
            }
        }
        
        document.querySelector('.loading-spinner').style.display = 'none';
    }, (error) => {
        console.error('Firebase categories error:', error);
        loadSampleData();
    });
}

// Fallback function to load sample data
async function loadSampleData() {
    console.log('Fallback to sample data');
    try {
        const response = await fetch('../data/sample_data.json');
        const data = await response.json();
        
        if (!data || !data.categories) {
            throw new Error('No sample data found');
        }
        
        categories = Object.keys(data.categories).map(key => {
            return {
                id: key,
                ...data.categories[key]
            };
        });
        
        // Store sample questions for later use
        window.sampleQuestions = data.questions;
        renderCategories();
    } catch (error) {
        console.error('Error loading sample data:', error);
        showToast('Error loading quiz data', 'error');
    } finally {
        document.querySelector('.loading-spinner').style.display = 'none';
    }
}

function renderCategories() {
    quizCategoriesContainer.innerHTML = '';
    categories.forEach(category => {
        const categoryCard = document.createElement('div');
        categoryCard.className = 'category-card';
        categoryCard.setAttribute('data-id', category.id);
        categoryCard.innerHTML = `
            <div class="category-icon">
                <i class="fas ${category.icon}"></i>
            </div>
            <div class="category-info">
                <h3 class="category-title">${category.name}</h3>
                <div class="category-stats">
                    <span>${category.questionCount} questions</span>
                    <span>${category.difficulty}</span>
                </div>
            </div>
        `;
        categoryCard.addEventListener('click', () => startQuiz(category.id));
        quizCategoriesContainer.appendChild(categoryCard);
    });
}

function startQuiz(categoryId) {
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) return;
    
    document.querySelector('.loading-spinner').style.display = 'flex';
    currentQuiz = {
        categoryId,
        categoryName: category.name
    };
    localStorage.setItem('currentQuizCategoryId', categoryId);
    
    // Try loading questions from Firebase first
    const questionsRef = ref(db, `questions/${categoryId}`);
    get(questionsRef).then((snapshot) => {
        const questionsData = snapshot.val();
        
        if (questionsData) {
            // Use Firebase data if available
            console.log('Using Firebase quiz data');
            currentQuestions = Object.values(questionsData);
            initializeQuiz();
        } else {
            // Fall back to sample data if needed
            console.log('No Firebase questions, using sample data');
            if (window.sampleQuestions && window.sampleQuestions[categoryId]) {
                // Check if the sample data is in the right format
                // Sometimes it might be an object with keys rather than an array
                if (typeof window.sampleQuestions[categoryId] === 'object' && !Array.isArray(window.sampleQuestions[categoryId])) {
                    currentQuestions = Object.values(window.sampleQuestions[categoryId]);
                } else {
                    currentQuestions = window.sampleQuestions[categoryId];
                }
                initializeQuiz();
            } else {
                showToast('No questions found for this category', 'error');
            }
        }
        document.querySelector('.loading-spinner').style.display = 'none';
    }).catch(error => {
        console.error('Error loading questions:', error);
        
        // Try using sample data as fallback
        if (window.sampleQuestions && window.sampleQuestions[categoryId]) {
            currentQuestions = window.sampleQuestions[categoryId];
            initializeQuiz();
        } else {
            showToast('Error loading quiz questions', 'error');
        }
        document.querySelector('.loading-spinner').style.display = 'none';
    });
}

// Initialize quiz with loaded questions
function initializeQuiz() {
    currentQuestionIndex = 0;
    score = 0;
    userAnswers = [];
    maxStreak = 0;
    currentStreak = 0;
    comboMultiplier = 1;
    quizCategoriesContainer.style.display = 'none';
    quizActive.style.display = 'block';
    loadQuestion();
}

function loadQuestion() {
    // Handle cases where question might not be properly formed
    if (!currentQuestions || currentQuestions.length === 0 || currentQuestionIndex >= currentQuestions.length) {
        console.error('No valid questions available');
        showToast('Error loading questions', 'error');
        return;
    }
    
    const question = currentQuestions[currentQuestionIndex];
    
    // Check if question object is valid
    if (!question || !question.question) {
        console.error('Invalid question format:', question);
        showToast('Error with quiz data format', 'error');
        return;
    }
    
    updateProgress();
    questionNumber.textContent = `Question ${currentQuestionIndex + 1} of ${currentQuestions.length}`;
    questionText.textContent = question.question;
    answerOptions.innerHTML = '';
    
    // Make sure incorrectAnswers is an array
    const incorrectAnswers = Array.isArray(question.incorrectAnswers) ? 
        question.incorrectAnswers : 
        (typeof question.incorrectAnswers === 'object' ? Object.values(question.incorrectAnswers) : []);
    
    const options = [...incorrectAnswers, question.correctAnswer];
    const shuffledOptions = shuffleArray(options);
    const letters = ['A', 'B', 'C', 'D'];
    shuffledOptions.forEach((option, index) => {
        const optionElement = document.createElement('div');
        optionElement.className = 'answer-option';
        optionElement.setAttribute('data-answer', option);
        optionElement.innerHTML = `
            <div class="answer-letter">${letters[index]}</div>
            <div class="answer-text">${option}</div>
        `;
        optionElement.addEventListener('click', () => selectAnswer(optionElement, option));
        answerOptions.appendChild(optionElement);
    });
    clearInterval(timer);
    timeLeft = 30;
    updateTimer();
    timer = setInterval(() => {
        timeLeft--;
        updateTimer();
        if (timeLeft <= 0) {
            clearInterval(timer);
            timeOut();
        }
    }, 1000);
}

function updateProgress() {
    const progressPercentage = ((currentQuestionIndex) / currentQuestions.length) * 100;
    progressFilled.style.width = `${progressPercentage}%`;
}

function updateTimer() {
    timerCountdown.textContent = timeLeft;
    if (timeLeft <= 5) {
        timerCountdown.style.color = 'var(--secondary-color)';
    } else if (timeLeft <= 10) {
        timerCountdown.style.color = 'var(--primary-color)';
    } else {
        timerCountdown.style.color = 'var(--text-color)';
    }
}

function timeOut() {
    userAnswers.push({
        questionId: currentQuestions[currentQuestionIndex].id,
        userAnswer: null,
        correct: false,
        timeSpent: 30
    });
    currentStreak = 0;
    const options = document.querySelectorAll('.answer-option');
    options.forEach(option => {
        if (option.getAttribute('data-answer') === currentQuestions[currentQuestionIndex].correctAnswer) {
            option.classList.add('correct');
        }
        option.style.pointerEvents = 'none';
    });
    nextButton.disabled = false;
    showToast('Time\'s up!', 'error');
}

function selectAnswer(element, answer) {
    // Define the correct variable by checking if answer matches correctAnswer
    const correctAnswer = currentQuestions[currentQuestionIndex].correctAnswer;
    const correct = answer === correctAnswer;
    
    clearInterval(timer);
    const timeSpent = 30 - timeLeft;
    totalTime += timeSpent;
    
    userAnswers.push({
        questionId: currentQuestions[currentQuestionIndex].id || `q${currentQuestionIndex + 1}`,
        userAnswer: answer,
        correct: correct,
        timeSpent
    });
    
    // Apply visual feedback
    element.classList.add(correct ? 'correct' : 'incorrect');
    
    const options = document.querySelectorAll('.answer-option');
    options.forEach(option => {
        option.style.pointerEvents = 'none';
        if (option.getAttribute('data-answer') === correctAnswer) {
            option.classList.add('correct');
        }
    });
    
    // Show feedback toast
    if (correct) {
        showToast('Correct! +1 point', 'success');
    } else {
        showToast(`Incorrect. The correct answer is: ${correctAnswer}`, 'error');
    }
    
    if (correct) {
        score++;
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
        
        // Update combo multiplier
        if (currentStreak >= 10) comboMultiplier = 2.5;
        else if (currentStreak >= 7) comboMultiplier = 2.0;
        else if (currentStreak >= 5) comboMultiplier = 1.5;
        else if (currentStreak >= 3) comboMultiplier = 1.25;
        
        // Update difficulty level
        if (currentStreak >= 5 && difficultyLevel < 3) {
            difficultyLevel++;
            showToast('Difficulty increased! Questions will be more challenging', 'info');
        }
        showToast('Correct! ' + (comboMultiplier > 1 ? `${comboMultiplier}x multiplier!` : ''), 'success');
    } else {
        currentStreak = 0;
        comboMultiplier = 1;
        if (difficultyLevel > 1) {
            difficultyLevel--;
            showToast('Difficulty decreased', 'info');
        }
        showToast('Incorrect!', 'error');
    }
    nextButton.disabled = false;
}

nextButton.addEventListener('click', () => {
    currentQuestionIndex++;
    if (currentQuestionIndex < currentQuestions.length) {
        loadQuestion();
        nextButton.disabled = true;
    } else {
        endQuiz();
    }
});

function endQuiz() {
    clearInterval(timer);
    quizActive.style.display = 'none';
    const scorePercentage = Math.round((score / currentQuestions.length) * 100);
    resultsTitleElement.textContent = score >= currentQuestions.length / 2 ? 'Great Job!' : 'Nice Try!';
    resultsScoreNumber.textContent = `${score}/${currentQuestions.length}`;
    resultsScorePercentage.textContent = `${scorePercentage}%`;
    const avgTimePerQuestion = Math.round(totalTime / currentQuestions.length);
    timeStatValue.textContent = `${avgTimePerQuestion}s`;
    const accuracy = Math.round((score / currentQuestions.length) * 100);
    accuracyStatValue.textContent = `${accuracy}%`;
    streakStatValue.textContent = maxStreak;
    displayRewards(scorePercentage);
    quizResults.style.display = 'block';
    saveQuizResults(scorePercentage);
}

function displayRewards(scorePercentage) {
    rewardsEarned.innerHTML = '';
    const basePoints = Math.round(scorePercentage * 10);
    const pointsEarned = Math.round(basePoints * comboMultiplier);
    const pointsReward = document.createElement('div');
    pointsReward.className = 'reward-item';
    pointsReward.innerHTML = `
        <div class="reward-icon">
            <i class="fas fa-star"></i>
            <span class="reward-points">+${pointsEarned}</span>
        </div>
        <div class="reward-name">XP Points</div>
        <div class="reward-description">Experience points added to your profile</div>
    `;
    rewardsEarned.appendChild(pointsReward);
    if (scorePercentage >= 90) {
        const perfectBadge = document.createElement('div');
        perfectBadge.className = 'reward-item';
        perfectBadge.innerHTML = `
            <div class="reward-icon">
                <i class="fas fa-award"></i>
            </div>
            <div class="reward-name">Expert</div>
            <div class="reward-description">Score 90% or higher on a quiz</div>
        `;
        rewardsEarned.appendChild(perfectBadge);
    }
    if (maxStreak >= 5) {
        const streakBadge = document.createElement('div');
        streakBadge.className = 'reward-item';
        streakBadge.innerHTML = `
            <div class="reward-icon">
                <i class="fas fa-fire"></i>
            </div>
            <div class="reward-name">Hot Streak</div>
            <div class="reward-description">Answer 5 or more questions correctly in a row</div>
        `;
        rewardsEarned.appendChild(streakBadge);
    }
    if (scorePercentage >= 70 && totalTime / currentQuestions.length < 15) {
        const speedBadge = document.createElement('div');
        speedBadge.className = 'reward-item';
        speedBadge.innerHTML = `
            <div class="reward-icon">
                <i class="fas fa-bolt"></i>
            </div>
            <div class="reward-name">Speed Demon</div>
            <div class="reward-description">Complete with 70%+ accuracy in under 15 seconds per question</div>
        `;
        rewardsEarned.appendChild(speedBadge);
    }
}

async function saveQuizResults(scorePercentage) {
    if (!currentUser) return;
    
    const basePoints = Math.round(scorePercentage * 10);
    const pointsEarned = Math.round(basePoints * comboMultiplier);
    const timestamp = new Date().toISOString();
    const correctAnswers = userAnswers.filter(a => a.correct).length;
    
    // Create quiz result object
    const quizResult = {
        categoryId: currentQuiz.categoryId,
        categoryName: currentQuiz.categoryName,
        score: scorePercentage,
        pointsEarned,
        correctAnswers,
        totalQuestions: currentQuestions.length,
        maxStreak,
        comboMultiplier,
        timeSpent: totalTime,
        completedAt: timestamp,
        answers: userAnswers
    };
    
    // Get user data
    const userRef = ref(db, `users/${currentUser.uid}`);
    const userSnapshot = await get(userRef);
    const userData = userSnapshot.val() || {};
    
    // Update user stats
    const updates = {
        lastActive: timestamp,
        totalPoints: (userData.totalPoints || 0) + pointsEarned,
        weeklyPoints: (userData.weeklyPoints || 0) + pointsEarned,
        monthlyPoints: (userData.monthlyPoints || 0) + pointsEarned,
        allTimePoints: (userData.allTimePoints || 0) + pointsEarned,
        quizzesTaken: (userData.quizzesTaken || 0) + 1,
        totalCorrectAnswers: (userData.totalCorrectAnswers || 0) + correctAnswers,
        bestStreak: Math.max(userData.bestStreak || 0, maxStreak),
        currentStreak: correctAnswers > 0 ? (userData.currentStreak || 0) + 1 : 0,
        accuracy: Math.round(((userData.totalCorrectAnswers || 0) + correctAnswers) / ((userData.quizzesTaken || 0) + 1) / currentQuestions.length * 100)
    };
    
    // Update category progress
    const categoryRef = ref(db, `users/${currentUser.uid}/categoryProgress/${currentQuiz.categoryId}`);
    const categorySnapshot = await get(categoryRef);
    const categoryData = categorySnapshot.val() || { totalPoints: 0, quizzesTaken: 0, bestScore: 0 };
    
    updates[`categoryProgress/${currentQuiz.categoryId}`] = {
        ...categoryData,
        totalPoints: categoryData.totalPoints + pointsEarned,
        quizzesTaken: categoryData.quizzesTaken + 1,
        bestScore: Math.max(categoryData.bestScore, scorePercentage),
        lastPlayed: timestamp
    };
    
    // Add quiz to history
    const quizKey = push(ref(db, `users/${currentUser.uid}/quizHistory`)).key;
    updates[`quizHistory/${quizKey}`] = quizResult;
    
    // Update achievements
    const achievements = userData.achievements || {};
    
    if (scorePercentage === 100 && !achievements.perfectScore) {
        achievements.perfectScore = { earned: true, date: timestamp };
        showToast('🏆 New Achievement: Perfect Score!', 'achievement');
    }
    if (maxStreak >= 10 && !achievements.streakMaster) {
        achievements.streakMaster = { earned: true, date: timestamp };
        showToast('🏆 New Achievement: Streak Master!', 'achievement');
    }
    if (comboMultiplier >= 2 && !achievements.comboKing) {
        achievements.comboKing = { earned: true, date: timestamp };
        showToast('🏆 New Achievement: Combo King!', 'achievement');
    }
    
    updates.achievements = achievements;
    
    // Update user rank based on total points
    const newRank = calculateRank(updates.totalPoints);
    if (newRank !== userData.rank) {
        updates.rank = newRank;
        showToast(`🎉 Rank Up! You are now a ${newRank}!`, 'achievement');
    }
    
    // Save all updates
    await update(userRef, updates);
    
    // Update leaderboard
    updateLeaderboard(pointsEarned, updates.totalPoints, currentUser.displayName, currentUser.photoURL);
}

async function updateLeaderboard(points, totalPoints, displayName, photoURL) {
    if (!currentUser) return;
    
    try {
        const leaderboardRef = ref(db, `leaderboard/${currentUser.uid}`);
        
        // Calculate level based on points
        const level = calculateLevel(totalPoints);
        
        // Update leaderboard data with new info
        await set(leaderboardRef, {
            uid: currentUser.uid,
            displayName: displayName || currentUser.displayName || 'Anonymous',
            photoURL: photoURL || currentUser.photoURL,
            points: totalPoints,
            level: level,
            lastUpdated: new Date().toISOString(),
            recentPoints: points
        });
        
        console.log('Leaderboard updated successfully');
    } catch (error) {
        console.error('Error updating leaderboard:', error);
        // Continue without failing if leaderboard update fails
    }
}

function calculateLevel(points) {
    return Math.floor(Math.sqrt(points / 100)) + 1;
}

function calculateRank(points) {
    if (points >= 10000) return 'Grand Master';
    if (points >= 5000) return 'Master';
    if (points >= 2500) return 'Expert';
    if (points >= 1000) return 'Advanced';
    if (points >= 500) return 'Intermediate';
    if (points >= 100) return 'Beginner';
    return 'Novice';
}

// Second implementation removed to fix duplicate function error

function showLevelUpNotification(newLevel) {
    const toast = document.createElement('div');
    toast.className = 'toast success';
    toast.innerHTML = `
        <i class="fas fa-level-up-alt"></i>
        <div class="toast-content">
            <strong>Level Up!</strong>
            <div>You've reached level ${newLevel}!</div>
        </div>
    `;
    const toastContainer = document.querySelector('.toast-container') || createToastContainer();
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <div class="toast-content">${message}</div>
    `;
    const toastContainer = document.querySelector('.toast-container') || createToastContainer();
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

function updateUserUI(userData) {
    console.log('Updating quiz UI with user data:', userData);
    
    // Update username
    const usernameElement = document.querySelector('.username');
    if (usernameElement) {
        // Use userData.displayName first, then fall back to currentUser.displayName
        usernameElement.textContent = userData.displayName || currentUser.displayName || 'Anonymous';
    }
    
    // Update level badge
    const levelElement = document.querySelector('.level-badge span');
    if (levelElement) {
        levelElement.textContent = `LVL ${userData.level || 1}`;
    }
    
    // Update points
    const pointsElement = document.querySelector('.points span');
    if (pointsElement) {
        // Use totalPoints which is the field used in saveQuizResults
        pointsElement.textContent = userData.totalPoints || 0;
    }
    
    // Update avatar
    const avatarElement = document.querySelector('.avatar');
    if (avatarElement) {
        // Use userData.photoURL first, then fall back to currentUser.photoURL
        if (userData.photoURL || currentUser.photoURL) {
            const photoURL = userData.photoURL || currentUser.photoURL;
            avatarElement.innerHTML = `<img src="${photoURL}" alt="User avatar">`;
        } else {
            const displayName = userData.displayName || currentUser.displayName || 'A';
            avatarElement.textContent = displayName.charAt(0);
        }
    }
}

document.getElementById('retry-btn').addEventListener('click', () => {
    quizResults.style.display = 'none';
    startQuiz(currentQuiz.categoryId);
});

document.getElementById('home-btn').addEventListener('click', () => {
    quizResults.style.display = 'none';
    quizCategoriesContainer.parentElement.style.display = 'block';
});

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

function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

document.addEventListener('DOMContentLoaded', () => {
    createFloatingParticles();
});
