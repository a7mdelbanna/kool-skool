# Development Gotchas and Tricky Parts

This document highlights the tricky aspects, edge cases, and gotchas that developers should be aware of when working with the School Management System.

## Table of Contents

1. [Authentication Gotchas](#authentication-gotchas)
2. [Database and RLS Issues](#database-and-rls-issues)
3. [Session Generation Complexities](#session-generation-complexities)
4. [Frontend State Management](#frontend-state-management)
5. [Data Flow and Caching](#data-flow-and-caching)
6. [Timezone and Date Handling](#timezone-and-date-handling)
7. [Component Architecture Pitfalls](#component-architecture-pitfalls)
8. [Business Logic Edge Cases](#business-logic-edge-cases)
9. [Performance Gotchas](#performance-gotchas)
10. [Development Workflow Issues](#development-workflow-issues)

---

## Authentication Gotchas

### 1. **Not Using Supabase Auth** ⚠️
**The Big One**: This system uses completely custom authentication, NOT Supabase Auth.

```typescript
// ❌ DON'T DO THIS - Supabase Auth methods won't work
const { data: { user } } = await supabase.auth.getUser();
const { error } = await supabase.auth.signUp({ email, password });

// ✅ DO THIS - Use custom RPC functions
const { data: loginResults } = await supabase.rpc('verify_admin_login', {
  p_email: email,
  p_password: password
});
```

**Why This Matters**:
- `auth.uid()` always returns `null` in RLS policies
- Supabase auth hooks and methods don't work
- Session management is entirely manual

### 2. **RLS Policies That Don't Work**
Many RLS policies reference `auth.uid()` but it's always null:

```sql
-- ❌ This policy will never work
CREATE POLICY "Users can view own data" 
ON some_table FOR SELECT 
USING (user_id = auth.uid());

-- ✅ Either disable RLS or use security definer functions
ALTER TABLE some_table DISABLE ROW LEVEL SECURITY;
```

### 3. **Multiple Login Endpoints**
Don't forget there are 3 separate login pages:
- `/login` - Admin and Teacher
- `/student-login` - Students only
- `/superadmin-login` - Super admin only

Each calls different RPC functions with different return structures.

### 4. **localStorage Dependency**
The entire session system depends on localStorage:

```typescript
// If localStorage is cleared/corrupted, user gets logged out
const storedUser = localStorage.getItem('user');
if (!storedUser) {
  // User will be redirected to login
}
```

**Gotcha**: Private browsing, storage limits, or user clearing data breaks sessions.

---

## Database and RLS Issues

### 1. **RLS vs Custom Auth Conflict**
Many tables have RLS enabled but policies that don't work with custom auth:

```sql
-- Common pattern that fails
USING (
  school_id IN (
    SELECT school_id FROM public.users WHERE id = auth.uid()  -- Always null!
  )
)
```

**Solution**: Either disable RLS or rewrite policies to use security definer functions.

### 2. **Circular RLS Dependencies**
Some RLS policies create circular references:

```sql
-- Policy on table A references table B
-- Policy on table B references table A
-- Results in infinite recursion or access denied
```

### 3. **Migration Order Matters**
Database migrations MUST be run in exact chronological order:
- Later migrations depend on earlier ones
- Running out of order causes foreign key constraint errors
- Some migrations modify data that must exist first

### 4. **Foreign Key Constraint Maze**
The database has complex relationships:
```
users -> schools -> licenses
students -> users, schools, courses
subscriptions -> students, groups
lesson_sessions -> subscriptions, students
transactions -> schools, accounts, categories
```

**Gotcha**: Creating data in wrong order causes constraint violations.

### 5. **Password Security Issue**
```sql
-- 🚨 SECURITY WARNING
password_plain TEXT  -- Passwords stored in plain text!
```
This is a known critical security issue that needs fixing.

---

## Session Generation Complexities

### 1. **Session Duplication Problem**
The session generation algorithm has a history of creating duplicates:

```typescript
// These functions have had duplication issues:
// - generate_lesson_sessions
// - generate_lesson_sessions_v1  
// - generate_lesson_sessions_v2 (current, better but not perfect)
```

**Always check for existing sessions** before generating new ones.

### 2. **Schedule JSON Complexity**
Schedule data is stored as JSONB with complex structure:

```json
[
  {"day": "monday", "time": "10:00"},
  {"day": "wednesday", "time": "14:30"}
]
```

**Gotchas**:
- Day names must be lowercase
- Time format must be "HH:MM" 
- Invalid JSON breaks session generation
- Timezone handling is inconsistent

### 3. **Subscription Lifecycle Issues**
```typescript
// Session generation happens automatically when:
// - Creating new subscription
// - Renewing subscription  
// - Updating subscription schedule
// - Adding students to groups

// But can fail if:
// - Schedule is invalid
// - Dates are in the past
// - Teacher conflicts exist
// - Database constraints violated
```

### 4. **Index Tracking Problems**
Sessions have multiple index fields:
- `index_in_sub` - Position within subscription
- `original_session_index` - For moved sessions
- Session numbering can get out of sync

---

## Frontend State Management

### 1. **React Query vs Context Conflicts**
The app uses both React Query for server state and Context for user state:

```typescript
// User state in Context (localStorage)
const { user } = useContext(UserContext);

// Server state in React Query  
const { data: students } = useQuery(['students']);

// These can get out of sync!
```

### 2. **Manual Query Invalidation**
After mutations, you must manually invalidate queries:

```typescript
// ❌ Forgetting this means stale data
await createStudent(data);

// ✅ Must invalidate related queries
queryClient.invalidateQueries(['students']);
queryClient.invalidateQueries(['school-stats']);
```

### 3. **Cross-Tab Synchronization**
User sessions sync across browser tabs via storage events:

```typescript
// This can cause unexpected behavior
window.addEventListener('storage', handleStorage);
```

If one tab logs out, all tabs lose session immediately.

### 4. **Context Provider Hierarchy**
```typescript
// App.tsx has nested providers that must be in correct order
<QueryClientProvider>
  <UserContext.Provider>
    <PaymentProvider>  {/* Only for admin routes */}
      <MainLayout />
    </PaymentProvider>
  </UserContext.Provider>
</QueryClientProvider>
```

---

## Data Flow and Caching

### 1. **Sample Data vs Real Data**
The dashboard shows **hardcoded sample data**, not database data:

```typescript
// src/pages/Index.tsx
const sampleStats = {
  totalStudents: 156,
  activeTeachers: 12,
  totalRevenue: 47500,
  // ... more fake data
};
```

**Gotcha**: New developers think the dashboard is broken when it shows fake data.

### 2. **Optimistic Updates Gone Wrong**
Some components update UI before server confirmation:

```typescript
// UI updates immediately
setLocalState(newValue);

// But server call might fail
const result = await updateServer(newValue);
if (result.error) {
  // UI is now out of sync!
}
```

### 3. **Stale Data Dependencies**
React Query dependencies can cause stale data:

```typescript
// Query depends on user.schoolId
const { data } = useQuery(
  ['students', user?.schoolId],
  () => fetchStudents(user.schoolId),
  { enabled: !!user?.schoolId }
);

// If user changes but query doesn't refetch...
```

---

## Timezone and Date Handling

### 1. **Inconsistent Timezone Handling**
Three different timezone sources:
- Browser timezone (automatic)
- User timezone preference (`users.timezone`)
- School timezone (`schools.timezone`)

**No clear hierarchy** for which takes precedence.

### 2. **Date Storage vs Display**
```typescript
// Database stores UTC timestamps
scheduled_date: "2025-01-15T14:00:00.000Z"

// But display logic is inconsistent
// Sometimes shows UTC, sometimes local, sometimes school timezone
```

### 3. **Daylight Saving Time Issues**
Session generation doesn't account for DST transitions:
- Sessions scheduled during "spring forward" hour don't exist
- Sessions during "fall back" hour are ambiguous

### 4. **Date-fns vs Native Date**
The app uses both date-fns and native Date objects inconsistently:

```typescript
// Mixed usage causes bugs
import { format } from 'date-fns';
const formatted = format(new Date(), 'yyyy-MM-dd');
const native = new Date().toLocaleDateString();
```

---

## Component Architecture Pitfalls

### 1. **Massive Component Files**
Many components are 200+ lines and do too much:

```typescript
// src/components/CreateGroupDialog.tsx - 300+ lines
// src/pages/Students.tsx - 400+ lines  
// src/components/AddStudentDialog.tsx - 250+ lines
```

**Gotcha**: Hard to modify without breaking other functionality.

### 2. **Props Drilling**
Deep component hierarchies with passed-down props:

```typescript
<StudentTabs>
  <SubscriptionsTab>
    <SubscriptionCard onEdit={onEdit} onDelete={onDelete} />
    <AddSubscriptionDialog onSuccess={onSuccess} />
  </SubscriptionsTab>
</StudentTabs>
```

### 3. **Mixed Concerns in Components**
Components often mix:
- Data fetching
- Business logic
- Form validation  
- UI rendering
- Error handling

### 4. **Inconsistent Error Handling**
```typescript
// Some components use try/catch
try {
  await operation();
} catch (error) {
  toast.error(error.message);
}

// Others use error states
const [error, setError] = useState('');

// Others use React Query error handling
const { error } = useQuery(...);
```

---

## Business Logic Edge Cases

### 1. **Teacher Schedule Conflicts**
The conflict detection algorithm has gaps:
- Doesn't account for travel time between locations
- No buffer time between sessions
- Group sessions vs individual sessions complexity

### 2. **Pricing Calculation Gotchas**
```typescript
// Different pricing modes
price_mode: 'perSession' | 'fixedPrice'

// Calculations can be wrong if:
// - Session count changes after price calculation
// - Currency conversion rates are stale
// - Pro-ration logic has bugs
```

### 3. **Group Enrollment Edge Cases**
- Students can be enrolled in multiple groups simultaneously
- Group capacity limits aren't enforced consistently
- Group sessions generation when students join mid-course

### 4. **Subscription Renewal Logic**
```typescript
// Renewal can fail if:
// - Original subscription schedule is invalid
// - Payment calculation errors
// - Session generation conflicts
// - Database constraint violations
```

---

## Performance Gotchas

### 1. **N+1 Query Problems**
```typescript
// Fetching students
const students = await getStudents();

// Then fetching subscriptions for each student (N+1!)
for (const student of students) {
  const subscriptions = await getSubscriptions(student.id);
}
```

### 2. **Large Dataset Issues**
Several queries don't implement pagination:
- Student lists can be huge
- Transaction history grows indefinitely
- Session data accumulates over time

### 3. **Real-time Updates Missing**
The app doesn't use Supabase real-time features:
- Users must refresh to see changes from other users
- No live updates for schedules or payments
- Can lead to conflicting edits

### 4. **Excessive Re-renders**
```typescript
// Context changes cause full app re-renders
const { user, setUser } = useContext(UserContext);

// Large objects in state cause unnecessary updates
const [formData, setFormData] = useState(largeObject);
```

---

## Development Workflow Issues

### 1. **No TypeScript Strict Mode**
The project has loose TypeScript configuration:
- `any` types used frequently
- Optional chaining overused (`user?.name?.length`)
- Type assertions without proper validation

### 2. **Inconsistent Code Patterns**
```typescript
// Some files use arrow functions
const Component = () => { ... };

// Others use function declarations  
function Component() { ... }

// Some use async/await
const result = await operation();

// Others use .then()
operation().then(result => { ... });
```

### 3. **Missing Error Boundaries**
No React error boundaries means unhandled errors crash the entire app.

### 4. **Console Logging Everywhere**
```typescript
// Development debug logs left in production code
console.log("Creating subscription:", data);
console.error("Payment failed:", error);
```

### 5. **No Automated Testing**
Zero test coverage makes refactoring dangerous:
- No unit tests
- No integration tests
- No end-to-end tests

---

## Quick Reference: Common Fixes

### Authentication Issues
```typescript
// Always check if user exists before using
if (!user || !user.schoolId) {
  return <LoginRequired />;
}

// Use custom RPC functions, not Supabase auth
const result = await supabase.rpc('verify_admin_login', { ... });
```

### RLS Policy Issues
```sql
-- Either disable RLS
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;

-- Or use security definer functions
CREATE OR REPLACE FUNCTION secure_operation()
RETURNS ... 
LANGUAGE plpgsql
SECURITY DEFINER  -- This bypasses RLS
AS $$
```

### Session Generation Issues
```typescript
// Always check for existing sessions first
const existingSessions = await checkExistingSessions(subscriptionId);
if (existingSessions.length > 0) {
  throw new Error('Sessions already exist');
}
```

### Query Invalidation
```typescript
// After any mutation, invalidate related queries
await mutateOperation();
queryClient.invalidateQueries(['affected-data']);
queryClient.invalidateQueries(['related-data']);
```

### Date Handling
```typescript
// Always store dates in UTC, display in local timezone
const utcDate = new Date().toISOString();
const displayDate = format(parseISO(utcDate), 'PPP', { 
  timeZone: user.timezone || 'UTC' 
});
```

---

## Red Flags to Watch For

🚩 **Authentication**: If you see `auth.uid()` or Supabase auth methods
🚩 **RLS Errors**: "Row level security policy violation" messages  
🚩 **Duplicate Sessions**: Multiple sessions with same date/time for student
🚩 **Stale Data**: UI not updating after mutations
🚩 **Console Errors**: React key warnings, undefined property access
🚩 **Timezone Issues**: Times displayed incorrectly for users
🚩 **Performance**: Slow loading with large datasets
🚩 **Type Errors**: TypeScript errors ignored with `any` or `@ts-ignore`

Remember: This system is complex but functional. Start with small changes, test thoroughly, and don't try to fix everything at once. Focus on understanding the current behavior before modifying it.
