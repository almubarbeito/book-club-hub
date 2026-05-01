const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');
const initializeFirebaseAdmin = require('./firebase-admin-init.cjs');

initializeFirebaseAdmin();

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405 };
  }

  try {
    const { proposalId, userId } = JSON.parse(event.body);

    if (!proposalId || !userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing data" })
      };
    }

    const db = admin.firestore();

    // 👉 obtener proposal
    const proposalRef = db.collection('proposals').doc(proposalId);
    const proposalSnap = await proposalRef.get();

    if (!proposalSnap.exists) {
      throw new Error("Proposal not found");
    }

    const proposal = proposalSnap.data();
    const userHadVoted = (proposal.votes || []).includes(userId);

    // 👉 contar votos activos
    const allProposalsSnapshot = await db.collection('proposals').get();

    let userVoteCount = 0;

    allProposalsSnapshot.forEach(doc => {
      const data = doc.data();

      // ignorar históricos
      if (data.status === 'selected') return;

      const votes = data.votes || [];

      if (votes.includes(userId)) {
        userVoteCount++;
      }
    });

    console.log("User active votes:", userVoteCount);

    // 👉 lógica
    if (!userHadVoted && userVoteCount >= 2) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Vote limit reached (max 2 active votes)" })
      };
    }

    // 👉 update
    await proposalRef.update({
      votes: userHadVoted
        ? FieldValue.arrayRemove(userId)
        : FieldValue.arrayUnion(userId)
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Vote updated" })
    };

  } catch (error) {
    console.error("ERROR:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};