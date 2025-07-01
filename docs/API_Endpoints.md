
# API Endpoints Documentation

This document outlines all the key API endpoints available in the School Management System, including their usage, parameters, and expected outputs.

## Table of Contents

1. [Authentication Endpoints](#authentication-endpoints)
2. [Student Management](#student-management)
3. [Course Management](#course-management)
4. [Teacher Management](#teacher-management)
5. [Payment Management](#payment-management)
6. [Subscription Management](#subscription-management)
7. [Lesson Session Management](#lesson-session-management)
8. [Group Management](#group-management)
9. [Financial Management](#financial-management)
10. [Contact Management](#contact-management)
11. [Settings Management](#settings-management)
12. [Calendar Management](#calendar-management)

---

## Authentication Endpoints

### User Login
**RPC Function:** `user_login`
- **Purpose:** Authenticate users and retrieve their profile information
- **Parameters:**
  ```typescript
  {
    email: string,
    password: string
  }
  ```
- **Expected Output:**
  ```typescript
  {
    success: boolean,
    user_id?: string,
    first_name?: string,
    last_name?: string,
    role?: string,
    school_id?: string,
    message?: string
  }
  ```

### School Setup
**RPC Function:** `setup_school`
- **Purpose:** Initialize a new school with admin user
- **Parameters:**
  ```typescript
  {
    school_name: string,
    admin_email: string,
    admin_password: string,
    admin_first_name: string,
    admin_last_name: string,
    license_key: string
  }
  ```
- **Expected Output:**
  ```typescript
  {
    success: boolean,
    school_id?: string,
    user_id?: string,
    message?: string
  }
  ```

---

## Student Management

### Get Students with Details
**RPC Function:** `get_students_with_details`
- **Purpose:** Retrieve comprehensive student information including course and payment details
- **Parameters:**
  ```typescript
  {
    p_school_id: string
  }
  ```
- **Expected Output:**
  ```typescript
  Array<{
    id: string,
    first_name: string,
    last_name: string,
    email: string,
    phone?: string,
    course_name: string,
    lesson_type: 'individual' | 'group',
    age_group: 'adult' | 'kid',
    level: string,
    teacher_id?: string,
    teacher_name?: string,
    payment_status?: 'paid' | 'pending' | 'overdue',
    next_payment_date?: string,
    next_payment_amount?: number,
    lessons_count?: number,
    next_session_date?: string,
    subscription_progress?: string
  }>
  ```

### Create Student
**Edge Function:** `create_student`
- **Purpose:** Create a new student with user account
- **Parameters:**
  ```typescript
  {
    student_email: string,
    student_password: string,
    student_first_name: string,
    student_last_name: string,
    teacher_id: string,
    course_id: string,
    age_group: string,
    level: string,
    phone?: string,
    current_user_id: string
  }
  ```
- **Expected Output:**
  ```typescript
  {
    success: boolean,
    student_id?: string,
    user_id?: string,
    message?: string
  }
  ```

### Update Student
**Table:** `students`
- **Method:** Direct table update
- **Parameters:**
  ```typescript
  {
    id: string, // Student ID
    updates: Partial<{
      first_name: string,
      last_name: string,
      phone: string,
      age_group: string,
      level: string,
      teacher_id: string,
      course_id: string
    }>
  }
  ```

### Delete Student
**Table:** `students`
- **Method:** Direct table deletion with CASCADE
- **Parameters:**
  ```typescript
  {
    id: string // Student ID
  }
  ```

---

## Course Management

### Get School Courses
**RPC Function:** `get_school_courses`
- **Purpose:** Retrieve all courses for a specific school
- **Parameters:**
  ```typescript
  {
    p_school_id: string
  }
  ```
- **Expected Output:**
  ```typescript
  Array<{
    id: string,
    school_id: string,
    name: string,
    lesson_type: 'individual' | 'group',
    created_at: string,
    updated_at: string
  }>
  ```

### Create Course
**Edge Function:** `create_course`
- **Purpose:** Create a new course for a school
- **Headers:**
  ```typescript
  {
    'x-user-id': string,
    'x-school-id': string,
    'x-user-role': string
  }
  ```
- **Parameters:**
  ```typescript
  {
    course_name: string,
    lesson_type: 'individual' | 'group',
    school_id: string
  }
  ```
- **Expected Output:**
  ```typescript
  {
    id: string,
    school_id: string,
    name: string,
    lesson_type: 'individual' | 'group',
    created_at: string,
    updated_at: string
  }
  ```

### Update Course
**RPC Function:** `update_course`
- **Purpose:** Update an existing course
- **Parameters:**
  ```typescript
  {
    p_course_id: string,
    p_name: string,
    p_lesson_type: string
  }
  ```

### Delete Course
**Table:** `courses`
- **Method:** Direct table deletion
- **Parameters:**
  ```typescript
  {
    id: string // Course ID
  }
  ```

---

## Teacher Management

### Get School Teachers
**RPC Function:** `get_team_members` (filtered for teachers)
- **Purpose:** Retrieve all teachers for a specific school
- **Parameters:**
  ```typescript
  {
    p_school_id: string
  }
  ```
- **Expected Output:**
  ```typescript
  Array<{
    id: string,
    first_name: string,
    last_name: string,
    email: string,
    role: 'teacher',
    display_name: string
  }>
  ```

### Get Team Members
**RPC Function:** `get_team_members`
- **Purpose:** Retrieve all team members (admins and teachers) for a school
- **Parameters:**
  ```typescript
  {
    p_school_id: string
  }
  ```
- **Expected Output:**
  ```typescript
  Array<{
    id: string,
    first_name: string,
    last_name: string,
    email: string,
    role: 'admin' | 'teacher'
  }>
  ```

---

## Payment Management

### Get Student Payments
**RPC Function:** `get_student_payments`
- **Purpose:** Retrieve payment history for a specific student
- **Parameters:**
  ```typescript
  {
    p_student_id: string
  }
  ```
- **Expected Output:**
  ```typescript
  Array<{
    id: string,
    student_id: string,
    amount: number,
    currency: string,
    payment_date: string,
    payment_method: string,
    status: string,
    notes?: string,
    created_at: string
  }>
  ```

### Add Student Payment
**Table:** `student_payments`
- **Method:** Direct table insertion
- **Parameters:**
  ```typescript
  {
    student_id: string,
    amount: number,
    currency: string,
    payment_date: string,
    payment_method: string,
    status: string,
    notes?: string
  }
  ```

### Delete Student Payment
**RPC Function:** `delete_student_payment`
- **Purpose:** Delete a student payment record
- **Parameters:**
  ```typescript
  {
    p_payment_id: string,
    p_current_user_id: string,
    p_current_school_id: string
  }
  ```

---

## Subscription Management

### Get Student Subscriptions
**RPC Function:** `get_student_subscriptions`
- **Purpose:** Retrieve all subscriptions for a specific student
- **Parameters:**
  ```typescript
  {
    p_student_id: string
  }
  ```
- **Expected Output:**
  ```typescript
  Array<{
    id: string,
    student_id: string,
    session_count: number,
    duration_months: number,
    start_date: string,
    schedule: any,
    price_mode: string,
    price_per_session?: number,
    fixed_price?: number,
    total_price: number,
    currency: string,
    notes?: string,
    status: string,
    created_at: string
  }>
  ```

### Add Student Subscription
**RPC Function:** `add_student_subscription`
- **Purpose:** Create a new subscription for a student with automatic session generation
- **Parameters:**
  ```typescript
  {
    p_student_id: string,
    p_session_count: number,
    p_duration_months: number,
    p_start_date: string,
    p_schedule: any,
    p_price_mode: string,
    p_price_per_session?: number,
    p_fixed_price?: number,
    p_total_price: number,
    p_currency: string,
    p_notes?: string,
    p_status: string,
    p_current_user_id: string,
    p_current_school_id: string,
    p_initial_payment_amount?: number,
    p_payment_method?: string,
    p_payment_notes?: string
  }
  ```

### Update Student Subscription
**RPC Function:** `update_subscription_with_related_data`
- **Purpose:** Update subscription and regenerate sessions if needed
- **Parameters:**
  ```typescript
  {
    p_subscription_id: string,
    p_session_count: number,
    p_duration_months: number,
    p_start_date: string,
    p_schedule: any,
    p_price_mode: string,
    p_price_per_session?: number,
    p_fixed_price?: number,
    p_total_price: number,
    p_currency: string,
    p_notes?: string,
    p_status: string,
    p_current_user_id: string,
    p_current_school_id: string
  }
  ```

### Delete Student Subscription
**RPC Function:** `delete_subscription_with_related_data`
- **Purpose:** Delete subscription and all related sessions
- **Parameters:**
  ```typescript
  {
    p_subscription_id: string,
    p_current_user_id: string,
    p_current_school_id: string
  }
  ```

---

## Lesson Session Management

### Get Lesson Sessions
**RPC Function:** `get_lesson_sessions`
- **Purpose:** Retrieve lesson sessions for a specific student
- **Parameters:**
  ```typescript
  {
    p_student_id: string
  }
  ```
- **Expected Output:**
  ```typescript
  Array<{
    id: string,
    subscription_id: string,
    student_id: string,
    scheduled_date: string,
    duration_minutes: number,
    status: string,
    payment_status: string,
    cost: number,
    notes?: string,
    created_at: string,
    index_in_sub?: number,
    counts_toward_completion?: boolean,
    original_session_index?: number,
    moved_from_session_id?: string
  }>
  ```

### Handle Session Action
**RPC Function:** `handle_session_action`
- **Purpose:** Perform actions on lesson sessions (complete, skip, reschedule, etc.)
- **Parameters:**
  ```typescript
  {
    p_session_id: string,
    p_action: string, // 'complete', 'skip', 'reschedule', etc.
    p_new_datetime?: string // Required for reschedule action
  }
  ```

---

## Group Management

### Get School Groups
**RPC Function:** `get_school_groups`
- **Purpose:** Retrieve all groups for a specific school
- **Parameters:**
  ```typescript
  {
    p_school_id: string
  }
  ```
- **Expected Output:**
  ```typescript
  Array<{
    id: string,
    school_id: string,
    course_id: string,
    teacher_id: string,
    name: string,
    description?: string,
    max_students: number,
    current_students_count: number,
    schedule: any,
    price_mode: string,
    price_per_session?: number,
    fixed_monthly_price?: number,
    status: string,
    created_at: string
  }>
  ```

### Create Group
**Table:** `groups`
- **Method:** Direct table insertion
- **Parameters:**
  ```typescript
  {
    school_id: string,
    course_id: string,
    teacher_id: string,
    name: string,
    description?: string,
    max_students: number,
    schedule: any,
    price_mode: string,
    price_per_session?: number,
    fixed_monthly_price?: number,
    status: string
  }
  ```

### Group Student Enrollment
**Table:** `group_students`
- **Method:** Direct table insertion/update
- **Parameters:**
  ```typescript
  {
    group_id: string,
    student_id: string,
    start_date: string,
    end_date?: string,
    status: 'active' | 'inactive'
  }
  ```

---

## Financial Management

### Get School Transactions
**RPC Function:** `get_school_transactions`
- **Purpose:** Retrieve all financial transactions for a school
- **Parameters:**
  ```typescript
  {
    p_school_id: string
  }
  ```
- **Expected Output:**
  ```typescript
  Array<{
    id: string,
    school_id: string,
    type: 'income' | 'expense' | 'transfer',
    amount: number,
    currency: string,
    transaction_date: string,
    description: string,
    notes?: string,
    contact_id?: string,
    category_id?: string,
    from_account_id?: string,
    to_account_id?: string,
    payment_method: string,
    receipt_number?: string,
    receipt_url?: string,
    tax_amount?: number,
    tax_rate?: number,
    is_recurring?: boolean,
    recurring_frequency?: string,
    recurring_end_date?: string
  }>
  ```

### Create Transaction
**RPC Function:** `create_transaction`
- **Purpose:** Create a new financial transaction
- **Parameters:**
  ```typescript
  {
    p_school_id: string,
    p_type: 'income' | 'expense' | 'transfer',
    p_amount: number,
    p_currency: string,
    p_transaction_date: string,
    p_description: string,
    p_notes?: string,
    p_contact_id?: string,
    p_category_id?: string,
    p_from_account_id?: string,
    p_to_account_id?: string,
    p_payment_method?: string,
    p_receipt_number?: string,
    p_receipt_url?: string,
    p_tax_amount?: number,
    p_tax_rate?: number,
    p_is_recurring?: boolean,
    p_recurring_frequency?: string,
    p_recurring_end_date?: string,
    p_tag_ids?: string[]
  }
  ```

### Get School Tags
**RPC Function:** `get_school_tags`
- **Purpose:** Retrieve transaction tags for a school
- **Parameters:**
  ```typescript
  {
    p_school_id: string
  }
  ```
- **Expected Output:**
  ```typescript
  Array<{
    id: string,
    school_id: string,
    name: string,
    color: string,
    created_at: string,
    updated_at: string
  }>
  ```

---

## Contact Management

### Get School Contact Types
**Table:** `contact_types`
- **Method:** Direct table query
- **Parameters:**
  ```typescript
  {
    school_id: string,
    is_active: true
  }
  ```
- **Expected Output:**
  ```typescript
  Array<{
    id: string,
    school_id: string,
    name: string,
    color: string,
    is_active: boolean,
    created_at: string,
    updated_at: string
  }>
  ```

### Create Contact Type
**Table:** `contact_types`
- **Method:** Direct table insertion
- **Parameters:**
  ```typescript
  {
    school_id: string,
    name: string,
    color: string
  }
  ```

### Update Contact Type
**Table:** `contact_types`
- **Method:** Direct table update
- **Parameters:**
  ```typescript
  {
    id: string,
    name: string,
    color: string,
    updated_at: string
  }
  ```

---

## Settings Management

### Get Current User Info
**Function:** `getCurrentUserInfo`
- **Purpose:** Get current user's school and role information
- **Parameters:** None (uses localStorage)
- **Expected Output:**
  ```typescript
  Array<{
    user_school_id: string,
    user_role: string
  }>
  ```

### Student Levels Management
**Table:** `student_levels`
- **Purpose:** Manage configurable student skill levels
- **Operations:** CREATE, READ, UPDATE, DELETE
- **Parameters:**
  ```typescript
  {
    school_id: string,
    name: string,
    color: string,
    sort_order: number,
    is_active: boolean
  }
  ```

### Accounts Management
**Table:** `accounts`
- **Purpose:** Manage financial accounts (bank accounts, cash, etc.)
- **Operations:** CREATE, READ, UPDATE, DELETE
- **Parameters:**
  ```typescript
  {
    school_id: string,
    currency_id: string,
    name: string,
    type: string, // 'General', 'Cash', 'Current Account', etc.
    account_number?: string,
    color: string,
    exclude_from_stats: boolean,
    is_archived: boolean
  }
  ```

---

## Calendar Management

### Generate Sessions
**RPC Function:** `generate_sessions`
- **Purpose:** Generate lesson sessions based on subscription schedule
- **Parameters:**
  ```typescript
  {
    p_subscription_id: string,
    p_schedule: any, // JSON schedule object
    p_start_date: string,
    p_duration_months: number,
    p_session_count: number
  }
  ```

---

## License Management

### Licenses Table
**Table:** `licenses`
- **Purpose:** Software licensing system for school subscriptions
- **Operations:** CREATE, READ, UPDATE (Admin only)
- **Parameters:**
  ```typescript
  {
    license_key: string,
    duration_days: number,
    expires_at: string,
    is_active: boolean
  }
  ```

---

## Error Handling

All endpoints follow a consistent error response format:

```typescript
{
  error: string,
  detail?: string,
  code?: string,
  message?: string
}
```

## Authentication & Authorization

- **RLS (Row Level Security)** is enabled on all tables
- **Role-based access control** with roles: `superadmin`, `admin`, `teacher`, `student`
- **School-based data isolation** ensures users only access their school's data
- **JWT tokens** are used for authentication via Supabase Auth

## Rate Limiting

- Edge functions have built-in rate limiting
- Database operations are protected by RLS policies
- Consider implementing client-side caching for frequently accessed data

## Best Practices

1. **Always validate user permissions** before database operations
2. **Use RPC functions** for complex operations that require multiple table interactions
3. **Implement proper error handling** in client applications
4. **Cache frequently accessed data** like courses and teachers
5. **Use transactions** for operations that modify multiple tables
6. **Validate input data** before sending to endpoints
7. **Handle edge cases** like deleted references and inactive records

---

*Last Updated: January 1, 2025*
