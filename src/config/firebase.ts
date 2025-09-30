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
// IMPORTANT: These values must be set in your environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Validate required configuration
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
  console.error('Missing required Firebase configuration. Please set the following environment variables:', {
    VITE_FIREBASE_API_KEY: !firebaseConfig.apiKey ? 'Missing' : 'Set',
    VITE_FIREBASE_AUTH_DOMAIN: !firebaseConfig.authDomain ? 'Missing' : 'Set',
    VITE_FIREBASE_PROJECT_ID: !firebaseConfig.projectId ? 'Missing' : 'Set',
    VITE_FIREBASE_STORAGE_BUCKET: !firebaseConfig.storageBucket ? 'Missing' : 'Set',
    VITE_FIREBASE_MESSAGING_SENDER_ID: !firebaseConfig.messagingSenderId ? 'Missing' : 'Set',
    VITE_FIREBASE_APP_ID: !firebaseConfig.appId ? 'Missing' : 'Set',
    VITE_FIREBASE_MEASUREMENT_ID: !firebaseConfig.measurementId ? 'Missing' : 'Set'
  });
  throw new Error('Firebase configuration is incomplete. Check the console for missing environment variables.');
}

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