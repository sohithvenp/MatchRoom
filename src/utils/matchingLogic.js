/**
 * REFINED COMPATIBILITY ALGORITHM
 * Calculates C(u,p) based on 10 startup-grade lifestyle vectors.
 * Each match contributes 10 points to a total of 100.
 * 
 * Vectors: 
 * wakeUpTime, sleepTime, studyTime, noiseTolerance, 
 * socialLevel, guestPreference, cleanliness, 
 * conflictStyle, personalSpace, temperature
 */
export const calculateCompatibility = (userA, userB) => {
  if (!userA || !userB || !userA.lifestyle || !userB.lifestyle) return 0;

  const lifeA = userA.lifestyle;
  const lifeB = userB.lifestyle;

  const pointsPerMatch = 10;
  let totalScore = 0;

  const keys = [
    'wakeUpTime', 
    'sleepTime', 
    'studyTime', 
    'noiseTolerance', 
    'socialLevel', 
    'guestPreference', 
    'cleanliness', 
    'conflictStyle', 
    'personalSpace', 
    'temperature'
  ];

  keys.forEach(key => {
    if (lifeA[key] === lifeB[key]) {
      totalScore += pointsPerMatch;
    } else {
      // Partial matches for adjacent/compatible categorical values
      if (key === 'noiseTolerance') {
        if ((lifeA[key] === 'moderate' && lifeB[key] === 'quiet') || 
            (lifeA[key] === 'moderate' && lifeB[key] === 'lively')) {
          totalScore += 5;
        }
      }
      if (key === 'cleanliness' || key === 'socialLevel' || key === 'temperature' || key === 'guestPreference') {
        const moderateValues = ['moderate', 'sometimes', 'weekends', 'shared'];
        if (moderateValues.includes(lifeA[key]) || moderateValues.includes(lifeB[key])) {
          // If one is moderate, it's a "partial" match for either extreme
          totalScore += 5;
        }
      }
    }
  });

  return Math.min(100, totalScore);
};

export const getDetailedBreakdown = (userA, userB) => {
  if (!userA || !userB || !userA.lifestyle || !userB.lifestyle) return { factors: [], score: 0 };

  const lifeA = userA.lifestyle;
  const lifeB = userB.lifestyle;
  const score = calculateCompatibility(userA, userB);

  const keyLabels = {
    wakeUpTime: 'Wake Up Schedule',
    sleepTime: 'Sleep Routine',
    studyTime: 'Preferred Study Hours',
    noiseTolerance: 'Noise Preference',
    socialLevel: 'Socializing Tendency',
    guestPreference: 'Guest Frequency',
    cleanliness: 'Cleanliness Standards',
    conflictStyle: 'Conflict Resolution',
    personalSpace: 'Need for Personal Space',
    temperature: 'Room Temperature'
  };

  const factors = Object.keys(keyLabels).map(key => {
    let matchLevel = 'Neutral';
    let icon = 'info';

    if (lifeA[key] === lifeB[key]) {
      matchLevel = 'Strong Match';
      icon = 'check';
    } else {
      const moderateValues = ['moderate', 'sometimes', 'weekends', 'shared'];
      if (moderateValues.includes(lifeA[key]) || moderateValues.includes(lifeB[key])) {
        matchLevel = 'Partial Match';
        icon = 'dot';
      } else {
        matchLevel = 'Conflict';
        icon = 'x';
      }
    }

    return {
      factor: keyLabels[key],
      userValue: lifeA[key] || 'Not Set',
      targetValue: lifeB[key] || 'Not Set',
      matchLevel
    };
  });

  return { factors, score };
};
