
# Database Setup Guide

This guide provides step-by-step instructions for setting up an isolated database for the School Management System.

## Table of Contents

1. [Overview](#overview)
2. [Supabase Project Setup](#supabase-project-setup)
3. [Database Schema Creation](#database-schema-creation)
4. [Initial Data Setup](#initial-data-setup)
5. [RPC Functions](#rpc-functions)
6. [Verification Steps](#verification-steps)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The School Management System uses PostgreSQL via Supabase with:
- 20+ interconnected tables
- Complex Row Level Security (RLS) policies
- Custom RPC functions for business logic
- Extensive foreign key relationships

---

## Supabase Project Setup

### 1. Create New Supabase Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose organization and name your project
4. Set a strong database password
5. Select region closest to your users
6. Wait for project creation (2-3 minutes)

### 2. Get Project Credentials
After creation, note these from Settings > API:
- **Project URL**: `https://your-project-id.supabase.co`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Service Role Key**: (for admin operations)

### 3. Update Application Configuration
Update `src/integrations/supabase/client.ts`:
```typescript
const supabaseUrl = "https://YOUR-PROJECT-ID.supabase.co"
const supabaseKey = "YOUR-ANON-KEY-HERE"
```

---

## Database Schema Creation

### Option 1: Using SQL Files (Recommended)
Execute the SQL files in `docs/sql/` in this order:

1. **Core Tables** (in any order):
   ```sql
   -- Run these first
   docs/sql/licenses.sql
   docs/sql/users.sql
   docs/sql/schools.sql (depends on licenses)
   docs/sql/currencies.sql
   docs/sql/courses.sql
   docs/sql/students.sql (depends on users, schools)
   ```

2. **Supporting Tables**:
   ```sql
   docs/sql/contact_types.sql
   docs/sql/contacts.sql
   docs/sql/student_levels.sql
   docs/sql/accounts.sql
   docs/sql/transaction_categories.sql
   docs/sql/transaction_tags.sql
   ```

3. **Complex Tables**:
   ```sql
   docs/sql/groups.sql
   docs/sql/group_students.sql
   docs/sql/subscriptions.sql
   docs/sql/lesson_sessions.sql
   docs/sql/transactions.sql
   docs/sql/transaction_tags_junction.sql
   ```

### Option 2: Using Migrations
If you have Supabase CLI installed:

```bash
# Initialize Supabase in your project
supabase init

# Link to your project
supabase link --project-ref YOUR-PROJECT-ID

# Run all migrations
supabase db push
```

### Option 3: Manual Table Creation
Use the Supabase SQL Editor to run each table creation script manually.

---

## Initial Data Setup

### 1. Create Super Admin User
```sql
-- Insert superadmin user
INSERT INTO public.users (
    email, 
    password_plain, 
    role, 
    first_name, 
    last_name,
    timezone
) VALUES (
    'superadmin@yourdomain.com',
    'your-secure-password',
    'superadmin',
    'Super',
    'Admin',
    'UTC'
);
```

### 2. Create Initial License
```sql
-- Create a license for testing
INSERT INTO public.licenses (
    license_key,
    duration_days,
    expires_at,
    is_active
) VALUES (
    'TEST-LICENSE-KEY-12345',
    365,
    NOW() + INTERVAL '365 days',
    true
);
```

### 3. Create Test School
```sql
-- Create initial school
INSERT INTO public.schools (
    name,
    timezone,
    license_id,
    contact_info
) VALUES (
    'Test Academy',
    'America/New_York',
    (SELECT id FROM public.licenses WHERE license_key = 'TEST-LICENSE-KEY-12345'),
    '{"phone": "+1-555-0123", "email": "contact@testacademy.com", "address": "123 Education St, Learning City, LC 12345"}'::jsonb
);
```

### 4. Create Default Currency
```sql
-- Create USD currency
INSERT INTO public.currencies (
    school_id,
    code,
    name,
    symbol,
    is_default,
    exchange_rate
) VALUES (
    (SELECT id FROM public.schools WHERE name = 'Test Academy'),
    'USD',
    'US Dollar',
    '$',
    true,
    1.0
);
```

### 5. Create School Admin User
```sql
-- Create school admin
INSERT INTO public.users (
    email,
    password_plain,
    role,
    first_name,
    last_name,
    school_id,
    timezone
) VALUES (
    'admin@testacademy.com',
    'admin-password',
    'admin',
    'School',
    'Administrator',
    (SELECT id FROM public.schools WHERE name = 'Test Academy'),
    'America/New_York'
);
```

### 6. Create Sample Course
```sql
-- Create a sample course
INSERT INTO public.courses (
    school_id,
    name,
    lesson_type
) VALUES (
    (SELECT id FROM public.schools WHERE name = 'Test Academy'),
    'Mathematics',
    'individual'
);
```

### 7. Create Default Account
```sql
-- Create default cash account
INSERT INTO public.accounts (
    school_id,
    name,
    type,
    currency_id,
    color
) VALUES (
    (SELECT id FROM public.schools WHERE name = 'Test Academy'),
    'Cash Account',
    'cash',
    (SELECT id FROM public.currencies WHERE code = 'USD' AND school_id = (SELECT id FROM public.schools WHERE name = 'Test Academy')),
    '#22C55E'
);
```

---

## RPC Functions

The system relies on several custom RPC functions. These should be created automatically if you run the migrations, but here are the key ones:

### Authentication Functions
```sql
-- Function to verify admin login
CREATE OR REPLACE FUNCTION verify_admin_login(p_email TEXT, p_password TEXT)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    user_id UUID,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    role TEXT,
    school_id UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE WHEN u.id IS NOT NULL THEN true ELSE false END,
        CASE WHEN u.id IS NOT NULL THEN 'Login successful' ELSE 'Invalid credentials' END,
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.role,
        u.school_id
    FROM public.users u
    WHERE u.email = p_email 
    AND u.password_plain = p_password 
    AND u.role IN ('admin', 'teacher');
END;
$$;
```

### Session Generation Function
```sql
-- Function to generate lesson sessions (simplified version)
CREATE OR REPLACE FUNCTION generate_lesson_sessions_v2(
    p_subscription_id UUID,
    p_student_id UUID,
    p_session_count INTEGER,
    p_schedule JSONB,
    p_start_date DATE,
    p_duration_minutes INTEGER DEFAULT 60,
    p_cost NUMERIC DEFAULT 0
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    sessions_created INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sessions_created INTEGER := 0;
    v_schedule_item JSONB;
    v_current_date DATE;
    v_session_index INTEGER := 1;
BEGIN
    -- Basic session generation logic
    -- (Full implementation would be much more complex)
    
    FOR v_session_index IN 1..p_session_count LOOP
        INSERT INTO public.lesson_sessions (
            subscription_id,
            student_id,
            scheduled_date,
            duration_minutes,
            cost,
            status,
            index_in_sub
        ) VALUES (
            p_subscription_id,
            p_student_id,
            p_start_date + (v_session_index * INTERVAL '7 days'),
            p_duration_minutes,
            p_cost,
            'scheduled',
            v_session_index
        );
        
        v_sessions_created := v_sessions_created + 1;
    END LOOP;
    
    RETURN QUERY SELECT true, 'Sessions created successfully', v_sessions_created;
END;
$$;
```

---

## Verification Steps

### 1. Test Database Connection
```sql
-- Simple connection test
SELECT 'Database connected successfully' as status;
```

### 2. Verify Tables Created
```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Expected tables:
- accounts, contacts, contact_types, courses, currencies
- groups, group_students, lesson_sessions, licenses
- schools, students, student_levels, subscriptions
- transactions, transaction_categories, transaction_tags, transaction_tags_junction
- users

### 3. Test Authentication
```sql
-- Test superadmin login
SELECT * FROM verify_superadmin_login('superadmin@yourdomain.com', 'your-secure-password');

-- Test school admin login  
SELECT * FROM verify_admin_login('admin@testacademy.com', 'admin-password');
```

### 4. Verify RLS Policies
```sql
-- Check RLS is enabled on key tables
SELECT 
    schemaname, 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;
```

### 5. Test Basic Data Access
```sql
-- Test school data access
SELECT s.name, u.first_name, u.last_name 
FROM schools s
JOIN users u ON u.school_id = s.id
WHERE u.role = 'admin';
```

---

## Troubleshooting

### Common Issues

#### 1. RLS Policy Errors
**Problem**: "new row violates row-level security policy"
**Solution**: 
- Ensure user_id columns are being set correctly
- Check that RLS policies allow the operation
- Some tables may need RLS temporarily disabled

#### 2. Foreign Key Constraint Errors
**Problem**: Foreign key violations during data insertion
**Solution**:
- Create parent records first (schools before users, users before students)
- Check that referenced IDs exist
- Follow the dependency order in table creation

#### 3. Function Not Found Errors
**Problem**: RPC functions not available
**Solution**:
- Ensure all migration files have been run
- Check function exists: `SELECT * FROM pg_proc WHERE proname = 'verify_admin_login';`
- Re-run function creation scripts

#### 4. Authentication Issues
**Problem**: Login functions return no results
**Solution**:
- Verify user records exist in database
- Check password_plain column matches input
- Ensure role column has correct values

#### 5. Timezone Issues
**Problem**: Dates/times appear incorrect
**Solution**:
- Set consistent timezone in school settings
- Use timezone-aware date functions
- Consider user's local timezone for display

### Debug Queries

```sql
-- Check user data
SELECT id, email, role, school_id, first_name, last_name FROM users;

-- Check school setup
SELECT s.name, s.timezone, l.license_key, l.is_active 
FROM schools s 
LEFT JOIN licenses l ON s.license_id = l.id;

-- Check RPC functions
SELECT proname, proargtypes 
FROM pg_proc 
WHERE proname LIKE '%login%' OR proname LIKE '%session%';

-- Check table relationships
SELECT 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public'
ORDER BY tc.table_name;
```

---

## Production Considerations

### Security
- **Change default passwords** for all initial users
- **Implement password hashing** (currently stored as plain text)
- **Review RLS policies** for your specific security requirements
- **Use service role key carefully** - it bypasses RLS

### Performance
- **Add indexes** for frequently queried columns
- **Monitor query performance** with large datasets
- **Consider partitioning** for lesson_sessions table if you have many sessions

### Backup
- **Set up automated backups** in Supabase dashboard
- **Test backup restoration** process
- **Document recovery procedures**

### Monitoring
- **Set up alerts** for database errors
- **Monitor connection counts** and query performance
- **Track RLS policy violations**

---

This completes the database setup process. Your isolated environment should now be ready for development work.
