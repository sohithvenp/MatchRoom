import { calculateCompatibility } from './compatibilityAlgorithm';

/**
 * Score Calculator Engine
 * Calculates objective function F(u,p) = αC(u,p) + βT(p) − γR(p)
 * 
 * α = 0.5, β = 0.3, γ = 0.2
 */

export function calculateCommuteScore(commuteTimeMins, commuteThreshold) {
    // T(p) = Normalize commute into a score where 0 commute = 100, and commute at threshold = 0.
    // E.g. (1 - (commute / maxThreshold)) * 100
    if (commuteThreshold === 0) return 0;
    
    const commuteScore = (1 - (commuteTimeMins / commuteThreshold)) * 100;
    
    // Cap strictly at 0 to 100
    return Math.max(0, Math.min(100, commuteScore));
}

export function rankPropertiesEngine(properties, userProfile, limitConstraints = true) {
    const weights = {
        alpha: 0.5,
        beta: 0.3,
        gamma: 0.2
    };

    let evaluated = properties.map(property => {
        // C(u,p) - 0 to 100
        // Use lifestyleVector if lifestyle is not present
        const propLifestyle = property.lifestyle || property.lifestyleVector;
        const compatibilityScore = calculateCompatibility(userProfile.lifestyle, propLifestyle);
        
        // T(p) - 0 to 100
        const commuteScore = calculateCommuteScore(property.commuteTime, userProfile.commuteThreshold);
        
        // R(p) - 0 to 100 (normalized)
        const rent = property.rent || property.rentPrice;
        const normalizedRent = userProfile.budget > 0 
           ? (rent / userProfile.budget) * 100 
           : 100;

        // F(u,p) = αC(u,p) + βT(p) − γR(p)
        const C_p = weights.alpha * compatibilityScore;
        const T_p = weights.beta * commuteScore;
        const R_p = weights.gamma * normalizedRent;
        
        const finalScore = C_p + T_p - R_p;

        return {
            ...property,
            rent: rent, // Ensure standardized key for UI
            compatibilityScore: parseFloat(compatibilityScore.toFixed(2)),
            commuteScore: parseFloat(commuteScore.toFixed(2)),
            normalizedRent: parseFloat(normalizedRent.toFixed(2)),
            finalScore: parseFloat(finalScore.toFixed(2)),
            components: { C_p, T_p, R_p } 
        };
    });

    if (limitConstraints) {
        evaluated = evaluated.filter(p => 
            p.rent <= userProfile.budget && 
            p.commuteTime <= userProfile.commuteThreshold &&
            p.compatibilityScore >= 40 
        );
    }

    return evaluated.sort((a, b) => b.finalScore - a.finalScore);
}
