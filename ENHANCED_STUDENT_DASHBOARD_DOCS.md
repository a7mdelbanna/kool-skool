# Enhanced Student Dashboard Documentation

## 📚 Overview

The Enhanced Student Dashboard is a comprehensive, multi-tab interface located at `/src/pages/StudentDetail.tsx`. It integrates all student management features including learning progress, speaking practice, vocabulary management, subscriptions, payments, and more.

**File Location**: `/Users/ahmed/Documents/Ahmedoshka'sCRM/src/pages/StudentDetail.tsx`
**Route**: `/student/:studentId`
**Component Size**: 1,228 lines
**Last Updated**: November 2024

---

## 🗄️ Data Sources & Queries

### 1. **Student Data Query**
```typescript
// Firebase Query - Line 93-102
queryKey: ['student-detail', studentId]
queryFn: databaseService.getById('students', studentId)
```
**Data Retrieved**:
- Basic student information (name, email, phone)
- Course details (courseName, level)
- Teacher assignment
- School information
- Telegram notification settings
- Payment status
- Profile picture URL

### 2. **Subscriptions Query**
```typescript
// Supabase RPC - Line 115-185
queryKey: ['student-subscriptions-detail', studentId]
queryFn: supabase.rpc('get_student_subscriptions', { p_student_id: studentId })
```
**Enhanced Processing**:
- Calculates actual end dates from sessions
- Queries Firebase sessions with both field conventions:
  - `subscriptionId` (camelCase)
  - `subscription_id` (snake_case)
- Sorts subscriptions chronologically (oldest first)
- Includes session count and completion tracking

### 3. **Sessions Query**
```typescript
// Firebase Query - Line 188-215
queryKey: ['student-sessions-detail', studentId]
queryFn: databaseService.query('sessions', {
  where: [{ field: 'studentId', operator: '==', value: studentId }]
})
```
**Fallback Query**:
```typescript
// Tries snake_case if camelCase returns empty
where: [{ field: 'student_id', operator: '==', value: studentId }]
```
**Data Processing**:
- Sorts sessions by date (newest first)
- Handles multiple date field formats:
  - `scheduled_date`
  - `scheduledDate`
  - `date`

### 4. **Payments Query**
```typescript
// Firebase Query - Line 218-235
queryKey: ['student-payments-detail', studentId]
queryFn: databaseService.query('transactions', {
  where: [
    { field: 'student_id', operator: '==', value: studentId },
    { field: 'type', operator: '==', value: 'income' }
  ]
})
```

### 5. **TODOs Query**
```typescript
// Firebase Service - Line 238-249
queryKey: ['student-todos-detail', studentId]
queryFn: todosService.getByFilters({ student_ids: [studentId] })
```

### 6. **Session Details Query**
```typescript
// Firebase Service - Line 252-271
queryKey: ['student-session-details', studentId, sessions]
queryFn: sessionDetailsService.getBySessionId(session.id) // for each session
```
**Performance Optimization**:
- Only fetches details for the 10 most recent sessions
- Includes vocabulary and teacher notes
- Parallel processing with Promise.all

### 7. **Telegram Configuration Query**
```typescript
// Firebase Service - Line 105-112
queryKey: ['telegram-config', user?.schoolId]
queryFn: telegramService.getConfig(user.schoolId)
```

---

## 📊 Calculated Statistics (Lines 273-296)

```typescript
const stats = {
  totalSessions: sessions.length,
  completedSessions: sessions.filter(s => s.status === 'completed' || s.status === 'attended').length,
  upcomingSessions: sessions.filter(s => s.status === 'scheduled').length,
  missedSessions: sessions.filter(s => s.status === 'absent' || s.status === 'missed').length,
  totalWords: sessionDetails.reduce((acc, detail) => acc + (detail?.vocabulary?.length || 0), 0),
  completedTodos: todos.filter(t => t.status === 'completed').length,
  totalTodos: todos.length,
  totalPaid: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
  activeSubscriptions: subscriptions.filter(s => s.status === 'active').length,
  totalSubscriptions: subscriptions.length
}

// Calculated Metrics
attendanceRate = (completedSessions / totalSessions) * 100
paymentRate = (totalPaid / totalOwed) * 100
```

---

## 🎯 Features & Components

### **Main Navigation Buttons** (Lines 405-416)

1. **Speaking Practice Button**
   - Route: `/student/${studentId}/speaking`
   - Component: `StudentSpeakingHub`
   - Icon: Mic

2. **Vocabulary Practice Button**
   - Route: `/student/${studentId}/practice?mode=mixed`
   - Component: `VocabularyPractice`
   - Icon: Brain

### **Tab Structure** (Lines 580-1200)

#### 1. **Overview Tab**
**Content**: Lines 602-809
- **Learning Progress Section**:
  - Total sessions with completion percentage
  - Payment status with visual indicator
  - Active subscriptions count
  - Homework completion rate

- **Telegram Integration**:
  - QR code generation for student linking
  - Deep link creation
  - Notification status display
  - Unlink functionality

- **Recent Activity**:
  - Last 3 sessions with dates and status
  - Vocabulary count from recent sessions
  - Teacher notes preview

- **Pending TODOs**:
  - Homework assignments
  - Task deadlines
  - Priority indicators

#### 2. **Sessions Tab**
**Content**: Lines 812-951
- **Session Grouping**: Groups sessions by subscription
- **Session Display**:
  - Date with timezone support
  - Duration (e.g., "60 min")
  - Status badges (Completed, Scheduled, Cancelled, Absent)
  - Teacher notes
  - Vocabulary count
- **Sorting**: Newest sessions first within each subscription

#### 3. **Subscriptions Tab**
**Content**: Lines 954-1034
- **Subscription Cards**:
  - Subscription number (e.g., "Subscription #1")
  - Date range (start to calculated end date)
  - Session progress (e.g., "5/10 sessions")
  - Price and currency
  - Status badge (Active/Expired/Cancelled)
- **Progress Bar**: Visual representation of completion
- **Sorting**: Chronological order (oldest first)

#### 4. **Payments Tab**
**Content**: Lines 1037-1090
- **Payment History**:
  - Transaction date
  - Amount with currency
  - Payment method
  - Associated subscription
  - Status (Paid/Pending/Overdue)
- **Summary Statistics**:
  - Total paid amount
  - Outstanding balance
  - Payment completion percentage

#### 5. **TODOs Tab**
**Content**: Lines 1093-1200
- **Task List**:
  - Task title and description
  - Due dates with countdown
  - Priority levels
  - Completion status
  - Teacher assignments
- **Filtering**: Active vs Completed tasks
- **Actions**: Mark as complete, view details

---

## 🔧 Key Functions & Handlers

### **QR Code Generation** (Lines 315-336)
```typescript
handleGenerateQRCode = async () => {
  const code = await telegramService.generateLinkingCode(studentId, user.schoolId)
  const link = telegramService.generateDeepLink(telegramConfig.botUsername, code)
  // Displays QR dialog with deep link
}
```

### **Telegram Unlink** (Lines 345-365)
```typescript
handleUnlink = async () => {
  await databaseService.update('students', studentId, {
    'telegramNotifications.chatId': null,
    'telegramNotifications.username': null,
    'telegramNotifications.enabled': false
  })
}
```

### **Navigation Handlers**
```typescript
handleStartPractice = () => navigate(`/student/${studentId}/practice?mode=mixed`)
handleSpeakingPractice = () => navigate(`/student/${studentId}/speaking`)
```

---

## 🎨 UI Components Used

### **Shadcn/UI Components**:
- `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger`
- `Card`, `CardContent`, `CardHeader`, `CardTitle`
- `Dialog`, `AlertDialog`
- `Badge`, `Button`, `Progress`
- `Avatar`, `AvatarFallback`, `AvatarImage`
- `Skeleton` (for loading states)

### **Icons (Lucide React)**:
- User, Phone, Mail, Calendar, CreditCard
- BookOpen, Brain, CheckSquare, TrendingUp
- Target, Trophy, Zap, Mic, DollarSign
- Clock, AlertCircle, Users, MapPin
- Cake, Star, School, Send, Copy, QrCode

---

## 🔄 Real-time Updates

### **Query Invalidation Points**:
1. After Telegram linking/unlinking
2. After TODO status changes
3. After subscription updates
4. After payment records

### **Refetch Triggers**:
```typescript
queryClient.invalidateQueries(['student-detail', studentId])
refetchStudent()
```

---

## 🚀 Performance Optimizations

1. **Lazy Loading**: Session details only for recent 10 sessions
2. **Conditional Queries**: Enabled flags prevent unnecessary API calls
3. **Dual Field Support**: Handles both camelCase and snake_case fields
4. **Sorted Data**: Pre-sorted at query level for better performance
5. **Memoized Calculations**: Statistics calculated once per render

---

## 📱 Responsive Design

- **Mobile**: Single column layout with stacked cards
- **Tablet**: 2-column grid for statistics
- **Desktop**: 4-column grid with sidebar navigation

---

## 🔐 Security Features

1. **School ID Validation**: All queries filtered by user's schoolId
2. **Role-based Access**: Teacher/Admin only view
3. **Telegram Security**: Unique linking codes with expiration
4. **Safe Date Handling**: Graceful fallbacks for invalid dates

---

## 🐛 Error Handling

1. **Query Errors**: Logged to console with fallback to empty arrays
2. **Date Parsing**: Safe formatting with "Invalid date" fallbacks
3. **Missing Data**: Conditional rendering prevents crashes
4. **Network Failures**: React Query retry logic

---

## 📈 Data Flow

```
Firebase (Students) ─┐
                     ├─→ StudentDetail Component ─→ Calculated Stats ─→ UI Render
Supabase (RPC) ──────┤
Firebase (Sessions) ─┤
Firebase (Payments) ─┤
Firebase (TODOs) ────┤
Firebase (Details) ──┘
```

---

## 🔄 Component Lifecycle

1. **Mount**: Fetch student data → Enable dependent queries
2. **Data Loading**: Show skeletons while queries pending
3. **Data Ready**: Render tabs with calculated statistics
4. **User Interaction**: Handle tab switches, button clicks
5. **Updates**: Invalidate queries on data changes
6. **Unmount**: Cancel pending queries

---

## 📋 Related Components

- `/src/components/student-tabs/SessionsTab.tsx`
- `/src/components/student-tabs/SubscriptionsTab.tsx`
- `/src/components/student-tabs/PaymentsTab.tsx`
- `/src/components/student-detail/LearningProgressTab.tsx`
- `/src/components/student-detail/VocabularyBankTab.tsx`
- `/src/components/speaking/StudentSpeakingHub.tsx`
- `/src/pages/VocabularyPractice.tsx`

---

## 🚦 Status Indicators

### **Session Status**:
- `completed` / `attended` → Green badge
- `scheduled` → Blue badge
- `cancelled` → Orange badge
- `absent` / `missed` → Red badge

### **Payment Status**:
- `paid` → Green (100% paid)
- `partial` → Yellow (1-99% paid)
- `overdue` → Red (0% paid)

### **Subscription Status**:
- `active` → Green
- `expired` → Gray
- `cancelled` → Red

---

## 📝 Notes for Developers

1. **Dual Database System**: Queries both Firebase and Supabase
2. **Field Naming**: Support for both camelCase and snake_case
3. **Date Handling**: Multiple date format support
4. **Subscription Numbering**: Based on chronological order
5. **Session Grouping**: Organized by subscription for clarity
6. **QR Code**: Generates Telegram deep links for mobile
7. **Timezone Support**: All dates respect user's timezone

---

## 🔗 Access Routes

- **Admin View**: `/student/:studentId`
- **Student Self-View**: Could be adapted to `/student-dashboard`
- **Speaking Practice**: `/student/:studentId/speaking`
- **Vocabulary Practice**: `/student/:studentId/practice`

---

## 📊 Query Summary Table

| Query Name | Source | Key | Parameters | Caching |
|-----------|--------|-----|------------|---------|
| student-detail | Firebase | students/:id | studentId | Yes |
| student-subscriptions-detail | Supabase RPC | get_student_subscriptions | p_student_id | Yes |
| student-sessions-detail | Firebase | sessions | studentId/student_id | Yes |
| student-payments-detail | Firebase | transactions | student_id, type='income' | Yes |
| student-todos-detail | Firebase | todos | student_ids[] | Yes |
| student-session-details | Firebase | sessionDetails | session.id (×10) | Yes |
| telegram-config | Firebase | telegramConfig | schoolId | Yes |

---

This documentation provides a complete overview of the Enhanced Student Dashboard, including all queries, features, and implementation details.