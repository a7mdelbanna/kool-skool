
# Vercel Environment Variables Guide

Comprehensive guide for managing environment variables and secrets in Vercel deployments of the School Management System.

## Important Context

⚠️ **The School Management System currently does NOT use environment variables**. All configuration is hardcoded in source files. This guide covers:
1. Current hardcoded approach (recommended for testing)
2. Optional migration to environment variables (better for production)

---

## Current Approach: Hardcoded Configuration

### How It Currently Works
All database connection settings are directly coded in:
```typescript
// src/integrations/supabase/client.ts
const supabaseUrl = "https://your-project-id.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Advantages:
- ✅ Simple setup
- ✅ No environment variable configuration needed
- ✅ Works immediately on Vercel
- ✅ Clear what credentials are being used

### Disadvantages:
- ❌ Credentials visible in source code
- ❌ Same credentials for all environments
- ❌ Must commit changes to update credentials

---

## Option 1: Keep Hardcoded (Recommended for Testing)

### For Testing/Development Deployments:
1. **Update** `src/integrations/supabase/client.ts` with isolated credentials
2. **Commit** changes to Git  
3. **Deploy** to Vercel (no additional configuration)

### Isolation Steps:
```typescript
// src/integrations/supabase/client.ts
// BEFORE (production - never use):
const supabaseUrl = "https://production-project-id.supabase.co"  // ❌
const supabaseKey = "production-anon-key"                        // ❌

// AFTER (isolated - safe to use):
const supabaseUrl = "https://test-project-id.supabase.co"        // ✅
const supabaseKey = "test-anon-key"                              // ✅
```

---

## Option 2: Migrate to Environment Variables

### Benefits of Migration:
- 🔒 **Security**: Credentials not in source code
- 🌍 **Multi-environment**: Different credentials per environment
- 🔄 **Updates**: Change credentials without code changes
- 👥 **Team**: Different developers can use different databases

### Migration Steps

#### Step 1: Update Supabase Client
```typescript
// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js'

// Use environment variables with fallbacks
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://fallback-project.supabase.co"
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "fallback-anon-key"

// Optional: Add environment validation
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.')
}

export const supabase = createClient(supabaseUrl, supabaseKey)
```

#### Step 2: Configure Vercel Environment Variables

**In Vercel Dashboard:**
1. Go to Project Settings → Environment Variables
2. Add each variable for appropriate environments

#### Step 3: Local Development Setup
```bash
# .env.local (add to .gitignore)
VITE_SUPABASE_URL=https://your-local-dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-local-dev-anon-key
```

---

## Vercel Environment Variables Configuration

### Environment Types

| Environment | When Used | Purpose |
|-------------|-----------|---------|
| **Production** | Main branch deployment | Live/staging site |
| **Preview** | Pull request/branch deployments | Feature testing |
| **Development** | `vercel dev` command | Local development with Vercel |

### Required Variables (if migrating)

#### Database Configuration
```bash
# Required for database connection
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional: Service role key (for admin operations)
VITE_SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Application Configuration
```bash
# Optional: Application settings
VITE_APP_NAME=School Management System - Test
VITE_APP_ENVIRONMENT=testing
VITE_DEBUG_MODE=true
```

### Setting Variables in Vercel Dashboard

#### Method 1: Web Interface
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Navigate to Settings → Environment Variables
4. Click "Add New"
5. Fill in:
   - **Key**: `VITE_SUPABASE_URL`
   - **Value**: `https://your-project-id.supabase.co`
   - **Environments**: Select all (Production, Preview, Development)
6. Repeat for each variable

#### Method 2: Vercel CLI
```bash
# Add environment variables via CLI
vercel env add VITE_SUPABASE_URL
# Enter value when prompted

vercel env add VITE_SUPABASE_ANON_KEY  
# Enter value when prompted

# List all environment variables
vercel env ls
```

### Environment Variable Security

#### Safe to Expose (Vite VITE_ prefix):
- ✅ `VITE_SUPABASE_URL` - Public URL
- ✅ `VITE_SUPABASE_ANON_KEY` - Anon key (protected by RLS)
- ✅ `VITE_APP_NAME` - Application name

#### Keep Secret (No VITE_ prefix):
- 🚨 `SUPABASE_SERVICE_KEY` - Full database access
- 🚨 `DATABASE_PASSWORD` - Direct database password
- 🚨 `ADMIN_SECRET` - Admin credentials

---

## Multi-Environment Setup

### Scenario: Different Databases Per Environment

#### Production Environment
```bash
VITE_SUPABASE_URL=https://production-project.supabase.co
VITE_SUPABASE_ANON_KEY=production-anon-key
VITE_APP_ENVIRONMENT=production
```

#### Preview Environment (for testing)
```bash
VITE_SUPABASE_URL=https://staging-project.supabase.co  
VITE_SUPABASE_ANON_KEY=staging-anon-key
VITE_APP_ENVIRONMENT=preview
```

#### Development Environment
```bash
VITE_SUPABASE_URL=https://dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=dev-anon-key
VITE_APP_ENVIRONMENT=development
```

---

## Vercel Secrets (Advanced)

### When to Use Secrets
For highly sensitive data that should never be logged or exposed.

#### Creating Secrets
```bash
# Create a secret (stored encrypted)
vercel secrets add supabase-service-key "actual-service-key-value"

# Use secret in environment variable
vercel env add SUPABASE_SERVICE_KEY @supabase-service-key
```

#### In `vercel.json`:
```json
{
  "build": {
    "env": {
      "VITE_SUPABASE_URL": "@supabase-url",
      "VITE_SUPABASE_ANON_KEY": "@supabase-anon-key"
    }
  }  
}
```

---

## Local Development Configuration

### Option 1: .env.local File
```bash
# .env.local (ignored by Git)
VITE_SUPABASE_URL=https://your-dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-dev-anon-key
```

### Option 2: Vercel Dev Command  
```bash
# Use Vercel's development environment
vercel dev

# This pulls environment variables from Vercel
# Uses "Development" environment variables
```

### Option 3: Multiple .env Files
```bash
# .env.development
VITE_SUPABASE_URL=https://dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=dev-anon-key

# .env.production  
VITE_SUPABASE_URL=https://prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=prod-anon-key
```

---

## Troubleshooting Environment Variables

### Common Issues

#### 1. Variables Not Loading
**Symptoms**: `import.meta.env.VITE_SUPABASE_URL` is undefined

**Solutions**:
```typescript
// Debug environment variables
console.log('Environment check:', {
  url: import.meta.env.VITE_SUPABASE_URL,
  hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
  mode: import.meta.env.MODE,
  allEnv: import.meta.env
});
```

#### 2. Build-Time vs Runtime
**Issue**: Variables available locally but not in Vercel

**Solution**: 
- Ensure variables are set in Vercel dashboard
- Check environment selection (Production/Preview/Development)
- Redeploy after adding variables

#### 3. VITE_ Prefix Required
**Issue**: Variables not accessible in browser

**Solution**:
```bash
# ❌ Wrong - not accessible in browser
SUPABASE_URL=https://project.supabase.co

# ✅ Correct - accessible in browser  
VITE_SUPABASE_URL=https://project.supabase.co
```

### Debug Commands

#### Check Variables in Vercel
```bash
# List all environment variables
vercel env ls

# Pull environment to local
vercel env pull .env.vercel

# Check specific variable
vercel env get VITE_SUPABASE_URL
```

#### Test in Browser Console
```javascript
// Run in deployed site's browser console
console.table(import.meta.env);
```

---

## Recommendations

### For Testing/Development:
- **Use hardcoded approach** - Simple and reliable
- **Create isolated Supabase project** 
- **Update source code directly**

### For Production/Team Use:
- **Migrate to environment variables** - Better security
- **Use different projects per environment**
- **Store secrets in Vercel secrets**

### Security Best Practices:
- ✅ Never commit real credentials to Git
- ✅ Use different projects for different environments  
- ✅ Regularly rotate API keys
- ✅ Monitor Supabase usage and access logs
- ✅ Use Vercel secrets for highly sensitive data

---

## Migration Checklist

**If migrating from hardcoded to environment variables:**

- [ ] Update `src/integrations/supabase/client.ts` to use `import.meta.env`
- [ ] Add fallback values for safety
- [ ] Set environment variables in Vercel dashboard
- [ ] Create `.env.local` for local development
- [ ] Test locally with environment variables
- [ ] Deploy and test on Vercel
- [ ] Verify no hardcoded credentials remain in code
- [ ] Update team documentation

Remember: **Environment variables are optional for this project**. The hardcoded approach works perfectly for testing and development scenarios.
