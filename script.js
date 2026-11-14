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
    getDocs,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Realtime Database සඳහා අවශ්‍ය දේවල් Import කිරීම
import { 
    getDatabase, 
    ref, 
    push, 
    set, 
    get,    // අලුතින් එකතු කළා
    update, // අලුතින් එකතු කළා
    onValue, 
    off 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDDl41EADKjz7ibdb7pz-mcpcSC4uLUpwI",
  authDomain: "ficauther.firebaseapp.com",
  databaseURL: "https://ficauther-default-rtdb.firebaseio.com", // ඔබේ RTDB URL එක වෙනස් නම් මෙතැනට දමන්න
  projectId: "ficauther",
  storageBucket: "ficauther.firebasestorage.app",
  messagingSenderId: "947569904685",
  appId: "1:947569904685:web:c1c30979d8baf3d853bca4",
  measurementId: "G-QVG0EHM6BP"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app); // Realtime Database හඳුන්වා දීම
const googleProvider = new GoogleAuthProvider();

// තෝරාගත් පැකේජයේ විස්තර තබාගන්නා පොදු විචල්‍යය (Global Variable for Database Save)
let selectedPackageData = {
    readingTime: "5 minutes",
    minutes: 5,
    words: "1,000+ Words",
    originalPrice: "$9.90",
    finalPrice: "$9.90",
    discount: "$0.00"
};


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


// --- 3. Story Request Popup Modal, Dynamic Gumroad Overlay & Firestore Save Logic ---
const modal = document.getElementById('request-modal');
const openModalBtn = document.getElementById('open-modal-btn');
const closeBtn = document.querySelector('.close-btn');
const form = document.getElementById('fanfic-form');
const reqSubmitBtn = document.getElementById('req-submit-btn');

// ඔබගේ Gumroad Product ලින්ක් එක
const GUMROAD_PRODUCT_URL = "https://katiebird1.gumroad.com/l/custom-book";

// Gumroad හි ඔබ සාදා ඇති Versions 25 හි නම් පිළිවෙලින්
const GUMROAD_VERSIONS = [
    "05 Mins - 1000+ Words",
    "10 Mins - 2000+ Words",
    "15 Mins - 3000+ Words",
    "20 Mins - 4000+ Words",
    "25 Mins - 5000+ Words",
    "30 Mins - 6000+ Words",
    "35 Mins - 7000+ Words",
    "40 Mins - 8000+ Words",
    "45 Mins - 9000+ Words",
    "50 Mins - 10000+ Words",
    "55 Mins - 11000+ Words",
    "1 Hr - 12000+ Words",
    "1 Hr 15 Mins - 15000+ Words",
    "1 Hr 30 Mins - 18000+ Words",
    "1 Hr 45 Mins - 21000+ Words",
    "2 Hrs - 24000+ Words",
    "2 Hrs 20 Mins - 28000+ Words",
    "2 Hrs 40 Mins - 32000+ Words",
    "3 Hrs - 36000+ Words",
    "3 Hrs 30 Mins - 42000+ Words",
    "4 Hrs - 48000+ Words",
    "4 Hrs 30 Mins - 54000+ Words",
    "5 Hrs - 60000+ Words",
    "5 Hrs 30 Mins - 66000+ Words",
    "6 Hrs - 72000+ Words"
];

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

// Form එක Submit කළ විට Firestore හි Save කර, අලුතින් <a> ටැගයක් සාදා Gumroad Pop-up විවෘත කිරීම
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    reqSubmitBtn.innerHTML = 'Saving & Opening Checkout... <i class="fas fa-spinner fa-spin"></i>';
    reqSubmitBtn.disabled = true;

    const reqName = document.getElementById('req-name').value;
    const reqContact = document.getElementById('req-contact').value;
    const reqFandom = document.getElementById('req-fandom').value;
    const reqPlot = document.getElementById('req-plot').value;

    // තෝරාගත් පියවරට අදාළ Gumroad Version නම ලබාගැනීම
    const selectedVersionName = GUMROAD_VERSIONS[currentStepIndex] || GUMROAD_VERSIONS[0];

    // ?wanted=true&option=...&email=... සහිත URL එක සෑදීම
    const checkoutUrl = `${GUMROAD_PRODUCT_URL}?wanted=true&option=${encodeURIComponent(selectedVersionName)}&email=${encodeURIComponent(currentUser.email)}`;

    try {
        // 1. පළමුව Firestore Database එකේ දත්ත සුරැකීම
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
            packageTime: selectedPackageData.readingTime,
            packageMinutes: selectedPackageData.minutes,
            packageWords: selectedPackageData.words,
            packagePrice: selectedPackageData.finalPrice,
            packageDiscount: selectedPackageData.discount,
            gumroadVersion: selectedVersionName,
            status: "Awaiting Payment Confirmation ⏳",
            requestedAt: serverTimestamp()
        });

        // 2. Form එක Reset කර request-modal එක වැසීම
        form.reset();
        modal.style.display = 'none';

        // 3. JavaScript මඟින් අලුතින්ම <a class="gumroad-button"> සබැඳියක් සාදා body එකට එක් කර Click කිරීම
        const dynamicGumroadLink = document.createElement('a');
        dynamicGumroadLink.className = 'gumroad-button';
        dynamicGumroadLink.href = checkoutUrl;
        dynamicGumroadLink.setAttribute('data-gumroad-overlay-checkout', 'true');
        dynamicGumroadLink.style.display = 'none';
        document.body.appendChild(dynamicGumroadLink);

        // gumroad.js හි MutationObserver එකට අලුත් <a> ටැගය හඳුනා ගැනීමට 100ms ලබා දී Click කිරීම
        setTimeout(() => {
            dynamicGumroadLink.click();
            // Pop-up එක විවෘත වූ පසු තාවකාලික <a> ටැගය ඉවත් කිරීම
            setTimeout(() => {
                dynamicGumroadLink.remove();
            }, 2000);
        }, 100);

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
const actionBtn = document.getElementById('action-btn');
const authCloseBtn = document.querySelector('.auth-close');

const loginSection = document.getElementById('login-section');
const signupSection = document.getElementById('signup-section');
const showSignupBtn = document.getElementById('show-signup');
const showLoginBtn = document.getElementById('show-login');

const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');

let currentUser = null;

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        const displayName = user.displayName ? user.displayName : "Reader";
        openAuthBtn.innerHTML = `${displayName} (Log Out) <i class="fas fa-sign-out-alt"></i>`;
        actionBtn.style.display = 'inline-block';
    } else {
        openAuthBtn.innerHTML = `Log In <i class="fas fa-user"></i>`;
        actionBtn.style.display = 'none';
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

actionBtn.addEventListener('click', () => {
    myRequestsModal.style.display = 'flex';
    loadUserRequests();
});

myReqCloseBtn.addEventListener('click', () => {
    myRequestsModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
    if (e.target === authModal) authModal.style.display = 'none';
    if (e.target === myRequestsModal) myRequestsModal.style.display = 'none';
});

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
            
            let dateStr = "Recently";
            if (data.requestedAt) {
                dateStr = data.requestedAt.toDate().toLocaleDateString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric'
                });
            }

            // පැකේජයේ විස්තර තිබේ නම් ලස්සනට පෙන්වීම
            const pkgHtml = data.packageTime ? `
                <div class="req-pkg-info">
                    <span><i class="fas fa-clock"></i> <strong>Time:</strong> ${data.packageTime}</span>
                    <span><i class="fas fa-feather-alt"></i> <strong>Length:</strong> ${data.packageWords}</span>
                    <span><i class="fas fa-tag"></i> <strong>Price:</strong> ${data.packagePrice}</span>
                </div>
            ` : '';

            const reqCard = document.createElement('div');
            reqCard.className = 'request-card';
            reqCard.innerHTML = `
                <div class="req-card-header">
                    <h4><i class="fas fa-magic"></i> ${data.fandom}</h4>
                    <span class="status-badge">${data.status || 'Pending'}</span>
                </div>
                ${pkgHtml}
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


// --- 10. Interactive Open Book & Modal Package Calculator Logic ---
const timeSlider = document.getElementById('time-slider');
const prevPageBtn = document.getElementById('prev-page-btn');
const nextPageBtn = document.getElementById('next-page-btn');
const inlineMinusBtn = document.getElementById('inline-minus-btn');
const inlinePlusBtn = document.getElementById('inline-plus-btn');
const pageFlipEffect = document.getElementById('page-flip-effect');

const calcTime = document.getElementById('calc-time');
const calcWords = document.getElementById('calc-words');
const calcOriginalPrice = document.getElementById('calc-original-price');
const calcFinalPrice = document.getElementById('calc-final-price');
const calcDiscount = document.getElementById('calc-discount');
const discountBadge = document.getElementById('discount-badge');
const orderPackageBtn = document.getElementById('order-package-btn');

// Modal එක ඇතුළත ඇති Package Selector Elements
const modalTimeSlider = document.getElementById('modal-time-slider');
const modalMinusBtn = document.getElementById('modal-minus-btn');
const modalPlusBtn = document.getElementById('modal-plus-btn');
const modalPkgTime = document.getElementById('modal-pkg-time');
const modalPkgWords = document.getElementById('modal-pkg-words');
const modalOrigPrice = document.getElementById('modal-orig-price');
const modalFinalPrice = document.getElementById('modal-final-price');
const modalDiscountTag = document.getElementById('modal-discount-tag');
const modalDiscountVal = document.getElementById('modal-discount-val');

const TIME_STEPS = [
    5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, // පළමු පැය (5m steps)
    75, 90, 105, 120,                              // දෙවන පැය (15m steps)
    140, 160, 180,                                 // තුන්වන පැය (20m steps)
    210, 240, 270, 300, 330, 360                   // පැය 3 සිට 6 දක්වා (30m steps)
];

const BASE_PRICE_PER_5_MIN = 9.90;
const WORDS_PER_MINUTE = 200;

let currentStepIndex = 0;

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

function triggerPageFlip() {
    pageFlipEffect.classList.remove('flipping');
    void pageFlipEffect.offsetWidth;
    pageFlipEffect.classList.add('flipping');
}

function calculateFairDiscount(minutes) {
    let discount = 0;
    for (let i = 1; i < TIME_STEPS.length; i++) {
        const stepMins = TIME_STEPS[i];
        if (stepMins > minutes) break;

        if (stepMins <= 60) {
            discount += 0.90;
        } else if (stepMins <= 120) {
            discount += 3.60;
        } else if (stepMins <= 180) {
            discount += 5.40;
        } else {
            discount += 9.00;
        }
    }
    return discount;
}

// ප්‍රධාන පිටුවේ පොත සහ Modal එකේ පැකේජ් කොටුව යන දෙකම එකවර යාවත්කාලීන කරන Function එක
function updateBookCalculator(index, animate = true) {
    currentStepIndex = index;
    timeSlider.value = index;
    modalTimeSlider.value = index;

    if (animate) triggerPageFlip();

    const minutes = TIME_STEPS[index];
    const fiveMinBlocks = minutes / 5;
    const words = minutes * WORDS_PER_MINUTE;

    const originalPrice = fiveMinBlocks * BASE_PRICE_PER_5_MIN;
    const totalDiscount = calculateFairDiscount(minutes);
    const finalPrice = originalPrice - totalDiscount;

    const formattedTime = formatReadingTimeText(minutes);
    const formattedWords = `${words.toLocaleString()}+ Words`;

    // 1. ප්‍රධාන පිටුවේ පොත යාවත්කාලීන කිරීම
    calcTime.textContent = formattedTime;
    calcWords.textContent = formattedWords;
    calcFinalPrice.textContent = finalPrice.toFixed(2);

    // 2. Modal එක ඇතුළත Package කොටුව යාවත්කාලීන කිරීම
    modalPkgTime.textContent = formattedTime;
    modalPkgWords.textContent = formattedWords;
    modalFinalPrice.textContent = finalPrice.toFixed(2);

    if (totalDiscount > 0) {
        calcOriginalPrice.style.display = 'inline';
        calcOriginalPrice.textContent = `$${originalPrice.toFixed(2)}`;
        calcDiscount.textContent = totalDiscount.toFixed(2);
        discountBadge.style.opacity = '1';

        modalOrigPrice.style.display = 'inline';
        modalOrigPrice.textContent = `$${originalPrice.toFixed(2)}`;
        modalDiscountTag.style.display = 'inline-block';
        modalDiscountVal.textContent = totalDiscount.toFixed(2);
    } else {
        calcOriginalPrice.style.display = 'none';
        discountBadge.style.opacity = '0';

        modalOrigPrice.style.display = 'none';
        modalDiscountTag.style.display = 'none';
    }

    // 3. Firestore හි සුරැකීම සඳහා වත්මන් පැකේජ් දත්ත ගබඩා කර තැබීම
    selectedPackageData = {
        readingTime: formattedTime,
        minutes: minutes,
        words: formattedWords,
        originalPrice: `$${originalPrice.toFixed(2)}`,
        finalPrice: `$${finalPrice.toFixed(2)}`,
        discount: `$${totalDiscount.toFixed(2)}`
    };

    // 4. බොත්තම් සක්‍රීය/අක්‍රීය කිරීම
    const isMin = (currentStepIndex === 0);
    const isMax = (currentStepIndex === TIME_STEPS.length - 1);

    inlineMinusBtn.disabled = isMin;
    prevPageBtn.disabled = isMin;
    modalMinusBtn.disabled = isMin;

    inlinePlusBtn.disabled = isMax;
    nextPageBtn.disabled = isMax;
    modalPlusBtn.disabled = isMax;
}

function decreaseTime() {
    if (currentStepIndex > 0) updateBookCalculator(currentStepIndex - 1, true);
}

function increaseTime() {
    if (currentStepIndex < TIME_STEPS.length - 1) updateBookCalculator(currentStepIndex + 1, true);
}

// ප්‍රධාන පිටුවේ සහ Modal එකේ ඇති සියලුම Sliders සහ බොත්තම් සම්බන්ධ කිරීම
timeSlider.addEventListener('input', (e) => updateBookCalculator(parseInt(e.target.value), true));
modalTimeSlider.addEventListener('input', (e) => updateBookCalculator(parseInt(e.target.value), false));

prevPageBtn.addEventListener('click', decreaseTime);
nextPageBtn.addEventListener('click', increaseTime);
inlineMinusBtn.addEventListener('click', decreaseTime);
inlinePlusBtn.addEventListener('click', increaseTime);
modalMinusBtn.addEventListener('click', decreaseTime);
modalPlusBtn.addEventListener('click', increaseTime);

// "Order This Story" එබූ විට කෙලින්ම Request Modal එක විවෘත වීම
orderPackageBtn.addEventListener('click', () => {
    openModalBtn.click();
});

// ආරම්භයේදී පළමු පියවර (මිනිත්තු 5) පෙන්වීම
updateBookCalculator(0, false);

// --- 11. Floating Chat Widget & Advanced Realtime Database Controls ---
const chatFabBtn = document.getElementById('chat-fab-btn');
const chatWidget = document.getElementById('chat-widget');
const closeChatBtn = document.getElementById('close-chat-btn');
const chatMessagesBox = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send-btn');
const chatLimitText = document.getElementById('chat-limit-text');
const fabMsgLeft = document.getElementById('fab-msg-left');

const MAX_CONSECUTIVE_MESSAGES = 3;

// පාලන විචල්‍යයන් (Control States)
let globalChatEnabled = true;
let isUserBlocked = false;
let isUserUnlimited = false;
let consecutiveUserMsgs = 0; // ඔබේ අවසාන Reply එකට පසු පාඨකයා එවූ පණිවිඩ ගණන

let activeUserChatRef = null;
const globalSettingsRef = ref(rtdb, 'chat_settings/globalChatEnabled');

// 1. Global Chat Switch එක පරීක්ෂා කිරීම (සියලු දෙනාටම Chat ඔන්/ඕෆ් කිරීම)
onValue(globalSettingsRef, (snapshot) => {
    if (!snapshot.exists()) {
        // පළමු වතාවට Console එකේ පහසුවෙන් පෙනීම සඳහා true ලෙස සෑදීම
        set(globalSettingsRef, true);
        globalChatEnabled = true;
    } else {
        globalChatEnabled = snapshot.val();
    }
    updateChatUIState();
});

// Floating Message බොත්තම එබූ විට
chatFabBtn.addEventListener('click', () => {
    if (!currentUser) {
        alert("Please log in first to send a direct message to the author! 🔒💬");
        authModal.style.display = 'flex';
        loginSection.style.display = 'block';
        signupSection.style.display = 'none';
        return;
    }

    if (chatWidget.style.display === 'flex') {
        chatWidget.style.display = 'none';
    } else {
        chatWidget.style.display = 'flex';
        chatMessagesBox.scrollTop = chatMessagesBox.scrollHeight;
    }
});

closeChatBtn.addEventListener('click', () => {
    chatWidget.style.display = 'none';
});

// පරිශීලකයා Log වූ විට ඔහුගේ Chat ෆෝල්ඩරයට සම්බන්ධ වීම
onAuthStateChanged(auth, async (user) => {
    if (activeUserChatRef) {
        off(activeUserChatRef);
        activeUserChatRef = null;
    }

    if (user) {
        fabMsgLeft.style.display = 'flex';
        
        // Firebase Console එකේ ඔබට පහසුවෙන් වෙනස් කිරීමට පරිශීලකයාගේ default settings සෑදීම
        const userSettingsRef = ref(rtdb, `user_chats/${user.uid}/settings`);
        const snap = await get(userSettingsRef);
        if (!snap.exists()) {
            await set(userSettingsRef, {
                isBlocked: false,
                isUnlimited: false
            });
        }
        await update(ref(rtdb, `user_chats/${user.uid}/userInfo`), {
            name: user.displayName || "Reader",
            email: user.email
        });

        listenToUserChat(user.uid);
    } else {
        chatWidget.style.display = 'none';
        fabMsgLeft.style.display = 'none';
    }
});

// 2. අදාළ පරිශීලකයාගේ Settings සහ Messages එකවර Real-time ලබා ගැනීම
function listenToUserChat(uid) {
    activeUserChatRef = ref(rtdb, `user_chats/${uid}`);

    onValue(activeUserChatRef, (snapshot) => {
        const data = snapshot.val() || {};

        // Settings ලබා ගැනීම (isBlocked සහ isUnlimited)
        const settings = data.settings || {};
        isUserBlocked = settings.isBlocked === true;
        isUserUnlimited = settings.isUnlimited === true;

        // Welcome note එක පෙන්වීම
        chatMessagesBox.innerHTML = `
            <div class="chat-welcome-note">
                Have a quick question? You can send up to <strong>3 messages</strong> at a time. Once the author replies, you get 3 more! ✨
            </div>
        `;

        consecutiveUserMsgs = 0;

        // පණිවිඩ ලැයිස්තුව පරීක්ෂා කිරීම
        if (data.messages) {
            Object.values(data.messages).forEach((msg) => {
                // පාඨකයා එවූ එකක් නම් ගණන වැඩි කිරීම, Author ගේ Reply එකක් නම් 0 ට Reset කිරීම!
                if (msg.sender === 'user') {
                    consecutiveUserMsgs++;
                } else if (msg.sender === 'author') {
                    consecutiveUserMsgs = 0; // Author පිළිතුරු දුන් සැණින් නැවත අවස්ථා 3ක් ලැබේ!
                }

                const bubble = document.createElement('div');
                bubble.className = `msg-bubble ${msg.sender === 'user' ? 'msg-user' : 'msg-author'}`;
                
                const timeStr = msg.timestamp 
                    ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                    : '';

                bubble.innerHTML = `
                    <div>${msg.text}</div>
                    <span class="msg-time">${msg.sender === 'author' ? 'Author • ' : ''}${timeStr}</span>
                `;
                chatMessagesBox.appendChild(bubble);
            });
        }

        updateChatUIState();
        chatMessagesBox.scrollTop = chatMessagesBox.scrollHeight;
    });
}

// 3. Boolean Values අනුව Chat Box එක Lock/Unlock කිරීමේ Function එක
function updateChatUIState() {
    // අවස්ථාව 1: ඔබ සියලු දෙනාටම Chat එක Off කර ඇත්නම් (globalChatEnabled: false)
    if (!globalChatEnabled) {
        chatInput.disabled = true;
        chatSendBtn.disabled = true;
        chatInput.placeholder = "Direct messaging is currently offline.";
        chatLimitText.textContent = "Chat Offline";
        fabMsgLeft.textContent = "!";
        fabMsgLeft.style.background = "#e74c3c";
        return;
    }

    // අවස්ථාව 2: ඔබ මෙම පරිශීලකයාව පමණක් Block කර ඇත්නම් (isBlocked: true)
    if (isUserBlocked) {
        chatInput.disabled = true;
        chatSendBtn.disabled = true;
        chatInput.placeholder = "Messaging is disabled for your account.";
        chatLimitText.textContent = "Access Restricted";
        fabMsgLeft.textContent = "0";
        fabMsgLeft.style.background = "#e74c3c";
        return;
    }

    // අවස්ථාව 3: ඔබ මෙම පරිශීලකයාට Unlimited ලබා දී ඇත්නම් (isUnlimited: true)
    if (isUserUnlimited) {
        chatInput.disabled = false;
        chatSendBtn.disabled = false;
        chatInput.placeholder = "Type your message (Unlimited)...";
        chatLimitText.textContent = "Unlimited messaging active ✨";
        fabMsgLeft.textContent = "∞";
        fabMsgLeft.style.background = "#2ecc71";
        return;
    }

    // අවස්ථාව 4: සාමාන්‍ය පරිශීලකයෙක් (පණිවිඩ 3 සීමාව)
    const remaining = Math.max(0, MAX_CONSECUTIVE_MESSAGES - consecutiveUserMsgs);
    fabMsgLeft.textContent = remaining;

    if (remaining === 0) {
        chatInput.disabled = true;
        chatSendBtn.disabled = true;
        chatInput.placeholder = "Waiting for author's reply (3/3 sent)...";
        chatLimitText.textContent = "Wait for author reply to send more";
        fabMsgLeft.style.background = "#f39c12"; // තැඹිලි පාට (Reply එනතුරු)
    } else {
        chatInput.disabled = false;
        chatSendBtn.disabled = false;
        chatInput.placeholder = "Type your message...";
        chatLimitText.textContent = `${remaining} of ${MAX_CONSECUTIVE_MESSAGES} messages left`;
        fabMsgLeft.style.background = "#2ecc71";
    }
}

// 4. පණිවිඩයක් යැවීම
// --- අකුරු ගණන සීමා කිරීම (Character Limit) ---
const MAX_MESSAGE_CHARS = 250; // ඔබට අවශ්‍ය අකුරු සීමාව (උදා: 250)
const chatCharCount = document.getElementById('chat-char-count');

// පාඨකයා අකුරු Type කරන විට ගණන (0 / 250) පෙන්වීම සහ සීමාව ඉක්මවීම වැළැක්වීම
chatInput.addEventListener('input', () => {
    if (chatInput.value.length > MAX_MESSAGE_CHARS) {
        chatInput.value = chatInput.value.substring(0, MAX_MESSAGE_CHARS);
    }

    const currentLen = chatInput.value.length;
    if (chatCharCount) {
        chatCharCount.textContent = `${currentLen} / ${MAX_MESSAGE_CHARS}`;
        if (currentLen >= MAX_MESSAGE_CHARS) {
            chatCharCount.classList.add('limit-reached');
        } else {
            chatCharCount.classList.remove('limit-reached');
        }
    }
});

// 4. පණිවිඩයක් යැවීම
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // නීති පරීක්ෂා කිරීම
    if (!currentUser || !globalChatEnabled || isUserBlocked) return;
    if (!isUserUnlimited && consecutiveUserMsgs >= MAX_CONSECUTIVE_MESSAGES) return;

    const text = chatInput.value.trim();
    if (!text) return;

    // අකුරු 250 ට වැඩි නම් Send වීම නැවැත්වීම
    if (text.length > MAX_MESSAGE_CHARS) {
        alert(`Message is too long! Maximum allowed is ${MAX_MESSAGE_CHARS} characters.`);
        return;
    }

    // Input එක හිස් කර අකුරු ගණන නැවත 0 / 250 ලෙස සැකසීම
    chatInput.value = '';
    if (chatCharCount) {
        chatCharCount.textContent = `0 / ${MAX_MESSAGE_CHARS}`;
        chatCharCount.classList.remove('limit-reached');
    }

    try {
        const msgListRef = ref(rtdb, `user_chats/${currentUser.uid}/messages`);
        const newMsgRef = push(msgListRef);
        await set(newMsgRef, {
            sender: "user",
            text: text,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error("Failed to send message:", error);
        alert("Could not send message.");
    }
});