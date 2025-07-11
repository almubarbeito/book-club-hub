// --- THIS IS THE CORRECTED TOP SECTION ---
const initializeFirebaseAdmin = require('./firebase-admin-init.cjs');
const admin = initializeFirebaseAdmin();
// ----------------------------------------

exports.handler = async function(event) {
    initializeFirebaseAdmin();
    if (event.httpMethod !== 'POST') return { statusCode: 405 };

    try {
        const { userId, userData } = JSON.parse(event.body);
        
        console.log(`[update-user] Received for userId: ${userId}`);
        console.log('[update-user] Received userData:', JSON.stringify(userData, null, 2));

        if (!userId || !userData) {
            console.error("[update-user] Validation Failed: Missing data.");
            return { statusCode: 400, body: 'User ID and data required.' };
        }
        
        const db = admin.firestore();
        const userDocRef = db.collection('users').doc(userId);

        // Use .set with { merge: true } to create or update the document.
        // This is the safest method.
        await userDocRef.set(userData, { merge: true });

        console.log(`[update-user] Successfully SET document for userId: ${userId}`);
        return { statusCode: 200, body: JSON.stringify({ message: 'User updated.' }) };

    } catch (error) {
        console.error("[update-user] CRITICAL ERROR:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Could not update user.' }) };
    }
};