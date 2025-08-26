import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, addDoc, Timestamp, getDocs, query, where, deleteDoc } from 'firebase/firestore';

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
const db = getFirestore(app);
const auth = getAuth(app);

async function cleanupAndCreateLicense() {
  try {
    console.log('🧹 Cleaning up previous test data...');
    
    // Delete test school if it exists
    const schoolsRef = collection(db, 'schools');
    const schoolQuery = query(schoolsRef, where('email', '==', 'ahmed@havenya.com'));
    const schoolSnapshot = await getDocs(schoolQuery);
    
    for (const doc of schoolSnapshot.docs) {
      console.log('Deleting school:', doc.id);
      await deleteDoc(doc.ref);
    }
    
    console.log('✅ Cleanup complete');
    
    // Now create a new license
    console.log('\n📝 Creating new license...');
    
    // Generate unique license key
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substr(2, 8).toUpperCase();
    const licenseKey = `SCHOOL-${timestamp}-${randomStr}`;
    
    // Calculate dates
    const now = new Date();
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 365 days from now
    
    const licenseData = {
      licenseKey: licenseKey,
      type: 'school_admin',
      status: 'active',
      maxUsers: 50,
      features: {
        studentManagement: true,
        teacherManagement: true,
        courseManagement: true,
        financialManagement: true,
        reportingAnalytics: true,
        multipleGroups: true,
        customBranding: false,
        apiAccess: false,
        maxStudents: 500,
        maxTeachers: 20,
        maxCourses: 100
      },
      createdAt: Timestamp.fromDate(now),
      expiresAt: Timestamp.fromDate(expiryDate),
      durationDays: 365,
      usedBy: null,
      schoolId: null,
      schoolName: null,
      registeredAt: null,
      metadata: {
        createdBy: 'system_admin',
        createdFor: 'Testing School Setup',
        description: 'School Admin License - 1 Year (365 days)',
        notes: 'Test license for debugging school setup flow'
      }
    };
    
    // Add to Firestore
    const docRef = await addDoc(collection(db, 'licenses'), licenseData);
    
    console.log('✅ License created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📄 Document ID:', docRef.id);
    console.log('🔑 License Key:', licenseKey);
    console.log('📅 Created:', now.toLocaleString());
    console.log('⏰ Expires:', expiryDate.toLocaleString());
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🎯 Use this fresh license key for testing:');
    console.log(`\n   ${licenseKey}\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the function
cleanupAndCreateLicense();