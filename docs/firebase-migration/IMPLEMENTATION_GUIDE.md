# Firebase Migration Implementation Guide

## Project Setup Complete ✅

### What's Been Done

1. **Firebase Configuration** ✅
   - Created `src/config/firebase.ts` with complete Firebase initialization
   - Set up authentication, Firestore, Storage, and Functions
   - Added helper functions for role checking and permissions

2. **Database Structure** ✅
   - Designed complete Firestore collections structure
   - Mapped all PostgreSQL tables to NoSQL collections
   - Implemented proper denormalization strategy

3. **Security Rules** ✅
   - Created `firestore.rules` with comprehensive RBAC
   - Created `storage.rules` for file access control
   - Implemented role hierarchy: superadmin > admin > teacher > student

4. **Authentication Service** ✅
   - Created `src/services/firebase/auth.service.ts`
   - Implemented proper Firebase Auth with custom claims
   - Added user management functions

5. **Database Service** ✅
   - Created `src/services/firebase/database.service.ts`
   - Generic CRUD operations
   - Real-time listeners and batch operations

6. **Cloud Functions** ✅
   - User management functions
   - Firestore triggers for data consistency
   - Scheduled functions for maintenance

7. **Project Configuration** ✅
   - `firebase.json` - Firebase project configuration
   - `.firebaserc` - Project alias configuration
   - `firestore.indexes.json` - Composite indexes
   - Environment variables template (`.env.example`)

## Next Steps for Implementation

### Step 1: Firebase Console Setup
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your `kool-skool` project
3. Get your configuration keys from Project Settings
4. Create `.env.local` file with your keys:
```bash
cp .env.example .env.local
# Edit .env.local with your actual Firebase keys
```

### Step 2: Install Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

### Step 3: Deploy Security Rules and Functions
```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Storage rules
firebase deploy --only storage:rules

# Install functions dependencies
cd functions
npm install
cd ..

# Deploy Cloud Functions
firebase deploy --only functions
```

### Step 4: Create Initial SuperAdmin
```javascript
// Run this in Firebase Console or a setup script
const createInitialSuperAdmin = async () => {
  const userRecord = await admin.auth().createUser({
    email: 'superadmin@koolskool.com',
    password: 'ChangeThis123!',
    displayName: 'Super Admin'
  });

  await admin.auth().setCustomUserClaims(userRecord.uid, {
    role: 'superadmin'
  });

  await admin.firestore().collection('users').doc(userRecord.uid).set({
    uid: userRecord.uid,
    email: 'superadmin@koolskool.com',
    firstName: 'Super',
    lastName: 'Admin',
    role: 'superadmin',
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
};
```

### Step 5: Update React Components

#### Example: Update Login Component
```typescript
// pages/Login.tsx
import { authService } from '@/services/firebase/auth.service';

const handleLogin = async (email: string, password: string) => {
  try {
    const userProfile = await authService.signIn(email, password);
    
    // Store user in context
    setUser({
      id: userProfile.uid,
      firstName: userProfile.firstName,
      lastName: userProfile.lastName,
      role: userProfile.role,
      schoolId: userProfile.schoolId || '',
      email: userProfile.email
    });
    
    // Navigate based on role
    if (userProfile.role === 'student') {
      navigate('/student-dashboard');
    } else {
      navigate('/dashboard');
    }
  } catch (error) {
    console.error('Login failed:', error);
  }
};
```

#### Example: Update Students List
```typescript
// pages/Students.tsx
import { databaseService } from '@/services/firebase/database.service';
import { useEffect, useState } from 'react';

const StudentsPage = () => {
  const [students, setStudents] = useState([]);
  
  useEffect(() => {
    // Subscribe to real-time updates
    const unsubscribe = databaseService.subscribe(
      'students',
      (data) => setStudents(data),
      {
        where: [{ field: 'schoolId', operator: '==', value: userSchoolId }],
        orderBy: [{ field: 'createdAt', direction: 'desc' }]
      }
    );
    
    return () => unsubscribe();
  }, []);
  
  return (
    // Your UI components
  );
};
```

### Step 6: Data Migration Script

Create `migrate-data.js`:
```javascript
const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');

// Initialize Firebase Admin
admin.initializeApp({
  // Your service account config
});

// Initialize Supabase client
const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_SERVICE_KEY'
);

const db = admin.firestore();

async function migrateSchools() {
  const { data: schools } = await supabase.from('schools').select('*');
  
  const batch = db.batch();
  schools.forEach(school => {
    const docRef = db.collection('schools').doc(school.id);
    batch.set(docRef, {
      id: school.id,
      name: school.name,
      logo: school.logo,
      contactInfo: school.contact_info,
      timezone: school.timezone,
      licenseId: school.license_id,
      createdAt: admin.firestore.Timestamp.fromDate(new Date(school.created_at)),
      updatedAt: admin.firestore.Timestamp.fromDate(new Date(school.updated_at))
    });
  });
  
  await batch.commit();
  console.log(`Migrated ${schools.length} schools`);
}

// Run migrations
async function runMigration() {
  await migrateSchools();
  // Add other collections...
}

runMigration();
```

## Testing Checklist

### Authentication Testing
- [ ] SuperAdmin can log in
- [ ] Admin can create users in their school
- [ ] Teachers can log in and see their students
- [ ] Students can log in and see their dashboard
- [ ] Password reset works
- [ ] User deactivation prevents login

### Database Operations
- [ ] CRUD operations work for all collections
- [ ] Real-time updates work
- [ ] Batch operations complete successfully
- [ ] Queries respect school boundaries

### Security Rules Testing
- [ ] Users can only access their school's data
- [ ] Students can only see their own records
- [ ] Teachers can manage their assigned students
- [ ] Admins can manage all school data
- [ ] SuperAdmins have full access

### Cloud Functions Testing
- [ ] User creation with custom claims works
- [ ] Triggers update related documents
- [ ] Scheduled functions run correctly
- [ ] Error handling works properly

## Performance Optimization

### 1. Enable Offline Persistence
Already configured in `firebase.ts`:
```typescript
persistentLocalCache({
  tabManager: persistentMultipleTabManager()
})
```

### 2. Use Pagination
```typescript
const { data, lastDoc, hasMore } = await databaseService.queryWithPagination(
  'students',
  20, // page size
  { orderBy: [{ field: 'createdAt', direction: 'desc' }] }
);
```

### 3. Optimize Queries
- Use composite indexes (already defined in `firestore.indexes.json`)
- Limit fields returned when possible
- Cache frequently accessed data

### 4. Bundle Size Optimization
```typescript
// Use dynamic imports for large components
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
```

## Monitoring & Debugging

### Firebase Console Tools
1. **Authentication**: Monitor user sign-ups and sign-ins
2. **Firestore**: View and edit data directly
3. **Functions Logs**: Monitor function executions
4. **Usage & Billing**: Track resource usage

### Local Development with Emulators
```bash
# Start emulators
firebase emulators:start

# Your app will automatically connect if VITE_USE_FIREBASE_EMULATORS=true
```

### Debug Security Rules
```bash
# Test security rules
npm test -- security-rules.test.js
```

## Troubleshooting Common Issues

### Issue: "Missing or insufficient permissions"
**Solution**: Check that custom claims are set correctly:
```javascript
const user = await auth.currentUser;
const idTokenResult = await user.getIdTokenResult();
console.log('Claims:', idTokenResult.claims);
```

### Issue: "No index found for this query"
**Solution**: Add the composite index to `firestore.indexes.json` and deploy:
```bash
firebase deploy --only firestore:indexes
```

### Issue: "Function deployment failed"
**Solution**: Check function logs and ensure all dependencies are installed:
```bash
firebase functions:log
cd functions && npm install
```

## Production Deployment Checklist

- [ ] Environment variables are set correctly
- [ ] Security rules are properly configured
- [ ] All indexes are deployed
- [ ] Cloud Functions are deployed
- [ ] Initial SuperAdmin account created
- [ ] Data migration completed successfully
- [ ] Backup strategy in place
- [ ] Monitoring alerts configured
- [ ] Performance testing completed
- [ ] Security audit performed

## Support & Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)
- [Firebase Security Rules Guide](https://firebase.google.com/docs/rules)
- [Cloud Functions Documentation](https://firebase.google.com/docs/functions)

## Important Notes

1. **Data Consistency**: Cloud Functions maintain data consistency across collections
2. **Security**: Never expose service account keys or API keys
3. **Costs**: Monitor usage to avoid unexpected charges
4. **Backups**: Implement regular backup strategy
5. **Testing**: Always test in development before deploying to production

---

*Migration prepared and ready for implementation. Follow this guide step-by-step for a successful migration from Supabase to Firebase.*