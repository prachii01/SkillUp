document.addEventListener('DOMContentLoaded', async () => {
    try {
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
        const usernameElement = document.querySelector('.username');
        
        // Display user name for test purposes
        usernameElement.textContent = "Test User";
        document.querySelector('.avatar').textContent = "T";
        
        // Show the loading spinner
        document.querySelector('.loading-spinner').style.display = 'flex';
        
        // Fetch the sample data
        const response = await fetch('../data/sample_data.json');
        const data = await response.json();

        if (!data || !data.categories) {
            throw new Error("No data found");
        }

        // Process categories
        const categories = Object.keys(data.categories).map(key => {
            return {
                id: key,
                ...data.categories[key]
            };
        });

        // Render categories
        renderCategories(categories);
        
        // Hide the loading spinner
        document.querySelector('.loading-spinner').style.display = 'none';

        // Add event listener for retry button
        document.getElementById('retry-btn').addEventListener('click', () => {
            quizResults.style.display = 'none';
            const currentQuizCategoryId = localStorage.getItem('currentQuizCategoryId');
            if (currentQuizCategoryId) {
                startQuiz(currentQuizCategoryId, categories, data.questions);
            } else {
                // Back to categories
                quizResults.style.display = 'none';
                quizCategoriesContainer.parentElement.style.display = 'block';
            }
        });

        // Add event listener for home button
        document.getElementById('home-btn').addEventListener('click', () => {
            quizResults.style.display = 'none';
            quizCategoriesContainer.parentElement.style.display = 'block';
        });

        // Function to render categories
        function renderCategories(categories) {
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
                categoryCard.addEventListener('click', () => {
                    startQuiz(category.id, categories, data.questions);
                });
                quizCategoriesContainer.appendChild(categoryCard);
            });
        }

        // Function to start quiz
        function startQuiz(categoryId, categories, allQuestions) {
            const category = categories.find(cat => cat.id === categoryId);
            if (!category) return;
            
            // Store current category ID
            localStorage.setItem('currentQuizCategoryId', categoryId);
            
            document.querySelector('.loading-spinner').style.display = 'flex';
            
            const questionsData = allQuestions[categoryId];
            if (questionsData) {
                const questions = Object.keys(questionsData).map(key => {
                    return {
                        id: key,
                        ...questionsData[key]
                    };
                });
                
                // Initialize quiz variables
                window.currentQuestions = shuffleArray(questions);
                window.currentQuestionIndex = 0;
                window.score = 0;
                window.userAnswers = [];
                window.maxStreak = 0;
                window.currentStreak = 0;
                window.totalTime = 0;
                
                // Hide categories, show quiz
                quizCategoriesContainer.parentElement.style.display = 'none';
                quizActive.style.display = 'block';
                
                // Start the quiz
                loadQuestion();
            }
            
            document.querySelector('.loading-spinner').style.display = 'none';
        }

        // Function to load question
        function loadQuestion() {
            const question = window.currentQuestions[window.currentQuestionIndex];
            
            // Update progress
            const progressPercentage = ((window.currentQuestionIndex) / window.currentQuestions.length) * 100;
            progressFilled.style.width = `${progressPercentage}%`;
            
            // Set question text
            questionNumber.textContent = `Question ${window.currentQuestionIndex + 1} of ${window.currentQuestions.length}`;
            document.querySelector('.question-number').textContent = `Question ${window.currentQuestionIndex + 1}`;
            questionText.textContent = question.question;
            
            // Clear answer options
            answerOptions.innerHTML = '';
            
            // Create answer options
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
                optionElement.addEventListener('click', () => selectAnswer(optionElement, option, question.correctAnswer));
                answerOptions.appendChild(optionElement);
            });
            
            // Reset timer
            clearInterval(window.timer);
            window.timeLeft = 30;
            timerCountdown.textContent = window.timeLeft;
            
            // Start timer
            window.timer = setInterval(() => {
                window.timeLeft--;
                timerCountdown.textContent = window.timeLeft;
                
                // Change timer color based on time left
                if (window.timeLeft <= 5) {
                    timerCountdown.style.color = '#ff5252';
                } else if (window.timeLeft <= 10) {
                    timerCountdown.style.color = '#ff9800';
                } else {
                    timerCountdown.style.color = '#ffffff';
                }
                
                if (window.timeLeft <= 0) {
                    clearInterval(window.timer);
                    timeOut(question.correctAnswer);
                }
            }, 1000);
            
            // Disable next button
            nextButton.disabled = true;
        }

        // Function to handle timeout
        function timeOut(correctAnswer) {
            window.userAnswers.push({
                questionId: window.currentQuestions[window.currentQuestionIndex].id,
                userAnswer: null,
                correct: false,
                timeSpent: 30
            });
            
            window.currentStreak = 0;
            
            const options = document.querySelectorAll('.answer-option');
            options.forEach(option => {
                if (option.getAttribute('data-answer') === correctAnswer) {
                    option.classList.add('correct');
                }
                option.style.pointerEvents = 'none';
            });
            
            nextButton.disabled = false;
            showToast('Time\'s up!', 'error');
        }

        // Function to select answer
        function selectAnswer(element, answer, correctAnswer) {
            clearInterval(window.timer);
            
            const timeSpent = 30 - window.timeLeft;
            window.totalTime += timeSpent;
            
            const isCorrect = answer === correctAnswer;
            
            window.userAnswers.push({
                questionId: window.currentQuestions[window.currentQuestionIndex].id,
                userAnswer: answer,
                correct: isCorrect,
                timeSpent: timeSpent
            });
            
            if (isCorrect) {
                element.classList.add('correct');
                window.score++;
                window.currentStreak++;
                window.maxStreak = Math.max(window.maxStreak, window.currentStreak);
                showToast('Correct!', 'success');
            } else {
                element.classList.add('incorrect');
                window.currentStreak = 0;
                
                // Show correct answer
                const options = document.querySelectorAll('.answer-option');
                options.forEach(option => {
                    if (option.getAttribute('data-answer') === correctAnswer) {
                        option.classList.add('correct');
                    }
                });
                
                showToast('Incorrect!', 'error');
            }
            
            // Disable all options
            const options = document.querySelectorAll('.answer-option');
            options.forEach(option => {
                option.style.pointerEvents = 'none';
            });
            
            nextButton.disabled = false;
        }

        // Add event listener for next button
        nextButton.addEventListener('click', () => {
            window.currentQuestionIndex++;
            
            if (window.currentQuestionIndex < window.currentQuestions.length) {
                loadQuestion();
            } else {
                endQuiz();
            }
        });

        // Function to end quiz
        function endQuiz() {
            clearInterval(window.timer);
            
            quizActive.style.display = 'none';
            quizResults.style.display = 'block';
            
            const scorePercentage = Math.round((window.score / window.currentQuestions.length) * 100);
            
            document.querySelector('.score-number').textContent = `${window.score}/${window.currentQuestions.length}`;
            document.querySelector('.score-percentage').textContent = `${scorePercentage}%`;
            
            // Update stats
            const avgTime = Math.round(window.totalTime / window.currentQuestions.length);
            document.querySelector('.time-stat .stat-value').textContent = `${avgTime}s`;
            document.querySelector('.accuracy-stat .stat-value').textContent = `${scorePercentage}%`;
            document.querySelector('.streak-stat .stat-value').textContent = `${window.maxStreak}`;
            
            // Display different messages based on score
            if (scorePercentage >= 80) {
                document.querySelector('.results-title').textContent = 'Excellent!';
            } else if (scorePercentage >= 60) {
                document.querySelector('.results-title').textContent = 'Good Job!';
            } else {
                document.querySelector('.results-title').textContent = 'Keep Practicing!';
            }
            
            // Display rewards
            displayRewards(scorePercentage);
        }

        // Function to display rewards
        function displayRewards(scorePercentage) {
            const rewardsContainer = document.querySelector('.rewards-earned');
            rewardsContainer.innerHTML = '';
            
            const pointsEarned = Math.round(scorePercentage * 10);
            const rewardCard = document.createElement('div');
            rewardCard.className = 'reward-card';
            rewardCard.innerHTML = `
                <div class="reward-icon">
                    <i class="fas fa-star"></i>
                </div>
                <div class="reward-info">
                    <h4 class="reward-title">Points</h4>
                    <div class="reward-value">+${pointsEarned}</div>
                </div>
            `;
            rewardsContainer.appendChild(rewardCard);
            
            // Add badge reward if score is high enough
            if (scorePercentage >= 70) {
                const badgeCard = document.createElement('div');
                badgeCard.className = 'reward-card';
                badgeCard.innerHTML = `
                    <div class="reward-icon">
                        <i class="fas fa-award"></i>
                    </div>
                    <div class="reward-info">
                        <h4 class="reward-title">Quiz Master</h4>
                        <div class="reward-value">New Badge!</div>
                    </div>
                `;
                rewardsContainer.appendChild(badgeCard);
            }
        }

        // Function to show toast notifications
        function showToast(message, type = 'success') {
            const toastContainer = document.querySelector('.toast-container');
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.innerHTML = `<div class="toast-content">${message}</div>`;
            toastContainer.appendChild(toast);
            
            setTimeout(() => {
                toast.classList.add('show');
            }, 100);
            
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => {
                    toast.remove();
                }, 300);
            }, 3000);
        }

        // Utility function to shuffle array
        function shuffleArray(array) {
            const newArray = [...array];
            for (let i = newArray.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
            }
            return newArray;
        }

    } catch (error) {
        console.error("Error:", error);
        document.querySelector('.loading-spinner').style.display = 'none';
        const quizHeader = document.querySelector('.quiz-header');
        quizHeader.innerHTML = `
            <h1>Error Loading Quiz</h1>
            <div class="error-message">
                There was a problem loading the quiz data. Please try again later.
                <br>
                Error details: ${error.message}
            </div>
        `;
    }
});
