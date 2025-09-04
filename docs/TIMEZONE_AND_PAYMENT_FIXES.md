# Timezone and Payment Date Fixes Documentation

## Issues Fixed (September 4, 2025)

### 1. Session Times Showing Incorrectly (3:00 AM instead of 6:00 PM)

**Problem:** 
- Sessions in Attendance page and Sessions tab were displaying at 3:00 AM instead of the correct 6:00 PM
- The subscription showed the correct time (6:00 PM) but generated sessions showed wrong time

**Root Cause:**
- Sessions were stored with separate `scheduledDate` and `scheduledTime` fields in Firebase
- When displaying, these fields weren't being properly combined with Cairo timezone consideration
- UTC conversion was happening incorrectly

**Solution Implemented:**

1. **In `/src/services/migration/supabaseToFirebase.ts`:**
   - Added proper timezone handling when creating sessions
   - Created a combined `scheduledDateTime` field with correct timezone
   ```typescript
   // Create a date at midnight local time (Cairo)
   const sessionDate = new Date(date);
   sessionDate.setHours(0, 0, 0, 0);
   
   // Parse time string and create final datetime
   const [hours, minutes] = timeStr.split(':').map(Number);
   const sessionDateTime = new Date(sessionDate);
   sessionDateTime.setHours(hours, minutes, 0, 0);
   
   const sessionData = {
     // ... other fields
     scheduledDateTime: sessionDateTime.toISOString(), // Full datetime for proper timezone handling
   };
   ```

2. **In `/src/hooks/useAttendanceData.ts`:**
   - Updated to use `scheduled_datetime` field when available
   - Added fallback logic for combining separate date/time fields
   ```typescript
   if (session.scheduled_datetime) {
     sessionDateTime = new Date(session.scheduled_datetime);
   } else if (session.scheduled_time) {
     // Combine date and time in Cairo timezone
     const [year, month, day] = dateStr.split('-').map(Number);
     const [hours, minutes] = timeStr.split(':').map(Number);
     sessionDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
   }
   ```

3. **In `/src/components/student-tabs/SessionsTab.tsx`:**
   - Added `scheduled_datetime` field to DatabaseSession interface
   - Fixed time display logic to handle timezone properly

### 2. Next Payment Date Showing "Today" for All Students

**Problem:**
- Student cards in `/students` showed "Today" for all next payments
- Expected Payments in `/finances` correctly showed "Oct 07, 2025" (33 days from now)
- Discrepancy between the two features

**Root Cause:**
- The `calculateStudentProgress` function in `Students.tsx` was setting `nextPaymentDate` to `new Date().toISOString()` (today) whenever there was a remaining payment amount
- It wasn't calculating the actual next payment date based on subscription schedule

**Solution Implemented:**

**In `/src/pages/Students.tsx`:**
- Updated `calculateStudentProgress` function to match ExpectedPaymentsSection logic:
```typescript
// Calculate next payment date based on schedule (same as ExpectedPaymentsSection)
if (remaining > 0) {
  // Fetch sessions to find last session date
  const subscriptionSessions = sessions
    .filter(s => s.subscription_id === activeSubscription.id && s.status !== 'cancelled')
    .sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime());
  
  if (subscriptionSessions.length > 0) {
    // Get the last session date
    const lastSession = subscriptionSessions[0];
    const lastSessionDate = new Date(lastSession.scheduled_date);
    
    // Get the schedule to find payment day
    const schedule = activeSubscription.schedule;
    const scheduledDay = firstSchedule.day; // e.g., "Monday", "Tuesday"
    
    // Find the next occurrence of the target day after last session
    let calcNextPayment = new Date(lastSessionDate);
    calcNextPayment.setDate(calcNextPayment.getDate() + 1);
    
    while (calcNextPayment.getDay() !== targetDayIndex) {
      calcNextPayment.setDate(calcNextPayment.getDate() + 1);
    }
    
    nextPaymentDate = calcNextPayment.toISOString();
    nextPaymentAmount = totalPrice; // Always show full subscription price
  }
}
```

**Additional Improvements in `/src/integrations/supabase/client.ts`:**
- Added extensive fallback logic for payment calculation
- Added debug logging to track payment date calculations
- Implemented direct session query as fallback when RPC fails

## Important Notes

### DO NOT MODIFY:
1. **Timezone Handling:** Always use `Africa/Cairo` timezone for all date/time operations
2. **Session DateTime Field:** Keep the `scheduledDateTime` field creation logic intact
3. **Payment Calculation:** The next payment calculation must follow subscription schedule, not default to today

### Key Functions to Preserve:
1. `supabaseToFirebase.ts` - Session creation with proper timezone
2. `calculateStudentProgress` in `Students.tsx` - Payment date calculation
3. `formatNextPayment` in `StudentCard.tsx` - Display formatting with timezone

### Testing Checklist:
- [ ] Sessions show correct time in Attendance page
- [ ] Sessions show correct time in Sessions tab
- [ ] Next Payment dates match between Student Cards and Expected Payments
- [ ] Timezone conversions work correctly for Cairo timezone
- [ ] Payment dates calculate based on subscription schedule

## Code Patterns to Follow

### Date/Time Storage:
```typescript
// Always store full ISO datetime strings
scheduledDateTime: sessionDateTime.toISOString()
```

### Timezone Conversion:
```typescript
import { toZonedTime } from 'date-fns-tz';
const userTimezone = 'Africa/Cairo';
const localDate = toZonedTime(utcDate, userTimezone);
```

### Payment Date Calculation:
```typescript
// Always calculate from last session + schedule
// Never default to today unless no sessions exist
```

## Files Modified in Fix:
1. `/src/services/migration/supabaseToFirebase.ts`
2. `/src/hooks/useAttendanceData.ts`
3. `/src/components/student-tabs/SessionsTab.tsx`
4. `/src/components/StudentCard.tsx`
5. `/src/pages/Students.tsx`
6. `/src/integrations/supabase/client.ts`

## Prevention:
- Always test date/time features with Cairo timezone
- Verify payment calculations match across all views
- Use debug logging when working with dates
- Test with real subscription data, not mock data