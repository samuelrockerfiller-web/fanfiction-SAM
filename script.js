// --- 1. Firebase Imports & Configuration ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut,
    updateProfile 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDDl41EADKjz7ibdb7pz-mcpcSC4uLUpwI",
  authDomain: "ficauther.firebaseapp.com",
  projectId: "ficauther",
  storageBucket: "ficauther.firebasestorage.app",
  messagingSenderId: "947569904685",
  appId: "1:947569904685:web:c1c30979d8baf3d853bca4",
  measurementId: "G-QVG0EHM6BP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);


// --- 2. Dark / Light Mode Toggle ---
const themeBtn = document.getElementById('theme-toggle');
const body = document.body;
const icon = themeBtn.querySelector('i');

if (localStorage.getItem('theme') === 'dark') {
    body.classList.add('dark-mode');
    icon.classList.replace('fa-moon', 'fa-sun');
}

themeBtn.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    if (body.classList.contains('dark-mode')) {
        icon.classList.replace('fa-moon', 'fa-sun');
        localStorage.setItem('theme', 'dark');
    } else {
        icon.classList.replace('fa-sun', 'fa-moon');
        localStorage.setItem('theme', 'light');
    }
});


// --- 3. Story Request Popup Modal Logic ---
const modal = document.getElementById('request-modal');
const openModalBtn = document.getElementById('open-modal-btn');
const closeBtn = document.querySelector('.close-btn');
const form = document.getElementById('fanfic-form');

openModalBtn.addEventListener('click', () => {
    modal.style.display = 'flex';
});

closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

form.addEventListener('submit', (e) => {
    e.preventDefault();
    alert("Thank you! Your story request has been sent. I'll contact you soon! ✨");
    form.reset();
    modal.style.display = 'none';
});


// --- 4. Log In / Sign Up Modal & Firebase Auth Logic ---
const authModal = document.getElementById('auth-modal');
const openAuthBtn = document.getElementById('open-auth-btn');
const authCloseBtn = document.querySelector('.auth-close');

const loginSection = document.getElementById('login-section');
const signupSection = document.getElementById('signup-section');
const showSignupBtn = document.getElementById('show-signup');
const showLoginBtn = document.getElementById('show-login');

const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');

let currentUser = null;

// පරිශීලකයා Log වී ඇත්දැයි පරීක්ෂා කිරීම (Check Auth State)
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        // Log වී ඇත්නම් බොත්තමේ නම වෙනස් කිරීම
        const displayName = user.displayName ? user.displayName : "Reader";
        openAuthBtn.innerHTML = `${displayName} (Log Out) <i class="fas fa-sign-out-alt"></i>`;
    } else {
        // Log වී නැත්නම් සාමාන්‍ය Log In බොත්තම පෙන්වීම
        openAuthBtn.innerHTML = `Log In <i class="fas fa-user"></i>`;
    }
});

// Navbar එකේ බොත්තම එබූ විට (Log In හෝ Log Out කිරීම)
openAuthBtn.addEventListener('click', () => {
    if (currentUser) {
        // දැනටමත් Log වී ඇත්නම්, Log Out කිරීම
        if (confirm("Are you sure you want to log out?")) {
            signOut(auth).then(() => {
                alert("You have been logged out.");
            });
        }
    } else {
        // Log වී නැත්නම් Popup එක පෙන්වීම
        authModal.style.display = 'flex';
        loginSection.style.display = 'block';
        signupSection.style.display = 'none';
    }
});

authCloseBtn.addEventListener('click', () => {
    authModal.style.display = 'none';
});

showSignupBtn.addEventListener('click', () => {
    loginSection.style.display = 'none';
    signupSection.style.display = 'block';
});

showLoginBtn.addEventListener('click', () => {
    signupSection.style.display = 'none';
    loginSection.style.display = 'block';
});

// Close Modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
    if (e.target === authModal) authModal.style.display = 'none';
});

// --- SIGN UP (අලුත් ගිණුමක් සෑදීම) ---
signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // පරිශීලකයාගේ නම (Pen Name) Firebase වෙත ඇතුළත් කිරීම
            return updateProfile(userCredential.user, {
                displayName: name
            });
        })
        .then(() => {
            alert(`Account created successfully! Welcome, ${name} 🎉`);
            signupForm.reset();
            authModal.style.display = 'none';
            // නම බොත්තමේ පෙන්වීමට පිටුව Refresh කිරීම හෝ බොත්තම යාවත්කාලීන කිරීම
            openAuthBtn.innerHTML = `${name} (Log Out) <i class="fas fa-sign-out-alt"></i>`;
        })
        .catch((error) => {
            alert("Error: " + error.message);
        });
});

// --- LOG IN (ගිණුමට ඇතුළු වීම) ---
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            const name = user.displayName ? user.displayName : "back";
            alert(`Welcome ${name}! You have successfully logged in. ✨`);
            loginForm.reset();
            authModal.style.display = 'none';
        })
        .catch((error) => {
            alert("Login Failed: Invalid email or password.");
        });
});