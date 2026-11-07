// --- 1. Firebase Imports & Configuration ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut,
    updateProfile,
    GoogleAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import { 
    getFirestore, 
    collection, 
    addDoc, 
    doc, 
    setDoc, 
    getDocs, // Requests කියවීම සඳහා එකතු කළා
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDDl41EADKjz7ibdb7pz-mcpcSC4uLUpwI",
  authDomain: "ficauther.firebaseapp.com",
  projectId: "ficauther",
  storageBucket: "ficauther.firebasestorage.app",
  messagingSenderId: "947569904685",
  appId: "1:947569904685:web:c1c30979d8baf3d853bca4",
  measurementId: "G-QVG0EHM6BP"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();


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


// --- 3. Story Request Popup Modal & Firestore Save Logic ---
const modal = document.getElementById('request-modal');
const openModalBtn = document.getElementById('open-modal-btn');
const closeBtn = document.querySelector('.close-btn');
const form = document.getElementById('fanfic-form');
const reqSubmitBtn = document.getElementById('req-submit-btn');

openModalBtn.addEventListener('click', () => {
    if (currentUser) {
        modal.style.display = 'flex';
        if (currentUser.displayName) {
            document.getElementById('req-name').value = currentUser.displayName;
        }
    } else {
        alert("Please log in or create an account first to request a custom story! 🔒✨");
        authModal.style.display = 'flex';
        loginSection.style.display = 'block';
        signupSection.style.display = 'none';
    }
});

closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    reqSubmitBtn.innerHTML = 'Sending... <i class="fas fa-spinner fa-spin"></i>';
    reqSubmitBtn.disabled = true;

    const reqName = document.getElementById('req-name').value;
    const reqContact = document.getElementById('req-contact').value;
    const reqFandom = document.getElementById('req-fandom').value;
    const reqPlot = document.getElementById('req-plot').value;

    try {
        const userDocRef = doc(db, "story_requests", currentUser.uid);
        await setDoc(userDocRef, {
            accountName: currentUser.displayName || reqName,
            accountEmail: currentUser.email,
            lastRequestAt: serverTimestamp()
        }, { merge: true });

        const userRequestsCol = collection(db, "story_requests", currentUser.uid, "requests");
        await addDoc(userRequestsCol, {
            name: reqName,
            contact: reqContact,
            fandom: reqFandom,
            plot: reqPlot,
            status: "Pending",
            requestedAt: serverTimestamp()
        });

        alert("Thank you! Your story request has been saved under your account. ✨");
        form.reset();
        modal.style.display = 'none';
    } catch (error) {
        console.error("Error saving request: ", error);
        alert("Failed to send request. Please try again!");
    } finally {
        reqSubmitBtn.innerHTML = 'Send Request <i class="fas fa-paper-plane"></i>';
        reqSubmitBtn.disabled = false;
    }
});


// --- 4. Log In / Sign Up Modal & Firebase Auth Logic ---
const authModal = document.getElementById('auth-modal');
const openAuthBtn = document.getElementById('open-auth-btn');
const actionBtn = document.getElementById('action-btn'); // Action බොත්තම
const authCloseBtn = document.querySelector('.auth-close');

const loginSection = document.getElementById('login-section');
const signupSection = document.getElementById('signup-section');
const showSignupBtn = document.getElementById('show-signup');
const showLoginBtn = document.getElementById('show-login');

const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');

let currentUser = null;

// පරිශීලකයා Log වී ඇත්දැයි බලා Action බොත්තම පෙන්වීම හෝ සැඟවීම
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        const displayName = user.displayName ? user.displayName : "Reader";
        openAuthBtn.innerHTML = `${displayName} (Log Out) <i class="fas fa-sign-out-alt"></i>`;
        actionBtn.style.display = 'inline-block'; // Log වී ඇත්නම් Action බොත්තම පෙන්වන්න
    } else {
        openAuthBtn.innerHTML = `Log In <i class="fas fa-user"></i>`;
        actionBtn.style.display = 'none'; // Log වී නැත්නම් Action බොත්තම සඟවන්න
    }
});

openAuthBtn.addEventListener('click', () => {
    if (currentUser) {
        if (confirm("Are you sure you want to log out?")) {
            signOut(auth).then(() => {
                alert("You have been logged out.");
            });
        }
    } else {
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


// --- 5. SIGN UP ---
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await updateProfile(user, { displayName: name });

        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            name: name,
            email: email,
            authProvider: "Email/Password",
            joinedDate: serverTimestamp()
        });

        alert(`Account created successfully! Welcome, ${name} 🎉`);
        signupForm.reset();
        authModal.style.display = 'none';
        openAuthBtn.innerHTML = `${name} (Log Out) <i class="fas fa-sign-out-alt"></i>`;
    } catch (error) {
        alert("Error: " + error.message);
    }
});


// --- 6. LOG IN ---
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
        .catch(() => {
            alert("Login Failed: Invalid email or password.");
        });
});


// --- 7. GOOGLE SIGN IN ---
const googleLoginBtn = document.getElementById('google-login-btn');

googleLoginBtn.addEventListener('click', async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            name: user.displayName,
            email: user.email,
            authProvider: "Google",
            lastLogin: serverTimestamp()
        }, { merge: true });

        alert(`Welcome ${user.displayName}! You have successfully signed in with Google. ✨`);
        authModal.style.display = 'none';
    } catch (error) {
        console.error(error);
        alert("Google Sign-In Failed: " + error.message);
    }
});


// --- 8. Protect "Read Next Chapters" Button ---
const readStoriesBtn = document.getElementById('read-stories-btn');

readStoriesBtn.addEventListener('click', (e) => {
    if (!currentUser) {
        e.preventDefault(); 
        alert("Please log in or create an account first to read exclusive chapters! 🔒📖");
        authModal.style.display = 'flex';
        loginSection.style.display = 'block';
        signupSection.style.display = 'none';
    }
});


// --- 9. "Action" Button & View User's Story Requests Logic ---
const myRequestsModal = document.getElementById('my-requests-modal');
const myReqCloseBtn = document.querySelector('.my-req-close');
const userRequestsList = document.getElementById('user-requests-list');

// Action බොත්තම එබූ විට Popup එක පෙන්වා දත්ත ලෝඩ් කිරීම
actionBtn.addEventListener('click', () => {
    myRequestsModal.style.display = 'flex';
    loadUserRequests();
});

myReqCloseBtn.addEventListener('click', () => {
    myRequestsModal.style.display = 'none';
});

// පිටත ක්ලික් කළ විට Modals වැසීම
window.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
    if (e.target === authModal) authModal.style.display = 'none';
    if (e.target === myRequestsModal) myRequestsModal.style.display = 'none';
});

// අදාළ පරිශීලකයාගේ Requests පමණක් Firestore වෙතින් ලබා ගැනීම
async function loadUserRequests() {
    if (!currentUser) return;

    userRequestsList.innerHTML = '<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Loading your requests...</p>';

    try {
        const reqCol = collection(db, "story_requests", currentUser.uid, "requests");
        const querySnapshot = await getDocs(reqCol);

        userRequestsList.innerHTML = '';

        if (querySnapshot.empty) {
            userRequestsList.innerHTML = '<p class="loading-text">You haven\'t requested any stories yet. Click "Request a Story" to order your first custom fanfic! ✨</p>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            
            // දිනය ලස්සනට සකසා ගැනීම
            let dateStr = "Recently";
            if (data.requestedAt) {
                dateStr = data.requestedAt.toDate().toLocaleDateString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric'
                });
            }

            const reqCard = document.createElement('div');
            reqCard.className = 'request-card';
            reqCard.innerHTML = `
                <div class="req-card-header">
                    <h4><i class="fas fa-magic"></i> ${data.fandom}</h4>
                    <span class="status-badge">${data.status || 'Pending'}</span>
                </div>
                <p class="req-plot-text"><strong>Plot Idea:</strong> ${data.plot}</p>
                <div class="req-meta">
                    <span><i class="fas fa-user-edit"></i> By: ${data.name} (${data.contact})</span>
                    <span><i class="far fa-calendar-alt"></i> ${dateStr}</span>
                </div>
            `;

            userRequestsList.appendChild(reqCard);
        });

    } catch (error) {
        console.error("Error loading user requests:", error);
        userRequestsList.innerHTML = '<p class="loading-text" style="color: #ea4335;">Failed to load your requests.</p>';
    }
}