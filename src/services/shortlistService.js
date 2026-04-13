import { 
  db, 
  auth 
} from '../firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';

const LOCAL_STORAGE_KEY = 'shortlisted_properties';

/**
 * Retrieves the current shortlist from localStorage and Firebase (if authenticated)
 */
export async function getShortlist() {
  // Always get from localStorage first for immediate UI responsiveness
  let localShortlist = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
  
  // If user is logged in, attempt to merge with Firebase
  if (auth.currentUser) {
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const fireShortlist = userSnap.data().shortlist || [];
        // Merge and unique
        const merged = Array.from(new Set([...localShortlist, ...fireShortlist]));
        
        // Update local if different
        if (merged.length !== localShortlist.length) {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
        }
        return merged;
      }
    } catch (e) {
      console.warn("Could not sync shortlist with Firebase:", e);
    }
  }
  
  return localShortlist;
}

/**
 * Toggles a property in the shortlist
 */
export async function toggleShortlist(propertyId) {
  if (!propertyId) return [];

  let current = await getShortlist();
  const isCurrentlyIn = current.includes(propertyId);
  
  let updated;
  if (isCurrentlyIn) {
    updated = current.filter(id => id !== propertyId);
  } else {
    updated = [...current, propertyId];
  }

  // 1. Update localStorage
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('storage')); // Notify other tabs/components

  // 2. Sync to Firebase if authenticated
  if (auth.currentUser) {
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        shortlist: isCurrentlyIn ? arrayRemove(propertyId) : arrayUnion(propertyId),
        updatedAt: new Date()
      });
    } catch (e) {
       console.warn("Failed to sync shortlist toggle to Firebase:", e);
    }
  }
  
  return updated;
}

/**
 * Records a property view event to Firebase for research analytics
 */
export async function recordPropertyView(property) {
  if (!auth.currentUser || !property) return;
  
  try {
    const viewRef = doc(db, `users/${auth.currentUser.uid}/view_history`, property.id);
    await setDoc(viewRef, {
      propertyId: property.id,
      propertyName: property.propertyName || property.address || 'Unknown',
      timestamp: new Date(),
      compatibilityScore: property.compatibility?.score || 0,
      commuteMinutes: property.commute?.modes?.transit || 0
    }, { merge: true });
  } catch (e) {
    console.warn("Could not log property view to Firebase:", e);
  }
}
