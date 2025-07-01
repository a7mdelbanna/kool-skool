
# Vercel Quick Deploy Checklist

Fast-track checklist for deploying School Management System to Vercel with isolated database.

## ⚠️ CRITICAL: Database Isolation First

**Before anything else:**
- [ ] Created NEW Supabase project (not production)
- [ ] Verified project URL is different from production
- [ ] Updated `src/integrations/supabase/client.ts` with isolated credentials
- [ ] Double-checked no production credentials in any file

---

## Pre-Deployment (15 minutes)

### 1. Database Setup
- [ ] New isolated Supabase project created
- [ ] All database migrations applied to isolated project
- [ ] Test data created (superadmin, school, admin users)
- [ ] Database connection tested locally

### 2. Code Preparation  
- [ ] Updated `src/integrations/supabase/client.ts`:
  ```typescript
  const supabaseUrl = "https://YOUR-ISOLATED-PROJECT-ID.supabase.co"
  const supabaseKey = "YOUR-ISOLATED-ANON-KEY"
  ```
- [ ] Local build tested: `npm run build && npm run preview`
- [ ] Changes committed and pushed to Git

---

## Vercel Deployment (10 minutes)

### 3. Create Vercel Project
- [ ] Go to [Vercel Dashboard](https://vercel.com/dashboard)
- [ ] Click "New Project"
- [ ] Import your Git repository
- [ ] Select main branch

### 4. Configure Settings
**Auto-detected (verify these are correct):**
- [ ] Framework: Vite
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `dist`
- [ ] Install Command: `npm install`

### 5. Deploy
- [ ] Click "Deploy"
- [ ] Wait for build completion (2-3 minutes)
- [ ] Note your Vercel URL: `https://your-project.vercel.app`

---

## Post-Deployment Testing (10 minutes)

### 6. Verify Deployment
- [ ] Site loads without errors
- [ ] All login pages accessible:
  - `/login` (admin/teacher)
  - `/student-login` 
  - `/superadmin-login`

### 7. Test Authentication
**Use your isolated database credentials:**
- [ ] Superadmin login works
- [ ] School admin login works
- [ ] Student login works (if created)

### 8. Verify Database Isolation
- [ ] Only test data visible (no production data)
- [ ] Can create/edit test records
- [ ] Database operations work correctly

### 9. Check Console for Errors
- [ ] No JavaScript errors in browser console
- [ ] No failed network requests
- [ ] Supabase connection working

---

## Optional: Custom Domain (20 minutes)

### 10. Add Custom Domain
- [ ] Project Settings → Domains in Vercel
- [ ] Add your domain: `app.yourcompany.com`
- [ ] Configure DNS records:
  ```
  Type: CNAME
  Name: app  
  Value: cname.vercel-dns.com
  ```

### 11. Update Supabase URLs
- [ ] Supabase Dashboard → Authentication → URL Configuration
- [ ] Site URL: `https://app.yourcompany.com`
- [ ] Redirect URLs: Add all login pages

---

## Success Criteria ✅

**Deployment is successful when:**
- [ ] ✅ Site loads at Vercel URL
- [ ] ✅ All login functions work
- [ ] ✅ Database operations work
- [ ] ✅ Only isolated test data visible
- [ ] ✅ No production data accessible
- [ ] ✅ No console errors
- [ ] ✅ SSL certificate active (automatic)

---

## Emergency Rollback

**If something goes wrong:**
1. **Pause deployment**: Vercel Dashboard → Project → Settings → General → "Pause Deployments"
2. **Revert to previous**: Deployments tab → Previous working deployment → "Promote to Production"
3. **Fix locally**: Make fixes, test locally, then redeploy

---

## Common Quick Fixes

### Build Failure:
```bash
npm install
npm run build  # Fix errors locally first
git add .
git commit -m "Fix build errors"
git push
```

### Wrong Database Connection:
```typescript
// src/integrations/supabase/client.ts - verify these are NOT production:
const supabaseUrl = "https://your-isolated-project-id.supabase.co" 
const supabaseKey = "your-isolated-anon-key"
```

### Authentication Issues:
```sql
-- Verify users exist in isolated database:
SELECT email, role FROM users WHERE role IN ('superadmin', 'admin');
```

---

## Next Steps After Deployment

1. **Share with team**: Send Vercel URL to team members
2. **Monitor usage**: Check Vercel analytics and Supabase usage
3. **Set up alerts**: Configure Vercel deployment notifications
4. **Document credentials**: Store isolated database credentials securely
5. **Plan updates**: Establish workflow for code and database updates

---

**Total Time: ~35-45 minutes for complete setup**

**Remember**: This is an isolated testing environment. Make sure no production data is ever accessible!
