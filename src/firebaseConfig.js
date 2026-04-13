import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

function normalizeStorageBucket(bucket) {
  if (!bucket || typeof bucket !== "string") return bucket;
  return bucket.replace(/^gs:\/\//, "").trim();
}

// The config uses Vite environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "dummy-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dummy-auth-domain",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "dummy-project-id",
  storageBucket: normalizeStorageBucket(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "match-room-d2f57.firebasestorage.app"),
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "dummy-sender-id",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "dummy-app-id"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
