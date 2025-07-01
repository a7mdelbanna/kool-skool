
# Dashboard - Main Overview Page

## What the feature does
The Dashboard serves as the central hub of the School Management System, providing administrators with a comprehensive overview of their tutoring business. It displays key metrics, recent activities, and quick access to important functions.

## How users interact with it (UI flow)

### Initial View
- Users land on the dashboard after login
- Two view modes available: **Enhanced View** (default) and **Standard View**
- Toggle between views using tabs in the top-right corner

### Main Components

#### 1. Header Section
- **Title**: "Dashboard" with welcome message
- **Action Buttons**:
  - Filter button (opens filter popover)
  - "New Student" button (opens student creation dialog)
- **View Toggle**: Switch between Enhanced/Standard views

#### 2. Statistics Cards
- **Enhanced View**: Shows `EnhancedDashboardStats` with detailed metrics
- **Standard View**: Shows basic `DashboardStats`
- Cards display key performance indicators

#### 3. Charts Section (Enhanced View Only)
- **Revenue/Expenses Chart**: 2/3 width column showing financial trends
- **New Students Stats**: 1/3 width column showing student acquisition data

#### 4. Recent Students Section
- **Left Column** (2/3 width): Grid of recent student cards
- Each student card shows:
  - Name and email
  - Course and lesson type
  - Progress information
  - Payment status
  - Next lesson time

#### 5. Right Sidebar
- **Upcoming Lessons**: List of scheduled lessons for today/tomorrow
- **Upcoming Payments**: List of pending and overdue payments

### Interactive Elements

#### Filter System
- **Daily/Weekly/Monthly** toggle buttons
- Customizes dashboard time range
- Currently shows sample filtering options

#### Add Student Dialog
- Triggered by "New Student" button
- Opens comprehensive student creation form
- Uses `PaymentProvider` context for payment-related functionality
- Shows success toast notification after student creation

## Custom Logic, Validation, and Quirks

### Sample Data
The dashboard currently displays **sample/mock data** for demonstration:
- Sample students array with predefined student records
- Sample lessons with various subjects and times
- Sample payments with different statuses and due dates

### Context Usage
- **PaymentProvider**: Wraps the AddStudentDialog for payment functionality
- **UserContext**: Manages user authentication and school context

### State Management
- `useState` for controlling dialog visibility
- `useState` for managing dashboard view mode (enhanced/standard)
- Date picker state for filtering (not fully implemented)

### Key Features
1. **Responsive Design**: Adapts to different screen sizes
2. **Glass Effect**: Cards use glass morphism styling (`glass glass-hover`)
3. **View Transitions**: Smooth transitions between view modes with `element-transition` class
4. **Toast Notifications**: Success messages when actions are completed

### Data Flow
1. Dashboard loads with sample data
2. Users can filter by time periods (functionality partially implemented)
3. Student creation flows through the AddStudentDialog component
4. Real-time updates should refresh dashboard metrics (not implemented with sample data)

### Limitations
- Currently uses static sample data instead of real database queries
- Filter functionality is partially implemented
- No real-time updates from database changes
- Payment integration is set up but not fully connected to backend

### Integration Points
- Connects to student management system via AddStudentDialog
- Integrates with payment system through PaymentProvider
- Links to other sections via navigation (StudentCard components link to detailed views)
