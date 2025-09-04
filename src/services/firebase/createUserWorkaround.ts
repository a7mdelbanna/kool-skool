import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { getAuth } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';

// Firebase configuration (same as main app)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'teacher' | 'student';
  schoolId: string;
  phoneNumber?: string;
  timezone?: string;
}

/**
 * Creates a new user with Firebase Auth and Firestore profile
 * This is a workaround for creating users without signing out the current admin
 * 
 * In production, this should be done via:
 * 1. Firebase Admin SDK (server-side)
 * 2. Cloud Functions
 * 3. Proper IAM roles and service accounts
 */
export async function createUserWithAuth(userData: CreateUserData): Promise<string> {
  // Create a temporary Firebase app instance for user creation
  const tempApp = initializeApp(firebaseConfig, 'temp-auth-' + Date.now());
  const tempAuth = getAuth(tempApp);
  
  try {
    // Create the user in the temporary auth instance
    const userCredential = await createUserWithEmailAndPassword(
      tempAuth,
      userData.email,
      userData.password
    );
    const newUser = userCredential.user;

    // Update display name
    await updateProfile(newUser, {
      displayName: `${userData.firstName} ${userData.lastName}`
    });

    // Create user document in Firestore (using main db instance)
    await setDoc(doc(db, 'users', newUser.uid), {
      uid: newUser.uid,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role,
      schoolId: userData.schoolId,
      phoneNumber: userData.phoneNumber || null,
      timezone: userData.timezone || 'Africa/Cairo',
      isActive: true,
      metadata: {
        lastLogin: null,
        loginCount: 0
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Sign out from the temporary auth instance
    await signOut(tempAuth);
    
    // Clean up the temporary app
    await deleteApp(tempApp);
    
    console.log('User created successfully with ID:', newUser.uid);
    return newUser.uid;
    
  } catch (error: any) {
    // Clean up the temporary app in case of error
    try {
      await deleteApp(tempApp);
    } catch (cleanupError) {
      console.error('Error cleaning up temp app:', cleanupError);
    }
    
    console.error('Error creating user:', error);
    throw new Error(error.message || 'Failed to create user');
  }
}