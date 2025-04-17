import { auth, db, usersRef } from './config.js';
import { set, ref, get } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signInWithPopup, 
    GoogleAuthProvider,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

const loadingSpinner = document.querySelector('.loading-spinner');

function showLoading() {
    if (loadingSpinner) {
        loadingSpinner.style.display = 'flex';
    }
}

function hideLoading() {
    if (loadingSpinner) {
        loadingSpinner.style.display = 'none';
    }
}

function showError(message) {
    const errorContainer = document.querySelector('.error-message');
    if (errorContainer) {
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast error';
    toast.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <div class="toast-content">${message}</div>
    `;
    
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

async function createUserProfile(uid, userData) {
    try {
        const userRef = ref(db, `users/${uid}`);
        
        const snapshot = await get(userRef);
        
        if (!snapshot.exists()) {
            await set(userRef, {
                email: userData.email,
                displayName: userData.displayName || 'Anonymous',
                photoURL: userData.photoURL || null,
                createdAt: new Date().toISOString(),
                level: 1,
                points: 0,
                quizzesTaken: 0,
                badges: ['newcomer']
            });
        }
        
        return true;
    } catch (error) {
        console.error('Error creating user profile:', error);
        throw error;
    }
}

const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading();

        try {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            await createUserProfile(userCredential.user.uid, {
                email: userCredential.user.email,
                displayName: userCredential.user.displayName
            });
            
            window.location.href = 'profile.html';
        } catch (error) {
            hideLoading();
            showError(error.message);
        }
    });
}

const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading();

        try {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const username = document.getElementById('username').value;
            
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            
            await userCredential.user.updateProfile({
                displayName: username
            });
            
            await createUserProfile(userCredential.user.uid, {
                email: userCredential.user.email,
                displayName: username
            });
            
            window.location.href = 'profile.html';
        } catch (error) {
            hideLoading();
            showError(error.message);
        }
    });
}

const googleProvider = new GoogleAuthProvider();
const googleSignInBtn = document.getElementById('googleSignIn');

if (googleSignInBtn) {
    googleSignInBtn.addEventListener('click', async () => {
        showLoading();
        
        try {
            const result = await signInWithPopup(auth, googleProvider);
            await createUserProfile(result.user.uid, {
                email: result.user.email,
                displayName: result.user.displayName,
                photoURL: result.user.photoURL
            });
            
            window.location.href = 'profile.html';
        } catch (error) {
            hideLoading();
            showError(error.message);
        }
    });
}

const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            window.location.href = '../pages/login.html';
        } catch (error) {
            console.error('Error signing out:', error);
        }
    });
}

onAuthStateChanged(auth, (user) => {
    hideLoading();
    
    const isAuthPage = window.location.pathname.includes('login.html') || 
                      window.location.pathname.includes('signup.html');
                      
    if (user && isAuthPage) {
        window.location.href = 'profile.html';
    } else if (!user && !isAuthPage && !window.location.pathname.includes('index.html')) {
        window.location.href = 'login.html';
    }
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

document.addEventListener('DOMContentLoaded', () => {
    createFloatingParticles();
});
