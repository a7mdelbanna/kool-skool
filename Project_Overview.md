
# School Management System - Project Overview

## Application Description

This is a comprehensive **School Management System** built with React, TypeScript, and Supabase. The application provides a complete solution for managing tutoring schools, language schools, and educational institutions with features for student management, scheduling, payments, and administration.

## Target Users

### 1. **School Administrators**
- Manage the entire school operations
- Create and manage courses, teachers, and students
- Handle financial transactions and payments
- Access comprehensive analytics and reports
- Manage school settings and configurations

### 2. **Teachers**
- View assigned students and courses
- Manage lesson schedules and attendance
- Track student progress and performance
- Access teaching materials and resources

### 3. **Students**
- Access personal dashboard with course progress
- View upcoming lessons and schedule
- Track subscription status and payments
- Access learning materials and assignments

### 4. **Super Administrators**
- Manage multiple schools and licenses
- Handle system-wide configurations
- Monitor platform usage and performance

## Core Features & Workflows

### 📚 **Student Management**
- **Student Registration**: Add new students with personal information, course assignment, and payment setup
- **Profile Management**: Update student details, contact information, and academic progress
- **Student Dashboard**: Personalized view with course progress, upcoming lessons, and subscription status

### 👨‍🏫 **Teacher & Team Management**
- **Teacher Onboarding**: Add teachers and staff members with role-based access
- **Schedule Management**: Assign teachers to courses and manage availability
- **Performance Tracking**: Monitor teaching effectiveness and student feedback

### 💰 **Financial Management**
- **Payment Processing**: Handle student payments, subscriptions, and billing
- **Financial Analytics**: Revenue tracking, expense management, and profitability analysis
- **Account Management**: Multi-currency support and account reconciliation

### 📅 **Scheduling & Calendar**
- **Lesson Scheduling**: Create and manage individual and group lessons
- **Calendar Integration**: Visual calendar with drag-and-drop functionality
- **Attendance Tracking**: Mark attendance and track student participation

### 📊 **Analytics & Reporting**
- **Dashboard Analytics**: Real-time insights into school performance
- **Student Progress Reports**: Track learning outcomes and achievement
- **Financial Reports**: Revenue analysis and payment tracking

## Technical Architecture

### **Frontend Stack**
- **React 18** with TypeScript for type safety
- **Tailwind CSS** + **shadcn/ui** for modern UI components
- **React Router** for navigation
- **TanStack Query** for data fetching and state management

### **Backend & Database**
- **Supabase** for authentication, database, and real-time features
- **PostgreSQL** with Row-Level Security (RLS)
- **Edge Functions** for serverless backend logic

### **Key Integrations**
- **Recharts** for data visualization
- **Date-fns** for date manipulation
- **Sonner** for toast notifications
- **Lucide React** for icons

## Major User Workflows

### 🎯 **Student Onboarding**
1. Admin creates student account with course assignment
2. Student receives login credentials
3. Student accesses dashboard and views course progress
4. Payment setup and subscription management

### 📖 **Lesson Management**
1. Admin/Teacher creates lesson schedule
2. Students receive notifications about upcoming lessons
3. Teacher conducts lesson and marks attendance
4. Progress is automatically tracked and updated

### 💳 **Payment Processing**
1. Admin sets up student payment plans
2. System generates payment reminders
3. Payments are processed and recorded
4. Financial reports are updated automatically

### 📈 **Progress Tracking**
1. Teachers input student performance data
2. System calculates progress metrics
3. Students and parents receive progress reports
4. Analytics dashboard shows school-wide performance

## Security & Compliance

- **Role-Based Access Control (RBAC)** with different permission levels
- **Row-Level Security (RLS)** for data isolation between schools
- **Encrypted password storage** with secure authentication
- **Multi-school support** with data separation

## Deployment & Scaling

- **Vite** for fast development and building
- **Supabase** for scalable backend infrastructure
- **Edge Functions** for serverless scaling
- **Multi-tenant architecture** supporting multiple schools

This system provides a complete solution for educational institutions to manage their operations efficiently while maintaining security, scalability, and user experience.
