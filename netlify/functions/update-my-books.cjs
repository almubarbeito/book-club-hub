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