// File: netlify/functions/update-proposal-vote.cjs

const admin = require('firebase-admin');
const initializeFirebaseAdmin = require('./firebase-admin-init.cjs');
initializeFirebaseAdmin();

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };

  try {
    const { proposalId, userId, proposalMonth } = JSON.parse(event.body);
    console.log(`Vote attempt: User [${userId}] on Proposal [${proposalId}] for Month [${proposalMonth}]`);

    if (!proposalId || !userId || !proposalMonth) {
      return { statusCode: 400, body: 'Missing required data.' };
    }

    const db = admin.firestore();
    const proposalsRef = db.collection('proposals');

    await db.runTransaction(async (transaction) => {
      const monthProposalsQuery = proposalsRef.where('proposalMonthYear', '==', proposalMonth);
      const monthProposalsSnapshot = await transaction.get(monthProposalsQuery);

      let targetProposalDoc = null;
      let targetProposalData = null;

      let userVoteCountThisMonth = 0;

      let userVoteCount = 0;

monthProposalsSnapshot.forEach(doc => {
    const data = doc.data();
    const votes = data.votes || [];

    if (votes.includes(userId)) {
        userVoteCount++;
    }

    if (doc.id === proposalId) {
        targetProposalDocRef = doc.ref;
        userVotedForTarget = votes.includes(userId);
    }
});

if (!userVotedForTarget) {
    if (userVoteCount >= 2) {
        throw new Error("Vote limit reached");
    }

    transaction.update(targetProposalDocRef, {
        votes: FieldValue.arrayUnion(userId)
    });
} else {
    transaction.update(targetProposalDocRef, {
        votes: FieldValue.arrayRemove(userId)
    });
}

      if (!targetProposalDoc || !targetProposalData) {
        throw new Error('Proposal document not found within the transaction.');
      }

      // No puede votar su propia propuesta
      if (targetProposalData.proposedByUserId === userId) {
        throw new Error('You cannot vote for your own proposal.');
      }

      const targetVotes = targetProposalData.votes || [];
      const userAlreadyVotedOnTarget = targetVotes.includes(userId);

      if (userAlreadyVotedOnTarget) {
        // Quitar solo este voto
        transaction.update(targetProposalDoc.ref, {
          votes: admin.firestore.FieldValue.arrayRemove(userId),
        });
      } else {
        // Limitar a 2 votos por mes
        if (userVoteCountThisMonth >= 2) {
          throw new Error('You can only vote for 2 books per month.');
        }

        // Añadir solo a esta propuesta
        transaction.update(targetProposalDoc.ref, {
          votes: admin.firestore.FieldValue.arrayUnion(userId),
        });
      }
    });

    return { statusCode: 200, body: JSON.stringify({ message: 'Vote updated.' }) };
  } catch (error) {
    console.error('CRITICAL ERROR in update-proposal-vote:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Could not update vote.' }),
    };
  }
};