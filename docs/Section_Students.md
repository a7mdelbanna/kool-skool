
# Students - Student Management System

## What the feature does
The Students section provides comprehensive student management capabilities, allowing administrators to view, add, edit, search, and filter students. It serves as the central hub for all student-related operations in the tutoring school.

## How users interact with it (UI flow)

### Main Student List View
- **Header**: "Students" title with student count
- **Search Bar**: Real-time search functionality for finding students
- **Add Student Button**: Opens the comprehensive student creation dialog
- **Student Grid**: Displays student cards in a responsive grid layout

### Student Cards
Each student card displays:
- **Profile Picture**: Avatar or initials
- **Basic Info**: Name, email, phone
- **Academic Info**: Course, level, lesson type
- **Progress**: Lessons completed, next lesson
- **Payment Status**: Current payment status and next payment date
- **Action Buttons**: Edit, view details, quick actions

### Add/Edit Student Dialog
Multi-tab interface with four main sections:

#### 1. Profile Tab
- **Personal Information**:
  - First Name, Last Name, Email (required)
  - Phone, WhatsApp, Telegram, Instagram
  - Birthday and Age Group selection
- **Academic Assignment**:
  - Course selection (dropdown from available courses)
  - Teacher assignment (dropdown from available teachers)
  - Student level selection
- **Login Credentials**:
  - Password creation for student portal access
  - Option to generate random password

#### 2. Subscriptions Tab
- **Active Subscriptions**: List of current subscriptions
- **Add Subscription**: Create new subscription with:
  - Subscription type (Individual/Group)
  - Session count and duration
  - Pricing (per session or fixed)
  - Schedule configuration
  - Start/end dates

#### 3. Payments Tab
- **Payment History**: List of all payments made
- **Add Payment**: Record new payments
- **Payment Status**: Track outstanding amounts
- **Next Payment**: Schedule upcoming payments

#### 4. Sessions Tab
- **Session History**: Past lesson sessions
- **Upcoming Sessions**: Scheduled future sessions
- **Session Details**: Notes, attendance, progress tracking

## Custom Logic, Validation, and Quirks

### Data Loading and Management
- **Real-time Data**: Uses TanStack Query for efficient data fetching
- **Optimistic Updates**: Immediate UI updates with rollback on failure
- **Cache Invalidation**: Automatic refresh after student operations

### Student Form Logic
- **Course/Teacher Integration**: Dropdown selections are populated from database
- **Password Management**: 
  - Auto-generates secure passwords if requested
  - Stores plain text for admin reference (security consideration)
  - Creates user account for student portal access

### Validation Rules
- **Required Fields**: First name, last name, email
- **Email Validation**: Proper email format checking
- **Phone Validation**: Flexible phone number formats
- **Course Assignment**: Must select valid course and teacher combination

### Custom Hooks
- **useStudentForm**: Manages student form state and operations
- **useStudentData**: Handles data fetching and caching
- **Database Integration**: Direct Supabase queries with RLS policies

### Complex Logic Areas

#### Student Creation Process
1. **Form Validation**: Multi-step validation across tabs
2. **User Account Creation**: Creates corresponding user record
3. **Default Subscription**: Can auto-create initial subscription
4. **Teacher Assignment**: Links student to selected teacher
5. **Course Enrollment**: Associates student with chosen course

#### Edit Mode Handling
- **Data Pre-population**: Loads existing student data into forms
- **Selective Updates**: Only modified fields are updated
- **Subscription Management**: Can modify existing subscriptions
- **Session History**: Preserves lesson history during edits

### Search and Filter System
- **Real-time Search**: Instant filtering as user types
- **Multiple Fields**: Searches across name, email, course, teacher
- **Debounced Input**: Optimized performance for large student lists
- **Case Insensitive**: Flexible search matching

### Integration Points
- **Payment System**: Connects to payment tracking and billing
- **Calendar System**: Links to lesson scheduling
- **Teacher Management**: Assigns students to teachers
- **Course Management**: Enrolls students in specific courses
- **Attendance System**: Tracks lesson participation

### Performance Considerations
- **Pagination**: Handles large student databases efficiently
- **Lazy Loading**: Loads student details on demand
- **Caching Strategy**: Reduces database queries through intelligent caching
- **Optimistic Updates**: Improves perceived performance

### Security Features
- **Row-Level Security**: Students can only see their own data
- **Role-Based Access**: Different permissions for admin/teacher/student
- **Password Security**: Secure password generation and storage
- **Data Isolation**: School-level data separation

### Known Limitations
- **Bulk Operations**: No bulk edit/delete functionality
- **Advanced Filtering**: Limited filtering options beyond search
- **Export Features**: No data export capabilities
- **Photo Upload**: Profile pictures not implemented
- **Communication**: No direct messaging features
