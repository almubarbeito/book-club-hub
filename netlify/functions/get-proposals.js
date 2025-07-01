// This function fetches all proposals.
// File: netlify/functions/get-proposals.js
const admin = require('firebase-admin');

// Initialize Firebase only if it hasn't been already
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8')))
  });
}

exports.handler = async function () {
  try {
    const db = admin.firestore();
    const snapshot = await db.collection('proposals').get();
    
    if (snapshot.empty) {
      return { statusCode: 200, body: JSON.stringify([]) };
    }

    const proposals = snapshot.docs.map(doc => {
      const data = doc.data();
      // Handle server timestamps correctly
      const timestamp = data.timestamp ? data.timestamp.toDate().toISOString() : new Date().toISOString();
      return { 
        id: doc.id, 
        ...data,
        timestamp: timestamp 
      };
    });

    return {
      statusCode: 200,
      body: JSON.stringify(proposals),
    };
  } catch (error) {
    console.error("get-proposals error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch proposals.' }) };
  }
};