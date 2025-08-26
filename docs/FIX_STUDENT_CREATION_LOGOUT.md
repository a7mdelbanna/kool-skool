# Fix: Admin Logout on Student Creation

## Problem
When an admin created a student account, they were automatically logged out of the platform. This was happening because the `createUserWithEmailAndPassword` function in Firebase Auth automatically signs in the newly created user, replacing the current admin session.

## Root Cause
In `src/services/firebase/auth.service.ts`, the `createStudent` function was using `createUserWithEmailAndPassword` directly on the client side, which has the default behavior of signing in the newly created user.

## Solution
Modified the `createStudent` function to use the Firebase Cloud Function `createUserWithClaims` instead of creating users directly on the client side. This approach:

1. **Preserves the admin session** - The cloud function runs server-side, so it doesn't affect the client's authentication state
2. **Maintains security** - User creation is handled server-side with proper role validation
3. **Sets custom claims** - The function automatically sets the user's role and schoolId as custom claims

## Technical Changes

### Modified File: `src/services/firebase/auth.service.ts`

**Before:**
```typescript
const userCredential = await createUserWithEmailAndPassword(
  auth,
  userData.email,
  userData.password
);
// This automatically signs in the new user, logging out the admin
```

**After:**
```typescript
const createUserFunction = httpsCallable(functions, 'createUserWithClaims');
const result = await createUserFunction({
  email: userData.email,
  password: userData.password,
  firstName: userData.firstName,
  lastName: userData.lastName,
  role: userData.role || 'student',
  schoolId: userData.schoolId,
  phoneNumber: userData.phoneNumber || null,
  timezone: userData.timezone || 'UTC'
});
// Admin session remains intact
```

## Cloud Function Used
The solution leverages the existing `createUserWithClaims` cloud function in `functions/src/index.ts` which:
- Creates the user in Firebase Auth server-side
- Sets custom claims (role, schoolId)
- Creates the user document in Firestore
- Returns the new user's UID

## Testing
To verify the fix works:

1. Sign in as admin (ahmed@englishoshka.com)
2. Create a new student account
3. Confirm the admin remains signed in after student creation
4. Verify the student account was created successfully

## Benefits
- ✅ Admin stays logged in when creating students
- ✅ Better security with server-side user creation
- ✅ Automatic custom claims assignment
- ✅ No need for client-side workarounds or re-authentication

## Deployment Note
The Firebase Cloud Functions must be deployed for this solution to work in production. Use:
```bash
cd functions
npm run deploy
```