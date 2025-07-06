// File: netlify/functions/get-my-books.cjs
// CORRECTED VERSION

const admin = require('./firebase-admin-init.cjs');

if (admin.apps.length === 0) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8')))
    });
  } catch (e) { console.error("Firebase admin init error", e); }
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

    const db = admin.firestore();

    // --- THIS IS THE CORRECTED LOGIC ---
    // 1. Get a reference to the USER document itself
    const userDocRef = db.collection('users').doc(userId);
    const doc = await userDocRef.get();

    // 2. Check if the document exists and has a 'books' field
    if (!doc.exists || !doc.data().books) {
      // If no books field, return an empty array
      return { statusCode: 200, body: JSON.stringify({ books: [] }) };
    }

    // 3. Return the 'books' array from the document data
    const books = doc.data().books;
    return {
      statusCode: 200,
      body: JSON.stringify({ books }),
    };
    // ------------------------------------

  } catch (error) {
    console.error("Error fetching user's books:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Could not fetch books." }) };
  }
};