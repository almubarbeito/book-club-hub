// File: netlify/functions/add-proposal.cjs
// --- The New, Correct Initialization ---
const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore'); // Import FieldValue directly
const initializeFirebaseAdmin = require('./firebase-admin-init.cjs');
initializeFirebaseAdmin(); // Ensure the app is initialized
// ------------------------------------

// This is the new, more compatible version of the handler

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const proposalData = JSON.parse(event.body);
    const db = admin.firestore();

    const docToAdd = {
      ...proposalData, // The spread operator is usually fine here
      timestamp: FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('proposals').add(docToAdd);
    
    // --- THIS IS THE REWRITTEN PART ---
    // Get the data from the newly created document
    const newDocSnapshot = await docRef.get();
    const finalData = newDocSnapshot.data();

    // Manually add the ID to the object instead of using spread syntax
    finalData.id = newDocSnapshot.id;
    // ------------------------------------
    
    return {
      statusCode: 201,
      body: JSON.stringify(finalData), // Now we stringify the complete object
    };
  } catch (error) {
    console.error("add-proposal error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to add proposal.' }) };
  }
};