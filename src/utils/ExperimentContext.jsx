import React, { createContext, useContext, useState } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

function isDemoFirebase() {
  return auth.app?.options?.apiKey === 'dummy-api-key';
}

/**
 * Ensures a Firebase Auth user exists so research_results rules (userId == uid) can be satisfied.
 * Uses anonymous sign-in when needed. Enable "Anonymous" in Firebase Console → Authentication → Sign-in method.
 */
async function ensureAnalyticsAuth() {
  if (isDemoFirebase()) return;
  if (auth.currentUser) return;
  try {
    await signInAnonymously(auth);
  } catch (e) {
    console.warn(
      'Anonymous sign-in failed; analytics will stay in localStorage only. Enable Anonymous auth in Firebase.',
      e
    );
  }
}

const ExperimentContext = createContext();

const PARTICIPANT_KEY = 'experiment_participant_id';

function getOrCreateParticipantId() {
  let id = localStorage.getItem(PARTICIPANT_KEY);
  if (!id) {
    id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `p_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem(PARTICIPANT_KEY, id);
  }
  return id;
}

export const ExperimentProvider = ({ children }) => {
  const [session, setSession] = useState({
    activeTask: null, // 'baseline' or 'optimized'
    startTime: null,
    viewCount: 0,
    shortlistCount: 0,
    results: []
  });

  const startTask = (type) => {
    getOrCreateParticipantId();
    void ensureAnalyticsAuth();
    setSession({
      activeTask: type,
      startTime: Date.now(),
      viewCount: 0,
      shortlistCount: 0,
      results: []
    });
    localStorage.setItem('experiment_active', type);
    localStorage.setItem('experiment_start', Date.now().toString());
  };

  const recordView = () => {
    if (session.activeTask) {
      setSession(prev => ({ ...prev, viewCount: (prev.viewCount || 0) + 1 }));
    }
  };

  const recordShortlist = () => {
    if (session.activeTask) {
      setSession(prev => ({ ...prev, shortlistCount: (prev.shortlistCount || 0) + 1 }));
    }
  };

  const endTask = async (feedback) => {
    const confidence =
      typeof feedback === 'number' ? feedback : feedback?.confidence ?? 0;
    const suitability =
      typeof feedback === 'object' && feedback != null && feedback.suitability != null
        ? feedback.suitability
        : null;

    const timeTaken = (Date.now() - session.startTime) / 1000; // in seconds
    const participantId = getOrCreateParticipantId();

    if (!isDemoFirebase()) {
      await ensureAnalyticsAuth();
    }

    const uid = auth.currentUser?.uid || null;
    const result = {
      userId: uid || 'anonymous',
      participantId,
      type: session.activeTask,
      timeTaken,
      viewCount: session.viewCount,
      shortlistCount: session.shortlistCount,
      confidence,
      suitability,
      timestamp: new Date().toISOString(),
      ...(uid ? { sessionAnonymous: !!auth.currentUser?.isAnonymous } : {}),
    };

    // Save to LocalStorage (legacy)
    const allResults = JSON.parse(localStorage.getItem('experiment_results') || '[]');
    allResults.push(result);
    localStorage.setItem('experiment_results', JSON.stringify(allResults));

    // Sync to Firestore for both baseline and optimised whenever we have a real Firebase uid
    try {
      if (!isDemoFirebase() && uid) {
        await addDoc(collection(db, 'research_results'), {
          ...result,
          serverTimestamp: serverTimestamp(),
        });
      }
    } catch (e) {
      console.warn('Failed to sync research results:', e);
    }
    
    setSession({
      activeTask: null,
      startTime: null,
      viewCount: 0,
      shortlistCount: 0,
      results: allResults
    });
    
    localStorage.removeItem('experiment_active');
    localStorage.removeItem('experiment_start');
    
    return result;
  };

  return (
    <ExperimentContext.Provider value={{ session, startTask, recordView, recordShortlist, endTask }}>
      {children}
    </ExperimentContext.Provider>
  );
};

export const useExperiment = () => useContext(ExperimentContext);
