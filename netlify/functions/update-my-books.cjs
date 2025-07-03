// File: netlify/functions/update-my-books.cjs

const admin = require('firebase-admin');

// Initialize Firebase Admin, but only if it hasn't been already.
if (admin.apps.length === 0) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8')))
    });
  } catch (e) {
    console.error("Firebase admin initialization error in update-my-books", e);
  }
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { userId, books } = JSON.parse(event.body);

    if (!userId || !Array.isArray(books)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'User ID and books array are required.' }) };
    }

    // --- THIS IS THE CORRECTED LINE ---
    const db = admin.firestore();

    // Get a reference to the user's document
    const userDocRef = db.collection('users').doc(userId);
    
    // Use a batch write to efficiently update all books
    const batch = db.batch();

    // First, clear existing books in the sub-collection (if that's the desired logic)
    // This is a more complex operation. A simpler way is to just overwrite the books array
    // on the main user document if you're not using a sub-collection.
    // Let's assume you're storing the 'books' array directly on the user document for simplicity.
    
    // Overwrite the 'books' field on the user document with the new array
    await userDocRef.set({ books: books }, { merge: true });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Books updated successfully." }),
    };

  } catch (error) {
    console.error("Error updating user's books:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Could not update books." }) };
  }
};