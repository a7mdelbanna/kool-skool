import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  connectAuthEmulator,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import { 
  getFirestore, 
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import { 
  getStorage, 
  connectStorageEmulator 
} from 'firebase/storage';
import { 
  getFunctions, 
  connectFunctionsEmulator 
} from 'firebase/functions';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Firebase configuration for kool-skool project
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA9wv23oSmC9bG-Bx9hA2KG2pAZBjHTO-A",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "kool-skool-7e858.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "kool-skool-7e858",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "kool-skool-7e858.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "207433730842",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:207433730842:web:a49b3934d80f71aa18faa3",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-5E4L5ST9FB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);

// Initialize Firestore with offline persistence
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

// Initialize Storage
export const storage = getStorage(app);

// Initialize Functions
export const functions = getFunctions(app);

// Initialize Analytics (only in production and if supported)
export const analytics = isSupported().then(yes => yes ? getAnalytics(app) : null);

// Connect to emulators in development
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
  connectFunctionsEmulator(functions, 'localhost', 5001);
  
  console.log('🔧 Connected to Firebase Emulators');
}

// Export app for any additional configuration
export default app;

// Helper function to get current user's custom claims
export const getUserClaims = async () => {
  const user = auth.currentUser;
  if (!user) return null;
  
  const idTokenResult = await user.getIdTokenResult();
  return idTokenResult.claims;
};

// Helper function to check user role
export const checkUserRole = async (requiredRole: string): Promise<boolean> => {
  const claims = await getUserClaims();
  if (!claims) return false;
  
  const role = claims.role as string;
  
  // Role hierarchy: superadmin > admin > teacher > student
  const roleHierarchy: { [key: string]: number } = {
    'superadmin': 4,
    'admin': 3,
    'teacher': 2,
    'student': 1
  };
  
  const userLevel = roleHierarchy[role] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;
  
  return userLevel >= requiredLevel;
};

// Helper function to get user's school ID
export const getUserSchoolId = async (): Promise<string | null> => {
  const claims = await getUserClaims();
  return claims?.schoolId as string || null;
};