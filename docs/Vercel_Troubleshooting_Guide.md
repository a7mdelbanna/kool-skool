
# Vercel Troubleshooting Guide

Comprehensive troubleshooting guide for common issues when deploying the School Management System on Vercel.

## Quick Diagnosis

### Is Your Issue Here?
- 🚨 [Site won't load / blank page](#site-wont-load)
- 🔐 [Login not working](#authentication-issues) 
- 💾 [Database connection failed](#database-connection-issues)
- 🏗️ [Build failures](#build-failures)
- 🌐 [Custom domain issues](#custom-domain-issues)
- ⚡ [Performance problems](#performance-issues)
- 🔒 [Security concerns](#security-issues)

---

## Site Won't Load

### Symptoms:
- Blank white page
- "This site can't be reached"
- Infinite loading spinner
- 404 for all routes

### Diagnosis Steps:

#### 1. Check Deployment Status
```bash
# Go to Vercel Dashboard → Deployments
# Look for:
✅ "Ready" status (successful)
❌ "Error" status (failed)  
🟡 "Building" status (in progress)
```

#### 2. Check Build Logs
1. Click on the deployment
2. View "Build Logs" tab
3. Look for errors in red

#### 3. Test Direct URL
```bash
# Try accessing your Vercel URL directly
https://your-project.vercel.app

# If custom domain not working, test Vercel URL first
```

### Common Causes & Solutions:

#### Build Output Directory Wrong
**Error**: "No index.html found"
```json
// Fix in Vercel dashboard: Settings → Build & Output
Output Directory: dist  ✅ (correct)
Output Directory: build ❌ (wrong for Vite)
```

#### Routing Issues (SPA)
**Error**: 404 on refresh or direct URLs
```json
// Add to vercel.json
{
  "rewrites": [
    {
      "source": "/((?!api).*)",
      "destination": "/index.html"
    }
  ]
}
```

#### Missing index.html
**Error**: Build succeeds but no files served
```bash
# Check build locally
npm run build
ls dist/  # Should see index.html

# If missing, check vite.config.ts
```

---

## Authentication Issues

### Symptoms:
- Login button does nothing
- "Invalid credentials" with correct password
- Redirect loops
- Authentication works locally but not on Vercel

### Diagnosis Steps:

#### 1. Check Browser Console
```javascript
// Open browser dev tools → Console
// Look for errors like:
"RPC function not found"
"Failed to fetch"
"CORS error"
```

#### 2. Check Network Tab
```bash
# Browser dev tools → Network tab
# Look for failed requests to:
- Supabase API calls
- RPC function calls
- 401/403 errors
```

#### 3. Verify Database Connection
```javascript
// Test in browser console on deployed site
console.log('Testing connection...');
console.log('Supabase URL:', 'check if this shows correct isolated URL');
```

### Common Causes & Solutions:

#### Wrong Database Credentials
**Most Common Issue**: Still using production or wrong credentials
```typescript
// Check src/integrations/supabase/client.ts
const supabaseUrl = "https://YOUR-ISOLATED-PROJECT.supabase.co"  // ✅
const supabaseUrl = "https://production-project.supabase.co"     // ❌

// Should be your isolated test project, not production!
```

#### Missing RPC Functions
**Error**: "RPC function 'verify_admin_login' not found"
```sql
-- Check in your isolated Supabase project SQL Editor:
SELECT proname FROM pg_proc WHERE proname LIKE '%login%';

-- Should return:
-- verify_admin_login
-- verify_student_login  
-- verify_superadmin_login
```

**Fix**: Run the database migrations in your isolated project.

#### User Records Missing
**Error**: Login fails with correct credentials
```sql
-- Check users exist in your isolated database:
SELECT email, role, school_id FROM users WHERE role IN ('admin', 'superadmin');

-- If empty, create test users:
INSERT INTO users (email, password_plain, role, first_name, last_name)
VALUES ('admin@test.com', 'password123', 'admin', 'Test', 'Admin');
```

#### CORS Issues
**Error**: "Access to fetch blocked by CORS policy"
- This usually indicates wrong Supabase URL
- Verify you're using correct isolated project URL
- Check Supabase project is active (not paused)

---

## Database Connection Issues

### Symptoms:
- "Failed to establish connection" 
- Timeouts on database operations
- Empty data loads
- Network errors in browser console

### Diagnosis Steps:

#### 1. Verify Project Status
```bash
# Go to your isolated Supabase project dashboard
# Check project status:
✅ Active
❌ Paused  
❌ Read-only mode
```

#### 2. Test Connection Manually
```javascript  
// In browser console on deployed site:
fetch('https://YOUR-ISOLATED-PROJECT.supabase.co/rest/v1/', {
  headers: {
    'apikey': 'YOUR-ISOLATED-ANON-KEY',
    'Authorization': 'Bearer YOUR-ISOLATED-ANON-KEY'
  }
})
.then(r => r.json())
.then(d => console.log('Connection test:', d));
```

#### 3. Check Supabase Logs
```bash
# In Supabase Dashboard → Logs
# Look for:
- Connection attempts
- Failed authentication  
- Rate limit errors
```

### Common Causes & Solutions:

#### Project Paused/Inactive
**Error**: Connection timeouts
**Solution**: 
1. Go to Supabase Dashboard
2. Check project status
3. Unpause if needed (may take few minutes)

#### Wrong Project Credentials
**Error**: 401 Unauthorized
```typescript
// Double-check these match your isolated project:
const supabaseUrl = "https://YOUR-PROJECT-ID.supabase.co"
const supabaseKey = "eyJ...YOUR-ANON-KEY..."

// Get correct values from Supabase Dashboard → Settings → API
```

#### Rate Limiting
**Error**: 429 Too Many Requests
**Solution**:
- Wait a few minutes
- Optimize queries to reduce API calls
- Consider upgrading Supabase plan

#### Network/Firewall Issues
**Error**: Connection refused
**Solution**:
- Test from different network
- Check if company firewall blocks Supabase
- Try mobile hotspot to isolate network issues

---

## Build Failures

### Symptoms:
- Deployment fails during build phase
- Red "Error" status in Vercel deployments
- Build logs show compilation errors

### Common Build Errors:

#### TypeScript Compilation Errors
**Error**: "Type 'X' is not assignable to type 'Y'"
```bash
# Fix locally first:
npm run build
# Fix all TypeScript errors
# Then push and redeploy
```

#### Missing Dependencies
**Error**: "Module 'package-name' not found"
```bash
# Fix: Install missing package
npm install package-name
git add package-lock.json
git commit -m "Add missing dependency"
git push
```

#### Build Command Issues
**Error**: "Build command failed"
```json
// Check these settings in Vercel dashboard:
Build Command: npm run build     ✅
Build Command: yarn build        ❌ (if using npm)
Build Command: npm start         ❌ (wrong command)
```

#### Memory Issues
**Error**: "JavaScript heap out of memory"
```json
// Fix: Update package.json
{
  "scripts": {
    "build": "NODE_OPTIONS='--max-old-space-size=4096' vite build"
  }
}
```

#### Import Path Issues
**Error**: "Cannot resolve module"
```typescript
// Fix: Use absolute imports properly
import { Button } from "@/components/ui/button"  ✅
import { Button } from "../../components/ui/button"  ❌ (can break on Vercel)
```

---

## Custom Domain Issues

### Symptoms:
- Domain not accessible
- SSL certificate errors  
- "This connection is not private"
- Domain shows default Vercel page

### Diagnosis Steps:

#### 1. Check DNS Propagation
```bash
# Use online tools:
# - https://dnschecker.org
# - https://whatsmydns.net

# Check if your domain points to Vercel
nslookup your-domain.com
```

#### 2. Verify DNS Records
```bash
# For subdomain (app.yourdomain.com):
Type: CNAME
Name: app  
Value: cname.vercel-dns.com

# For apex domain (yourdomain.com):
Type: A
Name: @
Value: 76.76.19.61
```

#### 3. Check Vercel Domain Status
```bash
# In Vercel Dashboard → Settings → Domains
# Look for:
✅ "Valid Configuration" 
❌ "Invalid Configuration"
🟡 "Pending Verification"
```

### Common Solutions:

#### DNS Propagation Time
**Issue**: Domain not accessible immediately
**Solution**: Wait 24-48 hours for full DNS propagation

#### Wrong DNS Records
**Issue**: Domain points to wrong location
**Solution**: Double-check DNS records match Vercel requirements exactly

#### SSL Certificate Issues
**Issue**: "Not secure" or certificate errors
**Solution**: 
- Vercel provides automatic SSL
- Wait a few hours after domain setup
- Check domain is properly verified in Vercel

#### Domain Already in Use
**Issue**: "Domain is already in use"
**Solution**:
- Remove domain from other Vercel projects
- Check domain isn't configured elsewhere
- Contact Vercel support if persistent

---

## Performance Issues

### Symptoms:
- Slow page loads
- High Time to First Byte (TTFB)
- JavaScript bundle too large
- Database queries timing out

### Diagnosis Tools:

#### 1. Vercel Analytics
```bash
# Enable in Vercel Dashboard → Analytics
# Monitor:
- Page load times
- Core Web Vitals
- User engagement
```

#### 2. Browser Performance
```bash
# Browser Dev Tools → Performance tab
# Look for:
- Large JavaScript bundles
- Slow network requests
- Render blocking resources
```

### Common Optimizations:

#### Bundle Size Optimization
```bash
# Analyze bundle size
npm run build
# Check dist/ folder size

# Use dynamic imports for large components
const HeavyComponent = lazy(() => import('./HeavyComponent'));
```

#### Database Query Optimization
```typescript
// Avoid N+1 queries
// Instead of:
students.forEach(async student => {
  const subscriptions = await getSubscriptions(student.id);
});

// Use single query with joins
const studentsWithSubscriptions = await getStudentsWithSubscriptions();
```

#### Image Optimization
```bash
# Optimize images before including
# Use WebP format where possible
# Implement lazy loading for images
```

---

## Security Issues

### Symptoms:
- Production data accessible
- Unauthorized access possible
- API keys exposed in browser
- Cross-origin errors

### Security Checklist:

#### 1. Database Isolation Verification
```sql
-- Run in your deployed app's database:
SELECT 
  'SECURITY CHECK' as test,
  count(*) as total_schools,
  string_agg(name, ', ') as school_names
FROM schools;

-- Should show only test data, no production schools
```

#### 2. Credential Verification
```javascript
// Check in browser console:
console.log('Database URL check:', 
  window.location.href.includes('your-isolated-project-id') ? 
  'SAFE - Using isolated database' : 
  '🚨 DANGER - Wrong database'
);
```

#### 3. API Key Security
```typescript
// Verify only anon keys are exposed:
// ✅ Safe to expose:
const supabaseKey = "eyJ...anon-key..."  // Anon key is safe

// 🚨 Never expose:  
const serviceKey = "eyJ...service-role-key..."  // Full access key
```

### Security Fixes:

#### Remove Production Credentials
```bash
# Search entire codebase for production references:
grep -r "production-project-id" .
grep -r "live-database" .
grep -r "prod-" .

# Remove any found references
```

#### Enable HTTPS Only
```json
// Add to vercel.json:
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains"
        }
      ]
    }
  ]
}
```

---

## Emergency Procedures

### Complete Site Down
1. **Check Vercel Status**: https://vercel-status.com
2. **Rollback Deployment**: 
   ```bash
   # Vercel Dashboard → Deployments → Previous working deployment → "Promote to Production"
   ```
3. **Pause New Deployments**:
   ```bash
   # Settings → General → "Pause Deployments"
   ```

### Database Emergency
1. **Verify Database Isolation**: Check you're not connected to production
2. **Contact Team**: Alert team members immediately  
3. **Document Issue**: Note exact error messages and steps taken

### Security Breach Suspected
1. **Change Credentials**: Generate new Supabase keys immediately
2. **Audit Access**: Check Supabase logs for unauthorized access
3. **Update Deployment**: Deploy with new credentials
4. **Review Code**: Ensure no sensitive data exposed

---

## Getting Help

### Vercel Support
- **Community**: https://github.com/vercel/vercel/discussions
- **Documentation**: https://vercel.com/docs
- **Status Page**: https://vercel-status.com

### Supabase Support  
- **Documentation**: https://supabase.com/docs
- **Community**: https://github.com/supabase/supabase/discussions
- **Status Page**: https://status.supabase.com

### Debug Information to Collect
When asking for help, provide:
1. **Vercel deployment URL**
2. **Build logs** (if build failing)
3. **Browser console errors** (screenshot)
4. **Network tab errors** (screenshot)
5. **Exact error messages**
6. **Steps to reproduce**

---

Remember: **Always verify database isolation first** - most issues stem from wrong database connections or missing setup steps.
