// File: netlify/functions/get-my-books.cjs
// USES THE SAME PROVEN PATTERN AS get-proposals.cjs

const admin = require('firebase-admin');

// Initialize Firebase Admin, but only if it hasn't been already.
// This prevents errors if multiple functions run in the same environment.
if (admin.apps.length === 0) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8')))
    });
  } catch (e) {
    console.error("Firebase admin initialization error", e);
  }
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { userId } = JSON.parse(event.body);
    if (!userId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'User ID is required.' }) };
    }

    // Get the Firestore instance from the initialized admin app
    const db = admin.firestore();

    // The query for the user's sub-collection of books
    const booksRef = db.collection('users').doc(userId).collection('books');
    const snapshot = await booksRef.get();

    // If the user has no books, return an empty array
    if (snapshot.empty) {
      return { statusCode: 200, body: JSON.stringify({ books: [] }) };
    }

    // Map the documents to an array of book objects
    const books = [];
    snapshot.forEach(doc => {
      books.push({ id: doc.id, ...doc.data() });
    });

    // Return the user's books
    return {
      statusCode: 200,
      body: JSON.stringify({ books }),
    };

  } catch (error) {
    console.error("Error fetching user's books:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Could not fetch books." }) };
  }
};