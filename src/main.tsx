

// Add this ENTIRE block to the very top of src/main.tsx

import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, doc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, runTransaction, FieldValue } from "firebase/firestore";

// --- Your Firebase project's configuration ---
// Get this from your Firebase project settings in the console
const firebaseConfig = {
  apiKey: "AIzaSyAFIWXm3HOZkcuoCWdKg_hn9mFoFyJArqQ",
  authDomain: "book-hub-club.firebaseapp.com",
  projectId: "book-hub-club",
  storageBucket: "book-hub-club.firebasestorage.app",
  messagingSenderId: "284120564183",
  appId: "1:284120564183:web:83e5818edc1832f54c0b92"
};

// --- Initialize Firebase and Firestore ---
let db; // Declare 'db' at the top level so all functions can access it

const initializeFirebase = () => {
    if (getApps().length === 0) {
        const firebaseApp = initializeApp(firebaseConfig);
        db = getFirestore(firebaseApp);
    }
};

// =======================================================
// The rest of your existing code starts here...
// =======================================================

// --- Type Definitions ---
interface LiteraryPreferences {
    // ...
}
// ...

// --- Type Definitions ---
interface LiteraryPreferences {
    genre?: string;
    pace?: string;
    adventure?: string;
}

interface UserProfile {
    name: string;
    bio: string;
    literaryPseudonym: string; 
    profileImageUrl: string; 
    literaryPreferences: LiteraryPreferences;
}

interface User {
    id: string;
    email: string;
    hashedPassword: string; 
    name: string;
    literaryPseudonym: string; 
    profileImageUrl: string; 
    onboardingComplete: boolean;
    literaryPreferences: LiteraryPreferences;
}

interface Book {
    id: string;
    title: string;
    author?: string;
    status: 'Pending' | 'Reading' | 'Read';
    coverImageUrl?: string;
}

interface BomRatings {
    plot: number;
    characters: number;
    writingStyle: number;
    overallEnjoyment: number;
}

interface BomComment {
    id: string;
    userId: string;
    userNameDisplay: string; // Pseudonym or actual name
    text: string;
    timestamp: number;
}

interface BomEntry {
    id: string; // e.g., "2024-07_the_midnight_library"
    monthYear: string; // e.g., "2024-07"
    title: string;
    author: string;
    description: string;
    coverImageUrl?: string;
    promptHint: string;
    setBy: 'default' | 'vote' | 'admin'; // How this BOM was chosen
    discussionStarters?: string[];
}

interface BomProposal {
    id: string;
    bookTitle: string;
    bookAuthor: string;
    bookCoverImageUrl?: string;
    reason: string;
    proposedByUserId: string;
    proposedByUserName: string; // Pseudonym or name
    proposalMonthYear: string; // For which month this is proposed (e.g., "2024-08")
    votes: string[]; // Array of user IDs who voted for this
    timestamp: number;
}


// --- Constants & Initial Data ---


const DEFAULT_BOM_SEED: Omit<BomEntry, 'id' | 'monthYear' | 'setBy'> = {
    title: "The Midnight Library",
    author: "Matt Haig",
    description: "Between life and death there is a library, and within that library, the shelves go on forever. Every book provides a chance to try another life you could have lived. To see how things would be if you had made other choices... Would you have done anything different, if you had the chance to undo your regrets?",
    promptHint: "themes of regret, choices, and parallel lives",
    coverImageUrl: "https://covers.openlibrary.org/b/id/10309991-L.jpg",
};

// --- localStorage Utilities ---
const Storage = {
    getItem: (key, defaultValue) => {
        const item = localStorage.getItem(key);
        if (item) {
            try {
                return JSON.parse(item);
            } catch (e) {
                console.error(`Error parsing localStorage item "${key}":`, e);
                return defaultValue; 
            }
        }
        return defaultValue;
    },
    setItem: (key, value) => {
        localStorage.setItem(key, JSON.stringify(value));
    },
    getUserItem: (userId, key, defaultValue) => {
        if (!userId) return defaultValue;
        return Storage.getItem(`user_${userId}_${key}`, defaultValue);
    },
    setUserItem: (userId, key, value) => {
        if (!userId) return;
        Storage.setItem(`user_${userId}_${key}`, value);
    }
};

// --- State Management (Global) ---
let users: User[] = Storage.getItem("users", []);
let currentUser: User | null = Storage.getItem("currentUser", null);

let currentView = Storage.getItem("currentView", "bookofthemonth");
let currentAuthProcessView = 'auth_options'; 
let authError = null;
let onboardingAnswers: LiteraryPreferences = {};
let generatedPseudonym = ''; 
let generatedProfileImageBase64Data = ''; 
let isProcessingOnboarding = false;
let savedScrollPosition: number | null = null;
const mainContentId = 'main-content-area'; // Define a constant for our scrolling element's ID

// --- NEW: Proposal Detail Modal State ---
let showProposalDetailModal = false;
let selectedProposalForModal: BomProposal | null = null;
let isLoadingModalDescription = false; // <-- NEW: To show a loading indicator
let modalBookDescription = '';

// --- Book of the Month State ---

// This is the new hardcoded data.
const hardcodedBomHistory: BomEntry[] = [
    // The original default book (we can keep it as a past entry)
    {
        id: "2024-07_the_midnight_library",
        monthYear: "2024-07", // A past month
        title: "The Midnight Library",
        author: "Matt Haig",
        description: "Between life and death there is a library, and within that library, the shelves go on forever. Every book provides a chance to try another life you could have lived. To see how things would be if you had made other choices... Would you have done anything different, if you had the chance to undo your regrets?",
        promptHint: "themes of regret, choices, and parallel lives",
        coverImageUrl: "https://covers.openlibrary.org/b/id/10309991-L.jpg",
        setBy: 'default',
        discussionStarters: []
    },
    // The NEW Book of the Month for July 2025
    {
        id: "2025-07_intermezzo",
        monthYear: "2025-07",
        title: "Intermezzo",
        author: "Sally Rooney",
        description: "A story of siblings Peter and Ivan Koubek, who have contrasting lives but are united by grief after their father's death. The novel explores their complex relationships with each other and with the women they love, navigating love, loss, and the intricacies of family.",
        promptHint: "themes of grief, sibling relationships, and modern love",
        coverImageUrl: "https://books.google.com/books/content?id=nx75EAAAQBAJ&printsec=frontcover&img=1&zoom=0&edge=curl&source=gbs_api",
        setBy: 'default',
        discussionStarters: []
    }
];

// This line now uses the hardcoded data as a fallback if localStorage is empty.
// 1. ALWAYS initialize the app state from our hardcoded array.
let bookOfTheMonthHistory: BomEntry[] = hardcodedBomHistory;
// 2. IMMEDIATELY save this "correct" state to localStorage, overwriting any old data.
Storage.setItem("bookOfTheMonthHistory", bookOfTheMonthHistory);
let currentBomToDisplay: BomEntry | null = null;
let activeBomId: string | null = null; 

// Global collections for ratings and comments related to BOM entries
let globalBomRatings: { [bomId: string]: { [userId: string]: BomRatings } } = Storage.getItem("globalBomRatings", {});
let globalBomComments: { [bomId: string]: { [userId: string]: BomComment } } = Storage.getItem("globalBomComments", {}); // Assuming one review-comment per user per BoM

let discussionStarters: string[] = [];
let isLoadingDiscussionStarters = false;
let discussionStartersError: string | null = null;

// --- End of Book of the Month State ---

// Book of the Month State
//let bookOfTheMonthHistory: BomEntry[] = Storage.getItem("bookOfTheMonthHistory", []);
//let currentBomToDisplay: BomEntry | null = null;
//let activeBomId: string | null = null; 

// Global collections for ratings and comments related to BOM entries
//let globalBomRatings: { [bomId: string]: { [userId: string]: BomRatings } } = Storage.getItem("globalBomRatings", {});
//let globalBomComments: { [bomId: string]: { [userId: string]: BomComment } } = Storage.getItem("globalBomComments", {}); // Assuming one review-comment per user per BoM

//let discussionStarters: string[] = [];
//let isLoadingDiscussionStarters = false;
//let discussionStartersError: string | null = null;

// Book of the Month Proposal State
let bomProposals: BomProposal[] = [];
let showBomProposalModal = false;
let bomProposal_searchText = '';
let bomProposal_searchResults: any[] = [];
let bomProposal_isLoadingSearch = false;
let bomProposal_searchError: string | null = null;
let bomProposal_formTitle = '';
let bomProposal_formAuthor = '';
let bomProposal_formCoverUrl = '';
let bomProposal_formReason = '';
let bomProposal_targetMonthYear = ''; // e.g., "2024-08"


// User-specific state - will be loaded on login / after onboarding
let books: Book[] = [];
let userProfile: UserProfile = { 
    name: "Book Lover", 
    bio: "Exploring worlds, one page at a time.", 
    literaryPseudonym: "", 
    profileImageUrl: "", 
    literaryPreferences: {} 
};
let chatMessages = Storage.getItem("chatMessagesGlobal", []); 
let myBooksSearchTerm = '';

// Add Book Modal State
let showAddBookModal = false;
let addBook_searchText = '';
let addBook_searchResults: any[] = [];
let addBook_isLoadingSearch = false;
let addBook_searchError: string | null = null;
let addBook_formTitle = '';
let addBook_formAuthor = '';
let addBook_formCoverUrl = '';

// Review Book Modal State (after marking as 'Read')
let showReviewBookModal = false;
let bookToReview: Book | null = null;
let reviewBook_formRatings: BomRatings = { plot: 0, characters: 0, writingStyle: 0, overallEnjoyment: 0 };
let reviewBook_formComment = '';


// --- Helper Functions ---
const generateId = () => Math.random().toString(36).substr(2, 9);

const simpleHash = (password) => {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; 
    }
    return `hashed_${hash}_${password.length}`; 
};

const getCurrentMonthYearString = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0'); // JavaScript months are 0-indexed
    return `${year}-${month}`;
};

const getNextMonthYearString = (): string => {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1; // Current month (1-12)

    month++; // Move to next month
    if (month > 12) {
        month = 1;
        year++;
    }
    return `${year}-${month.toString().padStart(2, '0')}`;
};

const formatMonthYearForDisplay = (monthYear: string): string => {
    if (!monthYear || !/^\d{4}-\d{2}$/.test(monthYear)) return "Invalid Date";
    const [year, monthNum] = monthYear.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
};


const initializeAndSetCurrentBOM = () => {
    //const currentMonthStr = getCurrentMonthYearString();
    // --- TEMPORARY CHANGE FOR TESTING ---
const currentMonthStr = "2025-07"; 
// const currentMonthStr = getCurrentMonthYearString(); // Comment out the original line
    let foundBomForCurrentMonth = bookOfTheMonthHistory.find(bom => bom.monthYear === currentMonthStr);

    if (!foundBomForCurrentMonth) {
        if (bookOfTheMonthHistory.length === 0) { 
            const newBomId = `${currentMonthStr}_${DEFAULT_BOM_SEED.title.toLowerCase().replace(/\s+/g, '_')}`;
            const initialBom: BomEntry = {
                ...DEFAULT_BOM_SEED,
                id: newBomId,
                monthYear: currentMonthStr,
                setBy: 'default',
                discussionStarters: []
            };
            bookOfTheMonthHistory.push(initialBom);
            Storage.setItem("bookOfTheMonthHistory", bookOfTheMonthHistory);
            foundBomForCurrentMonth = initialBom;
        } else {
            currentBomToDisplay = null; 
            activeBomId = null;
            discussionStarters = []; 
        }
    }
    
    currentBomToDisplay = foundBomForCurrentMonth || null; 
    if (currentBomToDisplay) {
        activeBomId = currentBomToDisplay.id;
        discussionStarters = currentBomToDisplay.discussionStarters || [];
    } else {
        activeBomId = null;
        discussionStarters = [];
    }
};


const loadUserSpecificData = async () => {
    if (!currentUser || !currentUser.id) {
        books = [];
        userProfile = { 
            name: "Book Lover", 
            bio: "Exploring worlds, one page at a time.", 
            literaryPseudonym: "", 
            profileImageUrl: "", 
            literaryPreferences: {} 
        };
        // globalBomRatings and globalBomComments are loaded globally, not per user.
        return;
    }
    try {
    // --- This is the new, crucial part ---
    const response = await fetch('/.netlify/functions/get-my-books', {
      method: 'POST',
      body: JSON.stringify({ userId: currentUser.id })
    });

    if (!response.ok) {
      // If the fetch fails, log an error but don't crash
      console.error("Failed to fetch user books:", response.statusText);
      books = []; // Keep books empty on failure
    } else {
      const data = await response.json();
      //
      // This is the most important line:
      // We update the global 'books' variable with the data from the server.
      //
      books = data.books || []; 
    }

  } catch (error) {
    console.error("Error in loadUserSpecificData:", error);
    books = []; // Also keep books empty on a network error
  }

  //
  // We no longer call renderApp() here. We let the calling function handle it.
  // This prevents the re-render race condition.
  //
};

const renderAverageStars = (categoryValue: number) => {
    let starsHtml = '';
    const roundedRating = Math.round(categoryValue);
    for (let i = 1; i <= 5; i++) {
        starsHtml += `<span class="material-icons static-star ${i <= roundedRating ? 'filled' : ''}" aria-label="${i} star">${i <= roundedRating ? 'star' : 'star_border'}</span>`;
    }
    return `${starsHtml} (${categoryValue.toFixed(1)} average)`;
};

const renderMainAverageRating = (overallValue: number, ratersCount: number) => {
    if (ratersCount === 0) {
        return `<p class="main-rating-no-reviews">Be the first to read and review!</p>`;
    }

    let starsHtml = '';
    // Use Math.floor to only show full stars, or Math.round for nearest star.
    // Let's use Math.round for a more generous look.
    const roundedRating = Math.round(overallValue); 
    for (let i = 1; i <= 5; i++) {
        // We'll use a slightly different class to style them if needed
        starsHtml += `<span class="material-icons main-rating-star ${i <= roundedRating ? 'filled' : ''}">${i <= roundedRating ? 'star' : 'star_border'}</span>`;
    }
    
    // Combine stars with a text description
    return `
        <div class="main-rating-display">
            ${starsHtml}
            <span class="main-rating-text">${overallValue.toFixed(1)} average rating • ${ratersCount} review(s)</span>
        </div>
    `;
};

function updateView () {
    // 1. Find the scrolling container and save its position
    const mainContent = document.getElementById(mainContentId);
    if (mainContent) {
        savedScrollPosition = mainContent.scrollTop;
    }

    // 2. Re-render the entire app
    renderApp();

    // 3. After rendering, find the NEW container and restore the scroll position
    const newMainContent = document.getElementById(mainContentId);
    if (newMainContent && savedScrollPosition !== null) {
        newMainContent.scrollTop = savedScrollPosition;
    }
    // Reset for next time
    savedScrollPosition = null; 
};

// --- Rendering Functions ---

const MyBooksView = () => {
    const searchTerm = myBooksSearchTerm.toLowerCase();

    const readingBooks = books.filter(book => book.status === 'Reading');
    const otherBooks = books.filter(book => book.status !== 'Reading');

    const filterBySearchTerm = (book: Book) => {
        if (!searchTerm) return true;
        const titleMatch = book.title.toLowerCase().includes(searchTerm);
        const authorMatch = (book.author || '').toLowerCase().includes(searchTerm);
        return titleMatch || authorMatch;
    };

    const filteredReadingBooks = readingBooks.filter(filterBySearchTerm);
    const filteredOtherBooks = otherBooks.filter(filterBySearchTerm);

    const booksToDisplay = [...filteredReadingBooks, ...filteredOtherBooks];

    let booksHtml;
    if (books.length === 0) {
        booksHtml = `<p>Your reading list is empty. Add a book to get started!</p>`;
    } else if (booksToDisplay.length === 0 && searchTerm) {
        booksHtml = `<p>No books match your search for "${myBooksSearchTerm}".</p>`;
    } else if (booksToDisplay.length === 0 && !searchTerm) {
        // This case might not be reachable if books.length > 0 and searchTerm is empty.
        // It's here for completeness if filtering logic changes.
        booksHtml = `<p>Your reading list is currently empty or filtered out.</p>`;
    }
    else {
        booksHtml = booksToDisplay.map(book => `
            <div class="book-item" id="book-${book.id}">
                <div class="book-item-content">
                    ${book.coverImageUrl ? `<img src="${book.coverImageUrl}" alt="Cover of ${book.title}" class="book-cover-thumbnail">` : '<div class="book-cover-placeholder-small">No Cover</div>'}
                    <div class="book-item-details">
                        <h3>${book.title}</h3>
                        <p><em>by ${book.author || 'Unknown Author'}</em></p>
                        <p>Status: <span class="status-tag status-${book.status.toLowerCase()}">${book.status}</span></p>
                    </div>
                </div>
                <div class="book-item-actions">
                    ${book.status !== 'Reading' ? `<button data-action="set-status" data-book-id="${book.id}" data-status="Reading">Mark as reading</button>` : ''}
                    ${book.status !== 'Read' ? `<button data-action="set-status" data-book-id="${book.id}" data-status="Read">Mark as read</button>` : ''}
                    ${book.status !== 'Pending' ? `<button data-action="set-status" data-book-id="${book.id}" data-status="Pending">Mark as pending</button>` : ''}
                    <button class="danger" data-action="delete-book" data-book-id="${book.id}">Delete</button>
                </div>
            </div>
        `).join('');
    }

    return `
        <div class="page" id="mybooks-view">
            <div class="search-bar-container">
                <input type="search" id="myBooksSearchInput" placeholder="Search by title or author..." value="${myBooksSearchTerm}" aria-label="Search my books">
            </div>
            ${booksHtml}
        </div>
    `;
};


const BookOfTheMonthView = () => {
    // This is a good debug log to keep for now.
    console.log("Rendering BookOfTheMonthView. currentBomToDisplay is:", currentBomToDisplay);

    // --- Part 1: Handle the case where there is no Book of the Month ---
    if (!currentBomToDisplay) {
        return `
            <div class="page" id="bom-view">
                <div class="book-item">
                    <h2>Book of the Month</h2>
                    <p>The Book of the Month for ${formatMonthYearForDisplay(getCurrentMonthYearString())} has not been set yet. Check back for proposals and voting!</p>
                </div>
                ${currentUser ? renderBomProposalSection() : ''}
            </div>
        `;
    }

    // --- Part 2: If we have a book, prepare all its data for rendering ---

    const { title, author, description, coverImageUrl, monthYear, id: activeBomId } = currentBomToDisplay;

    // --- All calculation logic goes here, before the return statement ---
    
    // Calculate Average Ratings
    // --- NEW, COMBINED Calculate Average Ratings ---

const allRatingsForThisBom = activeBomId ? globalBomRatings[activeBomId] : null;

// Variables for the DETAILED breakdown (like you had before)
let detailedAverageRatings: BomRatings = { plot: 0, characters: 0, writingStyle: 0, overallEnjoyment: 0 };
let ratingCounts = { plot: 0, characters: 0, writingStyle: 0, overallEnjoyment: 0 };

// Variables for the NEW single overall average
let finalOverallAverage = 0;
let totalRaters = 0;

if (allRatingsForThisBom) {
    const userRatingsArray: BomRatings[] = Object.values(allRatingsForThisBom);
    totalRaters = userRatingsArray.length;

    if (totalRaters > 0) {
        const individualUserAverages: number[] = [];

        userRatingsArray.forEach(userRating => {
            // --- Part 1: Accumulate for the detailed breakdown ---
            if (userRating.plot > 0) { detailedAverageRatings.plot += userRating.plot; ratingCounts.plot++; }
            if (userRating.characters > 0) { detailedAverageRatings.characters += userRating.characters; ratingCounts.characters++; }
            if (userRating.writingStyle > 0) { detailedAverageRatings.writingStyle += userRating.writingStyle; ratingCounts.writingStyle++; }
            if (userRating.overallEnjoyment > 0) { detailedAverageRatings.overallEnjoyment += userRating.overallEnjoyment; ratingCounts.overallEnjoyment++; }

            // --- Part 2: Calculate this user's personal average for the new overall score ---
            const scores = [userRating.plot, userRating.characters, userRating.writingStyle, userRating.overallEnjoyment];
            const validScores = scores.filter(score => score > 0);
            if (validScores.length > 0) {
                const sumOfScores = validScores.reduce((acc, score) => acc + score, 0);
                const userAverage = sumOfScores / validScores.length;
                individualUserAverages.push(userAverage);
            }
        });

        // --- Finalize Part 1: The detailed breakdown averages ---
        if (ratingCounts.plot > 0) detailedAverageRatings.plot /= ratingCounts.plot;
        if (ratingCounts.characters > 0) detailedAverageRatings.characters /= ratingCounts.characters;
        if (ratingCounts.writingStyle > 0) detailedAverageRatings.writingStyle /= ratingCounts.writingStyle;
        if (ratingCounts.overallEnjoyment > 0) detailedAverageRatings.overallEnjoyment /= ratingCounts.overallEnjoyment;
        
        // --- Finalize Part 2: The new single overall average ---
        if (individualUserAverages.length > 0) {
            const sumOfAllUserAverages = individualUserAverages.reduce((acc, avg) => acc + avg, 0);
            finalOverallAverage = sumOfAllUserAverages / individualUserAverages.length;
        }
    }
}



    // Get Comments/Reviews
    const allCommentsForThisBom = activeBomId ? globalBomComments[activeBomId] : null;
    const bomReviews: BomComment[] = allCommentsForThisBom ? Object.values(allCommentsForThisBom).sort((a, b) => b.timestamp - a.timestamp) : [];

    // Logic for "Start Reading this Book" button
    let startReadingButtonHtml = '';
    if (currentUser && currentBomToDisplay) {
        const bomInMyBooks = books.find(book =>
            book.title.toLowerCase() === currentBomToDisplay.title.toLowerCase() &&
            (book.author || '').toLowerCase() === (currentBomToDisplay.author || '').toLowerCase()
        );
        if (bomInMyBooks && bomInMyBooks.status === 'Reading') {
            startReadingButtonHtml = `<button class="button bom-action-button" disabled>Currently Reading (In My Books)</button>`;
        } else {
            startReadingButtonHtml = `<button class="button bom-action-button primary" data-action="start-reading-bom">Start reading this book</button>`;
        }
    }

    // --- Part 3: Return the final, clean HTML structure ---
    return `
        <div class="page" id="bom-view">

            <!-- Main Book of the Month Section -->
            <div class="book-item">
                <h2>Book of the Month: ${formatMonthYearForDisplay(monthYear)}</h2>
                
                <div class="bom-main-layout-container">
                    <!-- Column 1: Image -->
                    <div class="bom-image-wrapper">
                        <img src="${(coverImageUrl || '').replace('http://', 'https://')}" 
                             alt="Cover of ${title}" 
                             class="bom-cover-image">
                    </div>
                    <!-- Column 2: Text -->
                    <div class="bom-text-wrapper">
                         <!-- NEW wrapper for the growing content -->
    <div class="bom-text-content">
        <h3>${title}</h3>
        <p><em>by ${author}</em></p>
        ${renderMainAverageRating(finalOverallAverage, totalRaters)}
        <p>${description}</p>
    </div>
                        <div class="bom-main-actions">
                            ${startReadingButtonHtml}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Community Ratings Section -->
            <div class="book-item">
                <h3>Community Ratings</h3>
                ${totalRaters > 0 ? `
                    <div class="rating-category">
                        <p>Plot: <span class="rating-stars-display">${renderAverageStars(detailedAverageRatings.plot)}</span></p>
                    </div>
                    <div class="rating-category">
                        <p>Characters: <span class="rating-stars-display">${renderAverageStars(detailedAverageRatings.characters)}</span></p>
                    </div>
                    <div class="rating-category">
                        <p>Writing Style: <span class="rating-stars-display">${renderAverageStars(detailedAverageRatings.writingStyle)}</span></p>
                    </div>
                    <div class="rating-category">
                        <p>Overall Enjoyment: <span class="rating-stars-display">${renderAverageStars(detailedAverageRatings.overallEnjoyment)}</span></p>
                    </div>
                    <p class="total-raters-note">Based on ${totalRaters} review(s).</p>
                ` : `<p>No ratings submitted yet for this book.</p>`}
            </div>
            
            <!-- Thoughts from Readers Section -->
            <div class="book-item">
                <h3>Thoughts from Readers</h3>
                <div id="bomReviewsList">
                    ${bomReviews.length === 0 ? "<p>No reviews yet. Be the first to read and review!</p>" : bomReviews.map(review => `
                        <div class="comment-item">
                            <p><strong>${review.userNameDisplay}</strong> <span class="comment-timestamp">${new Date(review.timestamp).toLocaleString()}</span></p>
                            <p>${review.text.replace(/\n/g, '<br>')}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <!-- Proposals Section -->
            ${currentUser ? renderBomProposalSection() : ''}
        </div>
    `;
};


// This is the new, correct version of the function.
// Replace your old one with this.

const renderBomProposalSection = () => {
    if (!currentUser) return '';

    const nextMonthTarget = getNextMonthYearString();
    const userProposalsForNextMonth = bomProposals.filter(p => p.proposedByUserId === currentUser!.id && p.proposalMonthYear === nextMonthTarget);
    const canProposeMore = userProposalsForNextMonth.length < 3;

    const currentProposalsForNextMonth = bomProposals.filter(p => p.proposalMonthYear === nextMonthTarget)
        .sort((a, b) => {
        // Sort by number of votes in descending order (most votes first)
        const voteDifference = b.votes.length - a.votes.length;

        // If two books have the same number of votes, sort the newer one first
        if (voteDifference === 0) {
            return b.timestamp - a.timestamp;
        }

        return voteDifference;
    });

    return `
        <div class="book-item" id="bom-proposal-section">
            <h3>Propose & Vote for Book of ${formatMonthYearForDisplay(nextMonthTarget)}</h3>
            <p class="voting-deadline-note">Proposal and voting deadline: 25th of the current month.</p>
            ${canProposeMore ? `
                <p>You can propose ${3 - userProposalsForNextMonth.length} more book(s) for next month.</p>
                <button class="button" data-action="show-bom-proposal-modal">Propose a Book</button>
            ` : `
                <p>You have submitted the maximum of 3 proposals for next month. You can still vote!</p>
            `}
            
            <h4>Current Proposals for ${formatMonthYearForDisplay(nextMonthTarget)}:</h4>
            ${currentProposalsForNextMonth.length === 0 ? `
                <p>No books proposed yet for ${formatMonthYearForDisplay(nextMonthTarget)}. Be the first!</p>
            ` : `
                <div class="bom-proposals-list">
                    ${currentProposalsForNextMonth.map(proposal => {
                        const userVotedForThis = proposal.votes.includes(currentUser!.id);
                        
                        // Logic for the vote button
                        const voteButtonHtml = userVotedForThis 
                            ? `<button class="button small-button voted" data-action="toggle-bom-proposal-vote" data-proposal-id="${proposal.id}">
                                 <span class="material-icons">how_to_vote</span> Voted (${proposal.votes.length})
                               </button>`
                            : `<button class="button small-button primary" data-action="toggle-bom-proposal-vote" data-proposal-id="${proposal.id}">
                                 <span class="material-icons">how_to_vote</span> Vote (${proposal.votes.length})
                               </button>`;

                        // Logic for the delete button
                        const deleteButtonHtml = (currentUser && proposal.proposedByUserId === currentUser.id)
                            ? `<button class="button small-button danger" data-action="delete-bom-proposal" data-proposal-id="${proposal.id}">
                                 <span class="material-icons">delete</span>
                               </button>`
                            : '';
                        
                        // This is the HTML structure for a single proposal item
                        return `
                        <div class="bom-proposal-item ${userVotedForThis ? 'user-voted-highlight' : ''}" data-action="show-proposal-detail" data-proposal-id="${proposal.id}" role="button" tabindex="0">
                            ${proposal.bookCoverImageUrl ? `<img src="${proposal.bookCoverImageUrl}" alt="Cover of ${proposal.bookTitle}" class="book-cover-thumbnail">` : '<div class="book-cover-placeholder-small">No Cover</div>'}
                            <div class="bom-proposal-details">
                                <h4>${proposal.bookTitle}</h4>
                                <p><em>by ${proposal.bookAuthor || 'Unknown Author'}</em></p>
                                <p class="proposal-reason"><strong>Reason:</strong> ${proposal.reason}</p>
                                <p class="proposed-by">Proposed by: ${proposal.proposedByUserName}</p>
                                <div class="proposal-actions">
                                   ${voteButtonHtml}
                                   ${deleteButtonHtml}
                                </div>
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
            `}
        </div>
    `;
};

const renderBomProposalModal = () => {
    if (!showBomProposalModal || !currentUser) return '';

    const targetMonthDisplay = formatMonthYearForDisplay(bomProposal_targetMonthYear);
    let searchResultsHtml = '';
    if (bomProposal_isLoadingSearch) {
        searchResultsHtml = `<div class="loading-indicator modal-loading">Searching for books...</div>`;
    } else if (bomProposal_searchError) {
        searchResultsHtml = `<p class="error-message">${bomProposal_searchError}</p>`;
    } else if (bomProposal_searchResults.length > 0) {
        searchResultsHtml = `
            <ul class="book-search-results">
                ${bomProposal_searchResults.map((book, index) => `
                    <li class="book-search-result-item">
                        <img src="${book.cover || './book-placeholder.png'}" alt="Cover of ${book.title}" class="book-search-result-cover">
                        <div class="book-search-result-details">
                            <h4>${book.title}</h4>
                            <p>${book.author}</p>
                        </div>
                        <button class="button small-button" data-action="select-searched-bom-proposal-book" data-index="${index}">Select</button>
                    </li>
                `).join('')}
            </ul>
        `;
    } else if (bomProposal_searchText && !bomProposal_isLoadingSearch && bomProposal_searchResults.length === 0) {
         searchResultsHtml = `<p>No books found for "${bomProposal_searchText}". Try different keywords.</p>`;
    }

    return `
        <div class="modal open" id="bomProposalModalContainer" role="dialog" aria-labelledby="bomProposalModalTitle" aria-modal="true">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 id="bomProposalModalTitle">Propose Book for ${targetMonthDisplay}</h2>
                    <button class="close-button" data-action="close-bom-proposal-modal" aria-label="Close proposal dialog">&times;</button>
                </div>

                <div class="book-search-section">
                    <label for="bomProposalBookSearchText">Search for a book to propose:</label>
                    <div class="search-input-group">
                        <input type="text" id="bomProposalBookSearchText" placeholder="Enter title or author" value="${bomProposal_searchText}">
                        <button id="performBomProposalBookSearchButton" class="button" ${bomProposal_isLoadingSearch ? 'disabled' : ''}>
                            ${bomProposal_isLoadingSearch ? 'Searching...' : 'Search'}
                        </button>
                    </div>
                    ${searchResultsHtml}
                </div>
                
                <hr class="modal-divider">

                <form id="bomProposalForm" class="form">
                    <div>
                        <label for="bomProposalBookTitle">Book Title:</label>
                        <input type="text" id="bomProposalBookTitle" name="title" required value="${bomProposal_formTitle}" readonly>
                    </div>
                    <div>
                        <label for="bomProposalBookAuthor">Author:</label>
                        <input type="text" id="bomProposalBookAuthor" name="author" value="${bomProposal_formAuthor}" readonly>
                    </div>
                    <div>
                        <label for="bomProposalBookCoverUrl">Cover Image URL (optional):</label>
                        <input type="url" id="bomProposalBookCoverUrl" name="coverImageUrl" placeholder="https://example.com/image.jpg" value="${bomProposal_formCoverUrl}" readonly>
                        ${bomProposal_formCoverUrl ? `<img src="${bomProposal_formCoverUrl}" alt="Selected cover preview" class="modal-cover-preview">` : ''}
                    </div>
                    <div>
                        <label for="bomProposalReason">Why are you proposing this book?</label>
                        <textarea id="bomProposalReason" name="reason" required rows="3" placeholder="Share a few words about why this would be a great Book of the Month.">${bomProposal_formReason}</textarea>
                    </div>
                    <button type="submit">Submit Proposal</button>
                </form>
            </div>
        </div>
    `;
};


const renderReviewBookModal = () => {
    if (!showReviewBookModal || !bookToReview || !currentUser) return '';

    const renderRatingStarsInput = (category: keyof BomRatings, currentValue: number) => {
        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            starsHtml += `<span class="material-icons interactive-star ${i <= currentValue ? 'filled' : ''}" data-category="${category}" data-value="${i}" role="button" tabindex="0" aria-label="${i} star for ${category}">star</span>`;
        }
        return starsHtml;
    };
    
    return `
        <div class="modal open" id="reviewBookModalContainer" role="dialog" aria-labelledby="reviewBookModalTitle" aria-modal="true">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 id="reviewBookModalTitle">Review: ${bookToReview.title}</h2>
                    <button class="close-button" data-action="close-review-book-modal" aria-label="Close review dialog">&times;</button>
                </div>
                <form id="reviewBookForm" class="form">
                    <p>You've marked "${bookToReview.title}" by ${bookToReview.author || 'Unknown Author'} as 'Read'. Share your thoughts!</p>
                    
                    <div class="book-item">
                        <h3>Rate this Book</h3>
                        <div class="rating-category">
                            <p>Plot: <span class="rating-stars" data-category-stars="plot">${renderRatingStarsInput('plot', reviewBook_formRatings.plot)}</span></p>
                        </div>
                        <div class="rating-category">
                            <p>Characters: <span class="rating-stars" data-category-stars="characters">${renderRatingStarsInput('characters', reviewBook_formRatings.characters)}</span></p>
                        </div>
                        <div class="rating-category">
                            <p>Writing Style: <span class="rating-stars" data-category-stars="writingStyle">${renderRatingStarsInput('writingStyle', reviewBook_formRatings.writingStyle)}</span></p>
                        </div>
                        <div class="rating-category">
                            <p>Overall Enjoyment: <span class="rating-stars" data-category-stars="overallEnjoyment">${renderRatingStarsInput('overallEnjoyment', reviewBook_formRatings.overallEnjoyment)}</span></p>
                        </div>
                    </div>

                    <div>
                        <label for="reviewBookComment">Your Review (optional):</label>
                        <textarea id="reviewBookComment" name="comment" rows="4" placeholder="What did you think of the book?">${reviewBook_formComment}</textarea>
                    </div>
                    <div class="modal-actions">
                        <button type="submit" class="button primary" data-action="submit-review-book">Submit review</button>
                        <button type="button" class="button secondary" data-action="skip-review-book">Mark as read & skip</button>
                    </div>
                </form>
            </div>
        </div>
    `;
};

const renderProposalDetailModal = () => {
    if (!showProposalDetailModal || !selectedProposalForModal) return '';

    const { bookTitle, bookAuthor, bookCoverImageUrl, reason } = selectedProposalForModal;

    // --- NEW: Logic to display the description ---
    let descriptionHtml = '';
    if (isLoadingModalDescription) {
        descriptionHtml = `<div class="loading-indicator">Loading summary...</div>`;
    } else {
        // We add the <p> tag here
        descriptionHtml = `<p>${modalBookDescription}</p>`;
    }

    return `
        <div class="modal open" id="proposalDetailModalContainer" ...>
            <div class="modal-content">
                <div class="modal-header">
                    <h2 id="proposalDetailModalTitle">${bookTitle}</h2>
                    <button class="close-button" data-action="close-proposal-detail-modal" ...>×</button>
                </div>
                
                <div class="bom-main-layout-container">
                    <div class="bom-image-wrapper">
                        ${bookCoverImageUrl ? `<img src="${bookCoverImageUrl}" alt="Cover of ${bookTitle}" class="bom-cover-image">` : '<div class="book-cover-placeholder bom-cover-placeholder">No Cover</div>'}
                    </div>
                    <div class="bom-text-wrapper">
                        <p><em>by ${bookAuthor || 'Unknown Author'}</em></p>
                        
                        <!-- Description Section -->
                        <h4>Summary:</h4>
                        <div class="modal-description-wrapper">
                            ${descriptionHtml}
                        </div>

                        <!-- Reason Section -->
                        <h4>Reason for Proposal:</h4>
                        <p class="proposal-reason">${reason}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
};

// Chat View
const ChatView = () => {
    return `
        <div class="page" id="chat-view">
            <div class="chat-messages" id="chatMessagesContainer" aria-live="polite">
                ${chatMessages.length === 0 ? "<p>No messages yet. Start the conversation!</p>" : chatMessages.sort((a,b) => a.timestamp - b.timestamp).map(msg => `
                    <div class="chat-message ${msg.userId === currentUser?.id ? 'user' : 'other'}">
                        <strong>${msg.userId === currentUser?.id ? 'You' : (msg.userPseudonym || msg.userName || 'Anonymous')}</strong>
                        <p>${msg.text}</p>
                        <span class="chat-timestamp">${new Date(msg.timestamp).toLocaleTimeString()}</span>
                    </div>
                `).join('')}
            </div>
            <div class="chat-input-container">
                <input type="text" id="chatMessageInput" placeholder="Type your message..." aria-label="Chat message input">
                <button id="sendChatMessage" class="button"><span class="material-icons">send</span></button>
            </div>
        </div>
    `;
};

// Profile View
const ProfileView = () => {
    const { profileImageUrl, literaryPseudonym, name, bio, literaryPreferences } = userProfile;
    const placeholderId = `profileAvatarPlaceholder-${currentUser!.id}`; 
    const imageId = `profileImage-${currentUser!.id}`; 
    const initials = (literaryPseudonym || name || 'U').substring(0,2).toUpperCase();

    const initialImageDisplay = profileImageUrl ? 'block' : 'none';
    const initialPlaceholderDisplay = profileImageUrl ? 'none' : 'flex';

    return `
        <div class="page" id="profile-view">
            <div class="profile-avatar-container">
                <img id="${imageId}"
                     src="${profileImageUrl || '#'}" 
                     alt="${literaryPseudonym || name}'s profile picture" 
                     class="profile-avatar-large"
                     style="display: ${initialImageDisplay};"
                     onerror="console.log('ProfileView image load error for:', this.src); this.style.display='none'; document.getElementById('${placeholderId}').style.display='flex';">
                
                <div id="${placeholderId}" 
                     class="profile-avatar-large-placeholder" 
                     style="display: ${initialPlaceholderDisplay};">
                    ${initials}
                </div>
            </div>
            ${literaryPseudonym ? `<h2 class="profile-pseudonym">${literaryPseudonym}</h2>` : ''}
            <div class="profile-section">
                <form id="profileForm" class="form">
                    <div>
                        <label for="profileName">Name:</label>
                        <input type="text" id="profileName" name="name" value="${name || ''}" required>
                    </div>
                    <div>
                        <label for="profileBio">Bio:</label>
                        <textarea id="profileBio" name="bio">${bio || ''}</textarea>
                    </div>
                    <button type="submit">Save Profile</button>
                </form>
            </div>
            <div class="profile-section">
                <h3>Literary Preferences</h3>
                ${literaryPreferences && (literaryPreferences.genre || literaryPreferences.pace || literaryPreferences.adventure) ? `
                    <p><strong>Favorite Genre:</strong> ${literaryPreferences.genre || 'Not set'}</p>
                    <p><strong>Reading Pace:</strong> ${literaryPreferences.pace || 'Not set'}</p>
                    <p><strong>Preferred Adventures:</strong> ${literaryPreferences.adventure || 'Not set'}</p>
                ` : '<p>Your literary preferences will appear here after onboarding.</p>'}
            </div>
             <div class="profile-section">
                <button id="logoutButton" class="button danger">Logout</button>
            </div>
        </div>
    `;
};


// --- Auth & Onboarding Views ---
const AuthOptionsView = () => `
    <div class="page auth-page" id="auth-options-view">
        <div class="auth-container">
            <h2>Welcome to Book Club Hub!</h2>
            <p>Join our community of readers.</p>
            ${authError ? `<p class="error-message">${authError}</p>` : ''}
            <button class="button large-button" data-auth-action="show-login">Login</button>
            <button class="button large-button secondary" data-auth-action="show-register">Register</button>
            <p class="auth-note">Note: This app uses localStorage for user data. For optimal experience, use in a single browser.</p>
        </div>
    </div>
`;

const RegisterView = () => `
    <div class="page auth-page" id="register-view">
        <div class="auth-container">
            <h2>Create Your Account</h2>
            ${authError ? `<p class="error-message">${authError}</p>` : ''}
            <form id="registerForm" class="form">
                <div>
                    <label for="registerEmail">Email:</label>
                    <input type="email" id="registerEmail" name="email" required>
                </div>
                <div>
                    <label for="registerPassword">Password:</label>
                    <input type="password" id="registerPassword" name="password" required minlength="6">
                </div>
                 <div>
                    <label for="registerConfirmPassword">Confirm Password:</label>
                    <input type="password" id="registerConfirmPassword" name="confirmPassword" required minlength="6">
                </div>
                <button type="submit">Register</button>
            </form>
            <p>Already have an account? <button class="link-button" data-auth-action="show-login">Login here</button></p>
        </div>
    </div>
`;

const LoginView = () => `
    <div class="page auth-page" id="login-view">
        <div class="auth-container">
            <h2>Login to Your Account</h2>
            ${authError ? `<p class="error-message">${authError}</p>` : ''}
            <form id="loginForm" class="form">
                <div>
                    <label for="loginEmail">Email:</label>
                    <input type="email" id="loginEmail" name="email" required>
                </div>
                <div>
                    <label for="loginPassword">Password:</label>
                    <input type="password" id="loginPassword" name="password" required>
                </div>
                <button type="submit">Login</button>
            </form>
            <p>Don't have an account? <button class="link-button" data-auth-action="show-register">Register here</button></p>
        </div>
    </div>
`;

const OnboardingQuestionsView = () => `
    <div class="page onboarding-page" id="onboarding-questions-view">
        <div class="onboarding-container">
            <h2>Tell Us About Your Reading Style!</h2>
            <p>This will help us personalize your experience.</p>
            ${authError ? `<p class="error-message">${authError}</p>` : ''}
            <form id="onboardingQuestionsForm" class="form">
                <div class="form-group">
                    <label for="genre">What's your favorite book genre?</label>
                    <select id="genre" name="genre" required>
                        <option value="">-- Select a Genre --</option>
                        <option value="Fantasy">Fantasy</option>
                        <option value="Sci-Fi">Sci-Fi</option>
                        <option value="Mystery">Mystery</option>
                        <option value="Romance">Romance</option>
                        <option value="Thriller">Thriller</option>
                        <option value="Historical Fiction">Historical Fiction</option>
                        <option value="Contemporary">Contemporary</option>
                        <option value="Literary Fiction">Literary Fiction</option>
                        <option value="Classic">Classic Literature</option>
                        <option value="Non-Fiction">Non-Fiction</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="pace">How would you describe your reading pace?</label>
                    <select id="pace" name="pace" required>
                        <option value="">-- Select Pace --</option>
                        <option value="Speed-reader">Speed-reader (I devour books quickly!)</option>
                        <option value="Steady & Consistent">Steady & Consistent (A chapter or two a day)</option>
                        <option value="Takes my time">Takes my time (I like to savor every word)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="adventure">What kind of literary adventures do you seek?</label>
                    <select id="adventure" name="adventure" required>
                        <option value="">-- Select Adventure Type --</option>
                        <option value="Epic world-building">Epic world-building and intricate plots</option>
                        <option value="Deep character studies">Deep character studies and emotional journeys</option>
                        <option value="Thought-provoking ideas">Thought-provoking ideas and philosophical explorations</option>
                        <option value="Heart-pounding plots">Heart-pounding plots and thrilling suspense</option>
                        <option value="Comforting stories">Comforting stories and heartwarming moments</option>
                        <option value="Solving mysteries">Solving mysteries and uncovering secrets</option>
                        <option value="Timeless classics">Exploring timeless classics and literary masterpieces</option>
                    </select>
                </div>
                <button type="submit" ${isProcessingOnboarding ? 'disabled' : ''}>
                    ${isProcessingOnboarding ? 'Processing...' : 'Find My Literary Character!'}
                </button>
            </form>
        </div>
    </div>
`;

const OnboardingProcessingView = () => `
    <div class="page onboarding-page" id="onboarding-processing-view">
        <div class="onboarding-container">
            <h2>Conjuring Your Literary Alter Ego & Avatar...</h2>
            <div class="loading-indicator">Our AI is consulting the literary spirits and painting your portrait! Please wait.</div>
            <p>This might take a moment or two.</p>
        </div>
    </div>
`;

const OnboardingProfileSetupView = () => {
    const placeholderId = 'onboardingProfileImagePlaceholder';
    const imageId = 'onboardingProfileImagePreview';
    const initials = (generatedPseudonym || 'U').substring(0,2).toUpperCase();
    const imageUrl = generatedProfileImageBase64Data || '#'; 

    const initialImageDisplay = generatedProfileImageBase64Data ? 'block' : 'none';
    const initialPlaceholderDisplay = generatedProfileImageBase64Data ? 'none' : 'flex';
    
    return `
    <div class="page onboarding-page" id="onboarding-profile-setup-view">
        <div class="onboarding-container">
            <h2>Welcome, ${generatedPseudonym || "Reader"}!</h2>
            <p>Your literary character has been chosen and your avatar conjured.</p>
            <div class="profile-preview">
                 <div class="profile-avatar-container">
                    <img id="${imageId}"
                         src="${imageUrl}" 
                         alt="Your AI-generated profile picture based on ${generatedPseudonym}" 
                         class="profile-avatar-large" 
                         style="display: ${initialImageDisplay};"
                         onerror="console.log('OnboardingProfileSetupView image load error for:', this.src); this.style.display='none'; document.getElementById('${placeholderId}').style.display='flex';">
                    <div id="${placeholderId}" 
                         class="profile-avatar-large-placeholder" 
                         style="display: ${initialPlaceholderDisplay};">
                        ${initials}
                    </div>
                </div>
                <p>You embody: <strong>${generatedPseudonym}</strong></p>
            </div>
            ${authError ? `<p class="error-message">${authError}</p>` : ''}
            <form id="onboardingProfileForm" class="form">
                <div class="form-group">
                    <label for="onboardingName">What's your name? (This will be shown on your profile)</label>
                    <input type="text" id="onboardingName" name="name" required placeholder="Your Name">
                </div>
                <button type="submit">Complete Setup & Enter the Hub!</button>
            </form>
        </div>
    </div>
`;
};


const renderCurrentView = () => {
    if (!currentUser) { 
        switch (currentAuthProcessView) {
            case 'login': return LoginView();
            case 'register': return RegisterView();
            case 'auth_options':
            default: return AuthOptionsView();
        }
    } else if (!currentUser.onboardingComplete) { 
         switch (currentAuthProcessView) {
            case 'onboarding_questions': return OnboardingQuestionsView();
            case 'onboarding_processing': return OnboardingProcessingView();
            case 'onboarding_profile_setup': return OnboardingProfileSetupView();
            default: 
                currentAuthProcessView = 'onboarding_questions';
                return OnboardingQuestionsView();
        }
    }

    switch (currentView) {
        case "mybooks": return MyBooksView();
        case "bookofthemonth": return BookOfTheMonthView();
        case "chat": return ChatView();
        case "profile": return ProfileView();
        default:
            currentView = "bookofthemonth"; 
            return BookOfTheMonthView();
    }
};

const getHeaderTitle = () => {
    if (!currentUser || !currentUser.onboardingComplete) return "Book Club Hub";

    switch (currentView) {
        case "mybooks": return "My Books";
        case "bookofthemonth": return "Book of the Month";
        case "chat": return currentBomToDisplay ? `Chat: ${currentBomToDisplay.title}` : "Chat";
        case "profile": return "My Profile";
        default: return "Book Club Hub";
    }
};

const renderTopHeader = () => {
    let profileIconContent = '<span class="material-icons">account_circle</span>'; 
    if (currentUser && currentUser.onboardingComplete) {
        const initials = (userProfile.literaryPseudonym || userProfile.name || 'U').substring(0, 1).toUpperCase();
        const headerProfileImageId = 'headerProfileImage'; 
        const headerProfileInitialsId = 'headerProfileInitials'; 

        if (userProfile.profileImageUrl) {
            profileIconContent = `
                <img src="${userProfile.profileImageUrl}" 
                     alt="Profile" 
                     class="profile-icon-image"
                     id="${headerProfileImageId}"
                     style="display: block;" 
                     onerror="console.log('TopHeader image load error for:', this.src); this.style.display='none'; document.getElementById('${headerProfileInitialsId}').style.display='flex';">
                <div class="profile-icon-initials" 
                     id="${headerProfileInitialsId}" 
                     style="display:none;"> 
                     ${initials}
                </div>`;
        } else {
            profileIconContent = `<div class="profile-icon-initials">${initials}</div>`;
        }
    }

    return `
    <header class="top-header">
        <h1 class="top-header-title">${getHeaderTitle()}</h1>
        ${currentUser && currentUser.onboardingComplete ? `
            <button class="profile-icon-button" data-view="profile" aria-label="View Profile">
                ${profileIconContent}
            </button>
        ` : ''}
    </header>
`;
};


const renderBottomNav = () => {
    if (!currentUser || !currentUser.onboardingComplete) return ''; 

    const navItems = [
        { id: "bookofthemonth", icon: "auto_stories", label: "Book of Month" },
        { id: "mybooks", icon: "menu_book", label: "My Books" },
        { id: "chat", icon: "chat", label: "Chat" },
    ];
    return `
        <nav class="bottom-nav">
            ${navItems.map(item => `
                <button 
                    class="nav-item ${currentView === item.id ? 'active' : ''}" 
                    data-view="${item.id}"
                    aria-label="${item.label}"
                    aria-current="${currentView === item.id ? 'page' : 'false'}"
                >
                    <span class="material-icons">${item.icon}</span>
                    <span>${item.label}</span>
                </button>
            `).join('')}
        </nav>
    `;
};

const renderAddBookFAB = () => {
    if (!currentUser || !currentUser.onboardingComplete) return '';
    return `
    <button class="fab" id="addBookFab" aria-label="Add new book">
        <span class="material-icons">add</span>
    </button>
`;
}

const renderAddBookModal = () => {
    if (!showAddBookModal || !currentUser || !currentUser.onboardingComplete) return '';

    let searchResultsHtml = '';
    if (addBook_isLoadingSearch) {
        searchResultsHtml = `<div class="loading-indicator modal-loading">Searching for books...</div>`;
    } else if (addBook_searchError) {
        searchResultsHtml = `<p class="error-message">${addBook_searchError}</p>`;
    } else if (addBook_searchResults.length > 0) {
        searchResultsHtml = `
            <ul class="book-search-results">
                ${addBook_searchResults.map((book, index) => `
                    <li class="book-search-result-item">
                        <img src="${book.cover || './book-placeholder.png'}" alt="Cover of ${book.title}" class="book-search-result-cover">
                        <div class="book-search-result-details">
                            <h4>${book.title}</h4>
                            <p>${book.author}</p>
                        </div>
                        <button class="button small-button" data-action="select-searched-book" data-index="${index}">Select</button>
                    </li>
                `).join('')}
            </ul>
        `;
    } else if (addBook_searchText && !addBook_isLoadingSearch && addBook_searchResults.length === 0) {
         searchResultsHtml = `<p>No books found for "${addBook_searchText}". Try different keywords.</p>`;
    }


    return `
        <div class="modal open" id="addBookModalContainer" role="dialog" aria-labelledby="addBookModalTitle" aria-modal="true">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 id="addBookModalTitle">Add New Book</h2>
                    <button class="close-button" data-action="close-add-book-modal" aria-label="Close add book dialog">&times;</button>
                </div>

                <div class="book-search-section">
                    <label for="bookSearchText">Search for a book:</label>
                    <div class="search-input-group">
                        <input type="text" id="bookSearchText" placeholder="Enter title or author" value="${addBook_searchText}">
                        <button id="performBookSearchButton" class="button" ${addBook_isLoadingSearch ? 'disabled' : ''}>
                            ${addBook_isLoadingSearch ? 'Searching...' : 'Search'}
                        </button>
                    </div>
                    ${searchResultsHtml}
                </div>
                
                <hr class="modal-divider">

                <form id="addBookForm" class="form">
                    <div>
                        <label for="bookTitle">Title:</label>
                        <input type="text" id="bookTitle" name="title" required value="${addBook_formTitle}">
                    </div>
                    <div>
                        <label for="bookAuthor">Author:</label>
                        <input type="text" id="bookAuthor" name="author" value="${addBook_formAuthor}">
                    </div>
                    <div>
                        <label for="bookCoverImageUrl">Cover Image URL:</label>
                        <input type="url" id="bookCoverImageUrl" name="coverImageUrl" placeholder="https://example.com/image.jpg" value="${addBook_formCoverUrl}">
                        ${addBook_formCoverUrl ? `<img src="${addBook_formCoverUrl}" alt="Selected cover preview" class="modal-cover-preview">` : ''}
                    </div>
                    <button type="submit">Add Book to My List</button>
                </form>
            </div>
        </div>
    `;
};

// --- Event Handlers & Logic ---

const handleAuthAction = (event) => {
    const action = (event.target as HTMLElement).dataset.authAction;
    authError = null; 
    if (action === 'show-login') currentAuthProcessView = 'login';
    else if (action === 'show-register') currentAuthProcessView = 'register';
    else if (action === 'show-auth-options') currentAuthProcessView = 'auth_options';
    updateView();
};

const handleDeleteBomProposal = async (event: Event) => {
    event.stopPropagation(); // <-- Stop the bubble!
    if (!currentUser) return;
    const target = event.currentTarget as HTMLElement;
    const proposalId = target.dataset.proposalId;

    if (!proposalId) return;

    // Ask for confirmation
    if (!confirm("Are you sure you want to permanently delete this proposal?")) {
        return;
    }

    try {
        const res = await fetch('/.netlify/functions/delete-proposal', {
            method: 'POST',
            body: JSON.stringify({
                proposalId: proposalId,
                userId: currentUser.id // Send the current user's ID for verification
            })
        });

        if (!res.ok) {
            // Handle errors from the server like "Permission Denied"
            const errorData = await res.json();
            throw new Error(errorData.error || 'Failed to delete proposal.');
        }

        // Success! Re-fetch the list to update the UI.
        await fetchBomProposals();

    } catch (error) {
        console.error("Error deleting proposal:", error);
        alert(`Could not delete proposal: ${error.message}`);
    }
};

const handleRegister = (event) => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value.trim();
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    const confirmPassword = (form.elements.namedItem('confirmPassword') as HTMLInputElement).value;
    authError = null;

    if (password !== confirmPassword) {
        authError = "Passwords do not match.";
        updateView();
        return;
    }
    if (password.length < 6) {
        authError = "Password must be at least 6 characters long.";
        updateView();
        return;
    }

    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
        authError = "User with this email already exists.";
        updateView();
        return;
    }

    const userId = generateId();
    const newUser: User = {
        id: userId,
        email: email,
        hashedPassword: simpleHash(password), 
        onboardingComplete: false,
        name: email.split('@')[0], 
        literaryPseudonym: '',
        profileImageUrl: '',
        literaryPreferences: {}
    };
    users.push(newUser);
    Storage.setItem("users", users);

    currentUser = { ...newUser }; 
    Storage.setItem("currentUser", currentUser);
    
    Storage.setUserItem(currentUser.id, "profile", { 
        name: currentUser.name, 
        bio: "Just joined the club!",
        literaryPseudonym: '',
        profileImageUrl: '',
        literaryPreferences: {}
    } as UserProfile);
    Storage.setUserItem(currentUser.id, "books", []);
    // globalBomRatings and globalBomComments are not user-specific, no need to init here per user

    currentAuthProcessView = 'onboarding_questions';
    loadUserSpecificData(); 
    updateView();
};

const handleLogin = (event) => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value.trim();
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    authError = null;

    const user = users.find(u => u.email === email);
    if (!user || user.hashedPassword !== simpleHash(password)) { 
        authError = "Invalid email or password.";
        updateView(); // This is correct, show the error and stop.
        return;
    }

    currentUser = { ...user }; 
    Storage.setItem("currentUser", currentUser);

    // --- START OF THE NEW ASYNC LOGIC ---

    // We create an immediately-invoked async function here.
    // This lets us use 'await' inside without changing the outer function signature too much.
    (async () => {
        // Show a loading state if you have one, or just let the view be blank for a moment.
        // For example: root.innerHTML = '<div class="loading-indicator">Loading your library...</div>';

        // Wait for ALL the data to be fetched from the server.
        await loadUserSpecificData();
        await fetchBomProposals(); 

        // Now that all data is loaded and state variables are updated,
        // we can set the correct view.
        listenToUserData(); 
        initializeAndSetCurrentBOM(); 
        
        if (!currentUser.onboardingComplete) {
            currentAuthProcessView = 'onboarding_questions';
        } else {
            currentView = Storage.getItem("currentView", "bookofthemonth"); 
        }
        
        // And finally, call updateView() ONCE at the very end.
        //updateView();

    })(); // The () here immediately calls the async function.
    
    // --- END OF THE NEW ASYNC LOGIC ---
};

const handleLogout = () => {
    // Detach the listeners
    unsubscribeBooks();
    unsubscribeProposals();

    currentUser = null;
    Storage.setItem("currentUser", null);
    books = [];
    userProfile = { name: "Book Lover", bio: "Exploring worlds, one page at a time.", literaryPseudonym: "", profileImageUrl: "", literaryPreferences: {} };
    // globalBomRatings and globalBomComments remain as they are global
    myBooksSearchTerm = '';
    discussionStarters = [];
    isLoadingDiscussionStarters = false;
    discussionStartersError = null;
    currentView = 'bookofthemonth'; 
    currentAuthProcessView = 'auth_options';
    authError = null;
    initializeAndSetCurrentBOM(); 
    updateView();
};


// Inside your app.js, find the handleOnboardingQuestionsSubmit function

const handleOnboardingQuestionsSubmit = async (event) => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    onboardingAnswers = {
        genre: (form.elements.namedItem('genre') as HTMLSelectElement).value,
        pace: (form.elements.namedItem('pace') as HTMLSelectElement).value,
        adventure: (form.elements.namedItem('adventure') as HTMLSelectElement).value,
    };

    isProcessingOnboarding = true;
    currentAuthProcessView = 'onboarding_processing';
    generatedPseudonym = '';
    generatedProfileImageBase64Data = '';
    updateView(); // Re-render to show the "Processing..." view

    try {
        // --- This is the NEW fetch call to your secure backend ---
        const res = await fetch('/.netlify/functions/onboarding', {
            method: 'POST',
            body: JSON.stringify({
                ...onboardingAnswers,
                userId: currentUser!.id // Send the user ID for the image seed
            })
        });

        if (!res.ok) {
            // If the server function itself had an error
            throw new Error(`Server responded with status: ${res.status}`);
        }

        const data = await res.json(); // Get the response from your function

        // Use the data returned from your secure function
        generatedPseudonym = data.pseudonym;
        generatedProfileImageBase64Data = data.imageBase64;

        if (!generatedPseudonym) {
            generatedPseudonym = "The Inquisitive Reader"; // Fallback
        }
        if (!generatedProfileImageBase64Data) {
            authError = "Could not generate an avatar. A default will be used.";
        }

        currentAuthProcessView = 'onboarding_profile_setup';

    } catch (error) {
        console.error("Error during onboarding fetch process:", error);
        authError = "Oops! Our AI is pondering deeply. Could not complete setup.";
        // Provide fallbacks so the user isn't stuck
        generatedPseudonym = generatedPseudonym || "The Inquisitive Reader";
        generatedProfileImageBase64Data = '';
        currentAuthProcessView = 'onboarding_profile_setup';
    } finally {
        isProcessingOnboarding = false;
        updateView(); // Re-render to show the final profile setup view
    }
};

// This is the new, async version of your function

const handleOnboardingProfileSetupSubmit = async (event: Event) => { // <-- Made it async
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim();
    authError = null;

    if (!name) {
        authError = "Please enter your name.";
        updateView();
        return;
    }
    
    if (!currentUser) { 
        authError = "User session lost. Please try logging in again.";
        currentAuthProcessView = 'login';
        updateView();
        return;
    }
    
    // --- Start of new logic ---

    const imageUrlToSave = generatedProfileImageBase64Data || ''; 

    // 1. Prepare the complete, updated user object
    const updatedUserObject: User = {
        ...currentUser,
        name: name,
        literaryPseudonym: generatedPseudonym, 
        profileImageUrl: imageUrlToSave,
        literaryPreferences: onboardingAnswers,
        onboardingComplete: true,
    };
    
    // 2. Prepare the separate profile object (this might be redundant, but follows your original pattern)
    const newUserProfile: UserProfile = {
        name: name,
        bio: "Just joined the Book Club Hub!", 
        literaryPseudonym: generatedPseudonym, 
        profileImageUrl: imageUrlToSave,
        literaryPreferences: onboardingAnswers,
    };

    try {
        // 3. Save the data to Firebase and WAIT for it to finish.
        // We can do these in parallel for speed.
        await Promise.all([
            saveProfileToFirebase(newUserProfile), // This saves the profile data
            saveUserToFirebase(updatedUserObject)  // This saves the full user object
        ]);

        // 4. If saving was successful, now update the local state
        
        // Update the main 'users' array in memory
        const userIndex = users.findIndex(u => u.id === currentUser!.id);
        if (userIndex !== -1) {
            users[userIndex] = updatedUserObject;
        }

        // Update the 'currentUser' and 'userProfile' in memory
        currentUser = updatedUserObject;
        userProfile = newUserProfile;
        
        // This is UI state, so it's OK to keep it in localStorage
        Storage.setItem("currentUser", currentUser);
        
        // 5. Navigate to the main app view
        currentView = "bookofthemonth"; 

    } catch (error) {
        console.error("Failed to save onboarding data to Firebase:", error);
        authError = "There was a problem saving your profile. Please try again.";
    } finally {
        // 6. Re-render the app to show the new view or an error message
        updateView();
    }
};


const handleNavigation = (event) => {
    const target = event.currentTarget as HTMLElement;
    const view = target.dataset.view;
    if (view && currentUser && currentUser.onboardingComplete) { 
        currentView = view;
        Storage.setItem("currentView", currentView); 
        updateView(); 
    }
};

const handleShowProposalDetail = async (event: Event) => {
    const target = (event.target as HTMLElement).closest('.bom-proposal-item');
    if (!target) return;

    const proposalId = (target as HTMLElement).dataset.proposalId;
    if (!proposalId) return;

    const proposalToShow = bomProposals.find(p => p.id === proposalId);

    if (proposalToShow) {
        // --- Setup the modal state ---
        selectedProposalForModal = proposalToShow;
        showProposalDetailModal = true;
        isLoadingModalDescription = true; // Start in loading state
        modalBookDescription = ''; // Clear old description
        
        // Initial render to show the modal shell and loading indicator
        updateView(); 

        // --- Now, fetch the description in the background ---
        try {
            const res = await fetch('/.netlify/functions/get-book-details', {
                method: 'POST',
                body: JSON.stringify({
                    title: proposalToShow.bookTitle,
                    author: proposalToShow.bookAuthor
                })
            });
            if (!res.ok) throw new Error("Server fetch failed");
            
            const data = await res.json();
            modalBookDescription = data.description; // Store the fetched description

        } catch (error) {
            console.error("Failed to fetch book description:", error);
            modalBookDescription = "Could not load book summary. Please try again later.";
        } finally {
            isLoadingModalDescription = false; // Turn off loading
            // Re-render AGAIN, this time with the description populated
            updateView(); 
        }
    }
};

const handleCloseProposalDetail = () => {
    showProposalDetailModal = false;
    selectedProposalForModal = null;
    updateView(); // Re-render to hide the modal
};

// --- Add Book Modal Handlers ---
const resetAddBookModalState = () => {
    addBook_searchText = '';
    addBook_searchResults = [];
    addBook_isLoadingSearch = false;
    addBook_searchError = null;
    addBook_formTitle = '';
    addBook_formAuthor = '';
    addBook_formCoverUrl = '';
};

const handleAddBookFabClick = () => {
    resetAddBookModalState();
    showAddBookModal = true;
    updateView();
};

const handleCloseAddBookModal = () => {
    showAddBookModal = false;
    resetAddBookModalState();
    updateView();
};

const handleAddBookSearchInputChange = (event) => {
    addBook_searchText = (event.target as HTMLInputElement).value;
};

// In src/main.tsx

const GOOGLE_BOOKS_API_URL = 'https://www.googleapis.com/books/v1/volumes';
// Vite makes .env variables available on this special object
const BOOKS_API_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY;

// In src/main.tsx, add this new helper function

const handleSearchInputKeypress = (event: KeyboardEvent, searchButtonId: string) => {
    // Check if the key pressed was "Enter"
    if (event.key === 'Enter') {
        // Prevent the default Enter key behavior (like submitting a form)
        event.preventDefault(); 
        
        // Find the corresponding search button by its ID
        const searchButton = document.getElementById(searchButtonId) as HTMLButtonElement | null;
        
        // If the button exists and is not disabled, click it
        if (searchButton && !searchButton.disabled) {
            searchButton.click();
        }
    }
};
const handlePerformAddBookSearch = async () => {
    if (!addBook_searchText.trim()) {
        addBook_searchError = "Please enter a search term.";
        addBook_searchResults = [];
        updateView(); // Re-render
        return;
    }

    addBook_isLoadingSearch = true;
    addBook_searchError = null;
    addBook_searchResults = [];
    updateView(); // Re-render to show loading

    try {
        if (!BOOKS_API_KEY) {
            throw new Error("Books API Key is not configured.");
        }

        const query = encodeURIComponent(addBook_searchText.trim());
        const fullUrl = `${GOOGLE_BOOKS_API_URL}?q=${query}&maxResults=10&key=${BOOKS_API_KEY}`;
        
        // This fetch call now goes directly to Google's servers
        const res = await fetch(fullUrl);

        if (!res.ok) {
            throw new Error(`Google Books API error: ${res.status}`);
        }

        const data = await res.json();
        if (data.items && data.items.length > 0) {
            addBook_searchResults = data.items.map(item => {
                const volumeInfo = item.volumeInfo;
                return {
                    title: volumeInfo.title || "No Title",
                    author: volumeInfo.authors ? volumeInfo.authors.join(', ') : "Unknown Author",
                    cover: volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.smallThumbnail || null,
                };
            });
        } else {
            addBook_searchResults = [];
        }
    } catch (error) {
        console.error("Error searching books:", error);
        addBook_searchError = "Failed to search for books. Please try again.";
    } finally {
        addBook_isLoadingSearch = false;
        updateView(); // Re-render to show results or error
    }
};

const handleSelectSearchedBookForAdd = (event) => {
    const index = parseInt((event.target as HTMLElement).dataset.index!, 10);
    const selectedBook = addBook_searchResults[index];

    if (selectedBook) {
        addBook_formTitle = selectedBook.title;
        addBook_formAuthor = selectedBook.author;
        addBook_formCoverUrl = selectedBook.cover || '';
        addBook_searchResults = []; 
        addBook_searchText = ''; 
        updateView(); 
    }
};


const handleAddBookSubmit = async (event) => {
    event.preventDefault();
    const title = addBook_formTitle.trim();
    const author = addBook_formAuthor.trim();
    const coverImageUrl = addBook_formCoverUrl.trim();

    if (title && currentUser && currentUser.id) {
        const newBook: Book = {
            id: generateId(),
            title,
            author,
            status: "Pending",
            coverImageUrl: coverImageUrl || undefined,
        };
        books.push(newBook);
        //Storage.setUserItem(currentUser.id, "books", books);
        await saveBooksToFirebase();
        handleCloseAddBookModal(); 
    } else {
        alert("Book title is required.");
    }
};

const handleAddBookFormInputChange = (event) => {
    const { name, value } = event.target as HTMLInputElement;
    if (name === 'title') addBook_formTitle = value;
    else if (name === 'author') addBook_formAuthor = value;
    else if (name === 'coverImageUrl') addBook_formCoverUrl = value;
    updateView(); 
};


// --- MyBooksView Handlers ---
const handleBookAction = async (event) => {
    if (!currentUser || !currentUser.id) return;
    const target = event.target as HTMLElement;
    const action = target.dataset.action;
    const bookId = target.dataset.bookId;

    if (!action || !bookId) return;

    const bookIndex = books.findIndex(book => book.id === bookId);
    if (bookIndex === -1) return;

    if (action === "set-status") {
        const status = target.dataset.status! as Book['status'];
        if (status === 'Read') {
            bookToReview = { ...books[bookIndex] }; // Store the book to be reviewed
            reviewBook_formRatings = { plot: 0, characters: 0, writingStyle: 0, overallEnjoyment: 0 };
            reviewBook_formComment = '';
            showReviewBookModal = true;
            // The actual status update to 'Read' will happen after modal submission/skip
        } else {
            books[bookIndex] = { ...books[bookIndex], status };
            //Storage.setUserItem(currentUser.id, "books", books);
            await saveBooksToFirebase();
        }
    } else if (action === "delete-book") {
        if (confirm("Are you sure you want to delete this book?")) {
            books.splice(bookIndex, 1);
            //Storage.setUserItem(currentUser.id, "books", books);
            await saveBooksToFirebase();
        }
    }
    updateView();
};

const handleMyBooksSearchInputChange = (event) => {
    myBooksSearchTerm = (event.target as HTMLInputElement).value;
    updateView(); 
};


// --- Book of the Month Handlers (Discussion) ---
// Inside your app.js, replace the old function with this one

const handleFetchDiscussionStarters = async () => {
    if (!currentBomToDisplay) {
        discussionStartersError = "No Book of the Month is currently selected to generate starters.";
        updateView();
        return;
    }
    isLoadingDiscussionStarters = true;
    discussionStartersError = null;
    discussionStarters = [];
    updateView(); // Re-render to show loading state

    try {
        // --- NEW: Fetch call to your secure backend function ---
        const res = await fetch('/.netlify/functions/generate-starters', {
            method: 'POST',
            body: JSON.stringify({
                title: currentBomToDisplay.title,
                author: currentBomToDisplay.author,
                promptHint: currentBomToDisplay.promptHint,
            })
        });

        if (!res.ok) {
            throw new Error(`Server responded with status: ${res.status}`);
        }

        const data = await res.json(); // Get the response from your function

        if (data.starters && data.starters.length > 0) {
            const newStarters = data.starters;
            
            // Update the history item in localStorage
            const bomIndex = bookOfTheMonthHistory.findIndex(b => b.id === activeBomId);
            if (bomIndex !== -1) {
                bookOfTheMonthHistory[bomIndex].discussionStarters = newStarters;
                Storage.setItem("bookOfTheMonthHistory", bookOfTheMonthHistory);
            }
            // Update the state for the current view
            discussionStarters = newStarters;
        } else {
            // This could mean the AI returned an empty response
            throw new Error("No discussion starters were generated.");
        }

    } catch (error) {
        console.error("Error fetching discussion starters:", error);
        discussionStartersError = "Failed to generate discussion starters. Please try again.";
    } finally {
        isLoadingDiscussionStarters = false;
        updateView(); // Re-render to show the results or the error
    }
};

const handleStartReadingBom = () => {
    if (!currentUser || !currentUser.id || !currentBomToDisplay) return;

    const bomTitleLower = currentBomToDisplay.title.toLowerCase();
    const bomAuthorLower = (currentBomToDisplay.author || '').toLowerCase();

    const existingBookIndex = books.findIndex(book => 
        book.title.toLowerCase() === bomTitleLower &&
        (book.author || '').toLowerCase() === bomAuthorLower
    );

    if (existingBookIndex !== -1) {
        if (books[existingBookIndex].status !== 'Reading') {
            books[existingBookIndex].status = 'Reading';
        }
    } else {
        const newBook: Book = {
            id: generateId(), 
            title: currentBomToDisplay.title,
            author: currentBomToDisplay.author,
            coverImageUrl: currentBomToDisplay.coverImageUrl || undefined,
            status: 'Reading'
        };
        books.push(newBook);
    }

    //Storage.setUserItem(currentUser.id, "books", books);
    saveBooksToFirebase();
    updateView(); 
};

// --- BOM Proposal Modal Handlers ---
const resetBomProposalModalState = () => {
    bomProposal_searchText = '';
    bomProposal_searchResults = [];
    bomProposal_isLoadingSearch = false;
    bomProposal_searchError = null;
    bomProposal_formTitle = '';
    bomProposal_formAuthor = '';
    bomProposal_formCoverUrl = '';
    bomProposal_formReason = '';
};

const handleShowBomProposalModal = () => {
    resetBomProposalModalState();
    bomProposal_targetMonthYear = getNextMonthYearString();
    showBomProposalModal = true;
    updateView();
};

const handleCloseBomProposalModal = () => {
    showBomProposalModal = false;
    resetBomProposalModalState();
    updateView();
};

const handleBomProposalBookSearchInputChange = (event) => {
    bomProposal_searchText = (event.target as HTMLInputElement).value;
};

// This is the corrected version of the function
const handlePerformBomProposalBookSearch = async () => {
    if (!bomProposal_searchText.trim()) {
        bomProposal_searchError = "Please enter a search term.";
        bomProposal_searchResults = [];
        updateView();
        return;
    }

    bomProposal_isLoadingSearch = true;
    bomProposal_searchError = null;
    bomProposal_searchResults = [];
    updateView();

    try {
        // Assumes BOOKS_API_KEY and GOOGLE_BOOKS_API_URL are defined globally in the file
        if (!BOOKS_API_KEY) {
            throw new Error("Books API Key is not configured.");
        }

        const query = encodeURIComponent(bomProposal_searchText.trim());
        const fullUrl = `${GOOGLE_BOOKS_API_URL}?q=${query}&maxResults=5&key=${BOOKS_API_KEY}`;
        
        const res = await fetch(fullUrl);

        if (!res.ok) {
            throw new Error(`Google Books API error: ${res.status}`);
        }

        const data = await res.json();
        
        if (data.items && data.items.length > 0) {
            bomProposal_searchResults = data.items.map(item => {
                const volumeInfo = item.volumeInfo;
                return {
                    title: volumeInfo.title || "No Title",
                    author: volumeInfo.authors ? volumeInfo.authors.join(', ') : "Unknown Author",
                    cover: volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.smallThumbnail || null,
                };
            });
        } else {
            bomProposal_searchResults = [];
        }

    } catch (error) {
        console.error("Error searching books for BOM Proposal:", error);
        bomProposal_searchError = "Failed to search for books. Please try again.";
    } finally {
        bomProposal_isLoadingSearch = false;
        updateView();
    }
};

const handleSelectSearchedBomProposalBook = (event) => {
    const index = parseInt((event.target as HTMLElement).dataset.index!, 10);
    const selectedBook = bomProposal_searchResults[index];
    if (selectedBook) {
        bomProposal_formTitle = selectedBook.title;
        bomProposal_formAuthor = selectedBook.author;
        bomProposal_formCoverUrl = selectedBook.cover || '';
        bomProposal_searchResults = []; 
        bomProposal_searchText = ''; 
        updateView();
    }
};

const handleBomProposalFormInputChange = (event) => {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    if (target.name === 'reason') {
        bomProposal_formReason = target.value;
    }
};

const handleSubmitBomProposal = async (event) => {
    event.preventDefault();
    if (!currentUser) return;

    const reasonTextarea = document.getElementById('bomProposalReason') as HTMLTextAreaElement | null;
    if (reasonTextarea) {
        bomProposal_formReason = reasonTextarea.value; 
    }

    if (!bomProposal_formTitle.trim()) {
        alert("Please select a book to propose.");
        return;
    }
    if (!bomProposal_formReason.trim()) {
        alert("Please provide a reason for your proposal.");
        return;
    }

    const userProposalsForTargetMonth = bomProposals.filter(
        p => p.proposedByUserId === currentUser!.id && p.proposalMonthYear === bomProposal_targetMonthYear
    );
    if (userProposalsForTargetMonth.length >= 3) {
        alert("You have already submitted the maximum of 3 proposals for this month.");
        return;
    }

    const proposalDataToSend = {
        bookTitle: bomProposal_formTitle.trim(),
        bookAuthor: bomProposal_formAuthor.trim(),
        bookCoverImageUrl: bomProposal_formCoverUrl.trim() || '',
        reason: bomProposal_formReason.trim(),
        proposedByUserId: currentUser.id,
        proposedByUserName: currentUser.literaryPseudonym || currentUser.name,
        proposalMonthYear: bomProposal_targetMonthYear,
        votes: [], // A new proposal always starts with an empty votes array
    };
    //bomProposals.push(newProposal);
    //Storage.setItem("bomProposals", bomProposals);
    try {
        const res = await fetch('/.netlify/functions/add-proposal', {
            method: 'POST',
            body: JSON.stringify(proposalDataToSend)
        });

        if (!res.ok) {
            // This is better error handling. It checks if the server responded with an error.
            throw new Error('Server responded with an error while saving.');
        }

        // We successfully added the proposal. Now, refresh the list from the server.
        // The 'await' here ensures we wait for the fresh list before doing anything else.
        await fetchBomProposals();

    } catch (error) {
        console.error("Failed to submit proposal:", error);
        alert("Sorry, your proposal could not be saved. Please try again.");
    }

    handleCloseBomProposalModal(); 
};

const handleBomProposalVoteToggle = async (event: Event) => { // <-- Make it async
    event.stopPropagation();
    if (!currentUser) return;
    
    // Use .closest to make sure we get the proposalId even if the user clicks an icon inside the button
    const button = (event.target as HTMLElement).closest('button');
    const proposalId = button?.dataset.proposalId;
    
    if (!proposalId) return;

    // --- Start of new logic ---

    // Find the proposal in the local state
    const targetProposalIndex = bomProposals.findIndex(p => p.id === proposalId);
    if (targetProposalIndex === -1) return;

    const proposalMonth = bomProposals[targetProposalIndex].proposalMonthYear;
    const userId = currentUser.id;
    const userHadVotedForThis = bomProposals[targetProposalIndex].votes.includes(userId);

    // --- Optimistic UI Update ---
    // Update the local state immediately so the UI feels instant.
    // We will revert this change if the server call fails.
    
    // 1. First, remove the user's vote from ANY proposal for that month
    const originalProposalsState = JSON.parse(JSON.stringify(bomProposals)); // Deep copy for potential rollback
    bomProposals.forEach(p => {
        if (p.proposalMonthYear === proposalMonth) {
            const voteIndex = p.votes.indexOf(userId);
            if (voteIndex > -1) {
                p.votes.splice(voteIndex, 1);
            }
        }
    });

    // 2. If the user had NOT voted for this proposal, add their vote now
    if (!userHadVotedForThis) {
        bomProposals[targetProposalIndex].votes.push(userId);
    }
    
    // 3. Immediately re-render to show the new vote state
    updateView();

    // --- Now, sync the change with the server ---
    try {
        const response = await fetch('/.netlify/functions/update-proposal-vote', {
            method: 'POST',
            body: JSON.stringify({ 
                proposalId: proposalId, 
                userId: userId,
                proposalMonth: proposalMonth // Send the month to help the backend logic
            })
        });

        if (!response.ok) {
            // If the server fails, throw an error to trigger the catch block
            throw new Error("Failed to save vote to server.");
        }

        console.log("Vote successfully synced with Firebase.");

    } catch (error) {
        console.error("Error toggling vote:", error);
        
        // --- Rollback UI on Failure ---
        // If the server call failed, revert the local state to what it was before the click
        bomProposals = originalProposalsState;
        alert("There was an error saving your vote. Please try again.");
        
        // Re-render to show the reverted (correct) state
        updateView();
    }
};

// --- Review Book Modal Handlers ---
const resetReviewBookModalState = () => {
    bookToReview = null;
    reviewBook_formRatings = { plot: 0, characters: 0, writingStyle: 0, overallEnjoyment: 0 };
    reviewBook_formComment = '';
};

const handleCloseReviewBookModal = () => {
    showReviewBookModal = false;
    resetReviewBookModalState();
    updateView();
};

const handleReviewBookRating = (event) => {
    if (!currentUser || !currentUser.id || !bookToReview) return;
    const target = event.target as HTMLElement;
    if (!target.matches('.rating-stars .interactive-star')) return;

    const category = target.dataset.category! as keyof BomRatings;
    const value = parseInt(target.dataset.value || "0", 10);

    if (category && value >= 0 && value <= 5) { // Allow 0 for clearing
        (reviewBook_formRatings as any)[category] = value;
        // Re-render only the modal if possible, or minimally the form section
        const formElement = document.getElementById('reviewBookForm');
        if (formElement) { // Re-render star display within modal without full App()
             const starContainer = formElement.querySelector(`.rating-stars[data-category-stars="${category}"]`);
             if (starContainer) {
                 let starsHtml = '';
                 for (let i = 1; i <= 5; i++) {
                     starsHtml += `<span class="material-icons interactive-star ${i <= value ? 'filled' : ''}" data-category="${category}" data-value="${i}" role="button" tabindex="0" aria-label="${i} star for ${category}">star</span>`;
                 }
                 starContainer.innerHTML = starsHtml;
                 // Re-attach listeners to new stars
                 starContainer.querySelectorAll('.interactive-star').forEach(star => {
                    star.removeEventListener('click', handleReviewBookRating);
                    star.removeEventListener('keypress', handleReviewBookRatingKeypress as EventListener);
                    star.addEventListener('click', handleReviewBookRating);
                    star.addEventListener('keypress', handleReviewBookRatingKeypress as EventListener);
                 });
             }
        }
    }
};


const handleReviewBookCommentInputChange = (event) => {
    reviewBook_formComment = (event.target as HTMLTextAreaElement).value;
};

const processAndSaveReview = async (submitReview: boolean) => {
    if (!currentUser || !currentUser.id || !bookToReview) {
        handleCloseReviewBookModal();
        return;
    }

    // --- Start of new logic ---

    // 1. Find the book in the local array
    const bookIndex = books.findIndex(b => b.id === bookToReview!.id);
    if (bookIndex === -1) {
        handleCloseReviewBookModal();
        return; // Exit if the book isn't found
    }

    // 2. Update the local state first for immediate UI feedback
    books[bookIndex].status = 'Read';

    // 3. Prepare an array of promises for all the server updates
    const promisesToAwait = [];

    // Always add the promise to update the user's book list
    promisesToAwait.push(saveBooksToFirebase());

    // Only add rating/comment promises if the user is submitting a review
    if (submitReview) {
        const reviewedBookTitleLower = bookToReview.title.toLowerCase();
        const matchingBomEntry = bookOfTheMonthHistory.find(bom => 
            bom.title.toLowerCase() === reviewedBookTitleLower
        );

        if (matchingBomEntry) {
            const bomId = matchingBomEntry.id;

            // Update local state for ratings/comments immediately
            if (!globalBomRatings[bomId]) globalBomRatings[bomId] = {};
            globalBomRatings[bomId][currentUser.id] = { ...reviewBook_formRatings };

            // Add the save operation to our list of promises
            promisesToAwait.push(saveRatingsToFirebase(bomId, reviewBook_formRatings));

            if (reviewBook_formComment.trim()) {
                const newComment = {
                    id: generateId(),
                    userId: currentUser.id,
                    userNameDisplay: currentUser.literaryPseudonym || currentUser.name,
                    text: reviewBook_formComment.trim(),
                    timestamp: Date.now()
                };
                if (!globalBomComments[bomId]) globalBomComments[bomId] = {};
                globalBomComments[bomId][currentUser.id] = newComment;
                
                // Add the save operation to our list of promises
                promisesToAwait.push(saveCommentToFirebase(bomId, newComment));
            }
        }
    }

    try {
        // 4. Execute all save operations in parallel and wait for them all to finish
        await Promise.all(promisesToAwait);
        console.log("Review data and book status synced successfully.");
    } catch (error) {
        console.error("Failed to sync review data with server:", error);
        // Optionally, alert the user that the save failed
    } finally {
        // 5. Close the modal and re-render the app
        handleCloseReviewBookModal();
    }
};

const handleReviewBookSubmit = (event) => {
    event.preventDefault();
    processAndSaveReview(true);
};

const handleReviewBookSkip = () => {
    processAndSaveReview(false);
};

//Helper function to save books in My books
const saveBooksToFirebase = async () => {
    if (!currentUser || !currentUser.id) return;
    try {
        // This function stays the same! It just calls the backend.
        await fetch('/.netlify/functions/update-my-books', {
            method: 'POST',
            body: JSON.stringify({ userId: currentUser.id, books: books })
        });
    } catch (error) {
        console.error("Failed to save books:", error);
    }
};

const saveProfileToFirebase = async (profileData: UserProfile) => {
    // Make sure we have a logged-in user before trying to save
    if (!currentUser || !currentUser.id) {
        console.error("Cannot save profile, no current user.");
        return; // Exit if there's no user
    }

    try {
        // Call your new Netlify function
        const response = await fetch('/.netlify/functions/update-profile', {
            method: 'POST',
            body: JSON.stringify({ 
                userId: currentUser.id,
                profileData: profileData // Send the entire profile object
            })
        });

        if (!response.ok) {
            console.error("Failed to save profile to Firebase:", await response.text());
        } else {
            console.log("Profile successfully synced with Firebase.");
        }

    } catch (error) {
        console.error("Network error while saving profile:", error);
    }
};

const saveUserToFirebase = async (userData: User) => {
    if (!userData.id) {
        console.error("Cannot save user, no ID provided.");
        return;
    }
    // This will call a new backend function
    await fetch('/.netlify/functions/update-user', {
        method: 'POST',
        body: JSON.stringify({ userId: userData.id, userData: userData })
    });
};

const saveRatingsToFirebase = async (bomId: string, ratings: BomRatings) => {
    if (!currentUser?.id) return;
    await fetch('/.netlify/functions/add-rating', {
        method: 'POST',
        body: JSON.stringify({ bomId, userId: currentUser.id, ratings })
    });
};

const saveCommentToFirebase = async (bomId: string, comment: BomComment) => {
    await fetch('/.netlify/functions/add-comment', {
        method: 'POST',
        body: JSON.stringify({ bomId, commentData: comment })
    });
};


// --- Chat Handlers ---
const handleSendChatMessage = () => {
    if (!currentUser || !currentUser.id) return;
    const input = document.getElementById('chatMessageInput');
    
    if (input instanceof HTMLInputElement) {
        const messageText = input.value.trim();

        if (messageText) {
            const newMessage = {
                id: generateId(),
                userId: currentUser.id,
                userName: currentUser.name,
                userPseudonym: currentUser.literaryPseudonym,
                text: messageText,
                timestamp: Date.now(),
            };
            chatMessages.push(newMessage);
            Storage.setItem("chatMessagesGlobal", chatMessages); 
            input.value = '';
            updateView();
            
            const chatContainer = document.getElementById('chatMessagesContainer');
            if (chatContainer) {
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }
        }
    }
};

// In src/main.tsx

let unsubscribeBooks = () => {}; // A function to stop listening when the user logs out
let unsubscribeProposals = () => {}; // Another for proposals

const listenToUserData = () => {
  if (!currentUser || !currentUser.id) return;

  // We need to import these from the Firebase SDK at the top of your file
  // import { getFirestore, collection, onSnapshot, doc } from "firebase/firestore";
  const db = getFirestore(); // Assumes you have already initialized the main Firebase app

  // 1. Listen for changes to the user's books
  const userBooksRef = collection(db, 'users', currentUser.id, 'books');
  unsubscribeBooks = onSnapshot(userBooksRef, (snapshot) => {
    const freshBooks = [];
    snapshot.forEach((doc) => {
      freshBooks.push({ id: doc.id, ...doc.data() });
    });
    books = freshBooks; // Update the global state
    updateView(); // Re-render with the fresh data
  });

  // You already have working proposal sync, but this is how it would look with a listener
  const proposalsRef = collection(db, 'proposals');
  unsubscribeProposals = onSnapshot(proposalsRef, (snapshot) => {
      // ... logic to update your bomProposals array ...
      updateView();
  });
};

// --- Profile Handlers ---
const handleProfileSave = async (event: Event) => { // <-- 1. Added async and Event type
    event.preventDefault();
    if (!currentUser || !currentUser.id) return;

    const form = event.target as HTMLFormElement;
    const nameInput = form.elements.namedItem('name') as HTMLInputElement;
    const bioInput = form.elements.namedItem('bio') as HTMLTextAreaElement;

    const newName = nameInput.value;
    const newBio = bioInput.value;

    // --- Start of new logic ---

    // 1. Prepare the data objects
    const updatedProfile: UserProfile = { ...userProfile, name: newName, bio: newBio };
    const updatedUser: User = { ...currentUser, name: newName }; // We only need to update the name field here

    // 2. Update the local state first for a snappy UI response
    userProfile = updatedProfile;
    currentUser = updatedUser;

    try {
        // 3. Save both data structures to Firebase in parallel and WAIT
        await Promise.all([
            saveProfileToFirebase(updatedProfile), // Saves the separate profile data
            saveUserToFirebase(updatedUser)      // Saves the updated main user object
        ]);

        // 4. Update the main 'users' array in local memory
        const userIndex = users.findIndex(u => u.id === currentUser!.id); 
        if (userIndex !== -1) {
            users[userIndex] = updatedUser;
        }

        // 5. Save the updated currentUser to localStorage for session persistence
        Storage.setItem("currentUser", currentUser);
        
        // Let the user know it was successful
        alert("Profile saved!");

    } catch (error) {
        console.error("Failed to save profile:", error);
        alert("There was an error saving your profile. Please try again.");
        // Optional: Revert the local state changes if the save fails
    } finally {
        // 6. Re-render the app with the updated information
        updateView();
    }
};

// --- General Keypress Handlers ---
const handleReviewBookRatingKeypress = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
        handleReviewBookRating(e);
    }
};

const handleChatInputKeypress = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
        handleSendChatMessage();
    }
};


function attachEventListeners () {
    if (!currentUser) {
        document.querySelectorAll('[data-auth-action]').forEach(button => {
            button.removeEventListener('click', handleAuthAction);
            button.addEventListener('click', handleAuthAction);
        });
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.removeEventListener('submit', handleRegister);
            registerForm.addEventListener('submit', handleRegister);
        }
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.removeEventListener('submit', handleLogin);
            loginForm.addEventListener('submit', handleLogin);
        }
        return; 
    }

    if (currentUser && !currentUser.onboardingComplete) {
        const onboardingQuestionsForm = document.getElementById('onboardingQuestionsForm');
        if (onboardingQuestionsForm) {
            onboardingQuestionsForm.removeEventListener('submit', handleOnboardingQuestionsSubmit);
            onboardingQuestionsForm.addEventListener('submit', handleOnboardingQuestionsSubmit);
        }
        const onboardingProfileForm = document.getElementById('onboardingProfileForm');
        if (onboardingProfileForm) {
            onboardingProfileForm.removeEventListener('submit', handleOnboardingProfileSetupSubmit);
            onboardingProfileForm.addEventListener('submit', handleOnboardingProfileSetupSubmit);
        }
        return; 
    }

    const profileButton = document.querySelector('.profile-icon-button');
    if (profileButton) {
        profileButton.removeEventListener('click', handleNavigation);
        profileButton.addEventListener('click', handleNavigation);
    }
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.removeEventListener('click', handleNavigation); 
        item.addEventListener('click', handleNavigation);
    });

    if (currentView === "mybooks") {
        document.querySelectorAll('.book-item-actions button').forEach(button => {
            button.removeEventListener('click', handleBookAction);
            button.addEventListener('click', handleBookAction);
        });
        const addBookFab = document.getElementById('addBookFab');
        if (addBookFab) {
            addBookFab.removeEventListener('click', handleAddBookFabClick);
            addBookFab.addEventListener('click', handleAddBookFabClick);
        }
        const myBooksSearchInput = document.getElementById('myBooksSearchInput');
        if (myBooksSearchInput) {
            myBooksSearchInput.removeEventListener('input', handleMyBooksSearchInputChange);
            myBooksSearchInput.addEventListener('input', handleMyBooksSearchInputChange);
        }
    }
    
    if (showAddBookModal) {
        const addBookForm = document.getElementById('addBookForm');
        if (addBookForm) {
            addBookForm.removeEventListener('submit', handleAddBookSubmit);
            addBookForm.addEventListener('submit', handleAddBookSubmit);
            addBookForm.querySelectorAll('input[name="title"], input[name="author"], input[name="coverImageUrl"]').forEach(input => {
                input.removeEventListener('input', handleAddBookFormInputChange);
                input.addEventListener('input', handleAddBookFormInputChange);
            });
        }
        const closeButton = document.querySelector('#addBookModalContainer .close-button[data-action="close-add-book-modal"]');
        if(closeButton) {
            closeButton.removeEventListener('click', handleCloseAddBookModal);
            closeButton.addEventListener('click', handleCloseAddBookModal);
        }
        const modalContainer = document.getElementById('addBookModalContainer');
        if (modalContainer) {
            const closeModalOnClickOutside = (e) => { if (e.target === modalContainer) handleCloseAddBookModal(); };
            modalContainer.removeEventListener('click', closeModalOnClickOutside); 
            modalContainer.addEventListener('click', closeModalOnClickOutside);
        }
        const bookSearchInput = document.getElementById('bookSearchText');
        if (bookSearchInput) {
            bookSearchInput.removeEventListener('input', handleAddBookSearchInputChange);
            bookSearchInput.addEventListener('input', handleAddBookSearchInputChange);
            // Add the keypress listener here
        const keypressHandler = (e: KeyboardEvent) => handleSearchInputKeypress(e, 'performBookSearchButton');
        bookSearchInput.removeEventListener('keypress', keypressHandler);
        bookSearchInput.addEventListener('keypress', keypressHandler);
        }
        const performSearchButton = document.getElementById('performBookSearchButton');
        if (performSearchButton) {
            performSearchButton.removeEventListener('click', handlePerformAddBookSearch);
            performSearchButton.addEventListener('click', handlePerformAddBookSearch);
        }
        
       
            
         
        document.querySelectorAll('#addBookModalContainer .book-search-result-item button[data-action="select-searched-book"]').forEach(button => {
            button.removeEventListener('click', handleSelectSearchedBookForAdd);
            button.addEventListener('click', handleSelectSearchedBookForAdd);
        });
    }

    if (currentView === "bookofthemonth") {
        const fetchButton = document.getElementById('fetchDiscussionStarters');
        if (fetchButton) {
            fetchButton.removeEventListener('click', handleFetchDiscussionStarters);
            fetchButton.addEventListener('click', handleFetchDiscussionStarters);
        }
        const showProposalModalButton = document.querySelector('button[data-action="show-bom-proposal-modal"]');
        if (showProposalModalButton) {
            showProposalModalButton.removeEventListener('click', handleShowBomProposalModal);
            showProposalModalButton.addEventListener('click', handleShowBomProposalModal);
        }
        document.querySelectorAll('button[data-action="toggle-bom-proposal-vote"]').forEach(button => {
            button.removeEventListener('click', handleBomProposalVoteToggle);
            button.addEventListener('click', handleBomProposalVoteToggle);
        });
        
        const startReadingBomButton = document.querySelector('button[data-action="start-reading-bom"]');
        if (startReadingBomButton) {
            startReadingBomButton.removeEventListener('click', handleStartReadingBom);
            startReadingBomButton.addEventListener('click', handleStartReadingBom);
        }
        document.querySelectorAll('button[data-action="delete-bom-proposal"]').forEach(button => {
        button.removeEventListener('click', handleDeleteBomProposal);
        button.addEventListener('click', handleDeleteBomProposal);
    });
    }

    if (showBomProposalModal) {
        const bomProposalForm = document.getElementById('bomProposalForm');
        if (bomProposalForm) {
            bomProposalForm.removeEventListener('submit', handleSubmitBomProposal);
            bomProposalForm.addEventListener('submit', handleSubmitBomProposal);
        }
        const reasonTextArea = document.getElementById('bomProposalReason') as HTMLTextAreaElement;
        if (reasonTextArea) {
            reasonTextArea.removeEventListener('input', handleBomProposalFormInputChange);
            reasonTextArea.addEventListener('input', handleBomProposalFormInputChange);
        }
        const closeButton = document.querySelector('#bomProposalModalContainer .close-button[data-action="close-bom-proposal-modal"]');
        if(closeButton) {
            closeButton.removeEventListener('click', handleCloseBomProposalModal);
            closeButton.addEventListener('click', handleCloseBomProposalModal);
        }
        const modalContainer = document.getElementById('bomProposalModalContainer');
        if (modalContainer) {
            const closeModalOnClickOutside = (e) => { if (e.target === modalContainer) handleCloseBomProposalModal(); };
            modalContainer.removeEventListener('click', closeModalOnClickOutside); 
            modalContainer.addEventListener('click', closeModalOnClickOutside);
        }
        const searchInput = document.getElementById('bomProposalBookSearchText');
        if (searchInput) {
            searchInput.removeEventListener('input', handleBomProposalBookSearchInputChange);
            searchInput.addEventListener('input', handleBomProposalBookSearchInputChange);
            // Add the keypress listener here
        const keypressHandler = (e: KeyboardEvent) => handleSearchInputKeypress(e, 'performBomProposalBookSearchButton');
        searchInput.removeEventListener('keypress', keypressHandler);
        searchInput.addEventListener('keypress', keypressHandler);
        }
        const performSearchBtn = document.getElementById('performBomProposalBookSearchButton');
        if (performSearchBtn) {
            performSearchBtn.removeEventListener('click', handlePerformBomProposalBookSearch);
            performSearchBtn.addEventListener('click', handlePerformBomProposalBookSearch);
        }
        

        document.querySelectorAll('#bomProposalModalContainer .book-search-result-item button[data-action="select-searched-bom-proposal-book"]').forEach(button => {
            button.removeEventListener('click', handleSelectSearchedBomProposalBook);
            button.addEventListener('click', handleSelectSearchedBomProposalBook);
        });
    }

    if (showReviewBookModal) {
        const reviewBookForm = document.getElementById('reviewBookForm');
        if (reviewBookForm) {
            // Note: Submit button is handled by its data-action, not form submit directly
            // reviewBookForm.removeEventListener('submit', handleReviewBookSubmit);
            // reviewBookForm.addEventListener('submit', handleReviewBookSubmit);

            reviewBookForm.querySelectorAll('.rating-stars .interactive-star').forEach(star => {
                star.removeEventListener('click', handleReviewBookRating);
                star.removeEventListener('keypress', handleReviewBookRatingKeypress as EventListener);
                star.addEventListener('click', handleReviewBookRating);
                star.addEventListener('keypress', handleReviewBookRatingKeypress as EventListener);
            });
            const commentTextarea = document.getElementById('reviewBookComment');
            if (commentTextarea) {
                commentTextarea.removeEventListener('input', handleReviewBookCommentInputChange);
                commentTextarea.addEventListener('input', handleReviewBookCommentInputChange);
            }
        }
        const submitButton = document.querySelector('#reviewBookModalContainer button[data-action="submit-review-book"]');
        if (submitButton) {
            submitButton.removeEventListener('click', handleReviewBookSubmit);
            submitButton.addEventListener('click', handleReviewBookSubmit);
        }
        const skipButton = document.querySelector('#reviewBookModalContainer button[data-action="skip-review-book"]');
        if (skipButton) {
            skipButton.removeEventListener('click', handleReviewBookSkip);
            skipButton.addEventListener('click', handleReviewBookSkip);
        }

        const closeButton = document.querySelector('#reviewBookModalContainer .close-button[data-action="close-review-book-modal"]');
        if(closeButton) {
            closeButton.removeEventListener('click', handleCloseReviewBookModal);
            closeButton.addEventListener('click', handleCloseReviewBookModal);
        }
        const modalContainer = document.getElementById('reviewBookModalContainer');
        if (modalContainer) {
            const closeModalOnClickOutside = (e) => { if (e.target === modalContainer) handleCloseReviewBookModal(); };
            modalContainer.removeEventListener('click', closeModalOnClickOutside); 
            modalContainer.addEventListener('click', closeModalOnClickOutside);
        }
    }


    if (currentView === "chat") {
        const sendButton = document.getElementById('sendChatMessage');
        if (sendButton) {
            sendButton.removeEventListener('click', handleSendChatMessage);
            sendButton.addEventListener('click', handleSendChatMessage);
        }
        const messageInput = document.getElementById('chatMessageInput');
        if (messageInput) {
            messageInput.removeEventListener('keypress', handleChatInputKeypress as EventListener);
            messageInput.addEventListener('keypress', handleChatInputKeypress as EventListener);
        }
        const chatContainer = document.getElementById('chatMessagesContainer');
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }

    if (currentView === "profile") {
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.removeEventListener('submit', handleProfileSave);
            profileForm.addEventListener('submit', handleProfileSave);
        }
        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
            logoutButton.removeEventListener('click', handleLogout);
            logoutButton.addEventListener('click', handleLogout);
        }
    }

    // --- Listen for clicks on any proposal item ---
document.querySelectorAll('[data-action="show-proposal-detail"]').forEach(item => {
    item.addEventListener('click', handleShowProposalDetail);
    // Add keypress for accessibility
    item.addEventListener('keypress', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            handleShowProposalDetail(e);
        }
    });
});

// --- Listen for a click on the new modal's close button ---
const closeDetailButton = document.querySelector('#proposalDetailModalContainer .close-button');
if (closeDetailButton) {
    closeDetailButton.addEventListener('click', handleCloseProposalDetail);
}

// --- Listen for clicks outside the modal to close it ---
const detailModalContainer = document.getElementById('proposalDetailModalContainer');
if (detailModalContainer) {
    detailModalContainer.addEventListener('click', (e) => {
        if (e.target === detailModalContainer) {
            handleCloseProposalDetail();
        }
    });
}
};





// --- Initial Load ---
// --- NEW AND CORRECT INITIAL LOAD LOGIC ---

// This function will fetch the proposals from your backend
const fetchBomProposals = async () => {
    try {
        const res = await fetch('/.netlify/functions/get-proposals');
        if (!res.ok) {
            console.error(`Proposal fetch failed with status: ${res.status}`);
            bomProposals = Storage.getItem("bomProposals", []); // Fallback to localStorage
            return; 
        }
        const data = await res.json();
        bomProposals = data; // Update the global state with fresh data from the server
        Storage.setItem("bomProposals", bomProposals); // Optionally save the fresh data to localStorage
    } catch (error) {
        console.error("Failed to fetch or parse proposals:", error);
        bomProposals = Storage.getItem("bomProposals", []); // Fallback to localStorage on error
    }
};

// This is the new, corrected initializeApp function

async function initializeApp () {
    initializeFirebase(); // Connect to Firebase first thing.

    // 1. Load static data from localStorage first
    bookOfTheMonthHistory = Storage.getItem("bookOfTheMonthHistory", hardcodedBomHistory);
    chatMessages = Storage.getItem("chatMessagesGlobal", []);
    globalBomRatings = Storage.getItem("globalBomRatings", {});
    globalBomComments = Storage.getItem("globalBomComments", {});

    // 2. Fetch shared dynamic data
    await fetchBomProposals();

    // 3. Set up the BoM state based on what's available
    initializeAndSetCurrentBOM(); 

    // 4. Check for a logged-in user and fetch their specific data
    if (currentUser && currentUser.id) {
        // --- THIS IS THE KEY CHANGE ---
        // We now AWAIT the function that fetches the user's books.
        await loadUserSpecificData(); 
        
        // The rest of the logic stays the same
        if (!currentUser.onboardingComplete) {
            currentAuthProcessView = 'onboarding_questions'; 
        }
    } else {
        // There's a typo in your original code here, I've fixed it
        currentAuthProcessView = 'auth_options'; 
    }

    // 5. After ALL data is loaded, perform the single initial render
    renderApp();
};

// --- Main App Component ---


function renderApp ()  {
    const root = document.getElementById('root');
    if (!root) {
        console.error("Root element not found!");
        return;
    }
    //... all the innerHTML logic from your old App function

    let appContainerClass = "app-container";
    if (!currentUser || !currentUser.onboardingComplete) {
        appContainerClass += " auth-onboarding-active";
    }


    root.innerHTML = `
        <div class="${appContainerClass}">
            ${renderTopHeader()}
            <div class="main-content" id="${mainContentId}">
                ${renderCurrentView()}
            </div>
            ${renderBottomNav()}
            ${renderAddBookModal()}
            ${renderBomProposalModal()}
            ${renderReviewBookModal()}
            ${renderProposalDetailModal()} 
            ${(currentUser && currentUser.onboardingComplete && currentView === 'mybooks') ? renderAddBookFAB() : ''}
        </div>
    `;
    
    attachEventListeners();
}


// --- START THE APP ---
initializeApp();

