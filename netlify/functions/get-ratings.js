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

    const snapshot = await db
      .collection('ratings')
      .doc(bomId)
      .collection('userRatings')
      .get();

    const ratings = {};

    snapshot.forEach(doc => {
      ratings[doc.id] = doc.data();
    });

    return {
      statusCode: 200,
      body: JSON.stringify(ratings)
    };

  } catch (error) {
    console.error('Error in get-ratings:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Could not fetch ratings' })
    };
  }
};