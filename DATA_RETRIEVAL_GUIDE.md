# Data Retrieval Guide - Kool-Skool CRM

## Overview
This guide documents the **standardized patterns for retrieving data** in the Kool-Skool CRM application. It serves as the **definitive reference** for consistent data fetching across all components based on **working, tested implementations**.

## Data Storage Architecture

### Current State (Hybrid Approach)
- **Firebase Firestore**: Primary storage for students, TODOs, payments, transactions, and school data
- **Supabase**: Used for subscriptions, sessions, courses, accounts, and expected payments
- **Mixed Naming**: Some Supabase tables/functions are accessed via Firebase services (legacy naming)

## Core Data Retrieval Patterns

### 1. Students Data Retrieval

#### Primary Method (From Firebase)
```typescript
import { databaseService } from '@/services/firebase/database.service';

// Fetch students by school ID - ALWAYS USE THIS METHOD
const studentsData = await databaseService.getBySchoolId('students', schoolId);

// Data transformation pattern (handles both camelCase and snake_case)
const formattedStudents = studentsData.map((student: any) => ({
  id: student.id || student.studentId,
  studentId: student.studentId || student.id,
  firstName: student.firstName || student.first_name || '',
  lastName: student.lastName || student.last_name || '',
  email: student.email || '',
  phone: student.phone || '',
  schoolId: student.schoolId || student.school_id || schoolId,
  status: student.status || 'active',
  courseName: student.courseName || student.course_name || '',
  level: student.level || '',
  teacherId: student.teacherId || student.teacher_id || '',
  groupId: student.groupId || student.group_id || '',
  // ... additional fields with fallbacks
}));
```

#### Reference Implementation
- **File**: `/src/pages/Students.tsx`
- **Hook**: `useQuery` with key `['students', schoolId]`

### 2. Subscriptions Data Retrieval

#### Primary Method (Supabase RPC with Real-time Progress)
```typescript
import { supabase } from '@/integrations/supabase/client';

// Get subscriptions with real-time session progress
const { data: subscriptions } = await supabase.rpc('get_student_subscriptions', {
  p_student_id: studentId
});

// Response includes:
// - sessions_completed, sessions_attended, sessions_cancelled, sessions_scheduled
// - price, currency, total_sessions, start_date, end_date
// - course_name, teacher_id, subscription_type
```

#### Payment Calculation for Subscriptions (Firebase)
```typescript
// Get payments linked to subscription from Firebase
const { databaseService } = await import('@/services/firebase/database.service');

// Student payments
const studentPayments = await databaseService.query('payments', {
  where: [
    { field: 'student_id', operator: '==', value: studentId },
    { field: 'type', operator: '==', value: 'income' }
  ]
});

// Transaction payments
const transactionPayments = await databaseService.query('transactions', {
  where: [
    { field: 'subscription_id', operator: '==', value: subscriptionId },
    { field: 'type', operator: '==', value: 'income' }
  ]
});

// Calculate total paid (avoid double counting)
const totalPaid = Math.max(studentPaymentTotal, transactionPaymentTotal);
```

#### Reference Implementation
- **File**: `/src/components/student-tabs/SubscriptionsTab.tsx`
- **Hook**: `useQuery` with key `['student-subscriptions-rpc', studentId]`

### 3. Sessions Data Retrieval

#### Sessions by Subscription (Supabase)
```typescript
// Get sessions for a subscription
const { data: sessions } = await supabase
  .from('lesson_sessions')
  .select('*')
  .eq('subscription_id', subscriptionId)
  .order('scheduled_date', { ascending: true });

// Session status management
const updateSessionStatus = async (sessionId: string, newStatus: string) => {
  await supabase
    .from('lesson_sessions')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', sessionId);
};
```

#### Attendance Page Sessions (with Student/Subscription Info)
```typescript
// Fetch sessions with joined data for attendance
const { data: sessions } = await supabase
  .from('lesson_sessions')
  .select(`
    *,
    students!inner(
      id,
      user_id,
      users!inner(first_name, last_name)
    ),
    student_subscriptions(
      subscription_name,
      price,
      currency,
      total_sessions
    )
  `)
  .in('student_id', studentIds)
  .gte('scheduled_date', startDate.toISOString())
  .lte('scheduled_date', endDate.toISOString())
  .order('scheduled_date', { ascending: true });
```

#### Reference Implementation
- **File**: `/src/components/student-tabs/SessionsTab.tsx`
- **File**: `/src/pages/Attendance.tsx`
- **Hook**: `useAttendanceData` in `/src/hooks/useAttendanceData.ts`

### 4. Payments Data Retrieval

#### Student Payments (Mixed Sources)

##### From Firebase (Primary for Transactions)
```typescript
import { databaseService } from '@/services/firebase/database.service';

// Get all payments for a student
const payments = await databaseService.query('payments', {
  where: [
    { field: 'student_id', operator: '==', value: studentId }
  ],
  orderBy: [
    { field: 'payment_date', direction: 'desc' }
  ]
});
```

##### From Supabase (Legacy student_payments table)
```typescript
// Note: This table exists but is being phased out
const { data: payments } = await supabase
  .from('student_payments')
  .select('*')
  .eq('student_id', studentId)
  .order('payment_date', { desc: true });
```

#### Add New Payment (Firebase)
```typescript
const paymentData = {
  student_id: studentId,
  subscription_id: subscriptionId || null,
  amount: amount,
  currency: currency,
  payment_date: paymentDate,
  payment_method: method,
  status: 'completed',
  type: 'income',
  description: description,
  school_id: schoolId
};

const paymentId = await databaseService.create('payments', paymentData);
```

#### Reference Implementation
- **File**: `/src/components/student-tabs/PaymentsTab.tsx`

### 5. Courses Data Retrieval

#### From Supabase (Primary Storage)
```typescript
import { getSchoolCourses, createCourse, updateCourse, deleteCourse } from '@/integrations/supabase/client';

// Fetch all courses for school
const courses = await getSchoolCourses(schoolId);

// Create new course
await createCourse(courseName, courseType); // 'individual' | 'group'

// Update course
await updateCourse(courseId, { name: newName, type: newType });

// Delete course
await deleteCourse(courseId);
```

#### Reference Implementation
- **File**: `/src/pages/Courses.tsx`

### 6. Financial Data Retrieval

#### Account Balances (Supabase)
```typescript
// Get all account balances
const { data: accounts } = await supabase
  .from('accounts_balance_section')
  .select('*')
  .eq('school_id', schoolId);

// Response includes: account_name, currency, balance
```

#### Transactions (Firebase)
```typescript
// Get all transactions for the school
const transactions = await databaseService.query('transactions', {
  where: [
    { field: 'school_id', operator: '==', value: schoolId }
  ],
  orderBy: [
    { field: 'transaction_date', direction: 'desc' }
  ]
});

// Add new transaction
const transactionData = {
  type: 'income' | 'expense' | 'transfer',
  amount: amount,
  currency: currency,
  description: description,
  payment_method: method,
  category: category,
  transaction_date: date,
  school_id: schoolId,
  from_account: fromAccountId, // for transfers
  to_account: toAccountId, // for transfers
};

await databaseService.create('transactions', transactionData);
```

#### Expected Payments (Supabase)
```typescript
// Get expected payments
const { data: expectedPayments } = await supabase
  .from('expected_payments')
  .select(`
    *,
    students!inner(
      user_id,
      users!inner(first_name, last_name)
    ),
    student_subscriptions(
      subscription_name,
      price,
      currency
    )
  `)
  .eq('school_id', schoolId)
  .eq('status', 'pending')
  .order('due_date', { ascending: true });
```

#### Financial Summary Calculations
```typescript
// Get financial totals using RPC
const { data: summary } = await supabase
  .rpc('get_school_financial_summary', {
    p_school_id: schoolId,
    p_start_date: startDate,
    p_end_date: endDate
  });

// Or calculate manually
const netIncome = incomeTotal - expensesTotal;
const totalRevenue = paymentsTotal;
const totalExpenses = expensesTotal;
```

#### Reference Implementation
- **File**: `/src/pages/Finances.tsx`
- **File**: `/src/components/AccountsBalanceSection.tsx`
- **File**: `/src/components/ExpectedPaymentsSection.tsx`

### 7. Attendance & Session Management

#### Load Sessions with Full Context
```typescript
// Using the useAttendanceData hook
import { useAttendanceData } from '@/hooks/useAttendanceData';

const {
  sessions,
  subscriptionInfoMap, // Maps subscription IDs to subscription details
  studentInfoMap,      // Maps student IDs to student details
  loading,
  error,
  loadSessions,
  refreshSessions,
  updateSessionOptimistically,
  revertSessionUpdate
} = useAttendanceData(userTimezone);
```

#### Session Actions
```typescript
// Mark attendance
await supabase
  .from('lesson_sessions')
  .update({ status: 'attended' })
  .eq('id', sessionId);

// Cancel session
await supabase
  .from('lesson_sessions')
  .update({
    status: 'cancelled',
    cancellation_reason: reason
  })
  .eq('id', sessionId);

// Reschedule session
await supabase
  .from('lesson_sessions')
  .update({
    scheduled_date: newDate,
    start_time: newStartTime,
    end_time: newEndTime
  })
  .eq('id', sessionId);
```

#### Reference Implementation
- **File**: `/src/pages/Attendance.tsx`
- **File**: `/src/hooks/useAttendanceData.ts`
- **File**: `/src/components/calendar/UpcomingLessonsList.tsx`

### 8. TODOs Data Retrieval

#### From Firebase
```typescript
import { todosService } from '@/services/firebase/todos.service';

// For teachers
const todos = await todosService.getByTeacherId(teacherId);

// For admin/school
const todos = await todosService.getBySchoolId(schoolId);

// For specific student
const todos = await todosService.getByStudentId(studentId);

// Create TODO
const todoData = {
  title: title,
  description: description,
  student_id: studentId,
  teacher_id: teacherId,
  school_id: schoolId,
  category: 'homework' | 'assessment' | 'practice' | 'other',
  priority: 'low' | 'medium' | 'high' | 'urgent',
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled',
  due_date: dueDate
};

await todosService.create(todoData);
```

#### Reference Implementation
- **File**: `/src/pages/Todos.tsx`

## Important Patterns & Conventions

### 1. Data Source Quick Reference

| Data Type | Storage | Service/Method | Table/Collection |
|-----------|---------|----------------|------------------|
| Students | Firebase | `databaseService.getBySchoolId` | `students` |
| Subscriptions | Supabase | `supabase.rpc('get_student_subscriptions')` | `student_subscriptions` |
| Sessions | Supabase | `supabase.from('lesson_sessions')` | `lesson_sessions` |
| Payments | Firebase | `databaseService.query('payments')` | `payments` |
| Transactions | Firebase | `databaseService.query('transactions')` | `transactions` |
| Courses | Supabase | `getSchoolCourses()` | `courses` |
| Accounts | Supabase | `supabase.from('accounts_balance_section')` | `accounts_balance_section` |
| Expected Payments | Supabase | `supabase.from('expected_payments')` | `expected_payments` |
| TODOs | Firebase | `todosService` | `todos` |

### 2. Field Name Conventions

Always check for both naming conventions:
```typescript
// Firebase uses both camelCase and snake_case
const value = data.fieldName || data.field_name || defaultValue;

// Common mappings
student.firstName || student.first_name
student.schoolId || student.school_id
student.paymentStatus || student.payment_status
subscription.pricePerSession || subscription.price_per_session
```

### 3. User Context & School ID

Always get schoolId from user context:
```typescript
// From React Context
const { user } = useContext(UserContext);
const schoolId = user?.schoolId;

// From localStorage (fallback)
const getUserData = () => {
  const userData = localStorage.getItem('user');
  if (!userData) return null;
  const user = JSON.parse(userData);
  return user.schoolId;
};
```

### 4. React Query Patterns

Standard query key structure:
```typescript
// Format: [entity-type, identifier, ...filters]
queryKey: ['students', schoolId]
queryKey: ['student-subscriptions-rpc', studentId]
queryKey: ['transactions', schoolId, dateRange]
queryKey: ['expected-payments', schoolId]
```

### 5. Error Handling Pattern

```typescript
try {
  const data = await fetchFunction();
  if (!data) {
    console.log('No data found');
    return [];
  }
  return processData(data);
} catch (error) {
  console.error('Error fetching data:', error);
  toast.error('Failed to load data');
  return [];
}
```

### 6. Optimistic Updates

For immediate UI feedback:
```typescript
// Update UI immediately
setLocalState(newValue);

// Then sync with backend
try {
  await updateBackend(newValue);
} catch (error) {
  // Revert on failure
  setLocalState(oldValue);
  toast.error('Update failed');
}
```

## Debugging Checklist

When data isn't showing:

1. **Check Console for Errors**
   - Look for network errors
   - Check for permission errors
   - Verify RPC function names

2. **Verify User Context**
   ```typescript
   console.log('User:', user);
   console.log('School ID:', user?.schoolId);
   ```

3. **Check Data Source**
   - Firebase: Use `databaseService` or specific services
   - Supabase: Use `supabase.from()` or RPC functions

4. **Verify Field Names**
   - Check both camelCase and snake_case
   - Log the raw data to see actual field names

5. **Check Query Keys**
   - Ensure React Query keys are unique
   - Include all dependencies in the key array

6. **Verify Imports**
   ```typescript
   // Firebase services
   import { databaseService } from '@/services/firebase/database.service';

   // Supabase client
   import { supabase } from '@/integrations/supabase/client';
   ```

## Testing Data Retrieval

### Test Queries in Console

```javascript
// Test Firebase query
const { databaseService } = await import('/src/services/firebase/database.service');
const students = await databaseService.getBySchoolId('students', 'your-school-id');
console.log('Students:', students);

// Test Supabase query
const { supabase } = await import('/src/integrations/supabase/client');
const { data, error } = await supabase.from('courses').select('*');
console.log('Courses:', data, 'Error:', error);
```

## Migration Notes

### Current Migration Status
- ✅ Students: Firebase (complete)
- ✅ Subscriptions: Supabase with RPC (complete)
- ✅ Sessions: Supabase (complete)
- ⚠️ Payments: Mixed (Firebase primary, Supabase legacy)
- ✅ Transactions: Firebase (complete)
- ✅ Courses: Supabase (complete)
- ✅ Accounts: Supabase (complete)
- ✅ TODOs: Firebase (complete)

### Future Consolidation
The goal is to eventually consolidate all data in Supabase for better relational queries and consistency.

---

**Last Updated**: September 2025
**Version**: 2.0
**Maintainer**: Kool-Skool Development Team

## Quick Reference Examples

### Get Everything for a Student
```typescript
// Student details
const student = await databaseService.getById('students', studentId);

// Subscriptions with progress
const { data: subscriptions } = await supabase.rpc('get_student_subscriptions', {
  p_student_id: studentId
});

// Payments
const payments = await databaseService.query('payments', {
  where: [{ field: 'student_id', operator: '==', value: studentId }]
});

// Sessions
const { data: sessions } = await supabase
  .from('lesson_sessions')
  .select('*')
  .eq('student_id', studentId);

// TODOs
const todos = await todosService.getByStudentId(studentId);
```

### Get School Overview
```typescript
// All students
const students = await databaseService.getBySchoolId('students', schoolId);

// All courses
const courses = await getSchoolCourses(schoolId);

// Financial summary
const { data: accounts } = await supabase
  .from('accounts_balance_section')
  .select('*')
  .eq('school_id', schoolId);

// Expected payments
const { data: expectedPayments } = await supabase
  .from('expected_payments')
  .select('*')
  .eq('school_id', schoolId)
  .eq('status', 'pending');

// Recent transactions
const transactions = await databaseService.query('transactions', {
  where: [{ field: 'school_id', operator: '==', value: schoolId }],
  orderBy: [{ field: 'transaction_date', direction: 'desc' }],
  limit: 50
});
```