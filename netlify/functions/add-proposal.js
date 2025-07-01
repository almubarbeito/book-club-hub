// This function adds a new proposal.
const admin = require('firebase-admin');

// (Include the same admin.initializeApp block as above)
try { ... } catch (error) { ... }

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const newProposalData = JSON.parse(event.body);
    // Add a server-side timestamp for accuracy
    newProposalData.timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    const docRef = await admin.firestore().collection('proposals').add(newProposalData);
    return {
      statusCode: 201, // 201 Created
      body: JSON.stringify({ id: docRef.id, ...newProposalData }),
    };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to add proposal.' }) };
  }
};