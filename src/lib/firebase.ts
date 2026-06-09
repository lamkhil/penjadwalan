import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { initializeFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Firebase web app config for project "sparks-scheduler". These values are not
// secrets — they identify the project to the client SDK; access is governed by
// Firestore Security Rules and Firebase Auth. Env vars (VITE_FIREBASE_*) can
// override any field if you ever need a different project.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'AIzaSyAUi_3iFS1SwguoEEkRb08TVsXroZhL5tQ',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'sparks-scheduler.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'sparks-scheduler',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'sparks-scheduler.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '343861686324',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '1:343861686324:web:66d89b2b124ec3f6de9a61',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// ignoreUndefinedProperties lets us write objects with optional fields left as
// `undefined` (oldClassCode, startDate, endDate, completedAt, …) without errors.
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });

// Point the SDK at the local emulators when VITE_USE_EMULATOR=1, so you can
// develop fully offline and free.
if (import.meta.env.VITE_USE_EMULATOR === '1') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
