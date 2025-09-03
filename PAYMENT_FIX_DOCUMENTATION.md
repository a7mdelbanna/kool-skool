# Payment Status and Subscriptions Fix Documentation

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

## Test Results:
- Юля Савельева: RUB 6300 paid → Shows as "Paid" ✅
- Юра Сулин: RUB 0 paid of 18900 → Shows as "Overdue" ✅