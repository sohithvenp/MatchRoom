const DEFAULT_CONSTRAINTS = {
  maxBudget: 700,
  maxCommute: 40,
  minCompatibility: 50
};

/** Known reference-university campus ids (UK); used to validate preferredCampusId. */
const campusWeighting = {
  c1: true,
  c2: true,
  c3: true,
  c4: true,
  c5: true,
  c6: true,
  c7: true,
};

function scoreFromMap(value, map, fallback = 3) {
  if (!value) return fallback;
  return map[value] ?? fallback;
}

export function buildLifestyleVector(lifestyle = {}) {
  const sleep = scoreFromMap(lifestyle.sleepTime, {
    'before 10pm': 5,
    '10pm-12am': 3,
    'after 12am': 1
  });

  const cleanliness = scoreFromMap(lifestyle.cleanliness, {
    'very clean': 5,
    moderate: 3,
    messy: 1
  });

  const social = scoreFromMap(lifestyle.socialLevel, {
    'rarely invite friends': 1,
    sometimes: 3,
    often: 5
  });

  const study = scoreFromMap(lifestyle.studyTime, {
    morning: 4,
    afternoon: 3,
    night: 5
  });

  const noise = scoreFromMap(lifestyle.noiseTolerance, {
    quiet: 1,
    moderate: 3,
    lively: 5
  });

  return [sleep, cleanliness, social, study, noise];
}

export function sanitizeConstraints(constraints = {}) {
  return {
    maxBudget: Number(constraints.maxBudget) || DEFAULT_CONSTRAINTS.maxBudget,
    maxCommute: Number(constraints.maxCommute) || DEFAULT_CONSTRAINTS.maxCommute,
    minCompatibility: Number(constraints.minCompatibility) || DEFAULT_CONSTRAINTS.minCompatibility
  };
}

export function getDefaultConstraints() {
  return { ...DEFAULT_CONSTRAINTS };
}

export function getDefaultCampusId() {
  return 'c1';
}

export function normalizeCampusId(campusId) {
  return campusWeighting[campusId] ? campusId : getDefaultCampusId();
}
