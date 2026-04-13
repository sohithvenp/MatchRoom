/**
 * MatchRoom Optimization Module
 * 
 * Formal Model Implementation:
 * Feature vectors: X_u = (x1, x2, ..., xn), X_p = (p1, p2, ..., pn)
 * Compatibility Function: C(u,p) = f(X_u, X_p)
 * Objective Function: F(u,p) = αC(u,p) + βT(p) - γR(p)
 * Constraints: R(p) <= Budget, T(p) <= Threshold, C(u,p) >= Minimum
 */

/**
 * Calculates Euclidean distance between two vectors (lower is better, max distance implies 0 compatibility)
 * and normalizes it to a 0-100 Compatibility Score.
 * 
 * @param {Array<number>} userVector - X_u (e.g., [sleep, cleanliness, social, study, noise]) 
 * @param {Array<number>} propertyVector - X_p (e.g., [sleep, cleanliness, social, study, noise])
 * @returns {number} C(u,p) - Compatibility score (0-100)
 */
export const calculateCompatibility = (userVector, propertyVector) => {
    if (!userVector || !propertyVector || userVector.length !== propertyVector.length) {
        return 0; // Fallback
    }
    
    // Each feature is assumed to be scored on a scale of 1-5.
    // Max theoretical distance squared per feature is 4^2 = 16.
    const maxSqDistance = userVector.length * 16; 
    
    let sumSqDiff = 0;
    for (let i = 0; i < userVector.length; i++) {
        const diff = userVector[i] - propertyVector[i];
        sumSqDiff += diff * diff;
    }
    
    // Normalize distance to a 0-100% score where 100% means 0 distance.
    const compatibilityScore = (1 - Math.sqrt(sumSqDiff) / Math.sqrt(maxSqDistance)) * 100;
    
    return Math.max(0, parseFloat(compatibilityScore.toFixed(2))); // C(u,p)
};

/**
 * The Unified Objective Function evaluating the overall utility score F(u,p).
 * F(u,p) = αC(u,p) + βT(p) - γR(p)
 * 
 * @param {number} compatibility - C(u,p) from calculateCompatibility (0-100)
 * @param {number} commuteTime - T(p) representing time to campus in mins
 * @param {number} rentCost - R(p) representing monthly rent in GBP (£)
 * @param {Object} weights - { alpha, beta, gamma } representing user preferences
 * @returns {number} F(u,p) - Total unified objective score
 */
export const calculateObjectiveFunction = (
    compatibility, 
    commuteTime, 
    rentCost, 
    weights = { alpha: 1.5, beta: -1.0, gamma: -0.5 }
) => {
    // Note: Since we want to maximize C, but minimize T and R...
    // T and R weights beta and gamma must either be negative, or we subtract them.
    // The formal model states: F(u,p) = αC(u,p) + βT(p) - γR(p).
    // Let's assume passed weights are absolute value magnitudes, and we apply the signs strictly based on the formal model.
    
    const alpha = Math.abs(weights.alpha);
    const beta = -Math.abs(weights.beta); // Because lower commute is better
    const gamma = Math.abs(weights.gamma); // Handled as - gamma * R(p) in equation
    
    // F(u,p) = αC(u,p) + βT(p) - γR(p) => using our variables:
    const F = (alpha * compatibility) + (beta * commuteTime) - (gamma * rentCost);
    return parseFloat(F.toFixed(2));
};

/**
 * Filter properties based on constraints to ensure optimal trade-offs.
 * Constraints: R(p) ≤ Budget, T(p) ≤ Threshold, C(u,p) ≥ Minimum
 * 
 * @param {Array<Object>} properties - The array of property listings
 * @param {Object} constraints - { maxBudget, maxCommute, minCompatibility }
 * @param {Array<number>} userVector - X_u
 * @returns {Array<Object>} Eligible properties
 */
export const applyConstraints = (properties, constraints, userVector) => {
    return properties.filter(p => {
        const rent = Number(p.rent ?? p.price ?? Number.MAX_SAFE_INTEGER);
        const commuteTime = Number(p.commuteTime ?? Number.MAX_SAFE_INTEGER);
        const compatibility = calculateCompatibility(userVector, p.lifestyleVector || []);
        
        const passesBudget = rent <= constraints.maxBudget;
        const passesCommute = commuteTime <= constraints.maxCommute;
        const passesCompatibility = compatibility >= constraints.minCompatibility;
        
        return passesBudget && passesCommute && passesCompatibility;
    });
};

/**
 * The Main Ranking Engine
 * Applies constraints, calculates objective function scores, and sorts properties.
 */
export const rankProperties = (properties, targetUser) => {
    // 1. Filter out violations (Hard Constraints)
    let eligible = applyConstraints(properties, targetUser.constraints, targetUser.vector);
    
    // 2. Score properties
    const scoredProperties = eligible.map(p => {
        const rent = Number(p.rent ?? p.price ?? 0);
        const commuteTime = Number(p.commuteTime ?? 999);
        const C_up = calculateCompatibility(targetUser.vector, p.lifestyleVector);
        const F_up = calculateObjectiveFunction(C_up, commuteTime, rent, targetUser.weights);
        
        return {
            ...p,
            rent,
            commuteTime,
            compatibilityScore: C_up,
            objectiveScore: F_up
        };
    });
    
    // 3. Sort Descending by F(u,p)
    return scoredProperties.sort((a, b) => b.objectiveScore - a.objectiveScore);
};

// Baseline Ranking (For the Experiment Control Group) - ordered purely by price ascending
export const baselineRank = (properties, constraints) => {
    // Basic filter for budget only, to emulate traditional platforms like SpareRoom
    const eligible = properties.filter((p) => Number(p.rent ?? p.price ?? Number.MAX_SAFE_INTEGER) <= constraints.maxBudget);
    return eligible.sort((a, b) => Number(a.rent ?? a.price ?? 0) - Number(b.rent ?? b.price ?? 0));
};

import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

/**
 * Saves the results of the Unified Objective Equation to Firebase for analytics
 * 
 * @param {string} userId - the UID
 * @param {Array<Object>} rankedList - The properties that passed constraints, sorted by F
 * @param {Object} targetUser - The constraints and weights used
 */
export const saveOptimizationToFirebase = async (userId, rankedList, targetUser) => {
    if (!userId || !rankedList) return;
    try {
        const payload = {
            timestamp: new Date(),
            parameters: {
                weights: targetUser.weights,
                constraints: targetUser.constraints,
                vector: targetUser.vector
            },
            results: rankedList.map(p => ({
                propertyId: p.id,
                rent: p.rent,
                commute: p.commuteTime,
                C_up: p.compatibilityScore,
                F_up: p.objectiveScore
            }))
        };
        const optRef = doc(db, `users/${userId}/optimizations`, new Date().toISOString());
        await setDoc(optRef, payload);
    } catch (e) {
        console.warn("Failed to sync optimization formula data to Firebase:", e);
    }
};

/**
 * Saves the results of the Baseline Ranking to Firebase for analytics
 * 
 * @param {string} userId - the UID
 * @param {Array<Object>} rankedList - The properties ordered by price
 * @param {Object} constraints - The constraints used
 */
export const saveBaselineToFirebase = async (userId, rankedList, constraints) => {
    if (!userId || !rankedList) return;
    try {
        const payload = {
            timestamp: new Date(),
            parameters: {
                constraints: constraints,
                mode: 'baseline_price_ascending'
            },
            results: rankedList.map(p => ({
                propertyId: p.id,
                rent: p.rent,
                commute: p.commuteTime
            }))
        };
        const baseRef = doc(db, `users/${userId}/baselines`, new Date().toISOString());
        await setDoc(baseRef, payload);
    } catch (e) {
        console.warn("Failed to sync baseline sorting data to Firebase:", e);
    }
};
