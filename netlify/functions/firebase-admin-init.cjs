// File: netlify/functions/firebase-admin-init.cjs

const admin = require('./firebase-admin-init.cjs');

// Only initialize if no apps exist. This is the key check.
if (admin.apps.length === 0) {
    console.log("[firebase-admin-init] No Firebase app initialized. Starting new initialization.");
    try {
        admin.initializeApp({
            credential: admin.credential.cert(
                JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8'))
            )
        });
        console.log("[firebase-admin-init] Firebase Admin SDK Initialized SUCCESSFULLY.");
    } catch (e) {
        // Log the full error to see what's wrong with the service account key
        console.error('[firebase-admin-init] CRITICAL: Firebase admin initialization error:', e);
    }
}

// Export the admin object itself.
module.exports = admin;