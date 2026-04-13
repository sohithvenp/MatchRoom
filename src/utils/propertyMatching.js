/**
 * Vector-Based Property Compatibility Scoring Algorithm
 * Uses Euclidean Distance for calculating 0-100 compatibility scores.
 */
import { getStudentIdealTags } from './lifestyleTags';
import { db } from '../firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';

// Mappings for Euclidean vectors
const cleanlinessMap = { 'very clean': 0, 'strict': 0, 'moderate': 1, 'messy': 2, 'flexible': 2 };
const studyMap = { 'morning': 0, 'study-friendly': 0, 'afternoon': 1, 'night': 2, 'late night': 2 };
const socialMap = { 'rarely invite friends': 0, 'quiet': 0, 'sometimes': 1, 'often': 2, 'social': 2 };
const guestMap = { 'never': 0, 'restricted': 0, 'weekends': 1, 'moderate': 1, 'often': 2, 'flexible': 2 };
const smokingMap = { 'non-smoker': 0, 'not allowed': 0, 'smoker': 2, 'allowed': 2 };
const noiseMap = { 'quiet': 0, 'moderate': 1, 'lively': 2, 'social': 2 };

function getEuclideanFactor(valA, valB, mapObj, factorName) {
    const defaultVal = 1;
    let a = mapObj[valA] !== undefined ? mapObj[valA] : defaultVal;
    let b = mapObj[valB] !== undefined ? mapObj[valB] : defaultVal;
    
    // Some keys might not match directly, default to 1 (neutral/moderate)
    
    const distance = Math.abs(a - b); // 0, 1, or 2
    
    let matchLevel = 'Neutral';
    let explanation = 'Workable dynamics';
    let scorePenalty = distance * distance; // squared distance: 0, 1, 4

    if (distance === 0) {
        matchLevel = 'Strong Match';
        explanation = `Perfect vector alignment for ${factorName.toLowerCase()}.`;
    } else if (distance === 1) {
        matchLevel = 'Partial Match';
        explanation = `Slight deviation in ${factorName.toLowerCase()} habits.`;
    } else {
        matchLevel = 'Conflict';
        explanation = `Opposing vectors in ${factorName.toLowerCase()}.`;
    }

    // if factor is smoking, conflict gives a major penalty
    if (factorName === 'Smoking Policy' && distance === 2) {
       explanation = "Potential health/habit friction";
       scorePenalty = 9; // heavy weighting
    }

    return { valA, valB, distance, sqDist: scorePenalty, matchLevel, explanation };
}

export function calculateCompatibilityBreakdown(studentPrefs, propertyAttrs) {
    if (!studentPrefs || !propertyAttrs) return { score: 0, factors: [] };

    const factors = [];
    let sumSqDist = 0;

    // 1. Cleanliness
    const cleanF = getEuclideanFactor(studentPrefs.cleanliness, propertyAttrs.cleaningExpectation, cleanlinessMap, 'Cleanliness Standards');
    sumSqDist += cleanF.sqDist;
    factors.push({ factor: 'Cleanliness Standards', studentValue: studentPrefs.cleanliness || 'N/A', propertyValue: propertyAttrs.cleaningExpectation || 'N/A', matchLevel: cleanF.matchLevel, explanation: cleanF.explanation });

    // 2. Study Schedule
    const studyF = getEuclideanFactor(studentPrefs.studyTime, propertyAttrs.quietHours, studyMap, 'Study Schedule');
    sumSqDist += studyF.sqDist;
    factors.push({ factor: 'Study Schedule', studentValue: studentPrefs.studyTime || 'N/A', propertyValue: propertyAttrs.quietHours || 'N/A', matchLevel: studyF.matchLevel, explanation: studyF.explanation });

    // 3. Social Atmosphere
    const socialF = getEuclideanFactor(studentPrefs.socialLevel, propertyAttrs.environmentType, socialMap, 'Social Atmosphere');
    sumSqDist += socialF.sqDist;
    factors.push({ factor: 'Social Atmosphere', studentValue: studentPrefs.socialLevel || 'N/A', propertyValue: propertyAttrs.environmentType || 'N/A', matchLevel: socialF.matchLevel, explanation: socialF.explanation });

    // 4. Guest Accessibility
    const guestF = getEuclideanFactor(studentPrefs.guestPreference, propertyAttrs.guestPolicy, guestMap, 'Guest Accessibility');
    sumSqDist += guestF.sqDist;
    factors.push({ factor: 'Guest Accessibility', studentValue: studentPrefs.guestPreference || 'N/A', propertyValue: propertyAttrs.guestPolicy || 'N/A', matchLevel: guestF.matchLevel, explanation: guestF.explanation });

    // 5. Smoking Policy
    const smokeF = getEuclideanFactor(studentPrefs.smoking, propertyAttrs.smokingPolicy, smokingMap, 'Smoking Policy');
    sumSqDist += smokeF.sqDist;
    factors.push({ factor: 'Smoking Policy', studentValue: studentPrefs.smoking || 'N/A', propertyValue: propertyAttrs.smokingPolicy || 'N/A', matchLevel: smokeF.matchLevel, explanation: smokeF.explanation });

    // 6. Noise Tolerance
    const noiseF = getEuclideanFactor(studentPrefs.noisePreference, propertyAttrs.environmentType, noiseMap, 'Acoustic Comfort');
    sumSqDist += noiseF.sqDist;
    factors.push({ factor: 'Acoustic Comfort', studentValue: studentPrefs.noisePreference || 'N/A', propertyValue: propertyAttrs.environmentType || 'N/A', matchLevel: noiseF.matchLevel, explanation: noiseF.explanation });

    // Calculate Euclidean Distance Score
    // Max sumSqDist if all 6 factors have dist 2 => 6 * 4 = 24. Modifying smoking gives it +5 max. Say max is 29.
    const maxSqDist = 29;
    const euclideanDistance = Math.sqrt(sumSqDist);
    const maxEuclideanDist = Math.sqrt(maxSqDist);
    
    // Normalize to 0-100
    let baseScore = 100 - ((euclideanDistance / maxEuclideanDist) * 100);

    // Lifestyle Tags Bonus
    const idealTags = getStudentIdealTags(studentPrefs);
    const propTags = propertyAttrs.lifestyleTags || [];
    if (idealTags.length > 0 && propTags.length > 0) {
        const matches = idealTags.filter(t => propTags.includes(t));
        const matchRatio = matches.length / idealTags.length;
        if (matchRatio >= 0.5) {
            baseScore += 10;
            factors.push({ factor: 'Lifestyle Tags Fit', matchLevel: 'Strong Match', explanation: 'Highly compatible lifestyle tags' });
        } else if (matchRatio > 0) {
            baseScore += 5;
            factors.push({ factor: 'Lifestyle Tags Fit', matchLevel: 'Partial Match', explanation: 'Some shared lifestyle tags' });
        }
    }

    return {
        score: Math.min(100, Math.max(0, Math.round(baseScore))),
        factors
    };
}

export function calculatePropertyCompatibility(studentPrefs, propertyAttrs) {
    const breakdown = calculateCompatibilityBreakdown(studentPrefs, propertyAttrs);
    
    return {
        score: breakdown.score,
        breakdownFactors: breakdown.factors,
        matchReasons: breakdown.factors
            .filter(f => f.matchLevel === 'Strong Match')
            .map(f => f.factor)
            .slice(0, 3)
    };
}

/**
 * Syncs the calculated Euclidean Vectors to Firebase Firestore.
 */
export async function savePropertyMatchesToFirebase(userId, evaluatedProperties) {
    if (!userId || !evaluatedProperties || evaluatedProperties.length === 0) return;
    
    try {
        const batch = writeBatch(db);
        evaluatedProperties.forEach(p => {
             if (p.compatibility && p.compatibility.score) {
                 const matchRef = doc(db, `users/${userId}/propertyMatches`, p.id);
                 batch.set(matchRef, {
                     propertyId: p.id,
                     propertyName: p.propertyName,
                     score: p.compatibility.score,
                     factors: p.compatibility.breakdownFactors || [],
                     updatedAt: new Date()
                 }, { merge: true });
             }
        });
        await batch.commit();
        console.log("Vector matches synced to Firebase under the user's subcollection.");
    } catch (e) {
        console.warn("Could not save to Firebase:", e);
    }
}

