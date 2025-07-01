
# Developer Onboarding Guide

This guide will help you understand and set up an isolated copy of the School Management System for development purposes.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Database Setup](#database-setup)
5. [Authentication System](#authentication-system)
6. [Environment Configuration](#environment-configuration)
7. [Getting Started](#getting-started)
8. [Common Gotchas](#common-gotchas)

---

## Project Overview

The School Management System is a comprehensive web application for managing:
- Student enrollment and profiles
- Course and group management
- Lesson scheduling and session tracking
- Financial transactions and payments
- Teacher and admin user management
- License management for schools

**Key Architecture:** React frontend + Supabase backend + Custom Authentication

---

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **shadcn/ui** component library
- **React Router** for navigation
- **React Query (@tanstack/react-query)** for data fetching
- **date-fns** for date manipulation
- **Lucide React** for icons

### Backend & Database
- **Supabase** (PostgreSQL + Real-time + Edge Functions)
- **Row Level Security (RLS)** for data access control
- **Custom RPC functions** for complex business logic
- **Edge Functions** for server-side operations

### Authentication
- **Custom authentication system** (NOT Supabase Auth)
- Plain text passwords stored in database (⚠️ Security issue noted in Known_Issues.md)
- Role-based access control (admin, teacher, student, superadmin)

---

## Project Structure

```
├── docs/                          # Documentation files
│   ├── API_Endpoints.md           # API endpoint documentation
│   ├── Business_Logic.md          # Core business logic explanation
│   ├── Known_Issues.md            # Known bugs and issues
│   └── sql/                       # Database schema files
├── src/
│   ├── components/                # Reusable UI components
│   │   ├── ui/                    # shadcn/ui base components
│   │   ├── calendar/              # Calendar-specific components
│   │   ├── student-tabs/          # Student management tabs
│   │   └── sidebar/               # Sidebar components
│   ├── contexts/                  # React contexts
│   │   └── PaymentContext.tsx     # Payment-related state
│   ├── hooks/                     # Custom React hooks
│   ├── integrations/              # External service integrations
│   │   └── supabase/              # Supabase client and types
│   ├── layout/                    # Layout components
│   ├── lib/                       # Utility libraries
│   ├── pages/                     # Page components
│   ├── utils/                     # Utility functions
│   └── App.tsx                    # Main application component
├── supabase/
│   ├── config.toml                # Supabase configuration
│   ├── functions/                 # Edge functions
│   └── migrations/                # Database migrations
└── public/                        # Static assets
```

### Key Directories Explained

#### `src/components/`
- **ui/**: Base shadcn/ui components (buttons, dialogs, forms, etc.)
- **calendar/**: Calendar view, lesson scheduling, session management
- **student-tabs/**: Student profile tabs (subscriptions, payments, sessions)
- **sidebar/**: Navigation and user profile components

#### `src/pages/`
- **Index.tsx**: Main dashboard with sample data
- **Students.tsx**: Student management and profiles
- **Calendar.tsx**: Lesson scheduling and calendar view
- **Finances.tsx**: Financial transactions and reporting
- **Groups.tsx**: Group class management
- **Login.tsx / SuperAdminLogin.tsx**: Authentication pages

#### `src/hooks/`
- **useSubscriptionCreation.ts**: Complex subscription creation logic
- **useTeachers.ts**: Teacher data fetching
- **useAttendanceData.ts**: Attendance tracking
- **useStudentForm.ts**: Student form management

#### `src/utils/`
- **teacherScheduleValidation.ts**: Conflict detection for teacher schedules
- **timezone.ts**: Timezone handling utilities
- **sessionTimezone.ts**: Session-specific timezone logic

---

## Database Setup

### Schema Overview
The database consists of 20+ tables with complex relationships:

**Core Tables:**
- `users` - User authentication and profiles
- `schools` - School information and settings
- `students` - Student profiles and contact info
- `courses` - Course definitions
- `groups` - Group classes
- `subscriptions` - Student subscription plans
- `lesson_sessions` - Individual lesson instances
- `transactions` - Financial transactions

**Supporting Tables:**
- `currencies`, `accounts`, `contacts`
- `licenses` - School licensing system
- `transaction_categories`, `transaction_tags`
- `group_students` - Junction table for group enrollments

### RLS Policies
- **School-based isolation**: Users can only access data from their school
- **Role-based permissions**: Different access levels for admin/teacher/student
- **Student self-access**: Students can view their own data
- **Some tables have RLS disabled** for performance or complexity reasons

### Important RPC Functions
- `add_student_subscription` - Creates subscriptions with automatic session generation
- `generate_lesson_sessions_v2` - Intelligent session distribution algorithm
- `verify_admin_login` / `verify_superadmin_login` - Custom authentication
- `update_subscription_schedule` - Updates subscription schedules

---

## Authentication System

⚠️ **Critical**: This system uses CUSTOM authentication, NOT Supabase Auth.

### How It Works
1. **Login Process**: 
   - Users enter email/password
   - Frontend calls RPC function (`verify_admin_login`, `verify_student_login`, etc.)
   - RPC function validates credentials against `users` table
   - Returns user data if successful
   - Frontend stores user data in localStorage and React context

2. **Session Management**:
   - User data stored in `localStorage` as JSON
   - `UserContext` provides user state throughout app
   - No JWT tokens or Supabase sessions
   - Manual logout clears localStorage

3. **Route Protection**:
   - `App.tsx` checks user role and redirects accordingly
   - Different routes for different user types
   - No middleware - all protection is client-side

### User Roles
- **superadmin**: License management, cross-school access
- **admin**: School administration, full school access
- **teacher**: Limited access to assigned students/classes
- **student**: Access to own data only

### Login Endpoints
- `/login` - Admin/Teacher login
- `/student-login` - Student login  
- `/superadmin-login` - Super admin login

---

## Environment Configuration

### Supabase Configuration
The project connects to Supabase using these settings in `src/integrations/supabase/client.ts`:

```typescript
const supabaseUrl = "https://clacmtyxfdtfgjkozmqf.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Required Configuration Files

#### `supabase/config.toml`
Contains Supabase project configuration including:
- Project ID
- Database settings
- Edge function configuration
- Authentication settings (though not used)

#### No `.env` files
This project doesn't use environment variables - all configuration is hardcoded or in config files.

---

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project
- Basic understanding of React and PostgreSQL

### Setup Steps

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd school-management-system
   npm install
   ```

2. **Set Up New Supabase Project**
   - Create new Supabase project
   - Note the project URL and anon key
   - Update `src/integrations/supabase/client.ts` with your credentials

3. **Run Database Migrations**
   - Install Supabase CLI
   - Run all migration files in `supabase/migrations/` in chronological order
   - Or use the SQL files in `docs/sql/` to recreate tables

4. **Configure Project Settings**
   - Update `supabase/config.toml` with your project ID
   - Set up any required edge functions

5. **Create Initial Data**
   - Create a superadmin user in the `users` table
   - Create initial school, courses, and currencies
   - Set up license records if needed

6. **Start Development**
   ```bash
   npm run dev
   ```

### Sample Initial Data Script
```sql
-- Create superadmin user
INSERT INTO users (email, password_plain, role, first_name, last_name)
VALUES ('admin@example.com', 'password123', 'superadmin', 'Super', 'Admin');

-- Create initial school
INSERT INTO schools (name, timezone)
VALUES ('Test School', 'UTC');

-- Create default currency
INSERT INTO currencies (school_id, code, name, symbol, is_default)
VALUES ((SELECT id FROM schools LIMIT 1), 'USD', 'US Dollar', '$', true);
```

---

## Common Gotchas

### 1. Authentication Confusion
- **This does NOT use Supabase Auth** - all authentication is custom
- Don't try to use `supabase.auth` methods
- User sessions are stored in localStorage, not Supabase

### 2. RLS Policy Complexity
- Many tables have complex RLS policies
- Some policies reference `auth.uid()` but this returns null (custom auth)
- Check `Known_Issues.md` for RLS-related problems

### 3. Session Generation Edge Cases
- The session generation algorithm can create duplicates
- Use `generate_lesson_sessions_v2` function, not older versions
- Monitor for duplicate sessions after subscription changes

### 4. Database Migration Order
- Migrations must be run in exact chronological order
- Some migrations depend on previous ones
- Missing migrations can cause RLS policy failures

### 5. Sample Data vs Real Data
- Dashboard uses hardcoded sample data, not database queries
- Don't be confused if dashboard shows data that's not in your database
- Check `src/pages/Index.tsx` for sample data usage

### 6. Timezone Handling
- Timezone logic is inconsistent across the app
- Sessions may display incorrect times for different timezones
- User timezone preferences aren't fully implemented

### 7. Payment Security Issue
- Passwords are stored in plain text (`password_plain` column)
- This is a known critical security issue
- Consider implementing proper password hashing before production

### 8. Large File Syndrome
- Many components are very large (200+ lines)
- Consider refactoring large files into smaller components
- Focus on functionality over perfect structure initially

---

## Next Steps

1. **Read the companion documentation**:
   - `API_Endpoints.md` - Understand the data flow
   - `Business_Logic.md` - Learn the core processes
   - `Known_Issues.md` - Avoid known pitfalls

2. **Set up your isolated environment**:
   - Create new Supabase project
   - Run database setup
   - Create test data

3. **Start with small changes**:
   - Modify UI components first
   - Test authentication flow
   - Understand data relationships

4. **When you're ready to modify**:
   - Always backup your database
   - Test RLS policies carefully
   - Monitor for session generation issues

Good luck! The system is complex but well-documented. Take your time to understand the authentication flow and database relationships before making major changes.
