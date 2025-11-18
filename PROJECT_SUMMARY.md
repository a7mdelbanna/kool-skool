# Kool Skool CRM - Project Summary & Documentation

## 📋 Project Overview

**Kool Skool CRM** is a comprehensive School Management System designed for language schools and tutoring centers. It's a full-stack web application built with React, TypeScript, and Firebase that manages students, teachers, schedules, payments, and learning progress.

### Technology Stack
- **Frontend**: React 18.3.1 + TypeScript + Vite
- **UI Library**: shadcn/ui (Radix UI) + Tailwind CSS
- **Backend/Database**: Firebase (Firestore)
- **Authentication**: Firebase Auth
- **Storage**: Firebase Storage
- **State Management**: TanStack React Query
- **Routing**: React Router v6
- **Notifications**: Sonner (Toast notifications)
- **Icons**: Lucide React
- **Date Handling**: date-fns

---

## 🗄️ Firebase Database Structure

### Collections Overview

The application uses **Firebase Firestore** as the primary database. All data is stored in the following collections:

#### 1. **schools**
School/Organization data
```javascript
{
  id: string,
  name: string,
  email: string,
  phone: string,
  address: string,
  logo_url: string,
  timezone: string,
  currency: string,
  created_at: timestamp,
  updated_at: timestamp
}
```

#### 2. **users**
Teacher/Admin accounts
```javascript
{
  id: string,
  schoolId: string,
  email: string,
  firstName: string,
  lastName: string,
  role: 'teacher' | 'admin' | 'super_admin',
  phone: string,
  profileImage: string,
  created_at: timestamp,
  updated_at: timestamp
}
```

#### 3. **students**
Student profiles
```javascript
{
  id: string,
  schoolId: string,
  firstName: string,
  lastName: string,
  email: string,
  phone: string,
  countryCode: string,
  profileImage: string,
  birthday: timestamp,
  level: string,
  ageGroup: 'child' | 'teen' | 'adult',
  lessonType: 'individual' | 'group',
  courseName: string,
  paymentStatus: 'paid' | 'partial' | 'overdue',
  parentInfo: {
    name: string,
    phone: string,
    email: string
  },
  created_at: timestamp,
  updated_at: timestamp
}
```

#### 4. **subscriptions** (via Supabase RPC - data fetched but stored in Firebase context)
Subscription packages for students
```javascript
{
  id: string,
  student_id: string,
  school_id: string,
  session_count: number,
  duration_months: number,
  total_price: number,
  currency: string,
  start_date: timestamp,
  end_date: timestamp,
  status: 'active' | 'paused' | 'completed' | 'cancelled',
  schedule: array<{day: string, time: string}>,
  price_mode: 'total' | 'perSession',
  price_per_session: number,
  sessions_completed: number,
  sessions_attended: number,
  sessions_cancelled: number,
  sessions_scheduled: number,
  total_paid: number,
  created_at: timestamp,
  updated_at: timestamp
}
```

#### 5. **sessions** (also called lesson_sessions)
Individual lesson sessions
```javascript
{
  id: string,
  schoolId: string,
  studentId: string,
  subscription_id: string,
  student_id: string, // Both snake_case and camelCase supported
  teacher_id: string,
  teacherName: string,
  scheduled_date: timestamp,
  scheduledDate: timestamp, // Both supported
  scheduled_time: string,
  scheduledTime: string, // Both supported
  duration: number,
  status: 'scheduled' | 'completed' | 'attended' | 'cancelled' | 'absent' | 'missed',
  notes: string,
  zoom_link: string,
  created_at: timestamp,
  updated_at: timestamp
}
```

#### 6. **session_details**
Detailed content for each session (vocabulary, notes, attachments)
```javascript
{
  id: string,
  sessionId: string,
  vocabulary: array<{
    word: string,
    translation: string,
    example: string,
    audioUrl: string
  }>,
  notes: string,
  attachments: array<{
    name: string,
    url: string,
    type: string
  }>,
  homework: string,
  created_at: timestamp,
  updated_at: timestamp
}
```

#### 7. **todos**
Tasks and homework for students
```javascript
{
  id: string,
  schoolId: string,
  student_ids: array<string>,
  task: string,
  description: string,
  due_date: timestamp,
  priority: 'low' | 'medium' | 'high',
  status: 'pending' | 'in_progress' | 'completed',
  created_by: string,
  created_at: timestamp,
  updated_at: timestamp
}
```

#### 8. **payments** / **transactions**
Payment records (both collections used)
```javascript
{
  id: string,
  schoolId: string,
  student_id: string,
  subscription_id: string,
  amount: number,
  currency: string,
  type: 'income' | 'expense',
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'other',
  transaction_date: timestamp,
  status: 'completed' | 'pending' | 'failed',
  notes: string,
  category: string,
  tags: array<string>,
  created_at: timestamp,
  updated_at: timestamp
}
```

#### 9. **speaking_topics**
Speaking practice topics and assignments
```javascript
{
  id: string,
  schoolId: string,
  title: string,
  description: string,
  level: string,
  questions: array<string>,
  created_at: timestamp,
  updated_at: timestamp
}
```

#### 10. **speaking_submissions**
Student speaking practice recordings
```javascript
{
  id: string,
  topicId: string,
  studentId: string,
  schoolId: string,
  audioUrl: string,
  duration: number,
  feedback: string,
  grade: number,
  status: 'pending' | 'reviewed',
  submitted_at: timestamp,
  reviewed_at: timestamp,
  reviewed_by: string
}
```

#### 11. **vocabulary_progress**
Tracks student vocabulary practice progress
```javascript
{
  id: string,
  studentId: string,
  sessionId: string,
  wordId: string,
  correct_count: number,
  incorrect_count: number,
  last_practiced: timestamp,
  mastery_level: 'learning' | 'practicing' | 'mastered'
}
```

#### 12. **courses**
Course definitions
```javascript
{
  id: string,
  schoolId: string,
  name: string,
  description: string,
  level: string,
  duration_weeks: number,
  created_at: timestamp
}
```

#### 13. **groups**
Group/class management
```javascript
{
  id: string,
  schoolId: string,
  name: string,
  courseId: string,
  teacherId: string,
  studentIds: array<string>,
  schedule: array<{day: string, time: string}>,
  max_students: number,
  created_at: timestamp
}
```

#### 14. **contacts**
General contacts/leads
```javascript
{
  id: string,
  schoolId: string,
  firstName: string,
  lastName: string,
  email: string,
  phone: string,
  type: string,
  status: 'lead' | 'prospect' | 'student' | 'inactive',
  notes: string,
  created_at: timestamp
}
```

#### 15. **teacher_availability**
Teacher schedule availability
```javascript
{
  id: string,
  teacherId: string,
  schoolId: string,
  date: timestamp,
  time_slots: array<{
    start_time: string,
    end_time: string,
    is_available: boolean,
    booking_id: string
  }>,
  created_at: timestamp
}
```

#### 16. **notification_settings**
Automated notification rules
```javascript
{
  id: string,
  schoolId: string,
  rule_type: 'payment_reminder' | 'lesson_reminder' | 'birthday' | 'homework_due',
  enabled: boolean,
  trigger_days: number,
  template: string,
  channel: 'sms' | 'email' | 'whatsapp',
  created_at: timestamp
}
```

#### 17. **notification_logs**
History of sent notifications
```javascript
{
  id: string,
  schoolId: string,
  recipientId: string,
  type: string,
  channel: string,
  status: 'sent' | 'failed' | 'pending',
  message: string,
  sent_at: timestamp
}
```

---

## 🎯 Core Features

### 1. Student Management
- **Student Profiles**: Complete student information with contact details, parent info, profile images
- **Student Portal**: Students can login to view their progress, vocabulary, homework
- **Bulk Import**: CSV upload for adding multiple students at once
- **Advanced Search**: Search and filter students by name, level, status, tags
- **Payment Status Tracking**: Visual indicators for payment status (paid, partial, overdue)

### 2. Subscription & Payment Management
- **Flexible Subscription Plans**: Create subscriptions with:
  - Number of sessions (e.g., 8, 12, 16 sessions)
  - Duration in months
  - Total price or per-session pricing
  - Custom schedules (e.g., "Monday 5:00 PM, Wednesday 6:00 PM")
- **Subscription Renewal**: One-click renewal that automatically calculates new start/end dates
- **Payment Tracking**:
  - Link payments to students and subscriptions
  - Multiple payment methods (cash, card, bank transfer)
  - Payment history and transaction logs
  - Overdue payment detection with priority levels (Urgent/High/Normal)
- **Financial Reports**: Revenue tracking, expense management, profit analysis

### 3. Session Scheduling & Management
- **Calendar View**: Visual calendar showing all scheduled sessions
- **Session Creation**: Schedule sessions with:
  - Student selection
  - Teacher assignment
  - Date and time
  - Duration
  - Zoom link (optional)
- **Session Details**: For each session, teachers can add:
  - Vocabulary words with translations and examples
  - Audio recordings for pronunciation
  - Session notes
  - File attachments
  - Homework assignments
- **Session Status Tracking**: scheduled → attended/completed/cancelled/absent
- **Automatic Progress Updates**: Sessions automatically update subscription progress

### 4. Actions Hub (Admin Dashboard)
Central dashboard showing all pending actions:
- **Sessions Tab**: Upcoming lessons requiring preparation
- **Renewals Tab**: Subscriptions nearing expiration
- **Birthdays Tab**: Student birthdays for greetings
- **TODOs Tab**: Pending homework and tasks
- **Payments Tab**: Overdue payments with smart prioritization:
  - **Urgent**: Active subscriptions with zero payment
  - **High**: Active subscriptions with partial payment >30 days old
  - **Normal**: Other outstanding balances
- Quick actions: Call student, copy contact info, view student profile

### 5. Learning & Progress Tracking
- **Vocabulary Bank**:
  - Track all vocabulary taught to each student
  - Organized by session
  - Audio recordings for pronunciation
  - Practice modes: Flashcards, Matching, Typing
- **Vocabulary Practice**:
  - Interactive practice games
  - Progress tracking (correct/incorrect attempts)
  - Mastery levels (learning → practicing → mastered)
- **Speaking Practice**:
  - Teachers assign speaking topics
  - Students record audio responses
  - Teachers review and provide feedback
  - Grade assignments
- **Homework/TODOs**:
  - Assign tasks to individual students or groups
  - Set due dates and priority levels
  - Track completion status
  - Students view assignments in their portal

### 6. Teacher & Staff Management
- **Multi-user Support**: Multiple teachers per school
- **Role-Based Access**: Admin vs Teacher permissions
- **Teacher Availability**: Set available time slots for booking
- **Zoom Integration**: Teachers can add Zoom links to sessions

### 7. Student Detail View
Comprehensive student profile with tabs:
- **Overview**: Learning progress, recent sessions, pending tasks
- **Sessions**: Complete session history grouped by subscription
- **Subscriptions**: All subscription packages with:
  - Start and end dates (calculated from last session)
  - Payment progress
  - Session completion progress
  - Status (active/paused/completed)
- **Payments**: Full payment history
- **TODOs**: All assigned homework and tasks

### 8. Reports & Analytics
- **Financial Dashboard**: Revenue vs Expenses charts
- **Student Analytics**: New students, active students, churn rate
- **Payment Reports**: Outstanding balances, collection rates
- **Session Statistics**: Attendance rates, cancelled sessions

### 9. Notification System (Ready for Integration)
- **Notification Rules**: Define automated reminders for:
  - Payment reminders (X days before due)
  - Lesson reminders (X hours before session)
  - Birthday greetings
  - Homework due dates
- **Notification Templates**: Customizable message templates
- **Multi-channel**: SMS, Email, WhatsApp (via Twilio)
- **Notification Logs**: Track all sent notifications

### 10. Settings & Configuration
- **School Settings**:
  - School name, logo, contact info
  - Timezone configuration
  - Default currency
- **Academic Settings**:
  - Student levels (A1, A2, B1, B2, C1, C2)
  - Age groups (Child, Teen, Adult)
  - Courses and curriculum
- **Financial Settings**:
  - Payment methods
  - Transaction categories
  - Currency management
- **Theme Customization**: Light/Dark mode, color schemes
- **Personal Settings**: User profile, password change

---

## 🔐 Authentication & Access

### User Types:
1. **Super Admin**: Full system access across all schools
2. **School Admin**: Full access to their school's data
3. **Teacher**: Access to assigned students and sessions
4. **Student**: Limited portal access to view own progress

### Authentication Flow:
- Firebase Authentication for secure login
- Email/Password authentication
- Role-based routing and permissions
- Persistent sessions with localStorage

### Student Portal Access:
- Students login with credentials
- View their own:
  - Upcoming sessions
  - Vocabulary bank
  - Homework/TODOs
  - Speaking assignments
  - Payment status

---

## 📊 Data Fetching Patterns

The application uses a **hybrid approach** combining Supabase RPC calls and Firebase direct queries:

### Supabase RPC Functions (Legacy - being migrated):
- `get_student_subscriptions`: Fetches subscription data with calculated fields
- `renew_subscription`: Handles subscription renewal logic

### Firebase Direct Queries:
- All other data operations use Firebase Firestore directly
- Real-time listeners for live updates
- Batch operations for bulk updates
- Transaction support for atomic operations

### Key Pattern:
```typescript
// 1. Fetch subscriptions from Supabase RPC
const { data: subscriptions } = await supabase.rpc('get_student_subscriptions', {
  p_student_id: studentId
});

// 2. Fetch sessions from Firebase
const sessions = await databaseService.query('sessions', {
  where: [{ field: 'student_id', operator: '==', value: studentId }]
});

// 3. Fetch payments from Firebase
const payments = await databaseService.query('payments', {
  where: [
    { field: 'student_id', operator: '==', value: studentId },
    { field: 'type', operator: '==', value: 'income' }
  ]
});

// 4. Calculate end dates from last session
const calculatedEndDate = sessions.length > 0
  ? sessions.sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date))[0].scheduled_date
  : subscription.end_date;
```

---

## 🔔 Data Required for N8N Telegram Bot

For building a Telegram bot that sends reminders to students, you'll need access to:

### Student Data:
- **Student ID**: `students.id`
- **Name**: `students.firstName`, `students.lastName`
- **Phone**: `students.phone`, `students.countryCode`
- **Telegram ID**: (needs to be added to students collection)
- **School ID**: `students.schoolId`

### Subscription Data:
- **Subscription ID**: `subscriptions.id`
- **Status**: `subscriptions.status`
- **Total Price**: `subscriptions.total_price`
- **Total Paid**: `subscriptions.total_paid`
- **Amount Owed**: `total_price - total_paid`
- **Start Date**: `subscriptions.start_date`
- **End Date**: Calculate from last session's `scheduled_date`
- **Sessions Remaining**: `session_count - sessions_completed`

### Session Data:
- **Session ID**: `sessions.id`
- **Scheduled Date**: `sessions.scheduled_date`
- **Scheduled Time**: `sessions.scheduled_time`
- **Status**: `sessions.status`
- **Teacher Name**: `sessions.teacherName`
- **Zoom Link**: `sessions.zoom_link`

### Payment Data:
- **Last Payment Date**: `payments.transaction_date`
- **Last Payment Amount**: `payments.amount`
- **Payment Method**: `payments.payment_method`

### TODO/Homework Data:
- **Task Title**: `todos.task`
- **Description**: `todos.description`
- **Due Date**: `todos.due_date`
- **Priority**: `todos.priority`
- **Status**: `todos.status`

---

## 🤖 Bot Integration Recommendations

### Firebase Access for N8N:
1. **Service Account**: Create a Firebase service account with read-only access
2. **API Endpoints**: Consider creating Cloud Functions to expose specific data
3. **Security**: Use Firebase Security Rules to restrict data access

### Telegram Bot Features to Implement:

#### 1. Student Authentication:
```
/start → Request phone number
→ Match with database
→ Link Telegram ID to student record
```

#### 2. Payment Reminders:
```
Query Logic:
- Find students where (total_price - total_paid > 0)
- Filter by subscription status = 'active'
- Calculate days since last payment
- Send reminder based on priority:
  - Urgent (0 payments): Immediate
  - High (>30 days): Weekly
  - Normal: Monthly
```

#### 3. Lesson Reminders:
```
Query Logic:
- Find sessions where:
  - scheduled_date = today or tomorrow
  - status = 'scheduled'
  - student_id = user's telegram ID
- Send reminder with:
  - Date and time
  - Teacher name
  - Zoom link
  - Lesson notes
```

#### 4. Homework Reminders:
```
Query Logic:
- Find todos where:
  - student_ids includes user's ID
  - status != 'completed'
  - due_date within 3 days
- Send reminder with:
  - Task description
  - Due date
  - Priority level
```

#### 5. Upcoming Renewal Reminders:
```
Query Logic:
- Find subscriptions where:
  - student_id = user's ID
  - sessions_completed / session_count > 0.8 (80% complete)
  - status = 'active'
- Send reminder:
  - Sessions remaining
  - Estimated completion date
  - Renewal options
```

### N8N Workflow Triggers:
1. **Scheduled Triggers** (Cron):
   - Daily at 9 AM: Check for today's sessions
   - Daily at 6 PM: Send tomorrow's lesson reminders
   - Weekly: Payment reminders
   - Daily: Homework due date checks

2. **Firebase Triggers** (via Webhooks):
   - New session scheduled → Send confirmation
   - Payment received → Send receipt
   - Homework assigned → Send notification

### Sample Bot Commands:
```
/start - Link your account
/lessons - Show upcoming lessons
/payments - View payment status
/homework - Check pending homework
/vocabulary - Access vocabulary bank
/help - Get help and support
```

### Data Security Notes:
- Never expose Firebase credentials in N8N workflows
- Use environment variables for API keys
- Implement rate limiting on queries
- Log all bot interactions for audit
- Respect GDPR/data privacy regulations

---

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui base components
│   ├── calendar/       # Calendar-specific components
│   ├── student-tabs/   # Student detail tabs
│   ├── actions-hub/    # Actions Hub components
│   └── ...
├── pages/              # Route pages/views
│   ├── Index.tsx       # Dashboard
│   ├── Students.tsx    # Student list
│   ├── StudentDetail.tsx
│   ├── Calendar.tsx
│   ├── Finances.tsx
│   ├── ActionsHub.tsx
│   └── ...
├── services/           # Business logic & API services
│   ├── firebase/       # Firebase services
│   │   ├── database.service.ts
│   │   ├── auth.service.ts
│   │   ├── storage.service.ts
│   │   └── ...
│   └── ...
├── hooks/              # Custom React hooks
├── config/             # Configuration files
│   └── firebase.ts     # Firebase initialization
├── lib/                # Utilities
└── integrations/       # External integrations
    └── supabase/       # Supabase client (legacy)
```

---

## 🚀 Deployment

- **Hosting**: Netlify (connected to `production` branch)
- **Build Command**: `bun run build`
- **Environment Variables**: Set in Netlify dashboard
- **Auto-deploy**: Pushes to `production` branch trigger deployment

---

## 📞 Contact & Support

This system is designed to be integrated with external notification services like n8n for automated student communications. The database structure is optimized for querying student data, scheduling information, and payment status for building comprehensive reminder systems.

For n8n integration, focus on:
1. Firebase service account setup
2. Telegram bot token configuration
3. Webhook endpoints for real-time triggers
4. Scheduled workflows for daily reminders

---

**Version**: 1.0.0
**Last Updated**: January 2025
**Database**: Firebase Firestore
**Legacy**: Supabase (being phased out via supabaseToFirebase migration)
