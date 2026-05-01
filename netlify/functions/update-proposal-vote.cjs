const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');
const initializeFirebaseAdmin = require('./firebase-admin-init.cjs');

initializeFirebaseAdmin();

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405 };
  }

  try {
    const { proposalId, userId, proposalMonth } = JSON.parse(event.body);

    console.log("DATA:", proposalId, userId, proposalMonth);
    console.log("proposalMonth recibido:", proposalMonth);

    if (!proposalId || !userId || !proposalMonth) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing data" })
      };
    }

    const db = admin.firestore();

    // 👉 1. obtener proposal
    const proposalRef = db.collection('proposals').doc(proposalId);
    const proposalSnap = await proposalRef.get();

    if (!proposalSnap.exists) {
      throw new Error("Proposal not found");
    }

    const proposal = proposalSnap.data();
    const userHadVoted = proposal.votes?.includes(userId);

    // 👉 2. contar votos del usuario en este mes
    const monthSnapshot = await db
  .collection('proposals')
  .where('proposalMonthYear', '==', proposalMonth)
  .get();

let userVoteCount = 0;

monthSnapshot.forEach(doc => {
  console.log("doc month:", doc.data().proposalMonthYear);
  const data = doc.data();

  if (data.status === 'selected') return;

  const votes = data.votes || [];

  // 👇 excluir el proposal actual si ya votó
  if (doc.id === proposalId) {
    if (votes.includes(userId)) {
      userVoteCount--; // 🔥 CLAVE
    }
  }

  if (votes.includes(userId)) {
    userVoteCount++;
  }
});

    console.log("User votes this month:", userVoteCount);

    // 👉 3. lógica de voto
    if (!userHadVoted && userVoteCount >= 2) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Vote limit reached (max 2)" })
      };
    }

    // 👉 4. update
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