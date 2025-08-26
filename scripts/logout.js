import { initializeApp } from 'firebase/app';
import { getAuth, signOut } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA9wv23oSmC9bG-Bx9hA2KG2pAZBjHTO-A",
  authDomain: "kool-skool-7e858.firebaseapp.com",
  projectId: "kool-skool-7e858",
  storageBucket: "kool-skool-7e858.firebasestorage.app",
  messagingSenderId: "207433730842",
  appId: "1:207433730842:web:a49b3934d80f71aa18faa3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function logout() {
  try {
    await signOut(auth);
    console.log('✅ Successfully logged out from Firebase');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error logging out:', error);
    process.exit(1);
  }
}

// Run logout
logout();