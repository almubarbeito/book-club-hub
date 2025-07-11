// File: netlify/functions/update-proposal-vote.cjs

// NEW, CORRECTED TOP SECTION

// 1. Get the main 'firebase-admin' module
const admin = require('firebase-admin');

// 2. Get the FieldValue class directly from the main export
const { FieldValue } = require('firebase-admin/firestore');

// 3. Run our standard initializer function
const initializeFirebaseAdmin = require('./firebase-admin-init.cjs');
initializeFirebaseAdmin(); // This just ensures the app is initialized

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') return { statusCode: 405 };
    try {
        const { proposalId, userId, proposalMonth } = JSON.parse(event.body);
        console.log(`Vote attempt: User [${userId}] on Proposal [${proposalId}] for Month [${proposalMonth}]`);

        if (!proposalId || !userId || !proposalMonth) {
            console.error("Validation failed: Missing required data.");
            return { statusCode: 400, body: 'Missing required data.' };
        }
        
        const db = admin.firestore();
        const proposalsRef = db.collection('proposals');

        await db.runTransaction(async (transaction) => {
            console.log("Starting Firestore transaction...");
            const monthProposalsQuery = proposalsRef.where('proposalMonthYear', '==', proposalMonth);
            const monthProposalsSnapshot = await transaction.get(monthProposalsQuery);
            console.log(`Found ${monthProposalsSnapshot.size} proposals for month ${proposalMonth}.`);

            let userVotedForTarget = false;
            let targetProposalDocRef = null;

            monthProposalsSnapshot.forEach(doc => {
                const proposal = doc.data();
                console.log(`Checking proposal: ${doc.id}`);
                if (doc.id === proposalId) {
                    targetProposalDocRef = doc.ref;
                    console.log(`-> Match found! Target ref set for ${doc.id}.`);
                    if (proposal.votes && proposal.votes.includes(userId)) {
                        userVotedForTarget = true;
                        console.log(`-> User [${userId}] had already voted for this target.`);
                    }
                }
                // Always remove any previous vote for this month
                console.log(`-> Removing any vote by ${userId} from proposal ${doc.id}.`);
                transaction.update(doc.ref, { votes: admin.firestore.FieldValue.arrayRemove(userId) });
            });

            if (!targetProposalDocRef) {
                // This is a critical failure point.
                console.error(`Transaction failed: Could not find a document with id [${proposalId}].`);
                throw new Error("Proposal document not found within the transaction.");
            }

            if (!userVotedForTarget) {
                console.log(`-> User had NOT voted for target. Adding vote for ${userId} to ${targetProposalDocRef.id}.`);
                transaction.update(targetProposalDocRef, { votes: admin.firestore.FieldValue.arrayUnion(userId) });
            } else {
                console.log(`-> User had voted for target. Their vote has been removed (unvoted).`);
            }
        });

        console.log("Transaction completed successfully.");
        return { statusCode: 200, body: JSON.stringify({ message: 'Vote updated.' }) };

    } catch (error) {
        // This will now catch the "Proposal document not found" error if it happens
        console.error("CRITICAL ERROR in update-proposal-vote:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Could not update vote.' }) };
    }
};