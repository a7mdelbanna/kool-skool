import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';

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

async function createSchoolLicense() {
  try {
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
        createdFor: 'New School Registration',
        description: 'School Admin License - 1 Year (365 days)',
        notes: 'Full-featured school admin license for CRM access'
      }
    };
    
    // Add to Firestore
    console.log('Creating license in Firebase...');
    const docRef = await addDoc(collection(db, 'licenses'), licenseData);
    
    console.log('✅ License created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📄 Document ID:', docRef.id);
    console.log('🔑 License Key:', licenseKey);
    console.log('📅 Created:', now.toLocaleString());
    console.log('⏰ Expires:', expiryDate.toLocaleString());
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🎯 Share this license key with the school admin:');
    console.log(`\n   ${licenseKey}\n`);
    console.log('The admin can use this key during registration.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating license:', error);
    process.exit(1);
  }
}

// Run the function
createSchoolLicense();