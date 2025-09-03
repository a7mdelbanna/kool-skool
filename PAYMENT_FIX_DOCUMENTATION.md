# Payment Status, Subscriptions, and Progress Fix Documentation

## Critical: DO NOT CHANGE THESE IMPLEMENTATIONS

### Working Configuration (Commit: ac813a0)

## 1. Subscriptions Display (SubscriptionsTab.tsx)
**MUST USE SUPABASE RPC** - Do not change to Firebase!
```typescript
// CORRECT - This works!
const { data: subscriptionsData, error } = await supabase.rpc('get_student_subscriptions', {
  p_student_id: studentId
});
```

**Why:** Subscriptions are still stored in Supabase, not fully migrated to Firebase.

## 2. Payment Status Calculation (Students.tsx)

### Key Implementation Details:

#### a. Field Name Compatibility
The system MUST check both snake_case and camelCase field names:
```typescript
// Check both field formats for subscriptions
subscriptions = await databaseService.query('subscriptions', {
  where: [{ field: 'student_id', operator: '==', value: studentId }]
});
// If no results, try camelCase
if (subscriptions.length === 0) {
  subscriptions = await databaseService.query('subscriptions', {
    where: [{ field: 'studentId', operator: '==', value: studentId }]
  });
}
```

#### b. Transaction Queries
```typescript
// Check both field formats for transactions
transactions = await databaseService.query('transactions', {
  where: [
    { field: 'subscription_id', operator: '==', value: subscription.id },
    { field: 'type', operator: '==', value: 'income' }
  ]
});
// If no results, try camelCase
if (transactions.length === 0) {
  transactions = await databaseService.query('transactions', {
    where: [
      { field: 'subscriptionId', operator: '==', value: subscription.id },
      { field: 'type', operator: '==', value: 'income' }
    ]
  });
}
```

#### c. Price Field Fallbacks
```typescript
const totalPrice = parseFloat(subscription.totalPrice || subscription.total_price || subscription.price || 0);
```

## 3. Payment Status Rules
Only three statuses exist:
- **Paid**: Payment >= 99.9% of total price
- **Partial**: Payment > 0.1% but < 99.9%
- **Overdue**: Payment <= 0.1% or no payment

## What Was Breaking Before:

1. **Subscriptions not showing**: Changed to Firebase query but subscriptions aren't synced to Firebase
2. **Payment status always "Overdue"**: Field name mismatches prevented finding transactions
3. **Mixed data sources**: Some data in Supabase, some in Firebase

## Current Data Flow:

```
Subscriptions Tab:
Supabase RPC → get_student_subscriptions → Display subscriptions
                                         ↓
                                    Firebase → Get transactions for payments

Students Page:
Firebase → Get students
        ↓
Firebase → Get subscriptions (with field name fallbacks)
        ↓
Firebase → Get transactions (with field name fallbacks)
        ↓
Calculate payment status
```

## DO NOT CHANGE:
1. ✅ SubscriptionsTab MUST use Supabase RPC
2. ✅ Payment calculations MUST check both field name formats
3. ✅ Price MUST check totalPrice, total_price, and price fields
4. ✅ Only 3 payment statuses: paid, partial, overdue

## 4. Session Progress Calculation (Students.tsx - calculateStudentProgress)

**MUST USE SUPABASE RPC** - Do not change to Firebase!
```typescript
// CORRECT - This works!
const { data: subscriptions, error } = await supabase.rpc('get_student_subscriptions', {
  p_student_id: studentId
});

// Use session counts from RPC
const attendedSessions = activeSubscription.sessions_attended || 0;
const cancelledSessions = activeSubscription.sessions_cancelled || 0;
const completedSessions = attendedSessions + cancelledSessions; // Same as Attendance page
const totalSessions = activeSubscription.session_count || 0;
const progress = `${completedSessions}/${totalSessions}`;
```

**Why:** 
- Avoids Firebase index requirements for session queries
- Uses same logic as working Attendance page
- Session counts are pre-calculated in Supabase RPC

**Progress Calculation Rule:**
- Progress = attended sessions + cancelled sessions
- This matches the Attendance page logic where cancelled sessions count toward progress

## 5. Next Session Date Calculation (Students.tsx - calculateStudentProgress)

**MUST USE SUPABASE RPC** for fetching sessions
```typescript  
// CORRECT - Fetch sessions to find next upcoming
const { data: sessions } = await supabase.rpc('get_lesson_sessions', {
  p_student_id: studentId
});

// Filter for upcoming scheduled sessions
const upcomingSessions = sessions
  .filter(s => 
    s.subscription_id === activeSubscription.id &&
    s.status === 'scheduled' &&
    new Date(s.scheduled_date) >= now
  )
  .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime());

// Take the first upcoming session
nextSessionDate = upcomingSessions[0]?.scheduled_date;
```

**Logic (Same as Sessions Tab):**
- Session status must be 'scheduled'
- Session date must be >= today
- Take the earliest upcoming session by sorting

## 6. Session Generation for Multiple Days (supabaseToFirebase.ts)

**CRITICAL FIX** - Sessions must alternate between all scheduled days
```typescript
// WRONG - Only uses first day
const schedule = params.p_schedule[0]; // Bug: ignores other days

// CORRECT - Process all scheduled days
const scheduleItems = params.p_schedule || [];
const scheduledDays = scheduleItems.map(item => ({
  dayIndex: daysOfWeek.findIndex(day => day.toLowerCase() === item.day.toLowerCase()),
  time: item.time
}));

// Generate sessions on alternating days
while (sessionDates.length < params.p_session_count) {
  // Check if current date matches ANY scheduled day
  const matchingSchedule = scheduledDays.find(s => s.dayIndex === currentDayIndex);
  if (matchingSchedule) {
    sessionDates.push({ date, time });
  }
}
```

**Issue Fixed:**
- Selecting Tuesday & Thursday was generating all sessions on Tuesday only
- Now correctly alternates: Tue → Thu → Tue → Thu...

**Important Note:**
- This fixes Firebase/fallback implementation
- Supabase RPC functions (`add_student_subscription`, `update_subscription_with_related_data`) may need similar fix on database side

## Test Results:
- Юля Савельева: RUB 6300 paid → Shows as "Paid" ✅
- Progress: 0/5 → Shows correctly ✅
- Юра Сулин: RUB 0 paid of 18900 → Shows as "Overdue" ✅  
- Progress: 0/12 → Shows correctly ✅