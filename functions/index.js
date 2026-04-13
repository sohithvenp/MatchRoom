const functions = require('firebase-functions');
const admin = require('firebase-admin');

// We would import the exact matching logic from the frontend if using a monorepo, 
// here is the mirrored calculation logic to keep the cloud function self-contained.
function calculateCompatibilityScoring(studentPrefs, propertyAttrs) {
    if (!studentPrefs || !propertyAttrs) return 0;
    
    // Abstracted calculation that mirrors the frontend logic structurally
    let score = 0;
    
    // Cleanliness
    if (studentPrefs.cleanliness === propertyAttrs.cleaningExpectation) score += 15;
    else score += 10;
    
    // Social match
    if (studentPrefs.socialLevel === 'often' && propertyAttrs.environmentType === 'social') score += 15;
    else if (studentPrefs.socialLevel === 'rarely invite friends' && propertyAttrs.environmentType === 'quiet') score += 15;
    else score += 8;

    // Lifestyle tags checking (simplified for CF)
    const idealTags = [];
    if (studentPrefs.noisePreference === 'quiet') idealTags.push('quiet_household');
    if (studentPrefs.socialLevel === 'often') idealTags.push('social_friendly');
    
    const propTags = propertyAttrs.lifestyleTags || [];
    if (idealTags.length > 0 && propTags.length > 0) {
        const matches = idealTags.filter(t => propTags.includes(t));
        const matchRatio = matches.length / idealTags.length;
        if (matchRatio >= 0.5) score += 15;
        else if (matchRatio > 0) score += 8;
    }

    // Baseline calculation normalization (assuming 100 is max in this mock)
    // The exact algorithm implementation would be imported from a shared package.
    return Math.min(100, Math.round(score * 1.5 + 40)); 
}

admin.initializeApp();
const db = admin.firestore();

exports.notifyOnHighCompatibility = functions.firestore
  .document('properties/{propertyId}')
  .onCreate(async (snap, context) => {
    const newProperty = snap.data();
    const propertyId = context.params.propertyId;
    
    // 1. Retrieve all student profiles
    const usersSnapshot = await db.collection('users').get();
    
    const notifications = [];
    
    usersSnapshot.forEach(userDoc => {
      const student = userDoc.data();
      
      // Skip users without a completed profile or missing settings
      if (!student.lifestyle || !student.notificationPreferences) return;
      
      // 2. Compare property attributes with student preferences
      const compatibilityScore = calculateCompatibilityScoring(student.lifestyle, newProperty);
      
      // 3. Check threshold
      const threshold = student.compatibilityThreshold || 80;
      
      if (compatibilityScore >= threshold) {
        
        // 4. Trigger Notification Logic Based on Preferences
        const prefs = student.notificationPreferences;
        
        if (prefs.inApp) {
            // Save to Firestore so the user's bell icon lights up
            notifications.push(
               db.collection('users').doc(userDoc.id).collection('notifications').add({
                  title: 'New Compatible Property Found',
                  propertyName: newProperty.propertyName || 'Unnamed Property',
                  propertyId: propertyId,
                  compatibilityScore: compatibilityScore,
                  message: `A new listing matches your ${threshold}% threshold!`,
                  read: false,
                  createdAt: admin.firestore.FieldValue.serverTimestamp()
               })
            );
        }
        
        if (prefs.email) {
            // Execute email sending logic (e.g., SendGrid, Nodemailer, Firebase Trigger Email)
            console.log(`[EMAIL SEND] To ${student.email || userDoc.id}: Property ${newProperty.propertyName} scored ${compatibilityScore}%!`);
        }
        
        if (prefs.push) {
            // Execute FCM Push Notification
            if (student.fcmToken) {
                const payload = {
                    notification: {
                        title: 'New Property Match!',
                        body: `${newProperty.propertyName} exceeds your ${threshold}% compatibility threshold.`,
                    },
                    token: student.fcmToken
                };
                notifications.push(admin.messaging().send(payload).catch(err => console.error("FCM Error", err)));
            }
        }
      }
    });

    // Run all generated promises
    await Promise.all(notifications);
    return null;
  });

// Export the feedback analytics module
const feedbackAnalytics = require('./feedbackAnalytics');
exports.analyzeFeedbackAccuracy = feedbackAnalytics.analyzeFeedbackAccuracy;
