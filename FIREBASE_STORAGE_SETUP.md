# Firebase Storage Setup - URGENT

## The Problem
Your Firebase Storage is currently blocking all uploads because the security rules haven't been configured.

## Quick Fix (For Testing - Use This First)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `kool-skool-7e858`
3. Click **Storage** in the left sidebar
4. Click the **Rules** tab
5. Replace everything with this TEMPORARY rule for testing:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      // TEMPORARY - Allow all authenticated users to read/write
      // Replace this with proper rules after testing
      allow read, write: if request.auth != null;
    }
  }
}
```

6. Click **Publish**

## Proper Rules (Use After Testing Works)

Once uploads are working, replace with these secure rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Payment logos - authenticated users can read/write
    match /payment-logos/{schoolId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
        && request.resource.size < 2 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }
    
    // Payment proofs - authenticated users can read/write
    match /payment-proofs/{schoolId}/{studentId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
        && request.resource.size < 5 * 1024 * 1024
        && (request.resource.contentType.matches('image/.*') 
            || request.resource.contentType == 'application/pdf');
    }
    
    // Avatars - authenticated users can read/write
    match /avatars/{schoolId}/{userType}/{userId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
        && request.resource.size < 2 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }
    
    // Teacher documents
    match /teacher-documents/{schoolId}/{teacherId}/{documentType}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
        && request.resource.size < 10 * 1024 * 1024;
    }
  }
}
```

## If Storage Isn't Initialized

If you see "Get started" instead of the Rules tab:

1. Click **Get started**
2. Choose **Start in production mode**
3. Select your region (us-central1 is fine)
4. Click **Done**
5. Now go to the **Rules** tab and apply the rules above

## Verify It Works

After applying the rules:
1. Refresh your app
2. Try uploading a logo again
3. It should work now!

## Still Not Working?

If it still doesn't work after applying the rules:

1. Check that you're logged in (open browser console and type: `firebase.auth().currentUser`)
2. Make sure Storage is initialized in Firebase Console
3. Try logging out and logging back in
4. Check the browser console for any other errors

## Alternative Workaround

If you need it working immediately without Firebase Storage, let me know and I can implement a base64 image storage in Firestore instead (not recommended for production, but works for testing).