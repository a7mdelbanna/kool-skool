# Testing Instructions for Student Portal Session Management

## Overview
This guide provides step-by-step instructions for testing the complete student portal flow, including session display, Zoom link integration, and cancellation policies.

## Prerequisites
- Admin account with access to School Settings
- Teacher account with ability to set Zoom links
- Student account with active subscription
- Test subscription with generated sessions

## 1. Admin Setup - Configure Cancellation Policies

### Steps:
1. Login as admin
2. Navigate to **School Settings** from the sidebar
3. Click on the **Policies** tab
4. Configure the following:
   - **Allow Student Cancellations**: Toggle ON/OFF
   - **Cancellation Notice Period**: Set hours (e.g., 48 hours)
   - **Maximum Cancellations**: Set limit per subscription (e.g., 2)
5. Click **Save Policies**

### Expected Results:
- Settings should save successfully with a success toast
- Policy summary should update to reflect your choices

## 2. Teacher Setup - Configure Zoom Link

### Steps:
1. Login as teacher
2. Navigate to **Personal Settings** from the sidebar
3. Click on the **Meeting** tab
4. Enter your Zoom meeting link (e.g., `https://zoom.us/j/1234567890`)
5. Click **Save Changes**

### Test Features:
- Click the **Copy** button to copy the link
- Click the **Test** button to verify the link opens correctly

### Expected Results:
- Zoom link should save successfully
- Link validation should only accept valid Zoom URLs

## 3. Student Portal - Session Management

### Steps:
1. Login as student
2. Navigate to the **Student Dashboard**

### A. View Sessions
- **Upcoming Sessions** card shows all scheduled sessions
- **Recent Sessions** card shows completed sessions
- Each session displays:
  - Date and time (in student's timezone)
  - Duration
  - Course name (with book icon)
  - Teacher name (with user icon)
  - Session number (e.g., "Session 1 of 10")

### B. Join a Lesson
1. Find an upcoming scheduled session
2. Click the **Join Lesson** button (with video icon)

**Expected Results:**
- If teacher has set Zoom link: Opens Zoom meeting in new tab
- If no Zoom link: Shows error message "No Zoom link available"

### C. Cancel a Session
1. Find an upcoming scheduled session
2. Check the cancellation deadline message (e.g., "Cancel within 2 days")
3. Click **Cancel Session** button

**Expected Results based on policy:**
- **If cancellation allowed and within deadline:** 
  - Button is enabled
  - Clicking shows cancellation confirmation dialog
  - Session status changes to "cancellation_requested"
  
- **If past deadline:**
  - Button shows "Past Deadline" and is disabled
  - Cannot click the button
  
- **If student cancellation disabled (admin setting):**
  - Cancel button not available or disabled
  - Message indicates only teachers can cancel

### D. Expand Session Details
1. Click on any session card to expand it

**Expected Results:**
- Shows additional details if available:
  - Notes from teacher
  - Materials
  - Homework
- Shows "No additional details available" if empty

## 4. Testing Multi-Currency Payments

### Steps:
1. As student, click **Make Payment** on a subscription
2. In payment dialog:
   - Select currency from dropdown
   - Currency symbol should update (€, ₽, etc.)
   - Enter payment amount
   - Upload payment screenshot
   - Submit payment

**Expected Results:**
- Payment methods show for selected currency
- Currency symbol displays correctly
- Payment submits successfully

## 5. Testing Session Generation

### For Development Only:
1. In Student Dashboard, click **Test Session** button (dev mode only)
2. This creates a test session scheduled for next week

**Expected Results:**
- New session appears in upcoming sessions
- Session has all required fields populated

## 6. Common Test Scenarios

### Scenario 1: New Student Onboarding
1. Create new student account
2. Admin creates subscription for student
3. Sessions auto-generate based on subscription
4. Student logs in and sees all sessions
5. Student can join Zoom lessons and manage sessions

### Scenario 2: Cancellation Policy Change
1. Student attempts to cancel a session
2. Admin changes cancellation policy (e.g., from 48 to 24 hours)
3. Student refreshes page
4. Cancellation deadline updates accordingly

### Scenario 3: Teacher Changes Zoom Link
1. Teacher updates Zoom link in settings
2. Student refreshes dashboard
3. Join Lesson button uses new Zoom link

## Troubleshooting

### Sessions Not Showing:
- Check if subscription exists and is active
- Verify sessions were generated for the subscription
- Check browser console for errors
- Ensure student_id matches in sessions collection

### Zoom Link Not Working:
- Verify teacher has set their Zoom link
- Check that link is a valid Zoom URL
- Ensure teacher_id matches in session

### Cancellation Not Working:
- Check school's cancellation policy settings
- Verify current time vs cancellation deadline
- Check if max cancellations reached

### Payment Methods Not Showing:
- Verify payment methods configured for school
- Check currency selection
- Ensure payment methods are active

## Database Collections Reference

- **users**: Stores teacher Zoom links in `zoomLink` field
- **schools**: Stores cancellation policy in `cancellationPolicy` object
- **lesson_sessions**: Contains all session data with teacher/student references
- **subscriptions**: Links students to their course packages
- **paymentMethods**: School's available payment methods by currency

## Console Commands for Testing

```javascript
// Create test session (run in browser console)
createTestSession('student-id', 'subscription-id', 'school-id')

// Check session data
console.log(sessions)

// Check cancellation policy
console.log(sessionGeneratorService.canCancelSession(session))
```