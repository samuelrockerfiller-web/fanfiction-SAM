// --- 1. Firebase Configuration & Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    getDocs 
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

async function loadStories() {
    try {
        const querySnapshot = await getDocs(collection(db, "stories"));
        storiesContainer.innerHTML = '';

        if (querySnapshot.empty) {
            storiesContainer.innerHTML = '<p class="loading-text">No stories published yet. Stay tuned! ✨</p>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const storyTitle = docSnap.id;
            const data = docSnap.data();
            const storyText = Object.values(data).find(val => typeof val === 'string') || "Story content is empty.";

            const storyItem = document.createElement('div');
            storyItem.className = 'story-item';
            storyItem.innerHTML = `
                <h3><i class="fas fa-book-open" style="color: var(--accent-color); margin-right: 10px; font-size: 1rem;"></i> ${storyTitle}</h3>
                <span>Read Now <i class="fas fa-chevron-right"></i></span>
            `;

            storyItem.addEventListener('click', () => {
                openStoryReader(storyTitle, storyText);
            });

            storiesContainer.appendChild(storyItem);
        });

    } catch (error) {
        console.error("Error loading stories:", error);
        storiesContainer.innerHTML = '<p class="loading-text" style="color: #ea4335;">Failed to load stories. Please check your connection.</p>';
    }
}

function openStoryReader(title, content) {
    readerTitle.textContent = title;
    readerContent.textContent = content;
    
    listSection.style.display = 'none';
    readerSection.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

backToListBtn.addEventListener('click', () => {
    readerSection.style.display = 'none';
    listSection.style.display = 'block';
});

// --- 4. පරිශීලකයා Log වී ඇත්දැයි පරීක්ෂා කර කතා පෙන්වීම ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Log වී සිටී නම් පමණක් කතා ලෝඩ් කිරීම
        loadStories();
    } else {
        // Log වී නොමැතිව මෙම පිටුවට පැමිණියහොත් මුල් පිටුවට හරවා යැවීම
        alert("Access Denied! Please log in from the home page to read stories. 🔒");
        window.location.href = "index.html";
    }
});