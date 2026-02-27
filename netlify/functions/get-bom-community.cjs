const initializeFirebaseAdmin = require('./firebase-admin-init.cjs');
const admin = initializeFirebaseAdmin();

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405 };
  }

  try {
    const { bomId } = JSON.parse(event.body);

    if (!bomId) {
      return { statusCode: 400, body: 'Missing bomId' };
    }

    const db = admin.firestore();

    // 🔹 RATINGS
    const ratingsSnap = await db
      .collection('ratings')
      .doc(bomId)
      .collection('userRatings')
      .get();

    const ratings = {};
    ratingsSnap.forEach(doc => {
      ratings[doc.id] = doc.data();
    });

    // 🔹 COMMENTS
    const commentsSnap = await db
      .collection('comments')
      .doc(bomId)
      .collection('userComments')
      .get();

    const comments = {};
    commentsSnap.forEach(doc => {
      comments[doc.id] = doc.data();
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ ratings, comments })
    };

  } catch (error) {
    console.error('get-bom-community error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to load community data' })
    };
  }
};