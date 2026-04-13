const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Ensure app initialization is only done once, if imported via index.js main
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

exports.analyzeFeedbackAccuracy = functions.firestore
  .document('compatibilityFeedback/{feedbackId}')
  .onCreate(async (snap, context) => {
    const feedback = snap.data();
    
    // Core analysis check:
    const predictedScore = feedback.predictedCompatibilityScore; // 1-100
    const satisfactionRating = feedback.satisfactionRating; // 1-5
    
    // Normalize satisfaction to out of 100 for direct comparison
    const normalizedSatisfaction = (satisfactionRating / 5) * 100;
    
    const accuracyDelta = Math.abs(predictedScore - normalizedSatisfaction);
    
    // Example Analytical Data Saving
    let insightCategory = 'Neutral';
    if (predictedScore >= 80 && satisfactionRating >= 4) {
        insightCategory = 'Accurate High Match';
    } else if (predictedScore >= 80 && satisfactionRating <= 2) {
        insightCategory = 'Algorithm Mismatch (False Positive)';
    } else if (predictedScore <= 60 && satisfactionRating >= 4) {
        insightCategory = 'Algorithm Underestimation (False Negative)';
    }

    try {
        await db.collection('predictiveAnalytics').add({
            feedbackId: context.params.feedbackId,
            propertyId: feedback.propertyId,
            predictedScore,
            satisfactionRating,
            normalizedSatisfaction,
            accuracyDelta,
            insightCategory,
            evaluatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`[Algorithm Diagnostics] Processed feedback ${context.params.feedbackId}. Category: ${insightCategory}`);
    } catch (err) {
        console.error("Failed to analyze feedback accuracy", err);
    }
    
    return null;
  });
