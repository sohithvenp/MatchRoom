export const LIFESTYLE_TAGS = [
  { id: 'quiet_household', label: 'Quiet Household', description: 'Recommended for students who prefer low-noise environments.' },
  { id: 'study_focused', label: 'Study-Focused Environment', description: 'Optimized for long study sessions with minimal distractions.' },
  { id: 'social_friendly', label: 'Social and Friendly', description: 'Great for meeting people and hanging out in shared spaces.' },
  { id: 'clean_organized', label: 'Clean and Organized', description: 'High standards for cleanliness and shared chores.' },
  { id: 'non_smoking', label: 'Non-Smoking Household', description: 'No smoking allowed on the premises.' },
  { id: 'pet_friendly', label: 'Pet-Friendly', description: 'Pets are welcome.' },
  { id: 'guest_friendly', label: 'Guest-Friendly', description: 'Open to having guests and hosting activities.' },
  { id: 'early_sleep', label: 'Early Sleep Schedule', description: 'Household completely quiets down early in the evening.' },
  { id: 'shared_activities', label: 'Shared Social Activities', description: 'Housemates frequently cook, eat, or watch movies together.' },
  { id: 'music_friendly', label: 'Music-Friendly Environment', description: 'Tolerance or appreciation for playing instruments or music.' }
];

// Helper to map student preferences to corresponding tag IDs that would be a "Strong Match"
export const getStudentIdealTags = (studentPrefs) => {
  if (!studentPrefs) return [];
  
  const idealTags = [];
  
  if (studentPrefs.noisePreference === 'quiet') idealTags.push('quiet_household');
  if (studentPrefs.noisePreference === 'lively') idealTags.push('music_friendly');
  
  if (studentPrefs.studyTime === 'night' || studentPrefs.studyTime === 'morning') idealTags.push('study_focused');
  
  if (studentPrefs.socialLevel === 'often') {
    idealTags.push('social_friendly');
    idealTags.push('shared_activities');
  }
  
  if (studentPrefs.cleanliness === 'very clean') idealTags.push('clean_organized');
  
  if (studentPrefs.smoking === 'non-smoker') idealTags.push('non_smoking');
  
  if (studentPrefs.guestPreference === 'often') idealTags.push('guest_friendly');
  
  if (studentPrefs.sleepTime === 'before 10pm') idealTags.push('early_sleep');
  
  return idealTags;
};
