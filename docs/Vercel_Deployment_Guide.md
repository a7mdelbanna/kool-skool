
# Vercel Deployment Guide

Complete guide for deploying the School Management System on Vercel with isolated database and custom domain.

## Table of Contents

1. [Project Structure for Vercel](#project-structure-for-vercel)
2. [Environment Variables Setup](#environment-variables-setup)
3. [Database Isolation Setup](#database-isolation-setup)
4. [Build Configuration](#build-configuration)
5. [Custom Domain Setup](#custom-domain-setup)
6. [Supabase Integration](#supabase-integration)
7. [Vercel Configuration Files](#vercel-configuration-files)
8. [Step-by-Step Deployment](#step-by-step-deployment)
9. [Updates and Maintenance](#updates-and-maintenance)
10. [Troubleshooting](#troubleshooting)

---

## Project Structure for Vercel

### Required Files and Folders

Your project must have this structure for Vercel deployment:

```
project-root/
├── package.json                    # REQUIRED - Dependencies and scripts
├── vercel.json                     # OPTIONAL - Vercel configuration
├── vite.config.ts                  # REQUIRED - Build configuration
├── index.html                      # REQUIRED - Entry point
├── src/                            # REQUIRED - Source code
│   ├── main.tsx                    # REQUIRED - React entry point
│   ├── App.tsx                     # REQUIRED - Main component
│   ├── integrations/supabase/      # REQUIRED - Database connection
│   │   └── client.ts               # REQUIRED - Supabase client config
│   └── ...                         # Other source files
├── public/                         # OPTIONAL - Static assets
├── docs/                           # OPTIONAL - Documentation (ignored by Vercel)
└── supabase/                       # OPTIONAL - Local development only
```

### Files Vercel Ignores
These files/folders are automatically ignored during deployment:
- `supabase/` - Local Supabase CLI files
- `docs/` - Documentation files
- `node_modules/` - Dependencies (rebuilt on Vercel)
- `.git/` - Git history
- `*.md` files in root (except README.md)

### Critical Files for Deployment

#### 1. `package.json` - MUST be configured correctly
```json
{
  "name": "school-management-system",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    // All production dependencies must be here
  }
}
```

#### 2. `vite.config.ts` - Build configuration
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Set to true for debugging
  }
});
```

#### 3. `src/integrations/supabase/client.ts` - Database connection
```typescript
// This file MUST contain your isolated database credentials
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://YOUR-ISOLATED-PROJECT-ID.supabase.co"
const supabaseKey = "YOUR-ISOLATED-ANON-KEY"

export const supabase = createClient(supabaseUrl, supabaseKey)
```

---

## Environment Variables Setup

### Important Note
⚠️ **This project does NOT use traditional environment variables**. All configuration is hardcoded in the source files. However, you can optionally migrate to environment variables for better security.

### Option 1: Keep Current Structure (Recommended for Testing)
Update `src/integrations/supabase/client.ts` directly with your isolated credentials.

### Option 2: Migrate to Environment Variables (Better Security)

#### Step 1: Modify the Supabase Client
```typescript
// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://your-fallback-project.supabase.co"
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "your-fallback-anon-key"

export const supabase = createClient(supabaseUrl, supabaseKey)
```

#### Step 2: Configure Environment Variables in Vercel

Go to your Vercel project dashboard → Settings → Environment Variables:

**Add these variables:**

| Key | Value | Environment |
|-----|-------|-------------|
| `VITE_SUPABASE_URL` | `https://your-isolated-project-id.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Production, Preview, Development |

**Environment Settings:**
- **Production**: Live site only
- **Preview**: Git branch deployments  
- **Development**: `vercel dev` command

#### Step 3: Local Development Environment
Create `.env.local` for local development (ignored by Git):
```bash
# .env.local (DO NOT COMMIT TO GIT)
VITE_SUPABASE_URL=https://your-isolated-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-isolated-anon-key
```

---

## Database Isolation Setup

### Critical: Ensure Zero Production Risk

#### 1. Create Completely Separate Supabase Project
```bash
# DO NOT USE PRODUCTION CREDENTIALS
Production URL:  https://production-id.supabase.co      ❌ NEVER USE
Isolated URL:    https://your-test-project-id.supabase.co  ✅ USE THIS

Production Key:  eyJ...production-key...                ❌ NEVER USE  
Isolated Key:    eyJ...isolated-test-key...            ✅ USE THIS
```

#### 2. Verify Database Isolation
**Before deploying, verify your isolation:**

```sql
-- Run this query in your isolated database
SELECT 
    'ISOLATED DATABASE - SAFE TO TEST' as environment,
    count(*) as total_schools,
    count(*) filter (where name ILIKE '%production%' OR name ILIKE '%live%') as production_schools
FROM schools;
```

**Expected result:** 
- `total_schools`: Small number (your test data)
- `production_schools`: 0 (no production data)

#### 3. Database Setup Checklist
- [ ] New Supabase project created (not production)
- [ ] All database migrations applied to isolated database
- [ ] Test data created (not production data)
- [ ] Isolated credentials updated in code
- [ ] Production credentials removed from all files
- [ ] Database connection tested and verified

---

## Build Configuration

### Framework Detection
Vercel automatically detects Vite projects. No manual configuration needed.

**Detected Settings:**
- **Framework**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Custom Build Settings (if needed)

#### Override in Vercel Dashboard
Go to Project Settings → Build & Output Settings:

| Setting | Value |
|---------|-------|
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

#### Build Optimization Settings
```json
// package.json - Optimize for production
{
  "scripts": {
    "build": "tsc && vite build --mode production",
    "build:preview": "tsc && vite build --mode preview"
  }
}
```

### Build Environment Variables
Configure in Vercel dashboard if using environment variables:
- `NODE_ENV`: `production`
- `VITE_SUPABASE_URL`: Your isolated database URL
- `VITE_SUPABASE_ANON_KEY`: Your isolated anon key

---

## Custom Domain Setup

### When to Set Up Domain
**Recommended timing:**
1. ✅ **After successful deployment** with default Vercel domain
2. ✅ **After testing core functionality** 
3. ✅ **Before sharing with team members**

### Step-by-Step Domain Setup

#### 1. Purchase Domain (if needed)
Recommended providers:
- Namecheap, GoDaddy, Google Domains, Cloudflare

#### 2. Add Domain in Vercel
1. Go to Project Settings → Domains
2. Click "Add Domain"
3. Enter your domain: `your-school-app.com`
4. Choose configuration type:
   - **Apex domain**: `your-school-app.com`
   - **Subdomain**: `app.your-school-app.com` (recommended)

#### 3. Configure DNS Records
**For Subdomain (Recommended):**
```
Type: CNAME
Name: app
Value: cname.vercel-dns.com
```

**For Apex Domain:**
```
Type: A
Name: @
Value: 76.76.19.61

Type: A  
Name: @
Value: 76.223.126.88
```

#### 4. Update Application URLs
**After domain is active, update these in Supabase:**
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Update **Site URL**: `https://your-school-app.com`
3. Add **Redirect URLs**: 
   - `https://your-school-app.com`
   - `https://your-school-app.com/login`
   - `https://your-school-app.com/student-login`
   - `https://your-school-app.com/superadmin-login`

#### 5. SSL Certificate
Vercel automatically provides SSL certificates. No configuration needed.

---

## Supabase Integration

### Connection Setup

#### 1. Supabase Project Configuration
Ensure your isolated Supabase project has:
- **Database**: All tables created and migrated
- **API**: Enabled with correct URL and keys
- **Authentication**: Configured but not used (custom auth system)
- **Row Level Security**: Properly configured

#### 2. Verify Supabase Connection
```typescript
// Test connection in browser console after deployment
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
// Should show your isolated project URL, not production
```

#### 3. Edge Functions (if using)
Deploy edge functions to your isolated Supabase project:
```bash
# Deploy to isolated project only
supabase functions deploy --project-ref YOUR-ISOLATED-PROJECT-ID
```

### API Rate Limits
Supabase free tier limits:
- **Database size**: 500MB
- **Monthly bandwidth**: 5GB  
- **Monthly API requests**: 50,000

Monitor usage in Supabase dashboard.

---

## Vercel Configuration Files

### Optional: `vercel.json`
Create this file for advanced configuration:

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "devCommand": "npm run dev",
  "env": {
    "NODE_ENV": "production"
  },
  "build": {
    "env": {
      "VITE_SUPABASE_URL": "@vite_supabase_url",
      "VITE_SUPABASE_ANON_KEY": "@vite_supabase_anon_key"
    }
  },
  "functions": {
    "app/**": {
      "includeFiles": "dist/**"
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options", 
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/((?!api).*)",
      "destination": "/index.html"
    }
  ]
}
```

### Recommended: Minimal `vercel.json`
For most cases, you only need:
```json
{
  "rewrites": [
    {
      "source": "/((?!api).*)", 
      "destination": "/index.html"
    }
  ]
}
```

---

## Step-by-Step Deployment

### First-Time Deployment

#### Phase 1: Pre-Deployment Preparation (30 minutes)

1. **Verify Isolated Database**
   ```bash
   # Check you're connected to isolated database
   # Run in Supabase SQL Editor:
   SELECT 'This is my isolated database' as confirmation;
   ```

2. **Update Database Credentials**
   ```typescript
   // src/integrations/supabase/client.ts
   const supabaseUrl = "https://YOUR-ISOLATED-PROJECT-ID.supabase.co"  
   const supabaseKey = "YOUR-ISOLATED-ANON-KEY"
   ```

3. **Test Local Build**
   ```bash
   npm run build
   npm run preview
   # Visit http://localhost:4173 and test login
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "Configure for Vercel deployment with isolated database"
   git push origin main
   ```

#### Phase 2: Vercel Setup (15 minutes)

5. **Connect Repository**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your Git repository
   - Choose the correct branch (usually `main`)

6. **Configure Build Settings**
   - Framework Preset: **Vite** (auto-detected)
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `dist` (auto-detected)  
   - Install Command: `npm install` (auto-detected)

7. **Deploy**
   - Click "Deploy" 
   - Wait for build to complete (2-3 minutes)
   - Get your Vercel URL: `https://your-project-name.vercel.app`

#### Phase 3: Post-Deployment Testing (10 minutes)

8. **Test Core Functionality**
   - [ ] Site loads without errors
   - [ ] Login pages accessible
   - [ ] Database connection working
   - [ ] No production data visible

9. **Test User Authentication**
   ```bash
   # Test with your isolated database users
   Superadmin: superadmin@yourdomain.com / your-password
   Admin: admin@yourschool.com / admin-password  
   ```

10. **Verify Database Isolation**
    - Check that only test data appears
    - Verify no production information is accessible
    - Test CRUD operations

#### Phase 4: Domain Setup (Optional - 20 minutes)

11. **Add Custom Domain** (if desired)
    - Project Settings → Domains  
    - Add your domain
    - Configure DNS records
    - Wait for SSL certificate (automatic)

12. **Update Supabase Auth URLs**
    - Update Site URL in Supabase dashboard
    - Add redirect URLs for new domain

### Deployment Checklist

**Pre-deployment:**
- [ ] Isolated database created and configured
- [ ] Test data added to isolated database
- [ ] Database credentials updated in code
- [ ] Local build tested successfully
- [ ] Changes committed and pushed to Git

**During deployment:**
- [ ] Repository connected to Vercel
- [ ] Build settings configured correctly
- [ ] Environment variables set (if using)
- [ ] Deployment completed without errors

**Post-deployment:**
- [ ] Site loads and functions correctly
- [ ] Authentication works with test users
- [ ] Database operations work correctly
- [ ] No production data visible
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active

---

## Updates and Maintenance

### Code Updates

#### For Code Changes:
```bash
# Make your changes locally
git add .
git commit -m "Description of changes"  
git push origin main

# Vercel automatically redeploys on push to main branch
# Monitor deployment at https://vercel.com/dashboard
```

#### For Database Schema Changes:
```bash
# 1. Update your isolated database first
# Run new migrations in Supabase SQL Editor

# 2. Test changes locally
npm run dev
# Verify functionality works

# 3. Deploy code changes
git add .
git commit -m "Database schema updates"
git push origin main
```

### Database Updates

#### Adding New Data:
```sql  
-- Always add to isolated database first
-- Never modify production database
INSERT INTO your_table (columns) VALUES (test_data);
```

#### Schema Changes:
```sql
-- Run in isolated database SQL Editor
ALTER TABLE your_table ADD COLUMN new_column TEXT;
-- Test thoroughly before considering production
```

### Monitoring Deployments

#### Vercel Dashboard:
- **Deployments**: View build logs and status
- **Functions**: Monitor any serverless functions
- **Analytics**: Track site usage and performance  
- **Speed Insights**: Monitor page load times

#### Automatic Deployment:
- **Trigger**: Every push to main branch
- **Build time**: 2-4 minutes typically
- **Rollback**: Available if deployment fails

---

## Troubleshooting

### Common Deployment Issues

#### 1. Build Failures

**Error: "Module not found"**
```bash
# Solution: Ensure all dependencies are in package.json
npm install
git add package-lock.json
git commit -m "Fix dependencies"
git push
```

**Error: "TypeScript compilation failed"**
```bash
# Solution: Fix TypeScript errors locally first
npm run build
# Fix all errors, then deploy
```

#### 2. Runtime Errors

**Error: "Supabase connection failed"**
- Check database credentials in `src/integrations/supabase/client.ts`
- Verify Supabase project is active
- Test connection in local development

**Error: "Login not working"**
- Verify user records exist in isolated database
- Check RPC functions are created
- Test with correct credentials

#### 3. Custom Domain Issues

**Error: "Domain not accessible"**
- Verify DNS records are correct
- Wait up to 24 hours for DNS propagation  
- Check domain registrar settings

**Error: "SSL certificate not working"**
- Vercel provides automatic SSL
- Wait a few minutes after domain setup
- Check Vercel dashboard for certificate status

### Performance Issues

#### Slow Loading:
- Check build size in Vercel dashboard
- Optimize images and assets
- Review Supabase query performance

#### Database Timeouts:
- Check Supabase connection limits
- Optimize slow queries
- Consider database indexing

### Debug Information

#### Get Build Logs:
1. Go to Vercel Dashboard → Deployments
2. Click on failed deployment
3. View detailed build logs
4. Look for specific error messages

#### Test Database Connection:
```javascript
// Run in browser console on deployed site
console.log('Testing database connection...');
// Check browser network tab for failed requests
```

#### Environment Variables:
```javascript
// Check in browser console
console.log('Environment check:', {
  url: import.meta.env.VITE_SUPABASE_URL,
  hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
});
```

---

## Security Checklist

### Pre-Deployment Security:
- [ ] Production database credentials removed from all files
- [ ] Only isolated/test database credentials in codebase  
- [ ] No sensitive data in Git history
- [ ] Environment variables used for secrets (if applicable)

### Post-Deployment Security:
- [ ] HTTPS enforced (automatic with Vercel)
- [ ] Database access verified as isolated only
- [ ] No production data accessible through app
- [ ] Custom domain configured with SSL

### Ongoing Security:
- [ ] Regular updates to dependencies
- [ ] Monitor Vercel security advisories
- [ ] Review Supabase access logs periodically
- [ ] Keep isolated database credentials secure

---

This completes your Vercel deployment guide. Your isolated School Management System should now be running securely on Vercel with zero risk to production data.

Remember: **Always verify database isolation before and after deployment!**
