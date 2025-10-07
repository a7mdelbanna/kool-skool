// Script to clean up the problematic subscription for Maro maro
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCx0VwDTgF7ikBqJo6YHTqQfF6HTLuHhZc",
  authDomain: "kool-skool-production.firebaseapp.com",
  projectId: "kool-skool-production",
  storageBucket: "kool-skool-production.firebasestorage.app",
  messagingSenderId: "234877102792",
  appId: "1:234877102792:web:4e8419f5e7d2fe93e956df"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanupMaroSubscription() {
  console.log('🔍 Starting cleanup for Maro maro subscription...');

  try {
    // First, find the student ID for Maro maro
    const studentsRef = collection(db, 'students');
    const studentQuery = query(studentsRef, where('firstName', '==', 'Мaro'));
    const studentSnapshot = await getDocs(studentQuery);

    if (studentSnapshot.empty) {
      console.log('❌ Student Maro not found');
      return;
    }

    const studentId = studentSnapshot.docs[0].id;
    console.log('✅ Found student Maro with ID:', studentId);

    // Find the renewed subscription (created on 2025-10-07)
    // The renewed subscription ID from the logs was: 56gHAHpr2Os6ETPDufiq
    const subscriptionId = '56gHAHpr2Os6ETPDufiq';
    console.log('🎯 Looking for subscription:', subscriptionId);

    // Delete sessions for this subscription
    const sessionsRef = collection(db, 'sessions');
    const sessionsQuery = query(sessionsRef, where('subscriptionId', '==', subscriptionId));
    const sessionsSnapshot = await getDocs(sessionsQuery);

    console.log(`🗑️ Found ${sessionsSnapshot.size} sessions to delete`);

    for (const sessionDoc of sessionsSnapshot.docs) {
      await deleteDoc(doc(db, 'sessions', sessionDoc.id));
      console.log(`  ✅ Deleted session: ${sessionDoc.id}`);
    }

    // Also check for sessions with subscription_id field
    const sessionsQuery2 = query(sessionsRef, where('subscription_id', '==', subscriptionId));
    const sessionsSnapshot2 = await getDocs(sessionsQuery2);

    for (const sessionDoc of sessionsSnapshot2.docs) {
      await deleteDoc(doc(db, 'sessions', sessionDoc.id));
      console.log(`  ✅ Deleted session (snake_case): ${sessionDoc.id}`);
    }

    // Delete any payments for this subscription
    const paymentsRef = collection(db, 'payments');
    const paymentsQuery = query(paymentsRef, where('subscription_id', '==', subscriptionId));
    const paymentsSnapshot = await getDocs(paymentsQuery);

    console.log(`💰 Found ${paymentsSnapshot.size} payments to delete`);

    for (const paymentDoc of paymentsSnapshot.docs) {
      await deleteDoc(doc(db, 'payments', paymentDoc.id));
      console.log(`  ✅ Deleted payment: ${paymentDoc.id}`);
    }

    // Delete any transactions for this subscription
    const transactionsRef = collection(db, 'transactions');
    const transactionsQuery = query(transactionsRef, where('subscription_id', '==', subscriptionId));
    const transactionsSnapshot = await getDocs(transactionsQuery);

    console.log(`📊 Found ${transactionsSnapshot.size} transactions to delete`);

    for (const transactionDoc of transactionsSnapshot.docs) {
      await deleteDoc(doc(db, 'transactions', transactionDoc.id));
      console.log(`  ✅ Deleted transaction: ${transactionDoc.id}`);
    }

    // Finally, delete the subscription itself
    const subscriptionDoc = doc(db, 'subscriptions', subscriptionId);
    await deleteDoc(subscriptionDoc);
    console.log(`🎉 Deleted subscription: ${subscriptionId}`);

    console.log('✅ Cleanup completed successfully!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

// Run the cleanup
cleanupMaroSubscription();