// The final, correct startup logic

async function startApplication() {
    // 1. Initialize Firebase first.
    initializeFirebase();

    // 2. Set up the listener that will handle all future auth changes.
    onAuthStateChanged(auth, async (firebaseUser) => {
        // This callback will run once Firebase has the auth status.
        if (firebaseUser) {
            // ... all your correct logic for a logged-in user ...
            const userDocData = await getUserDataFromFirestore(firebaseUser.uid);
            if (userDocData) {
                currentUser = userDocData;
                Storage.setItem("currentUser", currentUser);
                await loadUserSpecificData();
                if (!currentUser.onboardingComplete) {
                    currentAuthProcessView = 'onboarding_questions';
                } else {
                    currentView = Storage.getItem("currentView", "bookofthemonth");
                }
            } else {
                await signOut(auth); // Will re-trigger this listener
                return;
            }
        } else {
            // --- USER IS LOGGED OUT ---
            currentUser = null;
            Storage.removeItem("currentUser");
            books = [];
            currentAuthProcessView = 'auth_options';
        }

        // The listener's job is done, now render with the final state.
        updateView();
    });

    // 3. THIS IS THE MISSING PIECE: Perform an immediate, initial render.
    // This shows the user something (e.g., the login page or a loading spinner)
    // while we wait for onAuthStateChanged to fire.
    // We will also fetch public data here.
    await fetchBomProposals();
    initializeAndSetCurrentBOM();
    updateView(); 
}

// The call at the very bottom of your file
document.addEventListener('DOMContentLoaded', () => {
    startApplication();
});