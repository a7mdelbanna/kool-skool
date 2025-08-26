const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  projectId: "kool-skool-7e858",
});

const db = admin.firestore();

async function createSchoolLicense() {
  try {
    // Generate a unique license key
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
      createdAt: admin.firestore.Timestamp.fromDate(now),
      expiresAt: admin.firestore.Timestamp.fromDate(expiryDate),
      durationDays: 365,
      usedBy: null, // Will be populated when admin registers
      schoolId: null, // Will be populated when school is created
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
    const docRef = await db.collection('licenses').add(licenseData);
    
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
    
    // Also return the data for programmatic use
    return {
      success: true,
      documentId: docRef.id,
      licenseKey: licenseKey,
      expiresAt: expiryDate
    };
    
  } catch (error) {
    console.error('❌ Error creating license:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the function
createSchoolLicense().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error(error);
  process.exit(1);
});