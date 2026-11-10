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
// --- 10. Interactive Open Book Pricing Calculator Logic ---
const timeSlider = document.getElementById('time-slider');
const prevPageBtn = document.getElementById('prev-page-btn');
const nextPageBtn = document.getElementById('next-page-btn');
const pageFlipEffect = document.getElementById('page-flip-effect');

const calcTime = document.getElementById('calc-time');
const calcWords = document.getElementById('calc-words');
const calcOriginalPrice = document.getElementById('calc-original-price');
const calcFinalPrice = document.getElementById('calc-final-price');
const calcDiscount = document.getElementById('calc-discount');
const discountBadge = document.getElementById('discount-badge');
const orderPackageBtn = document.getElementById('order-package-btn');

// ඔබ නියම කළ කාල පරතරයන් ලැයිස්තුව (මිනිත්තු වලින්):
// 1Hr දක්වා 5න් 5ට | 1Hr-2Hr දක්වා 15න් 15ට | 2Hr-3Hr දක්වා 20න් 20ට | 3Hr-6Hr දක්වා 30න් 30ට
const TIME_STEPS = [
    5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, // පළමු පැය (5m steps)
    75, 90, 105, 120,                              // දෙවන පැය (15m steps)
    140, 160, 180,                                 // තුන්වන පැය (20m steps)
    210, 240, 270, 300, 330, 360                   // පැය 3 සිට 6 දක්වා (30m steps)
];

const BASE_PRICE_PER_5_MIN = 9.90;
const WORDS_PER_MINUTE = 200;

let currentStepIndex = 0; // TIME_STEPS ලැයිස්තුවේ වත්මන් ස්ථානය (0 = 5 mins)

// "Unfold your dream world in [X]..." වාක්‍යයට ගැළපෙන ලෙස කාලය සැකසීම
function formatReadingTimeText(mins) {
    if (mins < 60) {
        return `${mins} minutes`;
    } else {
        const hrs = Math.floor(mins / 60);
        const remMins = mins % 60;
        const hrText = hrs === 1 ? "1 hour" : `${hrs} hours`;
        return remMins === 0 ? hrText : `${hrText} & ${remMins} mins`;
    }
}

// 3D පිටුව පෙරළීමේ Animation එක
function triggerPageFlip() {
    pageFlipEffect.classList.remove('flipping');
    void pageFlipEffect.offsetWidth;
    pageFlipEffect.classList.add('flipping');
}

// තෝරාගත් කාලයට අදාළ මුළු වට්ටම ගණනය කරන Function එක
function calculateFairDiscount(minutes) {
    let discount = 0;

    for (let i = 1; i < TIME_STEPS.length; i++) {
        const stepMins = TIME_STEPS[i];
        if (stepMins > minutes) break;

        if (stepMins <= 60) {
            discount += 0.90; // පළමු පැයේදී: සෑම +5m කටම $0.90 වට්ටමක්
        } else if (stepMins <= 120) {
            discount += 3.60; // දෙවන පැයේදී: සෑම +15m කටම $3.60 වට්ටමක්
        } else if (stepMins <= 180) {
            discount += 5.40; // තුන්වන පැයේදී: සෑම +20m කටම $5.40 වට්ටමක්
        } else {
            discount += 9.00; // පැය 3න් පසු: සෑම +30m කටම $9.00 වට්ටමක්
        }
    }
    return discount;
}

// මිල, වචන සහ කාලය තිරයේ යාවත්කාලීන කරන ප්‍රධාන Function එක
function updateBookCalculator(index, animate = true) {
    currentStepIndex = index;
    timeSlider.value = index;

    if (animate) triggerPageFlip();

    const minutes = TIME_STEPS[index];
    const fiveMinBlocks = minutes / 5;
    const words = minutes * WORDS_PER_MINUTE;

    // මිල සහ වට්ටම ගණනය කිරීම
    const originalPrice = fiveMinBlocks * BASE_PRICE_PER_5_MIN;
    const totalDiscount = calculateFairDiscount(minutes);
    const finalPrice = originalPrice - totalDiscount;

    // තිරයේ අකුරු යාවත්කාලීන කිරීම
    calcTime.textContent = formatReadingTimeText(minutes);
    calcWords.textContent = `${words.toLocaleString()}+ Words`;
    calcFinalPrice.textContent = finalPrice.toFixed(2);

    // මිනිත්තු 5ට වැඩි නම් වට්ටම් මුදල පෙන්වීම
    if (totalDiscount > 0) {
        calcOriginalPrice.style.display = 'inline';
        calcOriginalPrice.textContent = `$${originalPrice.toFixed(2)}`;
        calcDiscount.textContent = totalDiscount.toFixed(2);
        discountBadge.style.opacity = '1';
    } else {
        calcOriginalPrice.style.display = 'none';
        discountBadge.style.opacity = '0';
    }
}

// Slider එක එහා මෙහා කරන විට
timeSlider.addEventListener('input', (e) => {
    updateBookCalculator(parseInt(e.target.value), true);
});

// Prev Page බොත්තම
prevPageBtn.addEventListener('click', () => {
    if (currentStepIndex > 0) {
        updateBookCalculator(currentStepIndex - 1, true);
    }
});

// Next Page බොත්තම
nextPageBtn.addEventListener('click', () => {
    if (currentStepIndex < TIME_STEPS.length - 1) {
        updateBookCalculator(currentStepIndex + 1, true);
    }
});

// "Order This Story" එබූ විට තෝරාගත් පැකේජය සමඟ Request Form එක විවෘත කිරීම
orderPackageBtn.addEventListener('click', () => {
    openModalBtn.click();
    if (currentUser) {
        const plotBox = document.getElementById('req-plot');
        const pkgInfo = `[Selected Package: ${calcTime.textContent} (${calcWords.textContent}) - $${calcFinalPrice.textContent}]\n\n`;
        plotBox.value = plotBox.value.replace(/^\[Selected Package:.*\]\n\n/, '');
        plotBox.value = pkgInfo + plotBox.value;
    }
});

// ආරම්භයේදී පළමු පියවර (මිනිත්තු 5) පෙන්වීම
updateBookCalculator(0, false);