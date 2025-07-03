// File: netlify/functions/update-profile.cjs

const admin = require('firebase-admin');

// Standard Firebase Admin initialization (same as your other functions)
if (admin.apps.length === 0) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8')))
    });
  } catch (e) {
    console.error("Firebase admin initialization error in update-profile", e);
  }
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Get the userId and the new profile data from the frontend
    const { userId, profileData } = JSON.parse(event.body);

    if (!userId || !profileData) {
      return { statusCode: 400, body: JSON.stringify({ error: 'User ID and profile data are required.' }) };
    }

    const db = admin.firestore();
    
    // Get a reference to the specific user's document in the 'users' collection
    const userDocRef = db.collection('users').doc(userId);

    // Update the document. 
    // 'set' with '{ merge: true }' is perfect: it updates fields if the doc exists,
    // or creates the doc with these fields if it doesn't. It will not overwrite
    // other fields like 'email' or 'onboardingComplete'.
    await userDocRef.set(profileData, { merge: true });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Profile updated successfully." }),
    };

  } catch (error) {
    console.error("Error updating user profile:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Could not update profile." }) };
  }
};