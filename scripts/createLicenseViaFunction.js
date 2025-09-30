import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
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