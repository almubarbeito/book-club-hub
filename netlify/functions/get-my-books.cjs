// NEW, SIMPLIFIED way in update-my-books.cjs
const admin = require('./firebase-admin-init.js'); // Require our shared init file
const { getFirestore } = require('firebase-admin/firestore');

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