// --- 1. Firebase Configuration & Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    getDoc,
    addDoc,
    doc,            
    setDoc,         
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

// Initialize Firebase, Auth & Firestore
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


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


// --- 3. Fetch & Display Stories from Firestore ---
const storiesContainer = document.getElementById('stories-container');
const listSection = document.getElementById('stories-list-section');
const readerSection = document.getElementById('story-reader-section');
const readerTitle = document.getElementById('reader-title');
const readerContent = document.getElementById('reader-content');
const backToListBtn = document.getElementById('back-to-list-btn');

// 1. කතා නම් ලැයිස්තුව පමණක් ලබා ගැනීම (Session Cache + Single Index Document)
async function loadStories() {
    try {
        // පළමුව Browser එකේ (sessionStorage) කතා නම් ලැයිස්තුව Save වී ඇත්දැයි බැලීම (0 Reads!)
        const cachedTitles = sessionStorage.getItem('reverie_story_titles');
        if (cachedTitles) {
            renderStoryList(JSON.parse(cachedTitles));
            return;
        }

        // Browser එකේ නැතිනම් පමණක් Firestore හි Index Document එක කියවීම (කතා 100ක් තිබුණත් 1 Read පමණයි!)
        const indexDocRef = doc(db, "stories", "--story_index--");
        const indexSnap = await getDoc(indexDocRef);

        let titles = [];

        if (indexSnap.exists() && Array.isArray(indexSnap.data().titles)) {
            titles = indexSnap.data().titles;
        } else {
            // පළමු වතාවට පමණක් Index එක නොමැති නම් සියලු කතා බලා ස්වයංක්‍රීයව Index එක සෑදීම
            const querySnapshot = await getDocs(collection(db, "stories"));
            querySnapshot.forEach((docSnap) => {
                if (docSnap.id !== "--story_index--") {
                    titles.push(docSnap.id);
                    const data = docSnap.data();
                    const storyText = Object.values(data).find(val => typeof val === 'string') || "Story content is empty.";
                    sessionStorage.setItem('reverie_story_' + docSnap.id, storyText);
                }
            });
            await setDoc(indexDocRef, { titles: titles });
        }

        // කතා නම් ලැයිස්තුව Browser එකේ Save කර ගැනීම
        sessionStorage.setItem('reverie_story_titles', JSON.stringify(titles));
        renderStoryList(titles);

    } catch (error) {
        console.error("Error loading stories:", error);
        storiesContainer.innerHTML = '<p class="loading-text" style="color: #ea4335;">Failed to load stories. Please check your connection.</p>';
    }
}

// 2. කතා නම් ලැයිස්තුව පිටුවේ පෙන්වීම
function renderStoryList(titles) {
    storiesContainer.innerHTML = '';

    if (!titles || titles.length === 0) {
        storiesContainer.innerHTML = '<p class="loading-text">No stories published yet. Stay tuned! ✨</p>';
        return;
    }

    titles.forEach((storyTitle) => {
        const storyItem = document.createElement('div');
        storyItem.className = 'story-item';
        storyItem.innerHTML = `
            <h3><i class="fas fa-book-open" style="color: var(--accent-color); margin-right: 10px; font-size: 1rem;"></i> ${storyTitle}</h3>
            <span>Read Now <i class="fas fa-chevron-right"></i></span>
        `;

        storyItem.addEventListener('click', () => {
            fetchAndOpenStory(storyTitle);
        });

        storiesContainer.appendChild(storyItem);
    });
}

// 3. පාඨකයා Click කළ කතාව පමණක් ලෝඩ් කිරීම (හෝ Browser Cache එකෙන් ගැනීම)
async function fetchAndOpenStory(storyTitle) {
    // පාඨකයා මීට පෙර මෙම කතාව Open කර ඇත්නම් Browser එකෙන්ම ක්ෂණිකව පෙන්වීම (0 Reads!)
    const cachedContent = sessionStorage.getItem('reverie_story_' + storyTitle);
    if (cachedContent) {
        openStoryReader(storyTitle, cachedContent);
        return;
    }

    // අලුතින්ම කියවන කතාවක් නම් ඒ කතාව පමණක් Firestore වෙතින් ගැනීම (1 Read!)
    try {
        readerTitle.textContent = storyTitle;
        readerContent.innerHTML = '<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Loading story...</p>';
        listSection.style.display = 'none';
        readerSection.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });

        const storySnap = await getDoc(doc(db, "stories", storyTitle));
        if (storySnap.exists()) {
            const data = storySnap.data();
            const storyText = Object.values(data).find(val => typeof val === 'string') || "Story content is empty.";

            // කතාව Browser එකේ Save කර ගැනීම (නැවත කියවන විට Reads නොකැපීමට)
            sessionStorage.setItem('reverie_story_' + storyTitle, storyText);
            openStoryReader(storyTitle, storyText);
        } else {
            readerContent.innerHTML = '<p class="loading-text" style="color: #ea4335;">Story not found.</p>';
        }
    } catch (error) {
        console.error("Error fetching story:", error);
        readerContent.innerHTML = '<p class="loading-text" style="color: #ea4335;">Failed to load story content.</p>';
    }
}

function openStoryReader(title, content) {
    readerTitle.textContent = title;
    readerContent.innerHTML = '';

    // කතාව ඇතුළේ ඇති [NOTE: ...] සහ [NOTE-BTN: ...] කොටස් වෙන් කර හඳුනා ගැනීම
    const parts = content.split(/(\[NOTE-BTN:[\s\S]*?\]|\[NOTE:[\s\S]*?\])/g);

    parts.forEach((part) => {
        if (!part) return;

        // 1. [NOTE-BTN: ...] නම් (Short Note එක + Request a Story බොත්තම)
        if (part.startsWith('[NOTE-BTN:') && part.endsWith(']')) {
            const noteText = part.slice(10, -1).trim();
            const noteBox = document.createElement('div');
            noteBox.className = 'story-inline-note';
            noteBox.innerHTML = `
                <div class="story-inline-note-header"><i class="fas fa-feather-alt"></i> Author's Note</div>
                <p></p>
                <div class="story-note-btn-wrap">
                    <button type="button" class="btn btn-primary">Request a Story <i class="fas fa-magic"></i></button>
                </div>
            `;
            noteBox.querySelector('p').textContent = noteText;
            noteBox.querySelector('button').addEventListener('click', openRequestModal);
            readerContent.appendChild(noteBox);
        } 
        // 2. [NOTE: ...] නම් (Short Note එක පමණක්)
        else if (part.startsWith('[NOTE:') && part.endsWith(']')) {
            const noteText = part.slice(6, -1).trim();
            const noteBox = document.createElement('div');
            noteBox.className = 'story-inline-note';
            noteBox.innerHTML = `
                <div class="story-inline-note-header"><i class="fas fa-feather-alt"></i> Author's Note</div>
                <p></p>
            `;
            noteBox.querySelector('p').textContent = noteText;
            readerContent.appendChild(noteBox);
        } 
        // 3. සාමාන්‍ය කතාවේ ඡේද
        else {
            const cleanText = part.replace(/^\n+|\n+$/g, '');
            if (cleanText.length > 0) {
                const textSpan = document.createElement('div');
                textSpan.className = 'story-chunk-text';
                textSpan.textContent = cleanText;
                readerContent.appendChild(textSpan);
            }
        }
    });

    listSection.style.display = 'none';
    readerSection.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Back to Stories List බොත්තම ක්‍රියාත්මක කිරීම
backToListBtn.addEventListener('click', () => {
    readerSection.style.display = 'none';
    listSection.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

let currentUser = null;

// --- 4. පරිශීලකයා Log වී ඇත්දැයි පරීක්ෂා කර කතා පෙන්වීම ---
onAuthStateChanged(auth, (user) => {
    if (user && user.emailVerified) {
        currentUser = user;
        // Log වී සිටී නම් පමණක් කතා ලෝඩ් කිරීම
        loadStories();
    } else {
        // Log වී නොමැතිව මෙම පිටුවට පැමිණියහොත් මුල් පිටුවට හරවා යැවීම
        alert("Access Denied! Please log in from the home page to read stories. 🔒");
        window.location.href = "index.html";
    }
});

// --- 5. Story Request Modal, Package Calculator & Gumroad Checkout ---
const modal = document.getElementById('request-modal');
const closeBtn = document.querySelector('.close-btn');
const form = document.getElementById('fanfic-form');
const reqSubmitBtn = document.getElementById('req-submit-btn');

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
    5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60,
    75, 90, 105, 120,
    140, 160, 180,
    210, 240, 270, 300, 330, 360
];

const BASE_PRICE_PER_5_MIN = 9.90;
const WORDS_PER_MINUTE = 200;
let currentStepIndex = 0;

let selectedPackageData = {
    readingTime: "5 minutes",
    minutes: 5,
    words: "1,000+ Words",
    originalPrice: "$9.90",
    finalPrice: "$9.90",
    discount: "$0.00"
};

const GUMROAD_PRODUCT_URL = "https://katiebird1.gumroad.com/l/custom-book";

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

const GUMROAD_OPTION_IDS = [
    "https://katiebird1.gumroad.com/l/custom-book?option=90hlaffWqUjesZ4I_9txbw%3D%3D&_gl=1*14oqzvt*_ga*NTM4MTg3NDQ1LjE3ODc4NDA0OTg.*_ga_6LJN6D94N6*czE3OTQ3NjMzNTYkbzE4JGcxJHQxNzk0NzYzNjY2JGoyMSRsMCRoMA..",
    "https://katiebird1.gumroad.com/l/custom-book?option=9irR_vbBcNcNMrUd6CEwVg%3D%3D&_gl=1*14w2aw9*_ga*NTM4MTg3NDQ1LjE3ODc4NDA0OTg.*_ga_6LJN6D94N6*czE3OTQ3NjMzNTYkbzE4JGcxJHQxNzk0NzYzNzExJGo2MCRsMCRoMA..",
    "https://katiebird1.gumroad.com/l/custom-book?option=SCQplKiEfdwpOi3Jv7Fvrw%3D%3D&_gl=1*9mlvzq*_ga*NTM4MTg3NDQ1LjE3ODc4NDA0OTg.*_ga_6LJN6D94N6*czE3OTQ3NjMzNTYkbzE4JGcxJHQxNzk0NzYzODAyJGo0OCRsMCRoMA..",
    "https://katiebird1.gumroad.com/l/custom-book?option=DermBNKh29kIzatV5b4Www%3D%3D&_gl=1*167o5bb*_ga*NTM4MTg3NDQ1LjE3ODc4NDA0OTg.*_ga_6LJN6D94N6*czE3OTQ3NjMzNTYkbzE4JGcxJHQxNzk0NzY0MDEzJGo2MCRsMCRoMA..",
    "https://katiebird1.gumroad.com/l/custom-book?option=4pNrvop1ipmZ9lmfDB-vUQ%3D%3D&_gl=1*4jjxm3*_ga*NTM4MTg3NDQ1LjE3ODc4NDA0OTg.*_ga_6LJN6D94N6*czE3OTQ3NjMzNTYkbzE4JGcxJHQxNzk0NzY0MDEzJGo2MCRsMCRoMA..",
    "https://katiebird1.gumroad.com/l/custom-book?option=IzsiuhEUwbpkU5CLc7xmSQ%3D%3D&_gl=1*1t90f5n*_ga*NTM4MTg3NDQ1LjE3ODc4NDA0OTg.*_ga_6LJN6D94N6*czE3OTQ3NjMzNTYkbzE4JGcxJHQxNzk0NzY0MDY2JGo3JGwwJGgw",
    "https://katiebird1.gumroad.com/l/custom-book?option=d86NWhARJvAVPb4VJPgecw%3D%3D&_gl=1*1t90f5n*_ga*NTM4MTg3NDQ1LjE3ODc4NDA0OTg.*_ga_6LJN6D94N6*czE3OTQ3NjMzNTYkbzE4JGcxJHQxNzk0NzY0MDY2JGo3JGwwJGgw",
    "https://katiebird1.gumroad.com/l/custom-book?option=itKuZa3z3n3mmyQ2fP7zKw%3D%3D&_gl=1*q0jg1i*_ga*NTM4MTg3NDQ1LjE3ODc4NDA0OTg.*_ga_6LJN6D94N6*czE3OTQ3NjMzNTYkbzE4JGcxJHQxNzk0NzY0MDY2JGo3JGwwJGgw",
    "https://katiebird1.gumroad.com/l/custom-book?option=KP-GklerCFS848Sd-GpWLg%3D%3D&_gl=1*q0jg1i*_ga*NTM4MTg3NDQ1LjE3ODc4NDA0OTg.*_ga_6LJN6D94N6*czE3OTQ3NjMzNTYkbzE4JGcxJHQxNzk0NzY0MDY2JGo3JGwwJGgw",
    "https://katiebird1.gumroad.com/l/custom-book?option=8Fgf2eTaFxVS7l1mH2XhSw%3D%3D&_gl=1*q0jg1i*_ga*NTM4MTg3NDQ1LjE3ODc4NDA0OTg.*_ga_6LJN6D94N6*czE3OTQ3NjMzNTYkbzE4JGcxJHQxNzk0NzY0MDY2JGo3JGwwJGgw",
    "https://katiebird1.gumroad.com/l/custom-book?option=rClayQts1UBjmEfpY0TksQ%3D%3D&_gl=1*pycjfk*_ga*NTM4MTg3NDQ1LjE3ODc4NDA0OTg.*_ga_6LJN6D94N6*czE3OTQ3NjMzNTYkbzE4JGcxJHQxNzk0NzY0MDY2JGo3JGwwJGgw",
    "https://katiebird1.gumroad.com/l/custom-book?option=lO7wgJQiQrGlyrN5nUzTdw%3D%3D&_gl=1*pycjfk*_ga*NTM4MTg3NDQ1LjE3ODc4NDA0OTg.*_ga_6LJN6D94N6*czE3OTQ3NjMzNTYkbzE4JGcxJHQxNzk0NzY0MDY2JGo3JGwwJGgw",
    "https://katiebird1.gumroad.com/l/custom-book?option=nmwtblnoRnOsh4HvyNtCdw%3D%3D&_gl=1*pycjfk*_ga*NTM4MTg3NDQ1LjE3ODc4NDA0OTg.*_ga_6LJN6D94N6*czE3OTQ3NjMzNTYkbzE4JGcxJHQxNzk0NzY0MDY2JGo3JGwwJGgw",
    "https://katiebird1.gumroad.com/l/custom-book?option=dQM7Xs-F136f_w9LbDb03Q%3D%3D&_gl=1*pycjfk*_ga*NTM4MTg3NDQ1LjE3ODc4NDA0OTg.*_ga_6LJN6D94N6*czE3OTQ3NjMzNTYkbzE4JGcxJHQxNzk0NzY0MDY2JGo3JGwwJGgw",
    "https://katiebird1.gumroad.com/l/custom-book?option=TOg9ak0RBd3h5Xv6ryuE9A%3D%3D&_gl=1*1tb78dp*_ga*NTM4MTg3NDQ1LjE3ODc4NDA0OTg.*_ga_6LJN6D94N6*czE3OTQ3NjMzNTYkbzE4JGcxJHQxNzk0NzY0MDY2JGo3JGwwJGgw",
    "https://katiebird1.gumroad.com/l/custom-book?option=-ZLvTvQEQXBz7Wyl2n3EiQ%3D%3D&_gl=1*1tb78dp*_ga*NTM4MTg3NDQ1LjE3ODc4NDA0OTg.*_ga_6LJN6D94N6*czE3OTQ3NjMzNTYkbzE4JGcxJHQxNzk0NzY0MDY2JGo3JGwwJGgw",
    "https://katiebird1.gumroad.com/l/custom-book?option=c7Sd8S5NtlLF_6ErLXeorQ%3D%3D&_gl=1*1tb78dp*_ga*NTM4MTg3NDQ1LjE3ODc4NDA0OTg.*_ga_6LJN6D94N6*czE3OTQ3NjMzNTYkbzE4JGcxJHQxNzk0NzY0MDY2JGo3JGwwJGgw",
    "https://katiebird1.gumroad.com/l/custom-book?option=QIv8JLjB9Y3pp2cLJjOzbg%3D%3D&_gl=1*1tb78dp*_ga*NTM4MTg3NDQ1LjE3ODc4NDA0OTg.*_ga_6LJN6D94N6*czE3OTQ3NjMzNTYkbzE4JGcxJHQxNzk0NzY0MDY2JGo3JGwwJGgw",
    "https://katiebird1.gumroad.com/l/custom-book?option=MwEd0x_7-aqv3e4ETw8zbA%3D%3D&_gl=1*1tb78dp*_ga*NTM4MTg3NDQ1LjE3ODc4NDA0OTg.*_ga_6LJN6D94N6*czE3OTQ3NjMzNTYkbzE4JGcxJHQxNzk0NzY0MDY2JGo3JGwwJGgw",
    "https://katiebird1.gumroad.com/l/custom-book?option=3fSB6qiALjx2jTdB6t6hKQ%3D%3D&_gl=1*1sxr9wj*_ga*NTM4MTg3NDQ1LjE3ODc4NDA0OTg.*_ga_6LJN6D94N6*czE3OTQ3NjMzNTYkbzE4JGcxJHQxNzk0NzY0MDY2JGo3JGwwJGgw",
    "https://katiebird1.gumroad.com/l/custom-book?option=FQw7-dV22AA3adyh4-P-jg%3D%3D&_gl=1*1sxr9wj*_ga*NTM4MTg3NDQ1LjE3ODc4NDA0OTg.*_ga_6LJN6D94N6*czE3OTQ3NjMzNTYkbzE4JGcxJHQxNzk0NzY0MDY2JGo3JGwwJGgw",
    "https://katiebird1.gumroad.com/l/custom-book?option=8iHTAWRJQAoDbBJOIBxrkQ%3D%3D&_gl=1*1sxr9wj*_ga*NTM4MTg3NDQ1LjE3ODc4NDA0OTg.*_ga_6LJN6D94N6*czE3OTQ3NjMzNTYkbzE4JGcxJHQxNzk0NzY0MDY2JGo3JGwwJGgw",
    "https://katiebird1.gumroad.com/l/custom-book?option=kbZvQFOt8K18_woZ5aW06A%3D%3D&_gl=1*1sxr9wj*_ga*NTM4MTg3NDQ1LjE3ODc4NDA0OTg.*_ga_6LJN6D94N6*czE3OTQ3NjMzNTYkbzE4JGcxJHQxNzk0NzY0MDY2JGo3JGwwJGgw",
    "https://katiebird1.gumroad.com/l/custom-book?option=nWKT43kg7z78wQMTAP-heg%3D%3D&_gl=1*1sxr9wj*_ga*NTM4MTg3NDQ1LjE3ODc4NDA0OTg.*_ga_6LJN6D94N6*czE3OTQ3NjMzNTYkbzE4JGcxJHQxNzk0NzY0MDY2JGo3JGwwJGgw",
    "https://katiebird1.gumroad.com/l/custom-book?option=hfwg4o34l45ij9xT7R8Z_Q%3D%3D&_gl=1*1sxr9wj*_ga*NTM4MTg3NDQ1LjE3ODc4NDA0OTg.*_ga_6LJN6D94N6*czE3OTQ3NjMzNTYkbzE4JGcxJHQxNzk0NzY0MDY2JGo3JGwwJGgw"
];

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

function updateModalCalculator(index) {
    currentStepIndex = index;
    modalTimeSlider.value = index;

    const minutes = TIME_STEPS[index];
    const fiveMinBlocks = minutes / 5;
    const words = minutes * WORDS_PER_MINUTE;

    const originalPrice = fiveMinBlocks * BASE_PRICE_PER_5_MIN;
    const totalDiscount = calculateFairDiscount(minutes);
    const finalPrice = originalPrice - totalDiscount;

    const formattedTime = formatReadingTimeText(minutes);
    const formattedWords = `${words.toLocaleString()}+ Words`;

    modalPkgTime.textContent = formattedTime;
    modalPkgWords.textContent = formattedWords;
    modalFinalPrice.textContent = finalPrice.toFixed(2);

    if (totalDiscount > 0) {
        modalOrigPrice.style.display = 'inline';
        modalOrigPrice.textContent = `$${originalPrice.toFixed(2)}`;
        modalDiscountTag.style.display = 'inline-block';
        modalDiscountVal.textContent = totalDiscount.toFixed(2);
    } else {
        modalOrigPrice.style.display = 'none';
        modalDiscountTag.style.display = 'none';
    }

    selectedPackageData = {
        readingTime: formattedTime,
        minutes: minutes,
        words: formattedWords,
        originalPrice: `$${originalPrice.toFixed(2)}`,
        finalPrice: `$${finalPrice.toFixed(2)}`,
        discount: `$${totalDiscount.toFixed(2)}`
    };

    modalMinusBtn.disabled = (currentStepIndex === 0);
    modalPlusBtn.disabled = (currentStepIndex === TIME_STEPS.length - 1);
}

function openRequestModal() {
    if (currentUser) {
        modal.style.display = 'flex';
        if (currentUser.displayName) {
            document.getElementById('req-name').value = currentUser.displayName;
        }
    } else {
        alert("Please log in first to request a custom story! 🔒✨");
        window.location.href = "index.html";
    }
}

closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
});

modalTimeSlider.addEventListener('input', (e) => updateModalCalculator(parseInt(e.target.value)));
modalMinusBtn.addEventListener('click', () => {
    if (currentStepIndex > 0) updateModalCalculator(currentStepIndex - 1);
});
modalPlusBtn.addEventListener('click', () => {
    if (currentStepIndex < TIME_STEPS.length - 1) updateModalCalculator(currentStepIndex + 1);
});

updateModalCalculator(0);

// Form Submit -> Save to Firestore & Redirect to Gumroad
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    reqSubmitBtn.innerHTML = 'Saving & Opening Checkout... <i class="fas fa-spinner fa-spin"></i>';
    reqSubmitBtn.disabled = true;

    const reqName = document.getElementById('req-name').value;
    const reqContact = document.getElementById('req-contact').value;
    const reqFandom = document.getElementById('req-fandom').value;
    const reqPlot = document.getElementById('req-plot').value;

    const selectedVersionName = GUMROAD_VERSIONS[currentStepIndex] || GUMROAD_VERSIONS[0];
    const rawOption = GUMROAD_OPTION_IDS[currentStepIndex] || GUMROAD_OPTION_IDS[0];

    let cleanOptionId = rawOption.includes('option=')
        ? rawOption.split('option=')[1].split('&')[0]
        : rawOption.trim();

    cleanOptionId = encodeURIComponent(decodeURIComponent(cleanOptionId));

    const safePlot = reqPlot.substring(0, 1500);
    const checkoutUrl = `${GUMROAD_PRODUCT_URL}?option=${cleanOptionId}&wanted=true&email=${encodeURIComponent(currentUser.email)}&uid=${encodeURIComponent(currentUser.uid)}&contact=${encodeURIComponent(reqContact)}&plot=${encodeURIComponent(safePlot)}`;

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
            packageTime: selectedPackageData.readingTime,
            packageMinutes: selectedPackageData.minutes,
            packageWords: selectedPackageData.words,
            packagePrice: selectedPackageData.finalPrice,
            packageDiscount: selectedPackageData.discount,
            gumroadVersion: selectedVersionName,
            status: "Order received. I’ll keep you updated on your story soon. ⏳",
            requestedAt: serverTimestamp()
        });

        form.reset();
        modal.style.display = 'none';
        window.location.href = checkoutUrl;

    } catch (error) {
        console.error("Error saving request: ", error);
        alert("Failed to send request. Please try again!");
    } finally {
        reqSubmitBtn.innerHTML = 'Send Request <i class="fas fa-paper-plane"></i>';
        reqSubmitBtn.disabled = false;
    }
});