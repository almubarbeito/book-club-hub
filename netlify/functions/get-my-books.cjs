// File: netlify/functions/get-my-books.cjs
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin
try {
  const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8'));
  if (!admin.apps.length) { // Prevent re-initialization
    initializeApp({ credential: cert(serviceAccount) });
  }
} catch (e) {
  console.error('Firebase admin initialization error:', e);
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { userId } = JSON.parse(event.body);
    if (!userId) {
      return { statusCode: 400, body: 'User ID is required.' };
    }

    const db = getFirestore();
    const booksRef = db.collection('users').doc(userId).collection('books');
    const snapshot = await booksRef.get();

    if (snapshot.empty) {
      return { statusCode: 200, body: JSON.stringify({ books: [] }) };
    }

    const books = [];
    snapshot.forEach(doc => {
      books.push({ id: doc.id, ...doc.data() });
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ books }),
    };

  } catch (error) {
    console.error("Error fetching user's books:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Could not fetch books." }) };
  }
};