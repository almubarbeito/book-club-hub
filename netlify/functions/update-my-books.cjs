// File: netlify/functions/update-my-books.cjs
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin (same as above)
try {
  // ... (copy the same initialization block from get-my-books.cjs) ...
} catch (e) { console.error('Firebase admin initialization error:', e); }

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { userId, books } = JSON.parse(event.body);
    if (!userId || !Array.isArray(books)) {
      return { statusCode: 400, body: 'User ID and a books array are required.' };
    }

    const db = getFirestore();
    const booksRef = db.collection('users').doc(userId).collection('books');

    // To overwrite, we first delete all existing books for the user
    const existingBooks = await booksRef.get();
    const batch = db.batch();
    existingBooks.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Then, we add the new list of books
    books.forEach(book => {
      const { id, ...bookData } = book; // Separate the ID from the rest of the data
      const docRef = booksRef.doc(id); // Use the existing ID
      batch.set(docRef, bookData);
    });

    await batch.commit(); // Commit all the changes at once

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: "Books updated successfully." }),
    };

  } catch (error) {
    console.error("Error updating user's books:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Could not update books." }) };
  }
};