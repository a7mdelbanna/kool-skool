# 🚀 Deployment Guide for TutorFlow Assistant

## Overview

This application is deployed to **Netlify** with a dedicated `production` branch for live deployments.

- **Main Branch**: Development branch
- **Production Branch**: Live production deployments
- **Hosting**: Netlify
- **CI/CD**: GitHub Actions + Netlify

## 🔧 Initial Setup

### 1. Prerequisites

- [ ] GitHub repository set up
- [ ] Netlify account created
- [ ] Environment variables ready

### 2. Connect to Netlify

1. **Log in to Netlify**: https://app.netlify.com

2. **Import from Git**:
   - Click "Add new site" → "Import an existing project"
   - Connect to GitHub
   - Select your repository

3. **Configure Build Settings**:
   ```
   Base directory: /
   Build command: npm run build
   Publish directory: dist
   Production branch: production
   ```

4. **Set Environment Variables** in Netlify Dashboard:
   - Go to Site Settings → Environment Variables
   - Add all variables from `.env.production.example`:
   ```
   VITE_FIREBASE_API_KEY=your-production-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-production-auth-domain
   VITE_FIREBASE_PROJECT_ID=your-production-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-production-storage-bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-production-sender-id
   VITE_FIREBASE_APP_ID=your-production-app-id
   VITE_OPENAI_API_KEY=your-openai-key
   VITE_ELEVEN_LABS_API_KEY=your-elevenlabs-key
   ```

### 3. Set Up GitHub Secrets

For automated deployments via GitHub Actions:

1. Get Netlify credentials:
   - **Auth Token**: User Settings → Applications → Personal Access Tokens
   - **Site ID**: Site Settings → General → Site Information

2. Add to GitHub repository secrets:
   - Go to Repository → Settings → Secrets and variables → Actions
   - Add:
     - `NETLIFY_AUTH_TOKEN`
     - `NETLIFY_SITE_ID`

## 📦 Deployment Process

### Method 1: Automatic Deployment (Recommended)

1. **Merge to main branch**:
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```

2. **Deploy to production**:
   ```bash
   npm run deploy:production
   ```
   This script will:
   - Run tests
   - Build the project
   - Merge main into production
   - Push to production branch
   - Trigger Netlify deployment

### Method 2: Manual Deployment

1. **Create/update production branch**:
   ```bash
   git checkout main
   git pull origin main
   git checkout production
   git merge main
   git push origin production
   ```

2. Netlify will automatically deploy when production branch is updated

### Method 3: Direct Netlify CLI Deployment

1. **Install Netlify CLI**:
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**:
   ```bash
   netlify login
   ```

3. **Link your site**:
   ```bash
   netlify link
   ```

4. **Deploy**:
   ```bash
   # Deploy preview
   npm run netlify:deploy
   
   # Deploy to production
   npm run netlify:deploy:prod
   ```

## 🌳 Branch Strategy

```
main (development)
 ├── feature/new-feature
 ├── bugfix/fix-issue
 └── production (live site)
```

- **main**: Primary development branch
- **feature/**: Feature branches
- **bugfix/**: Bug fix branches
- **production**: Production deployments only

## 📋 Deployment Checklist

Before deploying to production:

- [ ] All tests pass
- [ ] Build completes without errors
- [ ] Environment variables are set in Netlify
- [ ] Database migrations are complete (if any)
- [ ] API endpoints are configured for production
- [ ] Performance testing done
- [ ] Security review completed

## 🔍 Monitoring

### Netlify Dashboard

- **Build Logs**: Check for build errors
- **Function Logs**: Monitor serverless functions
- **Analytics**: Track site performance
- **Forms**: Monitor form submissions

### Performance Monitoring

- Lighthouse scores (automated via Netlify plugin)
- Core Web Vitals
- Error tracking (consider adding Sentry)

## 🆘 Rollback Process

If something goes wrong:

### Option 1: Netlify Dashboard
1. Go to Deploys tab
2. Find the last working deployment
3. Click "Publish deploy"

### Option 2: Git Revert
```bash
git checkout production
git revert HEAD
git push origin production
```

## 🔧 Troubleshooting

### Build Fails

1. Check build logs in Netlify
2. Verify environment variables
3. Check Node version (should be 18)
4. Clear cache and redeploy:
   ```bash
   netlify deploy --prod --clear
   ```

### Environment Variables Not Working

1. Verify variable names match exactly
2. Restart build with cleared cache
3. Check for typos in variable names

### 404 Errors on Routes

- Ensure `netlify.toml` redirect rules are correct
- Check that `dist/index.html` exists

## 📞 Support

- **Netlify Status**: https://www.netlifystatus.com/
- **Netlify Support**: https://www.netlify.com/support/
- **Documentation**: https://docs.netlify.com/

## 📝 Notes

- Production deployments happen automatically when `production` branch is updated
- Preview deployments are created for pull requests
- Build time is typically 2-3 minutes
- Free tier includes 100GB bandwidth and 300 build minutes per month

---

**Last Updated**: Current Date
**Maintained By**: Development Team