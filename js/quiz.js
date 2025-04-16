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
    const categoriesRef = ref(db, 'categories');
    onValue(categoriesRef, (snapshot) => {
        const categoriesData = snapshot.val();
        if (categoriesData) {
            categories = Object.keys(categoriesData).map(key => {
                return {
                    id: key,
                    ...categoriesData[key]
                };
            });
            renderCategories();
        }
    });
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
    const questionsRef = ref(db, `questions/${categoryId}`);
    get(questionsRef).then((snapshot) => {
        const questionsData = snapshot.val();
        if (questionsData) {
            const allQuestions = Object.keys(questionsData).map(key => {
                return {
                    id: key,
                    ...questionsData[key]
                };
            });
            currentQuestions = shuffleArray(allQuestions).slice(0, 10);
            currentQuiz = {
                categoryId,
                categoryName: category.name,
                startTime: new Date().toISOString(),
                totalQuestions: currentQuestions.length
            };
            currentQuestionIndex = 0;
            score = 0;
            userAnswers = [];
            maxStreak = 0;
            currentStreak = 0;
            quizCategoriesContainer.parentElement.style.display = 'none';
            quizActive.style.display = 'block';
            loadQuestion();
            document.querySelector('.loading-spinner').style.display = 'none';
        }
    }).catch(error => {
        console.error("Error getting questions:", error);
        document.querySelector('.loading-spinner').style.display = 'none';
        showToast('Error loading questions. Please try again.', 'error');
    });
}

function loadQuestion() {
    const question = currentQuestions[currentQuestionIndex];
    updateProgress();
    questionNumber.textContent = `Question ${currentQuestionIndex + 1} of ${currentQuestions.length}`;
    questionText.textContent = question.question;
    answerOptions.innerHTML = '';
    const options = [...question.incorrectAnswers, question.correctAnswer];
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
    clearInterval(timer);
    const timeSpent = 30 - timeLeft;
    totalTime += timeSpent;
    const options = document.querySelectorAll('.answer-option');
    options.forEach(option => {
        option.style.pointerEvents = 'none';
    });
    const correctAnswer = currentQuestions[currentQuestionIndex].correctAnswer;
    const isCorrect = answer === correctAnswer;
    userAnswers.push({
        questionId: currentQuestions[currentQuestionIndex].id,
        userAnswer: answer,
        correct: isCorrect,
        timeSpent
    });
    if (isCorrect) {
        score++;
        currentStreak++;
        element.classList.add('selected', 'correct');
        if (currentStreak > maxStreak) {
            maxStreak = currentStreak;
        }
        showToast('Correct!', 'success');
    } else {
        element.classList.add('selected', 'incorrect');
        currentStreak = 0;
        options.forEach(option => {
            if (option.getAttribute('data-answer') === correctAnswer) {
                option.classList.add('correct');
            }
        });
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
    const pointsEarned = Math.round(scorePercentage * 10);
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

function saveQuizResults(scorePercentage) {
    if (!currentUser) return;
    const pointsEarned = Math.round(scorePercentage * 10);
    const quizResult = {
        userId: currentUser.uid,
        userDisplayName: currentUser.displayName || 'Anonymous',
        categoryId: currentQuiz.categoryId,
        categoryName: currentQuiz.categoryName,
        score,
        totalQuestions: currentQuestions.length,
        scorePercentage,
        maxStreak,
        avgTimePerQuestion: Math.round(totalTime / currentQuestions.length),
        pointsEarned,
        completedAt: new Date().toISOString(),
        userAnswers
    };
    const userQuizRef = push(ref(db, `users/${currentUser.uid}/quizzes`));
    set(userQuizRef, quizResult);
    const userRef = ref(db, `users/${currentUser.uid}`);
    get(userRef).then((snapshot) => {
        const userData = snapshot.val() || {};
        const currentPoints = userData.points || 0;
        const newPoints = currentPoints + pointsEarned;
        const currentLevel = userData.level || 1;
        const newLevel = calculateLevel(newPoints);
        const leveledUp = newLevel > currentLevel;
        const updatedData = {
            points: newPoints,
            level: newLevel,
            quizzesTaken: (userData.quizzesTaken || 0) + 1
        };
        const badges = userData.badges || [];
        if (scorePercentage >= 90 && !badges.includes('expert')) {
            badges.push('expert');
        }
        if (maxStreak >= 5 && !badges.includes('hot_streak')) {
            badges.push('hot_streak');
        }
        if (scorePercentage >= 70 && totalTime / currentQuestions.length < 15 && !badges.includes('speed_demon')) {
            badges.push('speed_demon');
        }
        if (!badges.includes('first_quiz')) {
            badges.push('first_quiz');
        }
        updatedData.badges = badges;
        update(userRef, updatedData);
        updateLeaderboard(newPoints, newLevel);
        if (leveledUp) {
            showLevelUpNotification(newLevel);
        }
    });
}

function calculateLevel(points) {
    return Math.floor(points / 100) + 1;
}

function updateLeaderboard(points, level) {
    if (!currentUser) return;
    const leaderboardItemRef = ref(db, `leaderboard/${currentUser.uid}`);
    set(leaderboardItemRef, {
        uid: currentUser.uid,
        displayName: currentUser.displayName || 'Anonymous',
        photoURL: currentUser.photoURL || null,
        points,
        level,
        lastUpdated: new Date().toISOString()
    });
}

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
