


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
        coverImageUrl: "https://covers.openlibrary.org/b/id/14532988-L.jpg",
        setBy: 'default',
        discussionStarters: []
    }
];

// This line now uses the hardcoded data as a fallback if localStorage is empty.
let bookOfTheMonthHistory: BomEntry[] = Storage.getItem("bookOfTheMonthHistory", hardcodedBomHistory);
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
let bomProposals: BomProposal[] = Storage.getItem("bomProposals", []);
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
    const currentMonthStr = getCurrentMonthYearString();
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


const loadUserSpecificData = () => {
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
    books = Storage.getUserItem(currentUser.id, "books", []);
    userProfile = Storage.getUserItem(currentUser.id, "profile", { 
        name: currentUser.name || "Book Lover", 
        bio: "Exploring worlds, one page at a time.",
        literaryPseudonym: currentUser.literaryPseudonym || "",
        profileImageUrl: currentUser.profileImageUrl || "",
        literaryPreferences: currentUser.literaryPreferences || {}
    });
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
                    ${book.status !== 'Reading' ? `<button data-action="set-status" data-book-id="${book.id}" data-status="Reading">Mark as Reading</button>` : ''}
                    ${book.status !== 'Read' ? `<button data-action="set-status" data-book-id="${book.id}" data-status="Read">Mark as Read</button>` : ''}
                    ${book.status !== 'Pending' ? `<button data-action="set-status" data-book-id="${book.id}" data-status="Pending">Mark as Pending</button>` : ''}
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
    console.log("BookOfTheMonthView - currentBomToDisplay:", currentBomToDisplay, "activeBomId:", activeBomId); 

    if (!currentBomToDisplay || !activeBomId) {
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

    const { title, author, description, coverImageUrl, monthYear } = currentBomToDisplay;
    const bomCoverImageId = `bomCoverImage-${activeBomId}`;
    const bomCoverPlaceholderId = `bomCoverPlaceholder-${activeBomId}`;

    // --- Calculate Average Ratings ---
    const allRatingsForThisBom = activeBomId ? globalBomRatings[activeBomId] : null;
    let averageRatings: BomRatings = { plot: 0, characters: 0, writingStyle: 0, overallEnjoyment: 0 };
    let ratingCounts = { plot: 0, characters: 0, writingStyle: 0, overallEnjoyment: 0 };
    let totalRaters = 0;

    if (allRatingsForThisBom) {
        const userRatingsArray = Object.values(allRatingsForThisBom);
        totalRaters = userRatingsArray.length;
        if (totalRaters > 0) {
            userRatingsArray.forEach(userRating => {
                if (userRating.plot > 0) { averageRatings.plot += userRating.plot; ratingCounts.plot++; }
                if (userRating.characters > 0) { averageRatings.characters += userRating.characters; ratingCounts.characters++; }
                if (userRating.writingStyle > 0) { averageRatings.writingStyle += userRating.writingStyle; ratingCounts.writingStyle++; }
                if (userRating.overallEnjoyment > 0) { averageRatings.overallEnjoyment += userRating.overallEnjoyment; ratingCounts.overallEnjoyment++; }
            });
            if (ratingCounts.plot > 0) averageRatings.plot /= ratingCounts.plot;
            if (ratingCounts.characters > 0) averageRatings.characters /= ratingCounts.characters;
            if (ratingCounts.writingStyle > 0) averageRatings.writingStyle /= ratingCounts.writingStyle;
            if (ratingCounts.overallEnjoyment > 0) averageRatings.overallEnjoyment /= ratingCounts.overallEnjoyment;
        }
    }
    
    const renderAverageStars = (categoryValue: number) => {
        let starsHtml = '';
        const roundedRating = Math.round(categoryValue); // Or use toFixed(1) for half stars if desired
        for (let i = 1; i <= 5; i++) {
            starsHtml += `<span class="material-icons static-star ${i <= roundedRating ? 'filled' : ''}" aria-label="${i} star">${i <= roundedRating ? 'star' : 'star_border'}</span>`;
        }
        return `${starsHtml} (${categoryValue.toFixed(1)} average)`;
    };

    // --- Get Comments/Reviews for this BoM ---
    const allCommentsForThisBom = activeBomId ? globalBomComments[activeBomId] : null;
    const bomReviews: BomComment[] = allCommentsForThisBom ? Object.values(allCommentsForThisBom).sort((a,b) => b.timestamp - a.timestamp) : [];


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
            startReadingButtonHtml = `<button class="button bom-action-button primary" data-action="start-reading-bom">Start Reading this Book</button>`;
        }
    }
    
    return `
        <div class="page" id="bom-view">
            <div class="book-of-the-month-details book-item">
                <h2>Book of the Month: ${formatMonthYearForDisplay(monthYear)}</h2>
                
                <div class="book-of-the-month-details">

    <!-- The Left Column (Image) -->
    <div class="bom-image-wrapper">
        <img src="${coverImageUrl || '#'}" 
             alt="Cover of ${title}" 
             class="bom-cover-image" ... >
        <!-- The placeholder can stay here if you like -->
    </div>

    <!-- The Right Column (Text) -->
    <div class="bom-text-wrapper">
        <h3>${title}</h3>
        <p><em>by ${author}</em></p>
        <p>${description}</p>
        <div class="bom-main-actions">
            ${startReadingButtonHtml}
        </div>
    </div>

</div> <!-- End of book-of-the-month-details -->


                <h3>${title}</h3>
                <p><em>by ${author}</em></p>
                <p>${description}</p>
                <div class="bom-main-actions">
                    ${startReadingButtonHtml}
                </div>
            </div>

            <div class="book-item">
                <h3>Community Ratings</h3>
                ${totalRaters > 0 ? `
                    <div class="rating-category">
                        <p>Plot: <span class="rating-stars-display">${renderAverageStars(averageRatings.plot)}</span></p>
                    </div>
                    <div class="rating-category">
                        <p>Characters: <span class="rating-stars-display">${renderAverageStars(averageRatings.characters)}</span></p>
                    </div>
                    <div class="rating-category">
                        <p>Writing Style: <span class="rating-stars-display">${renderAverageStars(averageRatings.writingStyle)}</span></p>
                    </div>
                    <div class="rating-category">
                        <p>Overall Enjoyment: <span class="rating-stars-display">${renderAverageStars(averageRatings.overallEnjoyment)}</span></p>
                    </div>
                    <p class="total-raters-note">Based on ${totalRaters} review(s).</p>
                ` : `<p>No ratings submitted yet for this book.</p>`}
            </div>
            
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

            <div class="book-item">
                <h3>Discussion Starters</h3>
                ${currentUser ? `
                    <button id="fetchDiscussionStarters" class="button" ${isLoadingDiscussionStarters ? 'disabled' : ''}>
                        ${isLoadingDiscussionStarters ? 'Loading...' : 'Get AI Discussion Starters'}
                    </button>
                    ${discussionStartersError ? `<p class="error-message">${discussionStartersError}</p>` : ''}
                    ${discussionStarters.length > 0 ? `
                        <ul class="discussion-starters">
                            ${discussionStarters.map(starter => `<li>${starter}</li>`).join('')}
                        </ul>
                    ` : ''}
                    ${!isLoadingDiscussionStarters && discussionStarters.length === 0 && !discussionStartersError ? '<p>Click the button to generate some discussion points for this book!</p>' : ''}
                ` : `<p>Please log in to generate discussion starters.</p>`}
            </div>
            
            ${currentUser ? renderBomProposalSection() : ''}
        </div>
    `;
};

const renderBomProposalSection = () => {
    if (!currentUser) return '';

    const nextMonthTarget = getNextMonthYearString();
    const userProposalsForNextMonth = bomProposals.filter(p => p.proposedByUserId === currentUser!.id && p.proposalMonthYear === nextMonthTarget);
    const canProposeMore = userProposalsForNextMonth.length < 3;

    const currentProposalsForNextMonth = bomProposals.filter(p => p.proposalMonthYear === nextMonthTarget)
        .sort((a,b) => b.timestamp - a.timestamp);

    const usersVoteForNextMonth = currentProposalsForNextMonth.find(p => p.votes.includes(currentUser!.id));

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
                        let voteButtonHtml = '';
                        if (userVotedForThis) {
                            voteButtonHtml = `<button class="button small-button voted" data-action="toggle-bom-proposal-vote" data-proposal-id="${proposal.id}">
                                                <span class="material-icons">how_to_vote</span> Voted (${proposal.votes.length})
                                           </button>`;
                        } else {
                            voteButtonHtml = `<button class="button small-button primary" data-action="toggle-bom-proposal-vote" data-proposal-id="${proposal.id}">
                                                Vote (${proposal.votes.length})
                                           </button>`;
                        }

                        return `
                        <div class="bom-proposal-item ${userVotedForThis ? 'user-voted-highlight' : ''}">
                            ${proposal.bookCoverImageUrl ? `<img src="${proposal.bookCoverImageUrl}" alt="Cover of ${proposal.bookTitle}" class="book-cover-thumbnail">` : '<div class="book-cover-placeholder-small">No Cover</div>'}
                            <div class="bom-proposal-details">
                                <h4>${proposal.bookTitle}</h4>
                                <p><em>by ${proposal.bookAuthor || 'Unknown Author'}</em></p>
                                <p class="proposal-reason"><strong>Reason:</strong> ${proposal.reason}</p>
                                <p class="proposed-by">Proposed by: ${proposal.proposedByUserName}</p>
                                <div class="proposal-actions">
                                   ${voteButtonHtml}
                                </div>
                            </div>
                        </div>
                    `}).join('')}
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
                        <button type="submit" class="button primary" data-action="submit-review-book">Submit Review</button>
                        <button type="button" class="button secondary" data-action="skip-review-book">Mark as Read & Skip</button>
                    </div>
                </form>
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
    App();
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
        App();
        return;
    }
    if (password.length < 6) {
        authError = "Password must be at least 6 characters long.";
        App();
        return;
    }

    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
        authError = "User with this email already exists.";
        App();
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
    App();
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
        App();
        return;
    }

    currentUser = { ...user }; 
    Storage.setItem("currentUser", currentUser);
    initializeAndSetCurrentBOM(); 
    loadUserSpecificData();

    if (!currentUser.onboardingComplete) {
        currentAuthProcessView = 'onboarding_questions';
    } else {
        currentView = Storage.getItem("currentView", "bookofthemonth"); 
    }
    App();
};

const handleLogout = () => {
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
    App();
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
    App(); // Re-render to show the "Processing..." view

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
        App(); // Re-render to show the final profile setup view
    }
};

const handleOnboardingProfileSetupSubmit = (event) => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim();
    authError = null;

    if (!name) {
        authError = "Please enter your name.";
        App();
        return;
    }
    
    if (!currentUser) { 
        authError = "User session lost. Please try logging in again.";
        currentAuthProcessView = 'login';
        App();
        return;
    }
    
    const imageUrlToSave = generatedProfileImageBase64Data || ''; 

    const userIndex = users.findIndex(u => u.id === currentUser!.id);
    if (userIndex !== -1) {
        users[userIndex] = {
            ...users[userIndex],
            name: name,
            literaryPseudonym: generatedPseudonym, 
            profileImageUrl: imageUrlToSave,
            literaryPreferences: onboardingAnswers,
            onboardingComplete: true,
        };
        Storage.setItem("users", users);
        currentUser = { ...users[userIndex] }; 
        Storage.setItem("currentUser", currentUser);

        const newUserProfile: UserProfile = {
            name: name,
            bio: "Just joined the Book Club Hub!", 
            literaryPseudonym: generatedPseudonym, 
            profileImageUrl: imageUrlToSave,
            literaryPreferences: onboardingAnswers,
        };
        Storage.setUserItem(currentUser.id, "profile", newUserProfile);
        userProfile = newUserProfile; 
        
        currentView = "bookofthemonth"; 
        App();
    } else {
        authError = "Error saving profile. User not found."; 
        currentAuthProcessView = 'onboarding_questions'; 
        App();
    }
};


const handleNavigation = (event) => {
    const target = event.currentTarget as HTMLElement;
    const view = target.dataset.view;
    if (view && currentUser && currentUser.onboardingComplete) { 
        currentView = view;
        Storage.setItem("currentView", currentView); 
        App(); 
    }
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
    App();
};

const handleCloseAddBookModal = () => {
    showAddBookModal = false;
    resetAddBookModalState();
    App();
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
        App(); // Re-render
        return;
    }

    addBook_isLoadingSearch = true;
    addBook_searchError = null;
    addBook_searchResults = [];
    App(); // Re-render to show loading

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
        App(); // Re-render to show results or error
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
        App(); 
    }
};


const handleAddBookSubmit = (event) => {
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
        Storage.setUserItem(currentUser.id, "books", books);
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
    App(); 
};


// --- MyBooksView Handlers ---
const handleBookAction = (event) => {
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
            Storage.setUserItem(currentUser.id, "books", books);
        }
    } else if (action === "delete-book") {
        if (confirm("Are you sure you want to delete this book?")) {
            books.splice(bookIndex, 1);
            Storage.setUserItem(currentUser.id, "books", books);
        }
    }
    App();
};

const handleMyBooksSearchInputChange = (event) => {
    myBooksSearchTerm = (event.target as HTMLInputElement).value;
    App(); 
};


// --- Book of the Month Handlers (Discussion) ---
// Inside your app.js, replace the old function with this one

const handleFetchDiscussionStarters = async () => {
    if (!currentBomToDisplay) {
        discussionStartersError = "No Book of the Month is currently selected to generate starters.";
        App();
        return;
    }
    isLoadingDiscussionStarters = true;
    discussionStartersError = null;
    discussionStarters = [];
    App(); // Re-render to show loading state

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
        App(); // Re-render to show the results or the error
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

    Storage.setUserItem(currentUser.id, "books", books);
    App(); 
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
    App();
};

const handleCloseBomProposalModal = () => {
    showBomProposalModal = false;
    resetBomProposalModalState();
    App();
};

const handleBomProposalBookSearchInputChange = (event) => {
    bomProposal_searchText = (event.target as HTMLInputElement).value;
};

// This is the corrected version of the function
const handlePerformBomProposalBookSearch = async () => {
    if (!bomProposal_searchText.trim()) {
        bomProposal_searchError = "Please enter a search term.";
        bomProposal_searchResults = [];
        App();
        return;
    }

    bomProposal_isLoadingSearch = true;
    bomProposal_searchError = null;
    bomProposal_searchResults = [];
    App();

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
        App();
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
        App();
    }
};

const handleBomProposalFormInputChange = (event) => {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    if (target.name === 'reason') {
        bomProposal_formReason = target.value;
    }
};

const handleSubmitBomProposal = (event) => {
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

    const newProposal: BomProposal = {
        id: generateId(),
        bookTitle: bomProposal_formTitle.trim(),
        bookAuthor: bomProposal_formAuthor.trim(),
        bookCoverImageUrl: bomProposal_formCoverUrl.trim() || undefined,
        reason: bomProposal_formReason.trim(),
        proposedByUserId: currentUser.id,
        proposedByUserName: currentUser.literaryPseudonym || currentUser.name,
        proposalMonthYear: bomProposal_targetMonthYear,
        votes: [],
        timestamp: Date.now()
    };
    bomProposals.push(newProposal);
    Storage.setItem("bomProposals", bomProposals);
    handleCloseBomProposalModal(); 
};

const handleBomProposalVoteToggle = (event) => {
    if (!currentUser) return;
    const proposalId = (event.target as HTMLElement).dataset.proposalId;
    if (!proposalId) return;

    const targetProposalIndex = bomProposals.findIndex(p => p.id === proposalId);
    if (targetProposalIndex === -1) return;

    const targetProposal = bomProposals[targetProposalIndex];
    const proposalMonth = targetProposal.proposalMonthYear;
    const userId = currentUser.id;

    const userVotedForTarget = targetProposal.votes.includes(userId);

    bomProposals.forEach(p => {
        if (p.proposalMonthYear === proposalMonth) {
            const voteIndex = p.votes.indexOf(userId);
            if (voteIndex > -1) {
                p.votes.splice(voteIndex, 1);
            }
        }
    });

    if (!userVotedForTarget) {
        bomProposals[targetProposalIndex].votes.push(userId);
    }

    Storage.setItem("bomProposals", bomProposals);
    App();
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
    App();
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

const processAndSaveReview = (submitReview: boolean) => {
    if (!currentUser || !currentUser.id || !bookToReview) {
        handleCloseReviewBookModal();
        return;
    }

    // Update book status to 'Read'
    const bookIndex = books.findIndex(b => b.id === bookToReview!.id);
    if (bookIndex !== -1) {
        books[bookIndex].status = 'Read';
        Storage.setUserItem(currentUser.id, "books", books);
    }

    if (submitReview) {
        // Check if the reviewed book is a BoM
        const reviewedBookTitleLower = bookToReview.title.toLowerCase();
        const reviewedBookAuthorLower = (bookToReview.author || '').toLowerCase();
        const matchingBomEntry = bookOfTheMonthHistory.find(bom => 
            bom.title.toLowerCase() === reviewedBookTitleLower &&
            (bom.author || '').toLowerCase() === reviewedBookAuthorLower
        );

        if (matchingBomEntry) {
            const bomId = matchingBomEntry.id;
            // Save ratings
            if (!globalBomRatings[bomId]) globalBomRatings[bomId] = {};
            globalBomRatings[bomId][currentUser.id] = { ...reviewBook_formRatings };
            Storage.setItem("globalBomRatings", globalBomRatings);

            // Save comment if provided
            if (reviewBook_formComment.trim()) {
                if (!globalBomComments[bomId]) globalBomComments[bomId] = {};
                globalBomComments[bomId][currentUser.id] = {
                    id: generateId(),
                    userId: currentUser.id,
                    userNameDisplay: currentUser.literaryPseudonym || currentUser.name,
                    text: reviewBook_formComment.trim(),
                    timestamp: Date.now()
                };
                Storage.setItem("globalBomComments", globalBomComments);
            }
        }
    }
    handleCloseReviewBookModal(); // This calls App()
};

const handleReviewBookSubmit = (event) => {
    event.preventDefault();
    processAndSaveReview(true);
};

const handleReviewBookSkip = () => {
    processAndSaveReview(false);
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
            App();
            
            const chatContainer = document.getElementById('chatMessagesContainer');
            if (chatContainer) {
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }
        }
    }
};

// --- Profile Handlers ---
const handleProfileSave = (event) => {
    event.preventDefault();
    if (!currentUser || !currentUser.id) return;

    const form = event.target as HTMLFormElement;
    const nameInput = form.elements.namedItem('name') as HTMLInputElement;
    const bioInput = form.elements.namedItem('bio') as HTMLTextAreaElement;

    const name = nameInput instanceof HTMLInputElement ? nameInput.value : userProfile.name;
    const bio = bioInput instanceof HTMLTextAreaElement ? bioInput.value : userProfile.bio;

    const updatedProfile: UserProfile = { ...userProfile, name, bio }; 
    Storage.setUserItem(currentUser.id, "profile", updatedProfile);
    userProfile = updatedProfile; 

    const userIndex = users.findIndex(u => u.id === currentUser!.id); 
    if (userIndex !== -1) {
        users[userIndex].name = name; 
        Storage.setItem("users", users);
        currentUser.name = name; 
        Storage.setItem("currentUser", currentUser);
    }
    
    alert("Profile saved!"); 
    App();
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


const attachEventListeners = () => {
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
};


// --- Main App Component ---
const App = () => {
    const root = document.getElementById('root');
    if (!root) {
        console.error("Root element not found!");
        return;
    }

    let appContainerClass = "app-container";
    if (!currentUser || !currentUser.onboardingComplete) {
        appContainerClass += " auth-onboarding-active";
    }


    root.innerHTML = `
        <div class="${appContainerClass}">
            ${renderTopHeader()}
            <div class="main-content">
                ${renderCurrentView()}
            </div>
            ${renderBottomNav()}
            ${renderAddBookModal()}
            ${renderBomProposalModal()}
            ${renderReviewBookModal()}
            ${(currentUser && currentUser.onboardingComplete && currentView === 'mybooks') ? renderAddBookFAB() : ''}
        </div>
    `;
    attachEventListeners();
};

// --- Initial Load ---
bookOfTheMonthHistory = Storage.getItem("bookOfTheMonthHistory", []);
bomProposals = Storage.getItem("bomProposals", []);
chatMessages = Storage.getItem("chatMessagesGlobal", []);
globalBomRatings = Storage.getItem("globalBomRatings", {});
globalBomComments = Storage.getItem("globalBomComments", {});


initializeAndSetCurrentBOM(); 

if (currentUser && currentUser.id) {
    loadUserSpecificData(); 
    if (!currentUser.onboardingComplete) {
        currentAuthProcessView = 'onboarding_questions'; 
    }
} else {
    currentAuthProcessView = 'auth_options'; 
}
App();
