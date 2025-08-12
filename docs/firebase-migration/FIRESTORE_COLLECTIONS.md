# Firestore Collections Structure

## Core Collections Architecture

### 1. `schools` Collection
```javascript
/schools/{schoolId}
{
  id: string,              // Auto-generated
  name: string,
  logo: string,            // Storage URL
  contactInfo: {
    address: string,
    phone: string,
    email: string,
    website: string
  },
  timezone: string,        // Default: 'UTC'
  licenseId: string,       // Reference to licenses collection
  settings: {
    currency: string,
    language: string,
    features: string[]
  },
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 2. `users` Collection (Synced with Firebase Auth)
```javascript
/users/{userId}
{
  uid: string,             // Firebase Auth UID (same as document ID)
  email: string,
  firstName: string,
  lastName: string,
  role: string,            // 'superadmin' | 'admin' | 'teacher' | 'student'
  schoolId: string,        // Reference to school (null for superadmin)
  avatar: string,          // Storage URL
  timezone: string,
  phoneNumber: string,
  isActive: boolean,
  metadata: {
    lastLogin: timestamp,
    loginCount: number
  },
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 3. `students` Collection (Extended Profile)
```javascript
/students/{studentId}
{
  id: string,
  userId: string,          // Reference to users collection
  schoolId: string,        // Reference to school
  teacherId: string,       // Assigned teacher
  courseId: string,        // Enrolled course
  
  // Student-specific data
  birthday: timestamp,
  ageGroup: string,        // 'child' | 'teen' | 'adult'
  level: string,           // 'beginner' | 'intermediate' | 'advanced'
  
  // Contact information
  parentName: string,      // For minors
  parentEmail: string,
  phone: string,
  whatsapp: string,
  telegram: string,
  instagram: string,
  
  // Academic info
  enrollmentDate: timestamp,
  totalLessonsTaken: number,
  totalLessonsScheduled: number,
  
  // Payment tracking
  nextPaymentDate: timestamp,
  nextPaymentAmount: number,
  paymentStatus: string,   // 'current' | 'overdue' | 'advance'
  
  status: string,          // 'active' | 'inactive' | 'graduated'
  notes: string,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 4. `courses` Collection
```javascript
/courses/{courseId}
{
  id: string,
  schoolId: string,
  name: string,
  description: string,
  subject: string,         // 'english' | 'math' | 'science' | etc.
  category: string,        // 'language' | 'academic' | 'skill'
  duration: {
    value: number,
    unit: string           // 'weeks' | 'months'
  },
  price: {
    amount: number,
    currency: string,
    mode: string           // 'total' | 'perSession' | 'monthly'
  },
  maxStudents: number,
  minAge: number,
  maxAge: number,
  level: string[],         // Array of applicable levels
  materials: string[],     // List of required materials
  isActive: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 5. `groups` Collection
```javascript
/groups/{groupId}
{
  id: string,
  schoolId: string,
  courseId: string,
  teacherId: string,
  name: string,
  description: string,
  
  // Session configuration
  sessionCount: number,
  sessionDuration: number,  // in minutes
  schedule: [              // Array of schedule objects
    {
      day: string,         // 'monday' | 'tuesday' | etc.
      time: string,        // 'HH:mm' format
      timezone: string
    }
  ],
  
  // Capacity
  maxStudents: number,
  currentStudents: number,
  enrolledStudentIds: string[],  // Array of student IDs
  
  // Pricing
  priceMode: string,       // 'perSession' | 'fixed'
  pricePerSession: number,
  totalPrice: number,
  currency: string,
  
  // Dates
  startDate: timestamp,
  endDate: timestamp,
  
  status: string,          // 'active' | 'inactive' | 'completed'
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 6. `subscriptions` Collection
```javascript
/subscriptions/{subscriptionId}
{
  id: string,
  studentId: string,       // Reference to students
  schoolId: string,        // For faster queries
  groupId: string,         // For group subscriptions (optional)
  
  // Subscription details
  type: string,            // 'individual' | 'group'
  sessionCount: number,
  sessionsCompleted: number,
  sessionsRemaining: number,
  
  // Schedule
  schedule: [              // For individual subscriptions
    {
      day: string,
      time: string,
      timezone: string
    }
  ],
  
  // Duration
  durationMonths: number,
  startDate: timestamp,
  endDate: timestamp,
  
  // Pricing
  priceMode: string,       // 'perSession' | 'fixed'
  pricePerSession: number,
  fixedPrice: number,
  totalPrice: number,
  totalPaid: number,
  balance: number,
  currency: string,
  
  // Teacher assignment
  teacherId: string,       // For individual subscriptions
  
  status: string,          // 'active' | 'paused' | 'completed' | 'cancelled'
  notes: string,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 7. `sessions` Collection (Renamed from lesson_sessions)
```javascript
/sessions/{sessionId}
{
  id: string,
  subscriptionId: string,
  studentId: string,
  teacherId: string,
  groupId: string,         // For group sessions
  schoolId: string,        // For faster queries
  
  // Scheduling
  scheduledDate: timestamp,
  scheduledTime: string,   // 'HH:mm'
  duration: number,        // minutes
  timezone: string,
  
  // Session tracking
  sessionNumber: number,   // Index in subscription (1, 2, 3...)
  status: string,          // 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'
  attendanceStatus: string, // 'present' | 'absent' | 'late'
  attendanceMarkedAt: timestamp,
  attendanceMarkedBy: string,
  
  // Payment
  cost: number,
  currency: string,
  paymentStatus: string,   // 'paid' | 'pending' | 'overdue'
  paymentDate: timestamp,
  
  // Rescheduling
  isRescheduled: boolean,
  originalSessionId: string,
  rescheduledReason: string,
  
  // Lesson details
  topic: string,
  materials: string[],
  homework: string,
  notes: string,
  teacherNotes: string,    // Private teacher notes
  
  // Performance
  performance: {
    participation: number,  // 1-5
    understanding: number,  // 1-5
    homework: number,      // 1-5
    overall: number        // 1-5
  },
  
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 8. `transactions` Collection
```javascript
/transactions/{transactionId}
{
  id: string,
  schoolId: string,
  
  // Type and category
  type: string,            // 'income' | 'expense' | 'transfer'
  category: string,        // Reference to categories
  subcategory: string,
  tags: string[],          // Array of tag IDs
  
  // Amount
  amount: number,
  currency: string,
  taxAmount: number,
  taxRate: number,
  netAmount: number,
  
  // Accounts (for transfers)
  fromAccountId: string,   // For expenses and transfers
  toAccountId: string,     // For income and transfers
  
  // Related entities
  studentId: string,       // For student payments
  subscriptionId: string,  // For subscription payments
  sessionId: string,       // For session payments
  contactId: string,       // Vendor/supplier
  
  // Transaction details
  transactionDate: timestamp,
  description: string,
  paymentMethod: string,   // 'cash' | 'card' | 'transfer' | 'check'
  referenceNumber: string,
  receiptUrl: string,      // Storage URL
  
  // Recurring
  isRecurring: boolean,
  recurringFrequency: string,
  recurringEndDate: timestamp,
  parentTransactionId: string,
  
  status: string,          // 'completed' | 'pending' | 'cancelled'
  notes: string,
  
  // Audit
  createdBy: string,       // User ID
  approvedBy: string,      // For expense approval
  approvedAt: timestamp,
  
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 9. `accounts` Collection (Financial Accounts)
```javascript
/accounts/{accountId}
{
  id: string,
  schoolId: string,
  name: string,
  type: string,            // 'cash' | 'bank' | 'credit' | 'wallet'
  currency: string,
  
  // Bank details
  bankName: string,
  accountNumber: string,
  routingNumber: string,
  swift: string,
  
  // Balances
  currentBalance: number,
  availableBalance: number,
  pendingBalance: number,
  
  // Limits
  creditLimit: number,
  overdraftLimit: number,
  
  // Statistics
  totalIncome: number,
  totalExpenses: number,
  transactionCount: number,
  lastTransactionDate: timestamp,
  
  isDefault: boolean,
  isActive: boolean,
  notes: string,
  
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 10. `licenses` Collection (System-wide)
```javascript
/licenses/{licenseId}
{
  id: string,
  schoolId: string,
  plan: string,            // 'basic' | 'professional' | 'enterprise'
  
  // Limits
  maxStudents: number,
  maxTeachers: number,
  maxCourses: number,
  maxStorage: number,      // GB
  
  // Features
  features: string[],      // Array of enabled features
  
  // Billing
  billingPeriod: string,   // 'monthly' | 'yearly'
  amount: number,
  currency: string,
  nextBillingDate: timestamp,
  
  // Status
  status: string,          // 'active' | 'trial' | 'suspended' | 'cancelled'
  trialEndsAt: timestamp,
  
  // Usage
  currentStudents: number,
  currentTeachers: number,
  currentStorage: number,
  
  createdAt: timestamp,
  updatedAt: timestamp,
  expiresAt: timestamp
}
```

## Subcollections Structure

### Group Students (Subcollection)
```javascript
/groups/{groupId}/students/{enrollmentId}
{
  studentId: string,
  enrolledAt: timestamp,
  status: string,          // 'active' | 'dropped' | 'completed'
  droppedAt: timestamp,
  droppedReason: string,
  completedAt: timestamp,
  attendanceRate: number,  // Percentage
  sessionsAttended: number,
  totalSessions: number
}
```

### Session Attendees (For Group Sessions)
```javascript
/sessions/{sessionId}/attendees/{studentId}
{
  studentId: string,
  status: string,          // 'present' | 'absent' | 'late'
  arrivalTime: timestamp,
  departureTime: timestamp,
  notes: string
}
```

### Transaction Tags Junction
```javascript
/transactions/{transactionId}/tags/{tagId}
{
  tagId: string,
  tagName: string,         // Denormalized for quick access
  addedAt: timestamp
}
```

## Supporting Collections

### `transactionCategories` Collection
```javascript
/transactionCategories/{categoryId}
{
  id: string,
  schoolId: string,        // null for system-wide
  name: string,
  type: string,            // 'income' | 'expense' | 'both'
  icon: string,
  color: string,
  isSystem: boolean,       // System-defined vs custom
  parentId: string,        // For subcategories
  order: number,
  isActive: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### `contacts` Collection
```javascript
/contacts/{contactId}
{
  id: string,
  schoolId: string,
  type: string,            // 'vendor' | 'supplier' | 'partner' | 'other'
  name: string,
  company: string,
  email: string,
  phone: string,
  address: {
    street: string,
    city: string,
    state: string,
    zip: string,
    country: string
  },
  taxId: string,
  notes: string,
  isActive: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### `currencies` Collection (System-wide)
```javascript
/currencies/{currencyCode}
{
  code: string,            // 'USD', 'EUR', etc.
  name: string,
  symbol: string,
  exchangeRate: number,    // Relative to USD
  lastUpdated: timestamp,
  isActive: boolean
}
```

### `studentLevels` Collection
```javascript
/studentLevels/{levelId}
{
  id: string,
  schoolId: string,        // null for system defaults
  name: string,
  code: string,
  description: string,
  order: number,           // For sorting
  minAge: number,
  maxAge: number,
  requirements: string[],
  isActive: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## Data Denormalization Strategy

### Why Denormalize?
Firestore doesn't support joins, so we denormalize frequently accessed data to avoid multiple reads.

### Denormalized Fields

1. **User Names in Sessions**
   - Store `studentName`, `teacherName` directly in session documents
   - Update via Cloud Functions when user names change

2. **School Info in Transactions**
   - Store `schoolName` in transaction documents
   - Enables easier reporting without additional reads

3. **Course Info in Subscriptions**
   - Store `courseName`, `courseSubject` in subscription documents
   - Reduces reads when displaying subscription lists

4. **Student Count in Groups**
   - Maintain `currentStudents` counter in group document
   - Update via Cloud Functions when students enroll/drop

### Update Triggers (Cloud Functions)

1. **onUserUpdate**: Update denormalized user data across collections
2. **onGroupEnrollment**: Update student counts and enrollment lists
3. **onSessionComplete**: Update subscription session counts
4. **onTransactionCreate**: Update account balances
5. **onSubscriptionCreate**: Generate initial sessions

## Query Optimization

### Composite Indexes Required

```javascript
// Most important composite indexes
1. sessions: schoolId + scheduledDate + status
2. transactions: schoolId + transactionDate + type
3. students: schoolId + status + level
4. subscriptions: schoolId + status + endDate
5. groups: schoolId + status + teacherId
```

### Collection Group Queries

Enable collection group queries for:
- All subcollections (`students`, `attendees`, `tags`)
- Enables queries across all groups' students, all sessions' attendees, etc.

## Migration Considerations

### Data Transformation Required

1. **JSON to Maps**: Convert JSON columns to Firestore maps
2. **Arrays**: Convert many-to-many relationships to arrays or subcollections
3. **Timestamps**: Convert all date fields to Firestore timestamps
4. **Foreign Keys**: Convert to document references or IDs
5. **Enums**: Keep as strings but validate in security rules

### Batch Operations

- Use batch writes (max 500 operations per batch)
- Implement pagination for large data sets
- Create progress tracking for migration status

### Rollback Strategy

1. Keep Supabase data intact during migration
2. Implement feature flags to switch between systems
3. Create data sync mechanism for parallel running
4. Backup Firestore data after each migration phase