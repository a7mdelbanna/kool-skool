
# Quick Start Checklist

This checklist will get you from zero to running isolated School Management System in minimal time.

## Prerequisites Checklist
- [ ] Node.js 18+ installed
- [ ] npm or yarn package manager
- [ ] Supabase account created
- [ ] Basic understanding of React and PostgreSQL

---

## Phase 1: Project Setup (15 minutes)

### 1. Repository Setup
- [ ] Clone the repository
- [ ] Run `npm install` 
- [ ] Verify project structure matches expected layout

### 2. Create New Supabase Project
- [ ] Go to [Supabase Dashboard](https://supabase.com/dashboard)
- [ ] Click "New Project"
- [ ] Choose organization and project name
- [ ] Set database password (save it!)
- [ ] Select region
- [ ] Wait for project creation (2-3 minutes)

### 3. Get Supabase Credentials
- [ ] Go to Settings > API in your new project
- [ ] Copy **Project URL**: `https://your-project-id.supabase.co`
- [ ] Copy **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- [ ] Note **Project ID** from URL or Settings > General

### 4. Update Project Configuration
- [ ] Edit `src/integrations/supabase/client.ts`
- [ ] Replace `supabaseUrl` with your Project URL
- [ ] Replace `supabaseKey` with your Anon Key
- [ ] Edit `supabase/config.toml`
- [ ] Replace `project_id` with your Project ID

---

## Phase 2: Database Setup (20 minutes)

### Option A: Using SQL Files (Recommended)
- [ ] Go to your Supabase project's SQL Editor
- [ ] Run SQL files from `docs/sql/` in this order:
  1. [ ] `licenses.sql`
  2. [ ] `users.sql` 
  3. [ ] Copy and run all other .sql files (order doesn't matter for the rest)

### Option B: Using Migrations (If you have Supabase CLI)
- [ ] Install Supabase CLI: `npm install -g supabase`
- [ ] Run `supabase init` in project folder
- [ ] Run `supabase link --project-ref YOUR-PROJECT-ID`
- [ ] Run `supabase db push`

### Verify Database Setup
- [ ] Run in SQL Editor: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`
- [ ] Should see 15+ tables including: users, schools, students, courses, etc.

---

## Phase 3: Initial Data Creation (10 minutes)

### Create Super Admin (Required)
Run this in SQL Editor:
```sql
INSERT INTO public.users (
    email, 
    password_plain, 
    role, 
    first_name, 
    last_name
) VALUES (
    'superadmin@yourcompany.com',
    'your-secure-password',
    'superadmin',
    'Super',
    'Admin'
);
```
- [ ] Update email to your email
- [ ] Update password to something secure
- [ ] Run the query

### Create Test License
```sql
INSERT INTO public.licenses (
    license_key,
    duration_days,
    expires_at,
    is_active
) VALUES (
    'TEST-LICENSE-2025',
    365,
    NOW() + INTERVAL '365 days',
    true
);
```
- [ ] Run this query

### Create Test School
```sql
INSERT INTO public.schools (
    name,
    timezone,
    license_id
) VALUES (
    'Your Test School',
    'America/New_York',
    (SELECT id FROM public.licenses WHERE license_key = 'TEST-LICENSE-2025')
);
```
- [ ] Update school name as desired
- [ ] Update timezone to your timezone
- [ ] Run the query

### Create School Admin
```sql
INSERT INTO public.users (
    email,
    password_plain,
    role,
    first_name,
    last_name,
    school_id
) VALUES (
    'admin@yourschool.com',
    'admin-password',
    'admin',
    'School',
    'Administrator',
    (SELECT id FROM public.schools WHERE name = 'Your Test School')
);
```
- [ ] Update email and password
- [ ] Update school name to match above
- [ ] Run the query

### Create Default Currency
```sql
INSERT INTO public.currencies (
    school_id,
    code,
    name,
    symbol,
    is_default
) VALUES (
    (SELECT id FROM public.schools WHERE name = 'Your Test School'),
    'USD',
    'US Dollar',
    '$',
    true
);
```
- [ ] Update school name to match
- [ ] Change currency if needed
- [ ] Run the query

---

## Phase 4: Test the Application (5 minutes)

### Start Development Server
- [ ] Run `npm run dev`
- [ ] Open `http://localhost:3000` in browser
- [ ] Should see login page

### Test Super Admin Login
- [ ] Go to `http://localhost:3000/superadmin-login`
- [ ] Use superadmin email/password you created
- [ ] Should login successfully and see super admin dashboard

### Test School Admin Login  
- [ ] Go to `http://localhost:3000/login`
- [ ] Use school admin email/password you created
- [ ] Should login successfully and see main dashboard

### Basic Functionality Test
- [ ] Navigate to Students page
- [ ] Navigate to Calendar page
- [ ] Navigate to Settings page
- [ ] All pages should load without errors

---

## Phase 5: Create Sample Data (Optional - 10 minutes)

### Create a Test Course
```sql
INSERT INTO public.courses (
    school_id,
    name,
    lesson_type
) VALUES (
    (SELECT id FROM public.schools WHERE name = 'Your Test School'),
    'Mathematics',
    'individual'
);
```

### Create a Test Teacher
```sql
INSERT INTO public.users (
    email,
    password_plain,
    role,
    first_name,
    last_name,
    school_id
) VALUES (
    'teacher@yourschool.com',
    'teacher-password',
    'teacher',
    'Test',
    'Teacher',
    (SELECT id FROM public.schools WHERE name = 'Your Test School')
);
```

### Create a Test Student
```sql
-- First create user account
INSERT INTO public.users (
    email,
    password_plain,
    role,
    first_name,
    last_name,
    school_id
) VALUES (
    'student@test.com',
    'student-password',
    'student',
    'Test',
    'Student',
    (SELECT id FROM public.schools WHERE name = 'Your Test School')
);

-- Then create student profile
INSERT INTO public.students (
    school_id,
    user_id,
    course_id,
    age_group,
    level
) VALUES (
    (SELECT id FROM public.schools WHERE name = 'Your Test School'),
    (SELECT id FROM public.users WHERE email = 'student@test.com'),
    (SELECT id FROM public.courses WHERE name = 'Mathematics'),
    'teenager',
    'beginner'
);
```

### Create Default Account
```sql
INSERT INTO public.accounts (
    school_id,
    name,
    type,
    currency_id
) VALUES (
    (SELECT id FROM public.schools WHERE name = 'Your Test School'),
    'Cash Account',
    'cash',
    (SELECT id FROM public.currencies WHERE code = 'USD' AND school_id = (SELECT id FROM public.schools WHERE name = 'Your Test School'))
);
```

---

## Troubleshooting Quick Fixes

### "Supabase connection failed"
- [ ] Verify Project URL and Anon Key are correct
- [ ] Check project is not paused in Supabase dashboard
- [ ] Test connection with simple query in SQL Editor

### "RPC function not found"
- [ ] Ensure all SQL files were run successfully
- [ ] Check function exists: `SELECT proname FROM pg_proc WHERE proname LIKE '%login%';`
- [ ] Rerun the problematic SQL file

### "Login failed" with correct credentials
- [ ] Verify user record exists: `SELECT * FROM users WHERE email = 'your@email.com';`
- [ ] Check password_plain matches exactly (case sensitive)
- [ ] Ensure role column has correct value

### Dashboard shows fake data
- [ ] This is normal! Dashboard uses sample data
- [ ] Real data will show in Students, Calendar, etc. pages
- [ ] See `src/pages/Index.tsx` for sample data logic

### Pages won't load / routing issues
- [ ] Check browser console for JavaScript errors
- [ ] Verify user is properly logged in (check localStorage)
- [ ] Clear browser cache and localStorage

---

## Success Criteria

✅ **You have successfully set up the isolated system when:**

- [ ] You can log in as super admin and see the super admin dashboard
- [ ] You can log in as school admin and see the main dashboard  
- [ ] You can navigate to all main pages (Students, Calendar, Settings)
- [ ] You can create a new student record
- [ ] No console errors in browser developer tools
- [ ] Database contains your test data (not production data)

---

## Next Steps

After completing this checklist:

1. **Read the detailed guides**:
   - `Developer_Onboarding.md` - Complete system overview
   - `Authentication_Flow_Guide.md` - Understand the custom auth
   - `Development_Gotchas.md` - Avoid common pitfalls

2. **Start development**:
   - Make small UI changes first
   - Test authentication flows thoroughly
   - Understand data relationships before major changes

3. **Security considerations**:
   - Change all default passwords
   - Consider implementing password hashing
   - Review RLS policies for your use case

**Estimated Total Time: 45-60 minutes**

You now have a completely isolated copy of the School Management System running with your own database and no access to production data!
