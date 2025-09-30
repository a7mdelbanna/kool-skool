import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, addDoc, Timestamp, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Validate configuration
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
  console.error('❌ Missing required Firebase configuration in environment variables');
  console.error('Please ensure your .env file contains all required Firebase configuration.');
  process.exit(1);
}

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