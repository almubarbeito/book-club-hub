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
    if (!userId || !userData) return { statusCode: 400, body: 'User ID and user data are required.' };
    
    const db = admin.firestore();
    const userDocRef = db.collection('users').doc(userId);
    
    // Use 'set' here to overwrite the entire user document with the new complete object
    await userDocRef.set(userData);

    return { statusCode: 200, body: JSON.stringify({ message: 'User updated successfully.' }) };
  } catch (error) {
    console.error("Error updating user:", error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not update user.' }) };
  }
};