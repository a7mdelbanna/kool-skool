# TutorFlow Assistant - Business Rules

## User Management Rules

### Role Hierarchy
1. **Super Admin** > **Admin** > **Teacher** > **Student**
2. Higher roles can perform all actions of lower roles
3. Users can only manage users with equal or lower roles

### Account Creation Rules
- **Students**: Created by Admin or Teacher
- **Teachers**: Created by Admin only
- **Admins**: Created by Super Admin only
- **Passwords**: Students get temporary passwords, others set their own

## Student Management Rules

### Enrollment Rules
- Students must be assigned to at least one course
- Students must have a valid email address
- Students can have multiple active subscriptions
- Age groups: 'adult' or 'kid' only

### Student Access
- Students can only view their own data
- Students cannot modify their profile directly
- Students can view but not edit their subscriptions
- Students can see upcoming lessons and payment status

## Subscription Rules

### Pricing Models
1. **Fixed Price**: Total price for all sessions
2. **Per Session**: Price multiplied by session count

### Subscription Lifecycle
- **Active**: Currently running subscription
- **Paused**: Temporarily stopped (sessions not generated)
- **Completed**: All sessions finished or expired
- **Cancelled**: Terminated before completion

### Session Generation Rules
- Sessions are auto-generated based on schedule
- Weekly schedules: Generate sessions for each selected day
- No duplicate sessions for same date/time
- Sessions inherit subscription's price

## Payment Rules

### Payment Status
- **Pending**: Payment not yet received
- **Paid**: Payment completed
- **Overdue**: Payment past due date
- **Cancelled**: Payment cancelled

### Payment Processing
- Payments linked to subscriptions
- Multi-currency support with conversion
- Partial payments allowed
- Payment history tracked

## Lesson/Session Rules

### Session Types
- **Individual**: One student per session
- **Group**: Multiple students per session

### Session Status
- **Scheduled**: Future session
- **In Progress**: Currently ongoing
- **Completed**: Finished session
- **Cancelled**: Cancelled session
- **Rescheduled**: Moved to different time

### Attendance Rules
- Attendance marked as: Present, Absent, Late, Excused
- Only teachers can mark attendance
- Attendance affects payment status
- Missed sessions can be rescheduled

## Group Management Rules

### Group Creation
- Groups have maximum capacity
- Groups linked to specific courses
- Groups can have fixed or per-session pricing
- Students can join/leave groups

### Group Sessions
- All group members have same session time
- Individual attendance tracking per student
- Group sessions can continue with minimum attendance

## Financial Rules

### Transaction Types
- **Income**: Revenue from students
- **Expense**: Costs and expenditures
- **Transfer**: Between accounts
- **Refund**: Money returned to students

### Multi-Currency Rules
- Each school has primary currency
- Transactions stored in original currency
- Automatic conversion for reports
- Exchange rates updated periodically

### Account Management
- Multiple accounts per school allowed
- Account types: Cash, Bank, Digital
- Balance tracking per account
- Transfer between accounts tracked

## Scheduling Rules

### Calendar Rules
- No overlapping sessions for same teacher
- Respect teacher availability
- Consider timezone differences
- Holiday blackout dates

### Rescheduling Rules
- 24-hour notice required
- Limited reschedules per subscription
- Teacher approval needed
- Automatic notification to affected parties

## Communication Rules

### Notification Rules
- Payment reminders 3 days before due
- Lesson reminders 24 hours before
- Attendance notifications immediate
- Schedule changes immediate

### Access Permissions
- Students: Read-only access to own data
- Teachers: Read/write for assigned students
- Admins: Full access to school data
- Super Admins: Full platform access

## Data Validation Rules

### Email Validation
- Must be valid email format
- Must be unique per user type
- Students can share family email

### Phone Validation
- Optional but recommended
- Must include country code
- Format: international standard

### Date Validation
- Start date cannot be in past
- End date must be after start date
- Sessions within subscription period

## Reporting Rules

### Financial Reports
- Monthly/quarterly/yearly periods
- Currency consolidation
- Tax calculation support
- Export formats: PDF, Excel, CSV

### Academic Reports
- Progress tracking per student
- Attendance statistics
- Performance metrics
- Parent-accessible reports

## Security Rules

### Password Requirements
- Minimum 8 characters
- At least one number
- At least one special character
- Password expiry: 90 days (configurable)

### Session Management
- Auto-logout after 30 minutes inactive
- Single session per user (configurable)
- Session tracking for audit

### Data Privacy
- Student data isolated by school
- GDPR compliance for EU users
- Data retention policies
- Right to deletion requests

## Business Logic Constraints

### Subscription Constraints
- Cannot delete subscription with completed payments
- Cannot modify past sessions
- Cannot overlap subscription periods for same student

### Payment Constraints
- Cannot delete paid transactions
- Cannot modify completed payments
- Refunds require admin approval

### Schedule Constraints
- Cannot schedule in past
- Cannot double-book teachers
- Cannot exceed room capacity (for groups)