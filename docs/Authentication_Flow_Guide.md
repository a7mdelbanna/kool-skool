# Authentication Flow Guide

This document explains the custom authentication system used in the School Management System. **This system does NOT use Supabase Auth** - it's entirely custom-built.

## Table of Contents

1. [System Overview](#system-overview)
2. [User Roles and Access](#user-roles-and-access)
3. [Login Flow](#login-flow)
4. [Session Management](#session-management)
5. [Route Protection](#route-protection)
6. [Database Schema](#database-schema)
7. [Implementation Details](#implementation-details)
8. [Security Considerations](#security-considerations)
9. [Common Issues](#common-issues)

---

## System Overview

### Architecture
- **Frontend**: React with Context API for state management
- **Backend**: Supabase RPC functions for authentication logic
- **Storage**: localStorage for session persistence
- **Database**: PostgreSQL `users` table for credential storage

### Key Components
- `UserContext` - Global user state management
- Custom login pages for each user type
- RPC functions for credential verification
- localStorage-based session persistence

---

## User Roles and Access

The system supports four distinct user roles:

### 1. SuperAdmin
- **Purpose**: System-wide administration and license management
- **Access**: All schools and system settings
- **Login**: `/superadmin-login`
- **Characteristics**:
  - `school_id` is NULL
  - Can access license management
  - Cross-school data access

### 2. Admin (School Administrator)
- **Purpose**: Full school management
- **Access**: All data within their assigned school
- **Login**: `/login`
- **Characteristics**:
  - Assigned to specific school via `school_id`
  - Can manage students, teachers, courses, finances
  - Cannot access other schools' data

### 3. Teacher
- **Purpose**: Limited access to assigned students and classes
- **Access**: Students and groups they're assigned to
- **Login**: `/login`
- **Characteristics**:
  - Assigned to specific school via `school_id`
  - Limited data access through RLS policies
  - Can view/manage their students and sessions

### 4. Student
- **Purpose**: Access to personal learning data
- **Access**: Only their own profile, sessions, and payments
- **Login**: `/student-login`
- **Characteristics**:
  - Linked to school and potentially a teacher
  - Self-service access to personal data
  - Cannot see other students' information

---

## Login Flow

### 1. User Types and Entry Points

#### Admin/Teacher Login (`/login`)
```typescript
// Login.tsx
const handleLogin = async (e: React.FormEvent) => {
  const { data: loginResults, error } = await supabase
    .rpc('verify_admin_login', {
      p_email: email.toLowerCase().trim(),
      p_password: password
    });
  
  // Handle response and set user context
};
```

#### Student Login (`/student-login`)
```typescript
// StudentLogin.tsx
const handleLogin = async (e: React.FormEvent) => {
  const { data: loginResults, error } = await supabase
    .rpc('verify_student_login', {
      p_email: email.toLowerCase().trim(),
      p_password: password
    });
};
```

#### Super Admin Login (`/superadmin-login`)
```typescript
// SuperAdminLogin.tsx
const handleLogin = async (e: React.FormEvent) => {
  const { data: loginResults, error } = await supabase
    .rpc('verify_superadmin_login', {
      p_email: email.toLowerCase().trim(),
      p_password: password
    });
};
```

### 2. RPC Function Verification
Each login type calls a corresponding RPC function:

#### `verify_admin_login(p_email, p_password)`
- Validates credentials against `users` table
- Checks role is 'admin' or 'teacher'
- Returns user data if successful
- Used by both admins and teachers

#### `verify_student_login(p_email, p_password)`
- Validates student credentials
- Checks role is 'student'
- Returns student profile data
- Includes school information

#### `verify_superadmin_login(p_email, p_password)`
- Validates superadmin credentials
- Checks role is 'superadmin'
- Returns minimal user data
- No school association required

### 3. Successful Login Process
When login succeeds:

1. **Extract User Data**: RPC function returns user profile
2. **Create Session Object**: Format user data for application
3. **Store in localStorage**: Persist session across browser sessions
4. **Update Context**: Set global user state
5. **Redirect**: Navigate to appropriate dashboard
6. **Dispatch Event**: Trigger storage event for cross-tab sync

```typescript
// Common success handling pattern
const userData = {
  id: result.user_id,
  firstName: result.first_name,
  lastName: result.last_name,
  email: result.email,
  role: result.role,
  schoolId: result.school_id
};

localStorage.setItem('user', JSON.stringify(userData));
setUser(userData);
window.dispatchEvent(new Event('storage'));
navigate('/dashboard-route');
```

---

## Session Management

### localStorage Structure
```json
{
  "id": "uuid-string",
  "firstName": "User",
  "lastName": "Name", 
  "email": "user@domain.com",
  "role": "admin|teacher|student|superadmin",
  "schoolId": "uuid-string|null"
}
```

### UserContext Provider
```typescript
// App.tsx
interface User {
  id: string;
  firstName: string;
  lastName: string;
  name?: string;
  email?: string;
  role: string;
  schoolId: string;
  avatar?: string;
  timezone?: string;
}

export const UserContext = createContext<UserContextProps>({
  user: null,
  setUser: () => {},
});
```

### Session Persistence
```typescript
// App.tsx initialization
useEffect(() => {
  const storedUser = localStorage.getItem('user');
  if (storedUser) {
    try {
      setUser(JSON.parse(storedUser));
    } catch (error) {
      localStorage.removeItem('user');
    }
  }
  
  // Cross-tab synchronization
  const handleStorage = () => {
    const storedUser = localStorage.getItem('user');
    setUser(storedUser ? JSON.parse(storedUser) : null);
  };
  
  window.addEventListener('storage', handleStorage);
  return () => window.removeEventListener('storage', handleStorage);
}, []);
```

### Logout Process
```typescript
const logout = () => {
  localStorage.removeItem('user');
  setUser(null);
  window.dispatchEvent(new Event('storage'));
  navigate('/login');
};
```

---

## Route Protection

### Main Route Logic
```typescript
// App.tsx route structure
<Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/student-login" element={<StudentLogin />} />
  <Route path="/superadmin-login" element={<SuperAdminLogin />} />
  
  {/* Student Dashboard */}
  <Route 
    path="/student-dashboard" 
    element={
      user && user.role === 'student' ? (
        <StudentDashboard />
      ) : (
        <Navigate to="/student-login" replace />
      )
    } 
  />
  
  {/* Admin/Teacher/SuperAdmin Routes */}
  <Route
    path="/*"
    element={
      user && (user.role === 'admin' || user.role === 'teacher' || user.role === 'superadmin') ? (
        <PaymentProvider>
          <MainLayout />
        </PaymentProvider>
      ) : (
        <Navigate to="/login" replace />
      )
    }
  />
</Routes>
```

### Role-Based Redirects
- **No user**: Redirect to `/login`
- **Student role**: Access to `/student-dashboard` only
- **Admin/Teacher/SuperAdmin**: Access to main application via `MainLayout`
- **Wrong role for route**: Redirect to appropriate login page

### Layout-Level Protection
```typescript
// MainLayout.tsx
const MainLayout = () => {
  const { user } = useContext(UserContext);
  
  // Additional role checks can be implemented here
  // Different sidebar items based on role
  // Role-specific component rendering
};
```

---

## Database Schema

### Users Table Structure
```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,           -- Currently unused
  password_plain TEXT,          -- 🚨 Security Issue: Plain text storage
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student', 'superadmin')),
  school_id UUID REFERENCES public.schools(id),  -- NULL for superadmin
  timezone TEXT DEFAULT 'UTC',
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Key Constraints
- **Email uniqueness**: Prevents duplicate accounts
- **Role validation**: Ensures valid role values
- **School association**: Links users to schools (except superadmin)
- **Self-referential**: Tracks who created each user

### RLS Policies
```sql
-- Users can view their own profile and school users
CREATE POLICY "Users can view own profile and school users" 
ON public.users FOR SELECT 
USING (
  id = auth.uid() OR 
  school_id IN (
    SELECT school_id FROM public.users WHERE id = auth.uid()
  )
);
```

**Note**: Since this system doesn't use Supabase Auth, `auth.uid()` returns NULL, making some RLS policies ineffective.

---

## Implementation Details

### RPC Function Examples

#### Admin/Teacher Login Function
```sql
CREATE OR REPLACE FUNCTION verify_admin_login(
  p_email TEXT, 
  p_password TEXT
)
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

#### Student Login Function
```sql
CREATE OR REPLACE FUNCTION verify_student_login(
  p_email TEXT, 
  p_password TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  user_id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  role TEXT,
  school_id UUID,
  school_name TEXT
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
    u.school_id,
    s.name as school_name
  FROM public.users u
  LEFT JOIN public.schools s ON u.school_id = s.id
  WHERE u.email = p_email 
  AND u.password_plain = p_password 
  AND u.role = 'student';
END;
$$;
```

### Error Handling Patterns
```typescript
// Common error handling in login components
try {
  setLoading(true);
  
  const { data: loginResults, error: loginError } = await supabase
    .rpc('verify_admin_login', {
      p_email: email.toLowerCase().trim(),
      p_password: password
    });
  
  if (loginError) {
    throw new Error(`Login failed: ${loginError.message}`);
  }
  
  if (!loginResults || loginResults.length === 0) {
    throw new Error('No response from login function');
  }
  
  const result = loginResults[0];
  
  if (!result.success) {
    throw new Error(result.message);
  }
  
  // Success handling...
  
} catch (error: any) {
  setError(error.message || 'Login failed. Please try again.');
  toast({
    title: "Login failed",
    description: error.message,
    variant: "destructive"
  });
} finally {
  setLoading(false);
}
```

---

## Security Considerations

### 🚨 Critical Security Issues

#### 1. Plain Text Password Storage
**Problem**: Passwords stored in `password_plain` column
**Risk**: Complete account compromise if database is breached
**Solution**: Implement proper password hashing (bcrypt, scrypt, or Argon2)

#### 2. Client-Side Session Management
**Problem**: No server-side session validation
**Risk**: Session manipulation, no automatic expiration
**Solution**: Implement JWT tokens or server-side session validation

#### 3. RLS Policy Gaps
**Problem**: Many RLS policies assume Supabase Auth (`auth.uid()`)
**Risk**: Potential data access issues
**Solution**: Update RLS policies for custom auth or disable where appropriate

### Recommended Security Improvements

#### 1. Password Hashing Implementation
```sql
-- Add password hashing function
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update login function to use hashed passwords
CREATE OR REPLACE FUNCTION verify_admin_login(
  p_email TEXT, 
  p_password TEXT
)
RETURNS TABLE(...) 
AS $$
BEGIN
  RETURN QUERY
  SELECT ...
  FROM public.users u
  WHERE u.email = p_email 
  AND u.password_hash = crypt(p_password, u.password_hash)  -- Use hashed comparison
  AND u.role IN ('admin', 'teacher');
END;
$$;
```

#### 2. Session Expiration
```typescript
// Add session expiration to user data
const userData = {
  // ... existing fields
  expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
};

// Check expiration on app load
const storedUser = JSON.parse(localStorage.getItem('user'));
if (storedUser.expiresAt < Date.now()) {
  localStorage.removeItem('user');
  setUser(null);
}
```

#### 3. Rate Limiting
Implement rate limiting on login attempts to prevent brute force attacks.

---

## Common Issues

### 1. "Cannot read properties of null"
**Cause**: User context not properly initialized
**Solution**: Check UserContext provider wraps entire app

### 2. Infinite redirect loops
**Cause**: Route protection logic conflicts
**Solution**: Ensure user state is properly set before route evaluation

### 3. "RPC function not found"
**Cause**: Database functions not created or wrong name
**Solution**: Verify function exists: 
```sql
SELECT proname FROM pg_proc WHERE proname LIKE '%login%';
```

### 4. Login successful but user not set
**Cause**: localStorage not updating context
**Solution**: Ensure storage event is dispatched and listener is active

### 5. Cross-tab synchronization issues
**Cause**: Storage event not properly handled
**Solution**: Verify storage event listener is set up in App.tsx

### 6. Role-based access not working
**Cause**: Incorrect role checking or user data format
**Solution**: Console.log user data to verify structure and values

---

## Testing Authentication

### Test Users Setup
```sql
-- Create test users for each role
INSERT INTO users (email, password_plain, role, first_name, last_name, school_id) VALUES
('superadmin@test.com', 'super123', 'superadmin', 'Super', 'Admin', NULL),
('admin@test.com', 'admin123', 'admin', 'School', 'Admin', (SELECT id FROM schools LIMIT 1)),
('teacher@test.com', 'teacher123', 'teacher', 'Test', 'Teacher', (SELECT id FROM schools LIMIT 1)),
('student@test.com', 'student123', 'student', 'Test', 'Student', (SELECT id FROM schools LIMIT 1));
```

### Login Testing Checklist
- [ ] SuperAdmin can access `/superadmin-login` and login
- [ ] Admin can access `/login` and login
- [ ] Teacher can access `/login` and login  
- [ ] Student can access `/student-login` and login
- [ ] Invalid credentials show error message
- [ ] Successful login redirects to correct dashboard
- [ ] User data persists across browser refresh
- [ ] Logout clears session and redirects
- [ ] Cross-tab synchronization works
- [ ] Route protection prevents unauthorized access

---

This completes the authentication flow documentation. The system, while functional, has significant security considerations that should be addressed before production use.
