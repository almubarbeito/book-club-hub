// File: netlify/functions/add-comment.cjs
const admin = require('./firebase-admin-init.cjs');
// ... (Your standard Firebase init block) ...
if (admin.apps.length === 0) { /* ... */ }

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') return { statusCode: 405 };
    try {
        const { bomId, commentData } = JSON.parse(event.body);
        if (!bomId || !commentData) return { statusCode: 400, body: 'Missing required data.' };
        
        const db = admin.firestore();
        // Add the new comment as a new document in the book's comments sub-collection
        const commentsColRef = db.collection('comments').doc(bomId).collection('userComments');
        await commentsColRef.add(commentData);

        return { statusCode: 200, body: JSON.stringify({ message: 'Comment saved.' }) };
    } catch (error) {
        console.error("Error in add-comment:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Could not save comment.' }) };
    }
};