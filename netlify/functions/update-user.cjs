// File: netlify/functions/update-user.cjs
const admin = require('firebase-admin');

if (admin.apps.length === 0) {
  try {
    admin.initializeApp({ /* ... your init config ... */ });
  } catch(e) { /* ... */ }
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };

  try {
    const { userId, userData } = JSON.parse(event.body);
    // --- Step 1: Log everything we receive ---
    console.log(`UPDATE_USER: Received request for userId: ${userId}`);
    console.log("UPDATE_USER: Received userData:", JSON.stringify(userData, null, 2));

    if (!userId || !userData) {
      console.error("UPDATE_USER: Validation failed. Missing userId or userData.");
      return { statusCode: 400, body: 'User ID and data required.' };
    }

    const db = admin.firestore();
    const userDocRef = db.collection('users').doc(userId);
    
    const fieldsToUpdate = {
        name: userData.name,
        literaryPseudonym: userData.literaryPseudonym,
        profileImageUrl: userData.profileImageUrl,
        literaryPreferences: userData.literaryPreferences,
        onboardingComplete: userData.onboardingComplete // This is the crucial one
    };

    console.log("UPDATE_USER: Attempting to update document with these fields:", fieldsToUpdate);
    await userDocRef.update(fieldsToUpdate);

    console.log(`UPDATE_USER: Successfully updated document for userId: ${userId}`);
    return { statusCode: 200, body: JSON.stringify({ message: 'User updated.' }) };

  } catch (error) {
    console.error("CRITICAL ERROR in update-user function:", error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not update user.' }) };
  }
};