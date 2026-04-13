/**
 * Compatibility Algorithm
 * Computes C(u,p) = similarity between Xu and Xp
 * 
 * Vectors include: [sleep, cleanliness, social, study, noise]
 * Rated from 1 to 5.
 * 
 * We use an inverse Euclidean distance, normalized to a 0-100 score.
 */

export function calculateCompatibility(userVector, propertyVector) {
    if (!userVector || !propertyVector) return 0;
    
    // Ordered arrays of the 5 features. Using keys: sleep, clean, social, study, noise.
    const keys = ['sleep', 'cleanliness', 'social', 'study', 'noise'];
    
    let sumSqDiff = 0;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      let userVal = 3;
      let propVal = 3;

      if (Array.isArray(userVector)) {
        userVal = userVector[i] !== undefined ? userVector[i] : 3;
      } else {
        userVal = userVector[key] !== undefined ? userVector[key] : 3;
      }

      if (Array.isArray(propertyVector)) {
        propVal = propertyVector[i] !== undefined ? propertyVector[i] : 3;
      } else {
        propVal = propertyVector[key] !== undefined ? propertyVector[key] : 3;
      }

      const diff = userVal - propVal;
      sumSqDiff += diff * diff;
    }
    
    // Max difference per feature is 4 (5 - 1). 
    // Squared max diff is 16. Total max for 5 features is 5 * 16 = 80.
    const maxSqDistance = 80;
    
    // Calculate inverse normalized distance (0 to 100%)
    const similarity = (1 - Math.sqrt(sumSqDiff) / Math.sqrt(maxSqDistance)) * 100;
    
    return Math.max(0, similarity);
}
