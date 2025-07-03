// File: netlify/functions/update-proposal-vote.cjs

const admin = require('firebase-admin');

if (admin.apps.length === 0) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8')))
    });
  } catch (e) { console.error("Firebase admin init error", e); }
}

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') return { statusCode: 405 };
    try {
        const { proposalId, userId, proposalMonth } = JSON.parse(event.body);
        if (!proposalId || !userId || !proposalMonth) return { statusCode: 400, body: 'Missing required data.' };
        
        const db = admin.firestore();
        const proposalsRef = db.collection('proposals');

        // Use a transaction to safely read and write the data
        await db.runTransaction(async (transaction) => {
            const monthProposalsQuery = proposalsRef.where('proposalMonthYear', '==', proposalMonth);
            const monthProposalsSnapshot = await transaction.get(monthProposalsQuery);

            let userVotedForTarget = false;
            let targetProposalDocRef = null;

            monthProposalsSnapshot.forEach(doc => {
                const proposal = doc.data();
                if (doc.id === proposalId) {
                    targetProposalDocRef = doc.ref;
                    if (proposal.votes && proposal.votes.includes(userId)) {
                        userVotedForTarget = true;
                    }
                }
                // Remove the user's vote from any proposal for this month
                transaction.update(doc.ref, { votes: admin.firestore.FieldValue.arrayRemove(userId) });
            });

            // If the user had NOT already voted for the target proposal, add their vote
            if (targetProposalDocRef && !userVotedForTarget) {
                transaction.update(targetProposalDocRef, { votes: admin.firestore.FieldValue.arrayUnion(userId) });
            }
        });

        return { statusCode: 200, body: JSON.stringify({ message: 'Vote updated.' }) };
    } catch (error) {
        console.error("Error in update-proposal-vote:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Could not update vote.' }) };
    }
};