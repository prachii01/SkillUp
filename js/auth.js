class Auth {
    constructor() {
        this.loginForm = document.getElementById('loginForm');
        this.googleSignInBtn = document.getElementById('googleSignIn');
        
        // Initialize Google Auth Provider
        this.googleProvider = new firebase.auth.GoogleAuthProvider();
        
        this.setupEventListeners();
        this.checkAuthState();
    }

    setupEventListeners() {
        // Email/Password Login
        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => this.handleEmailLogin(e));
        }
        
        // Google Sign In
        if (this.googleSignInBtn) {
            this.googleSignInBtn.addEventListener('click', () => this.handleGoogleSignIn());
        }
    }

    async handleEmailLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            this.handleSuccessfulLogin(userCredential.user);
        } catch (error) {
            this.showError(error.message);
        }
    }

    async handleGoogleSignIn() {
        try {
            const result = await auth.signInWithPopup(this.googleProvider);
            const user = result.user;
            
            // Check if this is a new user
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (!userDoc.exists) {
                // Create new user profile
                await this.createUserProfile(user);
            }
            
            this.handleSuccessfulLogin(user);
        } catch (error) {
            this.showError(error.message);
        }
    }

    async createUserProfile(user) {
        try {
            await db.collection('users').doc(user.uid).set({
                email: user.email,
                displayName: user.displayName || '',
                photoURL: user.photoURL || '',
                points: 0,
                badges: [],
                trophies: [],
                quizzesTaken: [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error creating user profile:', error);
        }
    }

    handleSuccessfulLogin(user) {
        // Store user info in localStorage for persistence
        localStorage.setItem('user', JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName
        }));
        
        // Redirect to home page
        window.location.href = '../index.html';
    }

    checkAuthState() {
        auth.onAuthStateChanged(user => {
            if (user) {
                // User is signed in
                if (window.location.href.includes('login.html') || 
                    window.location.href.includes('signup.html')) {
                    window.location.href = '../index.html';
                }
            } else {
                // User is signed out
                const protectedPages = ['quiz.html', 'profile.html'];
                const currentPage = window.location.pathname.split('/').pop();
                
                if (protectedPages.includes(currentPage)) {
                    window.location.href = 'login.html';
                }
            }
        });
    }

    showError(message) {
        // Create error element
        const errorDiv = document.createElement('div');
        errorDiv.className = 'auth-error fade-in';
        errorDiv.textContent = message;

        // Add to auth card
        const authCard = document.querySelector('.auth-card');
        authCard.insertBefore(errorDiv, authCard.firstChild);

        // Remove after 3 seconds
        setTimeout(() => {
            errorDiv.remove();
        }, 3000);
    }

    // Sign out method
    async signOut() {
        try {
            await auth.signOut();
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        } catch (error) {
            this.showError(error.message);
        }
    }
}

// Initialize Auth
const authModule = new Auth();
