// This function fetches all proposals.
// --- THIS IS THE CORRECTED TOP SECTION ---
const initializeFirebaseAdmin = require('./firebase-admin-init.cjs');
const admin = initializeFirebaseAdmin();
// ----------------------------------------

exports.handler = async function () {
  try {
    const db = admin.firestore();
    const snapshot = await db.collection('proposals').get();
    
    if (snapshot.empty) {
      return { statusCode: 200, body: JSON.stringify([]) };
    }

    const proposals = snapshot.docs.map(doc => {
      // --- REWRITTEN PART ---
      const data = doc.data();
      data.id = doc.id; // Manually add the id
      
      // Handle timestamp
      if (data.timestamp && typeof data.timestamp.toDate === 'function') {
        data.timestamp = data.timestamp.toDate().toISOString();
      }
      return data;
      // --------------------
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