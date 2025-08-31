# Welcome to your Lovable project

## 🚨 IMPORTANT: Firebase Storage Setup Required 🚨

To enable file uploads (payment logos, payment proofs, avatars), you MUST configure Firebase Storage security rules:

### Quick Setup Steps:

1. **Open Firebase Console**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Select your project: `kool-skool-7e858`

2. **Navigate to Storage**
   - Click **Storage** in the left sidebar
   - If first time: Click **Get started**, choose location, select **production mode**

3. **Update Security Rules**
   - Click the **Rules** tab
   - Replace ALL existing rules with:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to read and write payment logos
    match /payment-logos/{schoolId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
        && request.resource.size < 2 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }
    
    // Allow authenticated users to read and write payment proofs
    match /payment-proofs/{schoolId}/{studentId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
        && request.resource.size < 5 * 1024 * 1024
        && (request.resource.contentType.matches('image/.*') 
            || request.resource.contentType == 'application/pdf');
    }
    
    // Allow authenticated users to upload avatars
    match /avatars/{schoolId}/{userType}/{userId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
        && request.resource.size < 2 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }
    
    // Allow authenticated users to upload teacher documents
    match /teacher-documents/{schoolId}/{teacherId}/{documentType}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
        && request.resource.size < 10 * 1024 * 1024;
    }
  }
}
```

4. **Click "Publish"** to apply the rules

✅ **Storage is now configured!** File uploads will work properly.

---

## Project info

**URL**: https://lovable.dev/projects/e39a344b-5f65-4e00-89d2-0e0c1bcf76cc

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/e39a344b-5f65-4e00-89d2-0e0c1bcf76cc) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with .

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/e39a344b-5f65-4e00-89d2-0e0c1bcf76cc) and click on Share -> Publish.

## I want to use a custom domain - is that possible?

We don't support custom domains (yet). If you want to deploy your project under your own domain then we recommend using Netlify. Visit our docs for more details: [Custom domains](https://docs.lovable.dev/tips-tricks/custom-domain/)
