
# Groups - Group Management System

## What the feature does
The Groups section manages group lessons and classes, allowing administrators to create groups, assign multiple students, set schedules, and manage group-based pricing. It handles both fixed groups and flexible group arrangements for tutoring schools.

## How users interact with it (UI flow)

### Main Groups View
- **Header**: "Groups" title with active group count
- **Create Group Button**: Opens group creation dialog
- **Groups Grid**: Displays group cards with key information
- **Search/Filter**: Find groups by name, course, or teacher

### Group Cards Display
Each group card shows:
- **Group Name**: Primary identifier
- **Course Information**: Associated course and subject
- **Teacher Assignment**: Assigned instructor
- **Student Count**: Current enrollment vs. capacity
- **Schedule Summary**: Meeting times and frequency
- **Pricing Info**: Cost structure and payment method
- **Status Badge**: Active, inactive, or completed status

### Create/Edit Group Dialog
Comprehensive form with multiple sections:

#### Basic Information
- **Group Name**: Unique identifier (required)
- **Description**: Optional group description
- **Course Selection**: Choose from available courses
- **Teacher Assignment**: Select from available teachers
- **Status**: Active, inactive, or completed

#### Pricing Configuration
- **Price Mode**: Choose between:
  - Per Session: Individual session pricing
  - Fixed Price: Total course price
- **Currency Selection**: Multi-currency support
- **Total Price**: Calculated or manual entry
- **Session Count**: Number of sessions in the group

#### Schedule Setup
- **Session Duration**: Length of each session (default 60 minutes)
- **Schedule Pattern**: Weekly recurring schedule
- **Time Slots**: Specific days and times
- **Date Range**: Start and end dates for the group

#### Student Management
- **Add Students**: Select from existing students
- **Remove Students**: Manage current enrollment
- **Capacity Limits**: Set maximum student count
- **Enrollment Status**: Track active vs. inactive members

## Custom Logic, Validation, and Quirks

### Group Creation Logic
- **Automatic Session Generation**: Creates lesson sessions based on schedule
- **Student Subscription Creation**: Auto-generates subscriptions for enrolled students
- **Pricing Calculations**: Handles different pricing models dynamically
- **Schedule Validation**: Ensures no conflicts with existing bookings

### Pricing System
- **Flexible Pricing Models**:
  - Per Session: Price × Session Count = Total
  - Fixed Price: Set total regardless of session count
- **Multi-Currency Support**: Handles different currencies per school
- **Price Distribution**: Splits group costs among students
- **Payment Tracking**: Links to individual student payments

### Schedule Management
- **JSON Schedule Storage**: Complex schedule data stored as JSON
- **Recurring Pattern Logic**: Handles weekly recurring sessions
- **Date Range Validation**: Ensures logical start/end dates
- **Conflict Detection**: Checks for teacher/student availability conflicts

### Student Assignment Logic
- **Enrollment Management**: Tracks student join/leave dates
- **Status Tracking**: Active vs. inactive student participation
- **Automatic Subscriptions**: Creates corresponding individual subscriptions
- **Payment Reconciliation**: Handles pro-rated payments for mid-group joins

### Data Validation Rules
- **Required Fields**: Name, course, teacher, price mode
- **Price Validation**: Must have valid pricing based on selected mode
- **Schedule Validation**: Must have at least one scheduled session
- **Student Limits**: Configurable capacity constraints
- **Date Logic**: End date must be after start date

### Advanced Features

#### Session Generation
- **Intelligent Scheduling**: Creates sessions based on recurring patterns
- **Holiday Handling**: Can skip sessions for holidays (if configured)
- **Make-up Sessions**: Ability to reschedule missed sessions
- **Session Tracking**: Individual session attendance and progress

#### Group Analytics
- **Enrollment Trends**: Track student joining/leaving patterns
- **Revenue Tracking**: Group-specific financial performance
- **Attendance Rates**: Monitor group participation levels
- **Progress Metrics**: Track group learning outcomes

### Integration Points
- **Student Management**: Links students to groups seamlessly
- **Payment System**: Handles group-based billing and payments
- **Calendar Integration**: Group sessions appear in school calendar
- **Attendance Tracking**: Manages group lesson attendance
- **Teacher Scheduling**: Coordinates with teacher availability

### Complex Scenarios Handled
- **Mid-Course Enrollment**: Students joining existing groups
- **Pro-rated Pricing**: Adjusted pricing for partial participation
- **Group Splits**: Dividing large groups into smaller sections
- **Level Progressions**: Moving students between skill-level groups
- **Make-up Classes**: Rescheduling for missed group sessions

### Database Schema Integration
- **Groups Table**: Core group information
- **Group Students Junction**: Many-to-many student relationships  
- **Lesson Sessions**: Individual session records for groups
- **Subscriptions**: Individual student subscriptions linked to groups

### Performance Considerations
- **Batch Operations**: Efficient creation of multiple sessions/subscriptions
- **Query Optimization**: Minimal database calls for group data loading
- **Caching Strategy**: Group data cached for quick access
- **Pagination**: Handles schools with many groups efficiently

### Security and Access Control
- **School Isolation**: Groups isolated by school ID
- **Role Permissions**: Different access levels for admin/teacher roles
- **Student Privacy**: Students only see their own group information
- **Data Validation**: Server-side validation for all group operations

### Known Limitations
- **Capacity Management**: No automated waitlist functionality
- **Complex Schedules**: Limited support for irregular scheduling patterns
- **Resource Booking**: No classroom/resource conflict management
- **Communication Tools**: No built-in group messaging features
- **Assessment Integration**: No direct link to student assessment tools
