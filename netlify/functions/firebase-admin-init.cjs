// The new, robust, and lazy-initialized firebase-admin-init.cjs

const admin = require('firebase-admin');

// A global variable to hold the initialized app
let firebaseApp;

function initializeFirebaseAdmin() {
  // If the app is already initialized, just return it
  if (firebaseApp) {
    return firebaseApp;
  }

  // Check if any app exists in the admin namespace (a safety check)
  if (admin.apps.length > 0) {
    firebaseApp = admin.app(); // Get the default app
    return firebaseApp;
  }

  // If no app is initialized, then initialize it now
  console.log('[firebase-admin-init] Initializing Firebase Admin for the first time...');
  try {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8')))
    });
    console.log('[firebase-admin-init] Firebase Admin SDK Initialized SUCCESSFULLY.');
    return firebaseApp;
  } catch (e) {
    console.error('[firebase-admin-init] CRITICAL: Firebase admin initialization error:', e);
    // In case of error, we don't want to cache a failed state.
    // Let it throw so we can see the error clearly in the logs.
    throw e;
  }
}

// Export the INITIALIZER FUNCTION, not the admin object directly.
module.exports = initializeFirebaseAdmin;