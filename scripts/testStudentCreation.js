// Test script to verify student creation without logging out admin
// This script simulates the student creation flow

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Firebase configuration (replace with your actual config)
const firebaseConfig = {
  // Add your Firebase config here
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app);

async function testStudentCreation() {
  try {
    // 1. Sign in as admin
    console.log('Step 1: Signing in as admin...');
    const adminEmail = 'ahmed@englishoshka.com';
    const adminPassword = 'your-password'; // Replace with actual password
    
    const adminCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    console.log('✓ Admin signed in:', adminCredential.user.email);
    console.log('  Admin UID:', adminCredential.user.uid);
    
    // 2. Create a test student using cloud function
    console.log('\nStep 2: Creating student using cloud function...');
    const createUserFunction = httpsCallable(functions, 'createUserWithClaims');
    
    const studentData = {
      email: `test${Date.now()}@student.com`,
      password: 'Test123!@#',
      firstName: 'Test',
      lastName: 'Student',
      role: 'student',
      schoolId: 'sET8oQzDBtk9uREAw2Js',
      phoneNumber: null,
      timezone: 'UTC'
    };
    
    console.log('  Creating student:', studentData.email);
    const result = await createUserFunction(studentData);
    console.log('✓ Student created successfully');
    console.log('  Student UID:', result.data.uid);
    
    // 3. Check if admin is still signed in
    console.log('\nStep 3: Verifying admin session...');
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.email === adminEmail) {
      console.log('✅ SUCCESS: Admin is still signed in!');
      console.log('  Current user:', currentUser.email);
      console.log('  Current UID:', currentUser.uid);
    } else {
      console.log('❌ FAILED: Admin was logged out');
      console.log('  Current user:', currentUser ? currentUser.email : 'None');
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

// Run the test
console.log('Starting student creation test...\n');
console.log('This test will:');
console.log('1. Sign in as admin');
console.log('2. Create a student account');
console.log('3. Verify admin is still signed in\n');
console.log('='.repeat(50));

testStudentCreation();