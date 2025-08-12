# Firestore Security Rules

## Overview
Security rules that implement role-based access control (RBAC) matching the original Supabase RLS policies.

## Core Security Rules File

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ============================================
    // HELPER FUNCTIONS
    // ============================================
    
    // Check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Get user's role from custom claims
    function getUserRole() {
      return request.auth.token.role;
    }
    
    // Get user's school ID from custom claims
    function getUserSchoolId() {
      return request.auth.token.schoolId;
    }
    
    // Check if user is superadmin
    function isSuperAdmin() {
      return isAuthenticated() && getUserRole() == 'superadmin';
    }
    
    // Check if user is admin of their school
    function isSchoolAdmin() {
      return isAuthenticated() && getUserRole() == 'admin';
    }
    
    // Check if user is teacher in their school
    function isTeacher() {
      return isAuthenticated() && getUserRole() == 'teacher';
    }
    
    // Check if user is student
    function isStudent() {
      return isAuthenticated() && getUserRole() == 'student';
    }
    
    // Check if user belongs to the same school as the document
    function belongsToSameSchool(schoolId) {
      return isAuthenticated() && 
             getUserSchoolId() == schoolId;
    }
    
    // Check if user is admin or teacher of their school
    function isSchoolStaff() {
      return isAuthenticated() && 
             (getUserRole() == 'admin' || getUserRole() == 'teacher');
    }
    
    // Check if document belongs to current user
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // ============================================
    // SCHOOLS COLLECTION
    // ============================================
    match /schools/{schoolId} {
      // Read: Users can only see their own school
      allow read: if isAuthenticated() && 
                     (belongsToSameSchool(schoolId) || isSuperAdmin());
      
      // Create: Only superadmins
      allow create: if isSuperAdmin();
      
      // Update: School admins can update their school, superadmins can update any
      allow update: if isSuperAdmin() || 
                      (isSchoolAdmin() && belongsToSameSchool(schoolId));
      
      // Delete: Only superadmins
      allow delete: if isSuperAdmin();
    }
    
    // ============================================
    // USERS COLLECTION
    // ============================================
    match /users/{userId} {
      // Read: Users can read their own profile, 
      //       school staff can read users in their school
      allow read: if isOwner(userId) || 
                    isSuperAdmin() ||
                    (isSchoolStaff() && 
                     belongsToSameSchool(resource.data.schoolId));
      
      // Create: Admins can create users in their school, superadmins can create any
      allow create: if isSuperAdmin() ||
                      (isSchoolAdmin() && 
                       request.resource.data.schoolId == getUserSchoolId());
      
      // Update: Users can update their own profile (limited fields),
      //         admins can update users in their school
      allow update: if isOwner(userId) ? 
                      (request.resource.data.role == resource.data.role &&
                       request.resource.data.schoolId == resource.data.schoolId) :
                      (isSuperAdmin() || 
                       (isSchoolAdmin() && 
                        belongsToSameSchool(resource.data.schoolId)));
      
      // Delete: Only admins of the same school or superadmins
      allow delete: if isSuperAdmin() ||
                      (isSchoolAdmin() && 
                       belongsToSameSchool(resource.data.schoolId));
    }
    
    // ============================================
    // STUDENTS COLLECTION
    // ============================================
    match /students/{studentId} {
      // Read: Students can read their own record,
      //       school staff can read students in their school
      allow read: if (isStudent() && resource.data.userId == request.auth.uid) ||
                    (isSchoolStaff() && 
                     belongsToSameSchool(resource.data.schoolId)) ||
                    isSuperAdmin();
      
      // Create: Only school staff
      allow create: if (isSchoolStaff() && 
                       request.resource.data.schoolId == getUserSchoolId()) ||
                      isSuperAdmin();
      
      // Update: Students can update some of their own fields,
      //         school staff can update all fields
      allow update: if (isStudent() && 
                       resource.data.userId == request.auth.uid &&
                       request.resource.data.schoolId == resource.data.schoolId &&
                       request.resource.data.userId == resource.data.userId) ||
                      (isSchoolStaff() && 
                       belongsToSameSchool(resource.data.schoolId)) ||
                      isSuperAdmin();
      
      // Delete: Only school admins
      allow delete: if (isSchoolAdmin() && 
                       belongsToSameSchool(resource.data.schoolId)) ||
                      isSuperAdmin();
    }
    
    // ============================================
    // COURSES COLLECTION
    // ============================================
    match /courses/{courseId} {
      // Read: All authenticated users from the same school
      allow read: if belongsToSameSchool(resource.data.schoolId) ||
                    isSuperAdmin();
      
      // Create: School admins and teachers
      allow create: if (isSchoolStaff() && 
                       request.resource.data.schoolId == getUserSchoolId()) ||
                      isSuperAdmin();
      
      // Update: School admins and assigned teachers
      allow update: if (isSchoolAdmin() && 
                       belongsToSameSchool(resource.data.schoolId)) ||
                      (isTeacher() && 
                       resource.data.teacherId == request.auth.uid) ||
                      isSuperAdmin();
      
      // Delete: Only school admins
      allow delete: if (isSchoolAdmin() && 
                       belongsToSameSchool(resource.data.schoolId)) ||
                      isSuperAdmin();
    }
    
    // ============================================
    // GROUPS COLLECTION
    // ============================================
    match /groups/{groupId} {
      // Read: All users from the same school
      allow read: if belongsToSameSchool(resource.data.schoolId) ||
                    isSuperAdmin();
      
      // Create: School staff only
      allow create: if (isSchoolStaff() && 
                       request.resource.data.schoolId == getUserSchoolId()) ||
                      isSuperAdmin();
      
      // Update: School admins and assigned teachers
      allow update: if (isSchoolAdmin() && 
                       belongsToSameSchool(resource.data.schoolId)) ||
                      (isTeacher() && 
                       resource.data.teacherId == request.auth.uid) ||
                      isSuperAdmin();
      
      // Delete: Only school admins
      allow delete: if (isSchoolAdmin() && 
                       belongsToSameSchool(resource.data.schoolId)) ||
                      isSuperAdmin();
      
      // Subcollection: Group Students
      match /students/{enrollmentId} {
        allow read: if belongsToSameSchool(get(/databases/$(database)/documents/groups/$(groupId)).data.schoolId) ||
                      isSuperAdmin();
        
        allow create, update: if isSchoolStaff() &&
                                belongsToSameSchool(get(/databases/$(database)/documents/groups/$(groupId)).data.schoolId) ||
                                isSuperAdmin();
        
        allow delete: if isSchoolAdmin() &&
                        belongsToSameSchool(get(/databases/$(database)/documents/groups/$(groupId)).data.schoolId) ||
                        isSuperAdmin();
      }
    }
    
    // ============================================
    // SUBSCRIPTIONS COLLECTION
    // ============================================
    match /subscriptions/{subscriptionId} {
      // Read: Students can read their own, staff can read all in school
      allow read: if (isStudent() && 
                     resource.data.studentId == request.auth.uid) ||
                    (isSchoolStaff() && 
                     belongsToSameSchool(resource.data.schoolId)) ||
                    isSuperAdmin();
      
      // Create: Only school staff
      allow create: if (isSchoolStaff() && 
                       request.resource.data.schoolId == getUserSchoolId()) ||
                      isSuperAdmin();
      
      // Update: School staff only
      allow update: if (isSchoolStaff() && 
                       belongsToSameSchool(resource.data.schoolId)) ||
                      isSuperAdmin();
      
      // Delete: Only school admins
      allow delete: if (isSchoolAdmin() && 
                       belongsToSameSchool(resource.data.schoolId)) ||
                      isSuperAdmin();
    }
    
    // ============================================
    // SESSIONS COLLECTION
    // ============================================
    match /sessions/{sessionId} {
      // Read: Students can read their own sessions, staff can read all
      allow read: if (isStudent() && 
                     resource.data.studentId == request.auth.uid) ||
                    (isSchoolStaff() && 
                     belongsToSameSchool(resource.data.schoolId)) ||
                    isSuperAdmin();
      
      // Create: Only school staff
      allow create: if (isSchoolStaff() && 
                       request.resource.data.schoolId == getUserSchoolId()) ||
                      isSuperAdmin();
      
      // Update: School staff and assigned teachers
      allow update: if (isSchoolStaff() && 
                       belongsToSameSchool(resource.data.schoolId)) ||
                      (isTeacher() && 
                       resource.data.teacherId == request.auth.uid) ||
                      isSuperAdmin();
      
      // Delete: Only school admins
      allow delete: if (isSchoolAdmin() && 
                       belongsToSameSchool(resource.data.schoolId)) ||
                      isSuperAdmin();
      
      // Subcollection: Session Attendees
      match /attendees/{studentId} {
        allow read: if belongsToSameSchool(get(/databases/$(database)/documents/sessions/$(sessionId)).data.schoolId) ||
                      isSuperAdmin();
        
        allow create, update: if isSchoolStaff() &&
                                belongsToSameSchool(get(/databases/$(database)/documents/sessions/$(sessionId)).data.schoolId) ||
                                isSuperAdmin();
        
        allow delete: if isSchoolAdmin() &&
                        belongsToSameSchool(get(/databases/$(database)/documents/sessions/$(sessionId)).data.schoolId) ||
                        isSuperAdmin();
      }
    }
    
    // ============================================
    // TRANSACTIONS COLLECTION
    // ============================================
    match /transactions/{transactionId} {
      // Read: School staff can read all transactions in their school
      allow read: if (isSchoolStaff() && 
                     belongsToSameSchool(resource.data.schoolId)) ||
                    isSuperAdmin();
      
      // Create: School staff only
      allow create: if (isSchoolStaff() && 
                       request.resource.data.schoolId == getUserSchoolId()) ||
                      isSuperAdmin();
      
      // Update: School staff only
      allow update: if (isSchoolStaff() && 
                       belongsToSameSchool(resource.data.schoolId)) ||
                      isSuperAdmin();
      
      // Delete: Only school admins
      allow delete: if (isSchoolAdmin() && 
                       belongsToSameSchool(resource.data.schoolId)) ||
                      isSuperAdmin();
      
      // Subcollection: Transaction Tags
      match /tags/{tagId} {
        allow read: if isSchoolStaff() &&
                      belongsToSameSchool(get(/databases/$(database)/documents/transactions/$(transactionId)).data.schoolId) ||
                      isSuperAdmin();
        
        allow create, update, delete: if isSchoolStaff() &&
                                        belongsToSameSchool(get(/databases/$(database)/documents/transactions/$(transactionId)).data.schoolId) ||
                                        isSuperAdmin();
      }
    }
    
    // ============================================
    // ACCOUNTS COLLECTION (Financial)
    // ============================================
    match /accounts/{accountId} {
      // Read: School staff only
      allow read: if (isSchoolStaff() && 
                     belongsToSameSchool(resource.data.schoolId)) ||
                    isSuperAdmin();
      
      // Create: School admins only
      allow create: if (isSchoolAdmin() && 
                       request.resource.data.schoolId == getUserSchoolId()) ||
                      isSuperAdmin();
      
      // Update: School admins only
      allow update: if (isSchoolAdmin() && 
                       belongsToSameSchool(resource.data.schoolId)) ||
                      isSuperAdmin();
      
      // Delete: School admins only
      allow delete: if (isSchoolAdmin() && 
                       belongsToSameSchool(resource.data.schoolId)) ||
                      isSuperAdmin();
    }
    
    // ============================================
    // LICENSES COLLECTION
    // ============================================
    match /licenses/{licenseId} {
      // Read: School admins can read their license, superadmins can read all
      allow read: if isSuperAdmin() ||
                    (isSchoolAdmin() && 
                     resource.data.schoolId == getUserSchoolId());
      
      // Create, Update, Delete: Only superadmins
      allow create, update, delete: if isSuperAdmin();
    }
    
    // ============================================
    // SUPPORTING COLLECTIONS
    // ============================================
    
    // Transaction Categories
    match /transactionCategories/{categoryId} {
      // Read: All authenticated users
      allow read: if isAuthenticated();
      
      // Write: School admins for custom categories, superadmins for system
      allow create, update: if isSuperAdmin() ||
                              (isSchoolAdmin() && 
                               request.resource.data.schoolId == getUserSchoolId() &&
                               request.resource.data.isSystem == false);
      
      allow delete: if isSuperAdmin() ||
                      (isSchoolAdmin() && 
                       resource.data.schoolId == getUserSchoolId() &&
                       resource.data.isSystem == false);
    }
    
    // Contacts
    match /contacts/{contactId} {
      allow read: if (isSchoolStaff() && 
                     belongsToSameSchool(resource.data.schoolId)) ||
                    isSuperAdmin();
      
      allow create: if (isSchoolStaff() && 
                       request.resource.data.schoolId == getUserSchoolId()) ||
                      isSuperAdmin();
      
      allow update, delete: if (isSchoolAdmin() && 
                              belongsToSameSchool(resource.data.schoolId)) ||
                              isSuperAdmin();
    }
    
    // Currencies (System-wide, read-only for most users)
    match /currencies/{currencyCode} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isSuperAdmin();
    }
    
    // Student Levels
    match /studentLevels/{levelId} {
      allow read: if isAuthenticated();
      
      allow create, update: if isSuperAdmin() ||
                              (isSchoolAdmin() && 
                               request.resource.data.schoolId == getUserSchoolId());
      
      allow delete: if isSuperAdmin() ||
                      (isSchoolAdmin() && 
                       resource.data.schoolId == getUserSchoolId());
    }
  }
}
```

## Security Rules Testing

### Test Scenarios

```javascript
// Test file: security-rules.test.js

const testing = require('@firebase/rules-unit-testing');
const fs = require('fs');

const projectId = 'kool-skool';
const rules = fs.readFileSync('firestore.rules', 'utf8');

describe('Firestore Security Rules', () => {
  let testEnv;
  
  beforeAll(async () => {
    testEnv = await testing.initializeTestEnvironment({
      projectId,
      firestore: { rules }
    });
  });
  
  afterAll(async () => {
    await testEnv.cleanup();
  });
  
  describe('Schools Collection', () => {
    test('Superadmin can create schools', async () => {
      const admin = testEnv.authenticatedContext('admin1', {
        role: 'superadmin'
      });
      
      await testing.assertSucceeds(
        admin.firestore().collection('schools').add({
          name: 'Test School',
          timezone: 'UTC'
        })
      );
    });
    
    test('Regular admin cannot create schools', async () => {
      const admin = testEnv.authenticatedContext('admin2', {
        role: 'admin',
        schoolId: 'school1'
      });
      
      await testing.assertFails(
        admin.firestore().collection('schools').add({
          name: 'Test School',
          timezone: 'UTC'
        })
      );
    });
    
    test('School admin can update their own school', async () => {
      const admin = testEnv.authenticatedContext('admin3', {
        role: 'admin',
        schoolId: 'school1'
      });
      
      // First create the school as superadmin
      const superadmin = testEnv.authenticatedContext('super1', {
        role: 'superadmin'
      });
      
      await superadmin.firestore()
        .collection('schools')
        .doc('school1')
        .set({ name: 'Original School', timezone: 'UTC' });
      
      // Now update as school admin
      await testing.assertSucceeds(
        admin.firestore()
          .collection('schools')
          .doc('school1')
          .update({ name: 'Updated School' })
      );
    });
  });
  
  describe('Students Collection', () => {
    test('Student can read their own record', async () => {
      const student = testEnv.authenticatedContext('student1', {
        role: 'student',
        schoolId: 'school1'
      });
      
      // Create student record
      const admin = testEnv.authenticatedContext('admin1', {
        role: 'admin',
        schoolId: 'school1'
      });
      
      await admin.firestore()
        .collection('students')
        .doc('student1')
        .set({
          userId: 'student1',
          schoolId: 'school1',
          firstName: 'John',
          lastName: 'Doe'
        });
      
      // Student reads their own record
      await testing.assertSucceeds(
        student.firestore()
          .collection('students')
          .doc('student1')
          .get()
      );
    });
    
    test('Student cannot read other student records', async () => {
      const student = testEnv.authenticatedContext('student1', {
        role: 'student',
        schoolId: 'school1'
      });
      
      await testing.assertFails(
        student.firestore()
          .collection('students')
          .doc('student2')
          .get()
      );
    });
    
    test('Teacher can read students in their school', async () => {
      const teacher = testEnv.authenticatedContext('teacher1', {
        role: 'teacher',
        schoolId: 'school1'
      });
      
      // Create student record
      const admin = testEnv.authenticatedContext('admin1', {
        role: 'admin',
        schoolId: 'school1'
      });
      
      await admin.firestore()
        .collection('students')
        .doc('student1')
        .set({
          userId: 'student1',
          schoolId: 'school1',
          firstName: 'John',
          lastName: 'Doe'
        });
      
      // Teacher reads student in their school
      await testing.assertSucceeds(
        teacher.firestore()
          .collection('students')
          .doc('student1')
          .get()
      );
    });
  });
  
  describe('Cross-School Access', () => {
    test('Admin cannot access data from different school', async () => {
      const admin1 = testEnv.authenticatedContext('admin1', {
        role: 'admin',
        schoolId: 'school1'
      });
      
      const admin2 = testEnv.authenticatedContext('admin2', {
        role: 'admin',
        schoolId: 'school2'
      });
      
      // Admin2 creates student in school2
      await admin2.firestore()
        .collection('students')
        .doc('student2')
        .set({
          userId: 'student2',
          schoolId: 'school2',
          firstName: 'Jane',
          lastName: 'Smith'
        });
      
      // Admin1 tries to read student from school2
      await testing.assertFails(
        admin1.firestore()
          .collection('students')
          .doc('student2')
          .get()
      );
    });
  });
});
```

## Custom Claims Setup

### Cloud Function for Setting Custom Claims

```javascript
// functions/auth/setCustomClaims.js

const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.setUserClaims = functions.https.onCall(async (data, context) => {
  // Check if request is made by a superadmin
  if (!context.auth || context.auth.token.role !== 'superadmin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only superadmins can set user claims'
    );
  }
  
  const { userId, role, schoolId } = data;
  
  // Validate inputs
  if (!userId || !role) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'userId and role are required'
    );
  }
  
  // Validate role
  const validRoles = ['superadmin', 'admin', 'teacher', 'student'];
  if (!validRoles.includes(role)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Invalid role specified'
    );
  }
  
  // Set custom claims
  const claims = { role };
  if (schoolId) {
    claims.schoolId = schoolId;
  }
  
  try {
    await admin.auth().setCustomUserClaims(userId, claims);
    
    // Also update the user document
    await admin.firestore()
      .collection('users')
      .doc(userId)
      .update({ role, schoolId });
    
    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError(
      'internal',
      'Error setting custom claims',
      error
    );
  }
});

// Trigger to set claims when user document is created
exports.onUserCreate = functions.firestore
  .document('users/{userId}')
  .onCreate(async (snap, context) => {
    const userData = snap.data();
    const userId = context.params.userId;
    
    const claims = {
      role: userData.role || 'student'
    };
    
    if (userData.schoolId) {
      claims.schoolId = userData.schoolId;
    }
    
    try {
      await admin.auth().setCustomUserClaims(userId, claims);
      console.log(`Custom claims set for user ${userId}`);
    } catch (error) {
      console.error(`Error setting claims for user ${userId}:`, error);
    }
  });

// Trigger to update claims when user document is updated
exports.onUserUpdate = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();
    const userId = context.params.userId;
    
    // Check if role or schoolId changed
    if (newData.role !== oldData.role || 
        newData.schoolId !== oldData.schoolId) {
      
      const claims = {
        role: newData.role
      };
      
      if (newData.schoolId) {
        claims.schoolId = newData.schoolId;
      }
      
      try {
        await admin.auth().setCustomUserClaims(userId, claims);
        console.log(`Custom claims updated for user ${userId}`);
      } catch (error) {
        console.error(`Error updating claims for user ${userId}:`, error);
      }
    }
  });
```

## Security Best Practices

### 1. Input Validation
- Always validate data types and required fields
- Use Firestore data validation in rules
- Sanitize user inputs in Cloud Functions

### 2. Rate Limiting
- Implement rate limiting for sensitive operations
- Use Firebase App Check for API protection
- Monitor usage patterns for anomalies

### 3. Audit Logging
- Log all administrative actions
- Track permission changes
- Monitor failed access attempts

### 4. Data Encryption
- Enable encryption at rest (automatic in Firestore)
- Use HTTPS for all communications
- Encrypt sensitive fields if needed

### 5. Regular Security Audits
- Review security rules monthly
- Test rules with unit tests
- Monitor Firebase Security Rules Insights

### 6. Principle of Least Privilege
- Give users minimum required permissions
- Regularly review and revoke unused permissions
- Use time-based access when appropriate

## Migration Security Checklist

- [ ] All collections have security rules defined
- [ ] Custom claims are properly set for all users
- [ ] Security rules are tested with unit tests
- [ ] Sensitive operations require additional authentication
- [ ] Audit logging is implemented
- [ ] Rate limiting is configured
- [ ] Firebase App Check is enabled
- [ ] Regular backups are configured
- [ ] Security monitoring alerts are set up
- [ ] Documentation is complete and up-to-date