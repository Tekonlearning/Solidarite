import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import firebaseConfigJson from '../../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigJson.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigJson.appId,
};

const databaseId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || firebaseConfigJson.firestoreDatabaseId || "(default)";

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore with persistent offline cache
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, databaseId);

// Initialize App Check (with safety guards)
if (typeof window !== 'undefined') {
  try {
    const siteKey = import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY;
    const useDebug = import.meta.env.VITE_USE_APP_CHECK_DEBUG === 'true';

    if (useDebug) {
      (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }

    if (siteKey) {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(siteKey),
        isTokenAutoRefreshEnabled: true
      });
      console.log('Firebase App Check initialized successfully.');
    } else if (useDebug) {
      // Use a dummy site key for debug provider in development
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider('6LeX_mQqAAAAAK8D35Z-KzO9-55x3N5y0-xWlZ-k'),
        isTokenAutoRefreshEnabled: true
      });
      console.log('Firebase App Check initialized in debug mode.');
    }
  } catch (error) {
    console.warn('Failed to initialize Firebase App Check:', error);
  }
}

// Firebase configuration is initialized and ready for production use.



