// File: netlify/functions/firebase-admin-init.js

const admin = require('firebase-admin');

// Check if the app is already initialized to prevent errors on reloads
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8')
    );

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (e) {
    console.error('Firebase admin initialization error', e.stack);
  }
}

// Export the initialized admin instance
module.exports = admin;