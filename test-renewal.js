// Test script to verify subscription renewal functionality
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  limit,
  orderBy
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

async function testRenewalStructure() {
  console.log('🔍 Testing subscription renewal structure...\n');

  try {
    // Find a recently renewed subscription
    const subscriptionsRef = collection(db, 'subscriptions');
    const recentQuery = query(
      subscriptionsRef,
      orderBy('created_at', 'desc'),
      limit(5)
    );
    const snapshot = await getDocs(recentQuery);

    console.log(`📊 Found ${snapshot.size} recent subscriptions\n`);

    for (const doc of snapshot.docs) {
      const subscription = { id: doc.id, ...doc.data() };
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📌 Subscription ID: ${subscription.id}`);
      console.log(`👤 Student ID: ${subscription.student_id}`);
      console.log(`📅 Start Date: ${subscription.start_date}`);
      console.log(`📅 End Date: ${subscription.end_date}`);
      console.log(`💰 Price: ${subscription.price}`);
      console.log(`👨‍🏫 Teacher ID: ${subscription.teacher_id}`);
      console.log(`⏰ Scheduled Days: ${JSON.stringify(subscription.scheduled_days)}`);
      console.log(`🕐 Scheduled Time: ${subscription.scheduled_time}`);
      console.log(`📆 Duration: ${subscription.duration_in_months} months`);
      console.log(`📝 Note: ${subscription.note || 'N/A'}`);
      console.log(`🔄 Is Renewed: ${subscription.is_renewed || false}`);
      console.log(`✅ Created At: ${subscription.created_at}`);

      // Check for required fields
      console.log('\n🔍 Field Validation:');
      const requiredFields = [
        'student_id', 'teacher_id', 'start_date', 'end_date',
        'scheduled_days', 'scheduled_time', 'price', 'duration_in_months'
      ];

      const missingFields = requiredFields.filter(field => !subscription[field]);
      if (missingFields.length > 0) {
        console.log(`❌ Missing fields: ${missingFields.join(', ')}`);
      } else {
        console.log('✅ All required fields present');
      }

      // Check sessions for this subscription
      const sessionsRef = collection(db, 'sessions');
      const sessionsQuery = query(
        sessionsRef,
        where('subscriptionId', '==', subscription.id)
      );
      const sessionsSnapshot = await getDocs(sessionsQuery);

      console.log(`\n📚 Sessions: ${sessionsSnapshot.size} sessions found`);

      if (sessionsSnapshot.size > 0) {
        const firstSession = sessionsSnapshot.docs[0].data();
        console.log('  First session structure:');
        console.log(`  - scheduled_date: ${firstSession.scheduled_date}`);
        console.log(`  - scheduled_time: ${firstSession.scheduled_time}`);
        console.log(`  - status: ${firstSession.status}`);
        console.log(`  - teacher_id: ${firstSession.teacher_id}`);

        // Check for date format issues
        if (firstSession.scheduled_date && !firstSession.scheduled_date.includes('-')) {
          console.log('  ❌ WARNING: scheduled_date format issue detected');
        }
        if (!firstSession.scheduled_time) {
          console.log('  ❌ WARNING: missing scheduled_time');
        }
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Structure validation complete!\n');

  } catch (error) {
    console.error('❌ Error testing renewal structure:', error);
  }
}

// Run the test
testRenewalStructure();