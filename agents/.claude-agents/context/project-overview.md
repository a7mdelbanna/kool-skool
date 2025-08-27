# TutorFlow Assistant - Project Overview for Agents

## Project Summary
TutorFlow Assistant is a comprehensive school management system for tutoring schools, language schools, and educational institutions. Built with React, TypeScript, and Firebase (migrated from Supabase).

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** + **shadcn/ui** components
- **React Router** for navigation
- **TanStack Query** for data fetching
- **React Hook Form** for forms
- **Vite** for build tooling

### Backend
- **Firebase** (migrated from Supabase)
  - Authentication
  - Firestore Database
  - Cloud Functions
  - Storage
- **Real-time updates** via Firestore listeners

## User Roles & Permissions

### Role Hierarchy
1. **Super Admin** - Platform-wide access
2. **Admin** - School-wide management
3. **Teacher** - Student and lesson management
4. **Student** - Personal dashboard access

## Core Modules

### 1. Student Management (`/students`)
- Student profiles and enrollment
- Course assignments
- Progress tracking
- Payment status

### 2. Financial Management (`/finances`)
- Payments and subscriptions
- Transactions tracking
- Multi-currency support
- Account management

### 3. Scheduling (`/calendar`, `/attendance`)
- Lesson scheduling
- Group sessions
- Attendance tracking
- Calendar views

### 4. Team Management (`/team-access`)
- Teacher accounts
- Role assignments
- Access control

### 5. Analytics (`/dashboard`)
- Revenue metrics
- Student statistics
- Performance tracking
- Real-time dashboards

## Database Structure

### Main Collections
- `users` - All user accounts
- `students` - Student-specific data
- `schools` - School configurations
- `courses` - Course definitions
- `subscriptions` - Payment plans
- `sessions` - Lesson sessions
- `transactions` - Financial records
- `groups` - Group classes
- `payments` - Payment records

## Key Features
1. Multi-school support
2. Real-time data synchronization
3. Role-based access control (RBAC)
4. Multi-currency financial management
5. Timezone-aware scheduling
6. Subscription-based billing
7. Group and individual lessons
8. Comprehensive reporting

## Development Patterns

### Component Structure
```
ComponentName/
├── ComponentName.tsx      # Main component
├── ComponentName.types.ts # TypeScript interfaces
├── ComponentName.test.tsx # Tests
└── index.ts              # Exports
```

### Service Layer Pattern
All Firebase operations go through service layers:
- `authService` - Authentication
- `databaseService` - Database operations
- `dashboardService` - Dashboard metrics

### State Management
- React Context for global state (UserContext)
- TanStack Query for server state
- Local state for component-specific data

## Security Considerations
1. Firebase Security Rules enforce access control
2. Role-based permissions at every level
3. School data isolation
4. Secure password management for students
5. Input validation and sanitization

## Current Migration Status
- ✅ Migrated from Supabase to Firebase
- ✅ All authentication flows working
- ✅ Database operations functional
- ✅ Real-time updates implemented
- ✅ Security rules configured

## Important Files
- `/src/config/firebase.ts` - Firebase configuration
- `/src/App.tsx` - Main app routing
- `/src/services/` - Service layer implementations
- `/src/pages/` - Page components
- `/src/components/` - Reusable components

## Testing Requirements
- Unit tests for utilities and services
- Component tests for UI components
- Integration tests for workflows
- E2E tests for critical paths

## Performance Targets
- Initial load: < 3s
- Page transitions: < 500ms
- API responses: < 1s
- Real-time updates: < 100ms