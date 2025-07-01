
# Business Logic Documentation

This document outlines the core business logic and processes implemented in the School Management System, explaining how key features work behind the scenes.

## Table of Contents

1. [Group Creation Logic](#group-creation-logic)
2. [Session Overlap Detection](#session-overlap-detection)
3. [Payment Processing](#payment-processing)
4. [Subscription Management](#subscription-management)
5. [Session Generation](#session-generation)
6. [Student Enrollment](#student-enrollment)
7. [Financial Transaction Processing](#financial-transaction-processing)
8. [Calendar and Scheduling](#calendar-and-scheduling)
9. [Data Validation Rules](#data-validation-rules)
10. [Error Handling Patterns](#error-handling-patterns)

---

## Group Creation Logic

### Overview
Group creation is a complex process that involves creating a group, managing pricing, generating sessions, and handling student enrollments automatically.

### Process Flow

#### 1. Group Validation
- **Course Validation**: Ensures selected course exists and belongs to the school
- **Teacher Validation**: Verifies teacher availability and assignment
- **Price Validation**: Validates pricing based on selected mode (per session vs. fixed price)
- **Schedule Validation**: Ensures schedule has valid time slots and doesn't conflict with existing bookings

#### 2. Group Creation
```typescript
// Core group data structure
{
  school_id: string,
  course_id: string,
  teacher_id: string,
  name: string,
  description?: string,
  session_count: number,
  session_duration_minutes: number,
  schedule: Array<{day: string, time: string}>,
  price_mode: 'perSession' | 'fixedPrice',
  price_per_session?: number,
  total_price: number,
  currency: string,
  status: 'active' | 'inactive'
}
```

#### 3. Automatic Session Generation
- **Schedule Processing**: Converts JSON schedule into recurring session dates
- **Session Creation**: Creates individual lesson_sessions for each scheduled occurrence
- **Date Calculation**: Uses intelligent date calculation to distribute sessions over the group duration
- **Conflict Avoidance**: Checks for teacher and student availability conflicts

#### 4. Student Enrollment Management
- **Bulk Enrollment**: Allows adding multiple students simultaneously
- **Individual Subscriptions**: Creates corresponding individual subscriptions for each enrolled student
- **Pro-rated Pricing**: Handles pricing adjustments for students joining mid-course
- **Status Tracking**: Maintains active/inactive status for each student enrollment

### Business Rules

#### Pricing Logic
- **Per Session Mode**: `Total Price = Session Count × Price Per Session`
- **Fixed Price Mode**: Total price remains constant regardless of session count
- **Multi-Currency**: Supports different currencies per school with exchange rate handling
- **Student Distribution**: Group costs can be split evenly among enrolled students

#### Capacity Management
- **Maximum Students**: Configurable capacity limits per group
- **Enrollment Tracking**: Real-time tracking of current vs. maximum enrollment
- **Waitlist Support**: Basic framework for handling oversubscription

---

## Session Overlap Detection

### Overview
The system prevents scheduling conflicts by checking for overlapping sessions across teachers and students.

### Teacher Schedule Validation

#### Core Logic (`validateTeacherScheduleOverlap`)
```typescript
interface SessionTime {
  teacherId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  durationMinutes: number;
  excludeSessionId?: string; // For rescheduling
}
```

#### Overlap Detection Algorithm
1. **Time Conversion**: Converts time strings to minutes since midnight for accurate comparison
2. **Conflict Query**: Searches for existing sessions on the same date for the teacher
3. **Overlap Calculation**: 
   ```typescript
   hasOverlap = (newStartMinutes < existingEndMinutes) && 
                (newEndMinutes > existingStartMinutes)
   ```
4. **Detailed Reporting**: Provides specific conflict information including student names and session types

#### Conflict Resolution
- **Grace Periods**: No buffer time between sessions (sessions can be back-to-back)
- **Rescheduling Support**: Excludes the session being moved when checking for conflicts
- **Group vs Individual**: Handles conflicts for both individual and group sessions
- **User-Friendly Messages**: Provides clear conflict descriptions with suggested alternatives

### Student Schedule Validation
- **Multiple Teacher Conflicts**: Checks if student has sessions with different teachers at the same time
- **Group Participation**: Validates student availability for group sessions
- **Subscription Limits**: Ensures students don't exceed their subscription session limits

---

## Payment Processing

### Overview
Payment processing handles multiple payment types, currencies, and integration with the accounting system.

### Payment Creation Logic

#### Payment Validation
- **Amount Validation**: Ensures positive amounts and currency consistency
- **Student Verification**: Confirms student belongs to the school
- **Account Matching**: Validates that payment account currency matches transaction currency
- **Duplicate Prevention**: Checks for potential duplicate payments

#### Payment Types
1. **Student Payments**: Direct payments from students/parents
2. **Subscription Payments**: Payments linked to specific subscriptions
3. **Session Payments**: Individual session-based payments
4. **Initial Payments**: Payments made during subscription creation

#### Account Integration
```typescript
// Payment-Account relationship
{
  amount: number,
  currency: string,
  account_id: string, // Must match currency
  payment_method: string,
  payment_date: string,
  status: 'completed' | 'pending' | 'cancelled'
}
```

### Advanced Payment Features

#### Multi-Currency Support
- **Currency Validation**: Ensures payment currency matches account currency
- **Exchange Rates**: Handles currency conversion using stored exchange rates
- **Reporting**: Multi-currency financial reporting with base currency conversion

#### Payment Allocation
- **Subscription Linking**: Automatically links payments to relevant subscriptions
- **Session Attribution**: Associates payments with specific lesson sessions
- **Credit Management**: Handles overpayments and creates credit balances

---

## Subscription Management

### Overview
Subscriptions define how many lessons a student has purchased and their scheduling parameters.

### Subscription Creation Process

#### Data Structure
```typescript
interface Subscription {
  student_id: string,
  subscription_type: 'individual' | 'group',
  session_count: number,
  duration_months: number,
  start_date: Date,
  schedule: Array<{day: string, time: string}>,
  price_mode: 'perSession' | 'fixed',
  total_price: number,
  currency: string,
  status: 'active' | 'inactive' | 'completed' | 'cancelled'
}
```

#### Creation Workflow (`useSubscriptionCreation`)
1. **Form Validation**: Validates all required fields and business rules
2. **Currency Consistency**: Ensures account and subscription currencies match
3. **RPC Function Call**: Uses `add_student_subscription` for atomic creation
4. **Session Generation**: Automatically creates lesson sessions based on schedule
5. **Payment Processing**: Handles initial payment if provided
6. **Query Invalidation**: Refreshes all related data caches

### Subscription Business Rules

#### Pricing Models
- **Per Session**: Individual session pricing with flexible total calculation
- **Fixed Price**: Set total price regardless of session count
- **Pro-ration**: Handles partial subscription periods and adjustments

#### Schedule Management
- **JSON Storage**: Complex schedules stored as JSON with day/time objects
- **Recurring Patterns**: Supports weekly recurring schedule patterns
- **Date Range Logic**: Calculates end dates based on duration and session count
- **Holiday Handling**: Framework for skipping sessions during holidays

#### Status Lifecycle
- **Active**: Currently active subscription with upcoming sessions
- **Inactive**: Temporarily suspended subscription
- **Completed**: All sessions completed successfully
- **Cancelled**: Subscription terminated before completion

---

## Session Generation

### Overview
Session generation creates individual lesson sessions based on subscription schedules and group configurations.

### Core Algorithm (`generate_lesson_sessions_v2`)

#### Session Distribution Logic
1. **Schedule Sorting**: Orders schedule items by day of week (Monday-Sunday)
2. **Cyclic Distribution**: Cycles through schedule items for even distribution
3. **Date Calculation**: Finds next occurrence of each scheduled day
4. **Session Creation**: Creates sessions with proper indexing and metadata

#### Key Features
- **Intelligent Spacing**: Prevents session clustering by advancing base date after each session
- **Conflict Prevention**: Checks for existing sessions before creation
- **Cost Calculation**: Automatically calculates session costs based on subscription pricing
- **Safety Limits**: Prevents infinite loops with reasonable date boundaries

#### Session Metadata
```typescript
interface LessonSession {
  subscription_id: string,
  student_id: string,
  scheduled_date: timestamp,
  duration_minutes: number,
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled',
  payment_status: 'paid' | 'pending' | 'overdue',
  cost: number,
  index_in_sub: number, // Position within subscription
  notes?: string
}
```

---

## Student Enrollment

### Overview
Student enrollment handles the process of adding students to individual courses or group classes.

### Individual Student Creation
- **User Account Creation**: Creates authentication account via Edge Function
- **Student Record**: Links user account to student profile
- **Course Assignment**: Associates student with course and teacher
- **Initial Setup**: Sets age group, level, and contact information

### Group Enrollment Process
- **Capacity Checking**: Verifies group has available spots
- **Schedule Compatibility**: Ensures student schedule doesn't conflict
- **Subscription Creation**: Creates group subscription for the student
- **Payment Integration**: Links enrollment to payment processing

### Business Rules
- **Unique Constraints**: Prevents duplicate enrollments in the same group
- **Status Management**: Tracks active/inactive enrollment status
- **Date Tracking**: Records enrollment start and end dates
- **Automatic Updates**: Updates group enrollment counts automatically

---

## Financial Transaction Processing

### Overview
The financial system handles income, expenses, and transfers with comprehensive categorization and reporting.

### Transaction Types

#### Income Transactions
- **Student Payments**: Revenue from tuition and fees
- **Other Income**: Additional revenue sources
- **Account Credit**: Positive account adjustments

#### Expense Transactions
- **Payroll**: Teacher and staff payments
- **Utilities**: Operational expenses
- **Supplies**: Educational materials and equipment
- **Marketing**: Promotional and advertising costs

#### Transfer Transactions
- **Account Transfers**: Moving money between accounts
- **Currency Conversion**: Multi-currency transfer handling
- **Balance Adjustments**: Correcting account balances

### Transaction Creation (`create_transaction`)
```typescript
interface TransactionData {
  school_id: string,
  type: 'income' | 'expense' | 'transfer',
  amount: number,
  currency: string,
  transaction_date: string,
  description: string,
  account_id: string,
  category_id?: string,
  contact_id?: string,
  tag_ids?: string[]
}
```

### Advanced Features
- **Multi-Tagging**: Flexible categorization with multiple tags
- **Recurring Transactions**: Automated recurring transaction creation
- **Tax Handling**: Tax calculation and reporting support
- **Audit Trail**: Complete transaction history with user attribution

---

## Calendar and Scheduling

### Overview
The calendar system coordinates lesson sessions, teacher availability, student schedules, and group meetings.

### Scheduling Logic

#### Session Placement
- **Time Slot Management**: Manages available time slots for teachers and students
- **Conflict Resolution**: Automatically detects and prevents scheduling conflicts
- **Resource Allocation**: Ensures proper allocation of teachers and classroom resources

#### Group Session Coordination
- **Multi-Student Scheduling**: Coordinates schedules for all group participants
- **Attendance Tracking**: Manages attendance for group sessions
- **Make-up Sessions**: Handles rescheduling for missed group sessions

---

## Data Validation Rules

### Core Validation Patterns

#### Student Data Validation
- **Email Uniqueness**: Prevents duplicate email addresses across the system
- **Age Group Consistency**: Ensures age group aligns with course requirements
- **Contact Information**: Validates phone numbers and social media handles

#### Financial Data Validation
- **Positive Amounts**: All financial amounts must be positive
- **Currency Consistency**: Transaction currency must match account currency
- **Date Logic**: Payment dates cannot be in the future beyond reasonable limits

#### Schedule Validation
- **Time Format**: Validates HH:MM time format
- **Day Names**: Ensures valid day names (Monday-Sunday)
- **Duration Limits**: Reasonable session duration limits (15-240 minutes)

---

## Error Handling Patterns

### Common Error Scenarios

#### Database Errors
- **Constraint Violations**: Handles unique constraint and foreign key errors
- **Connection Issues**: Manages database connection failures
- **Transaction Rollbacks**: Ensures data consistency during failures

#### Business Logic Errors
- **Validation Failures**: User-friendly messages for validation errors
- **Conflict Detection**: Clear messaging for scheduling conflicts
- **Permission Denied**: Appropriate handling of access control violations

#### Integration Errors
- **Payment Processing**: Handles payment gateway failures
- **Email Delivery**: Manages notification delivery failures
- **File Operations**: Handles file upload and processing errors

### Error Response Format
```typescript
interface ErrorResponse {
  error: string,
  detail?: string,
  code?: string,
  message?: string,
  suggestions?: string[]
}
```

---

## Performance Considerations

### Database Optimization
- **Query Optimization**: Efficient queries with proper indexing
- **Batch Operations**: Bulk operations for session creation and updates
- **Connection Pooling**: Optimal database connection management

### Caching Strategies
- **Query Caching**: Caches frequently accessed data
- **Real-time Updates**: Invalidates caches when data changes
- **User Session Caching**: Maintains user context efficiently

### Scalability Patterns
- **Pagination**: Handles large datasets efficiently
- **Lazy Loading**: Loads data on demand
- **Background Processing**: Handles intensive operations asynchronously

---

*Last Updated: January 1, 2025*
