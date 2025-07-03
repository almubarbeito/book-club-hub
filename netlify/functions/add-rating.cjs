// File: netlify/functions/add-rating.cjs
const admin = require('firebase-admin');
// ... (Your standard Firebase init block) ...
if (admin.apps.length === 0) { /* ... */ }

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') return { statusCode: 405 };
    try {
        const { bomId, userId, ratings } = JSON.parse(event.body);
        if (!bomId || !userId || !ratings) return { statusCode: 400, body: 'Missing required data.' };
        
        const db = admin.firestore();
        // We are setting a specific user's rating inside the book's ratings sub-collection or map
        const ratingDocRef = db.collection('ratings').doc(bomId).collection('userRatings').doc(userId);
        // OR if you store ratings as a map:
        // const ratingDocRef = db.collection('ratings').doc(bomId);
        // await ratingDocRef.set({ [userId]: ratings }, { merge: true });

        await ratingDocRef.set(ratings);

        return { statusCode: 200, body: JSON.stringify({ message: 'Rating saved.' }) };
    } catch (error) {
        console.error("Error in add-rating:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Could not save rating.' }) };
    }
};