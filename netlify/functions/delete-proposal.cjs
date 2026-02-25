// --- THIS IS THE CORRECTED TOP SECTION ---
const initializeFirebaseAdmin = require('./firebase-admin-init.cjs');
const admin = initializeFirebaseAdmin();
// ----------------------------------------

exports.handler = async function (event) {
  // Only allow DELETE requests (or POST if you prefer)
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { proposalId, userId } = JSON.parse(event.body);

    if (!proposalId || !userId) {
      return { statusCode: 400, body: 'Proposal ID and User ID are required.' };
    }

    const db = admin.firestore();
    const proposalRef = db.collection('proposals').doc(proposalId);
    const doc = await proposalRef.get();

    if (!doc.exists) {
  console.log(`Proposal ${proposalId} already deleted.`);
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Proposal already deleted.' }),
  };
}

    const proposalData = doc.data();

    // --- The Crucial Security Check ---
    if (proposalData.proposedByUserId && proposalData.proposedByUserId !== userId) {
      console.warn(`SECURITY: User ${userId} tried to delete proposal ${proposalId} owned by ${proposalData.proposedByUserId}.`);
      return { statusCode: 403, body: 'Permission Denied: You can only delete your own proposals.' };
    }
    // ------------------------------------

    // If the check passes, delete the document
    await proposalRef.delete();

    console.log(`User ${userId} successfully deleted proposal ${proposalId}.`);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Proposal deleted successfully.' }),
    };
  } catch (error) {
    console.error("delete-proposal error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to delete proposal.' }) };
  }
};