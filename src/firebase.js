// firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

function normalizeStorageBucket(bucket) {
  if (!bucket || typeof bucket !== 'string') return bucket;
  return bucket.replace(/^gs:\/\//, '').trim();
}

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyC5HragLk6IHn-IzBvAU6KaqON3MMYy2t8',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'match-room-d2f57.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'match-room-d2f57',
  storageBucket: normalizeStorageBucket(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'match-room-d2f57.firebasestorage.app'),
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '977080752515',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:977080752515:web:20fd0f6803172adbbd7eb6',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-3JGC809D57'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app, `gs://${firebaseConfig.storageBucket}`);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app;
