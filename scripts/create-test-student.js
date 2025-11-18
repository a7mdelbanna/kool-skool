#!/usr/bin/env node

// Script to create a test student account with Firebase Authentication
// Run with: node scripts/create-test-student.js

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(dirname(__dirname), '.env') });

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Test student credentials
const TEST_STUDENT = {
  email: 'teststudent@example.com',
  password: 'TestStudent123!',
  firstName: 'Test',
  lastName: 'Student',
  schoolId: 'sET8oQzDBtk9uREAw2Js' // Default school ID
};

console.log('🚀 Creating test student account...');
console.log('======================================');

// Validate Firebase configuration
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
  console.error('❌ Missing Firebase configuration. Please check your .env file.');
  process.exit(1);
}

console.log('✅ Firebase configuration loaded');
console.log('Project ID:', firebaseConfig.projectId);

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createTestStudent() {
  try {
    console.log('\n📝 Student Details:');
    console.log('Email:', TEST_STUDENT.email);
    console.log('Password:', TEST_STUDENT.password);
    console.log('Name:', TEST_STUDENT.firstName, TEST_STUDENT.lastName);
    console.log('School ID:', TEST_STUDENT.schoolId);

    // Try to sign in first to check if user exists
    console.log('\n🔍 Checking if user already exists...');
    try {
      const existingUser = await signInWithEmailAndPassword(auth, TEST_STUDENT.email, TEST_STUDENT.password);
      console.log('✅ User already exists with UID:', existingUser.user.uid);
      console.log('\n📋 You can use these credentials to login:');
      console.log('Email:', TEST_STUDENT.email);
      console.log('Password:', TEST_STUDENT.password);
      return existingUser.user;
    } catch (error) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        console.log('User does not exist, creating new account...');
      } else {
        throw error;
      }
    }

    // Create new user with Firebase Auth
    console.log('\n🔐 Creating Firebase Auth user...');
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      TEST_STUDENT.email,
      TEST_STUDENT.password
    );

    const user = userCredential.user;
    console.log('✅ Firebase Auth user created with UID:', user.uid);

    // Create user profile in Firestore
    console.log('\n📄 Creating user profile in Firestore...');
    const userProfile = {
      uid: user.uid,
      email: TEST_STUDENT.email,
      firstName: TEST_STUDENT.firstName,
      lastName: TEST_STUDENT.lastName,
      role: 'student',
      schoolId: TEST_STUDENT.schoolId,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      metadata: {
        createdBy: 'script',
        loginCount: 0
      }
    };

    await setDoc(doc(db, 'users', user.uid), userProfile);
    console.log('✅ User profile created in Firestore');

    // Create student record
    console.log('\n📚 Creating student record...');
    const studentRecord = {
      id: user.uid,
      studentId: user.uid,
      userId: user.uid,
      firstName: TEST_STUDENT.firstName,
      lastName: TEST_STUDENT.lastName,
      email: TEST_STUDENT.email,
      schoolId: TEST_STUDENT.schoolId,
      courseName: 'Test Course',
      level: 'Beginner',
      status: 'active',
      totalLessonsTaken: 0,
      totalPayments: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(doc(db, 'students', user.uid), studentRecord);
    console.log('✅ Student record created');

    // Verify the user can sign in
    console.log('\n🔑 Testing login with created credentials...');
    await signInWithEmailAndPassword(auth, TEST_STUDENT.email, TEST_STUDENT.password);
    console.log('✅ Login successful!');

    console.log('\n========================================');
    console.log('🎉 Test student created successfully!');
    console.log('========================================');
    console.log('\n📋 Login Credentials:');
    console.log('Email:', TEST_STUDENT.email);
    console.log('Password:', TEST_STUDENT.password);
    console.log('\n🔗 Login URL: http://localhost:8080/student-login');
    console.log('\n✨ You can now login with these credentials!');

    return user;

  } catch (error) {
    console.error('\n❌ Error creating test student:', error.message);

    if (error.code === 'auth/email-already-in-use') {
      console.log('\n📝 This email is already registered.');
      console.log('Try logging in with:');
      console.log('Email:', TEST_STUDENT.email);
      console.log('Password:', TEST_STUDENT.password);
    } else if (error.code === 'auth/weak-password') {
      console.log('Password is too weak. Please use a stronger password.');
    } else if (error.code === 'auth/invalid-email') {
      console.log('Invalid email format.');
    } else {
      console.log('Error code:', error.code);
      console.log('Full error:', error);
    }

    process.exit(1);
  }
}

// Run the script
createTestStudent()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });