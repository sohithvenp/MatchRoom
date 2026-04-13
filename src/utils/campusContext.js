import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { getCampusById, mockUserPreferences } from './mockData';
import { normalizeCampusId } from './userModel';

/**
 * Loads the signed-in (or demo) user's preferred campus and returns the full campus record for commute routing.
 */
export async function resolveUserTargetCampus() {
  let preferredCampusId = mockUserPreferences.preferredCampusId;
  try {
    if (auth.app?.options?.apiKey === 'dummy-api-key') {
      const localProfile = JSON.parse(localStorage.getItem('userProfileData') || '{}');
      if (localProfile.preferredCampusId) preferredCampusId = localProfile.preferredCampusId;
    } else if (auth.currentUser) {
      const userSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userSnap.exists() && userSnap.data().preferredCampusId) {
        preferredCampusId = userSnap.data().preferredCampusId;
      }
    }
  } catch (e) {
    console.warn('resolveUserTargetCampus: using default campus', e);
  }
  return getCampusById(normalizeCampusId(preferredCampusId));
}
