# NotificationLogsViewer Component

A comprehensive component for viewing, filtering, and managing notification logs in the TutorFlow Assistant application.

## Features

### 📊 Statistics Dashboard
- **Total Sent**: Shows total number of successfully sent notifications
- **Success Rate**: Displays the percentage of successfully delivered messages
- **Total Cost**: Shows cumulative cost of all sent notifications
- **Failed Messages**: Shows count of failed notification attempts

### 🔍 Advanced Filtering
- **Date Range**: Filter logs by specific date ranges with preset options (Today, Yesterday, Last 7 days, etc.)
- **Status Filter**: Filter by message status (sent, delivered, read, failed, pending)
- **Type Filter**: Filter by notification type (lesson_reminder, payment_reminder, lesson_cancellation, custom)
- **Channel Filter**: Filter by delivery channel (SMS, WhatsApp)
- **Recipient Search**: Search by recipient name or phone number

### 📋 Data Table
- **Sortable Columns**: Sort by date/time, recipient, type, status, and cost
- **Pagination**: Navigate through large datasets efficiently
- **Real-time Updates**: Optional real-time refresh for latest data
- **Responsive Design**: Works on desktop and mobile devices

### 📤 Export Functionality
- **CSV Export**: Download filtered logs as CSV files
- **Formatted Data**: Includes all relevant fields with proper formatting

### 🔧 Management Actions
- **View Details**: Click to see full message content and metadata
- **Resend Failed**: Retry sending failed messages
- **Delete Old Logs**: Bulk delete logs older than specified days (admin only)

### 🧪 Development Features
- **Sample Data**: Create sample logs for testing (development mode only)
- **Real-time Toggle**: Enable/disable real-time updates

## Usage

```tsx
import NotificationLogsViewer from '@/components/NotificationLogsViewer';

<NotificationLogsViewer schoolId={schoolId} />
```

## Props

- `schoolId` (string): The unique identifier for the school

## Data Structure

The component works with the `NotificationLog` type which includes:

- Basic info: recipient details, message content, timestamps
- Status tracking: sent, delivered, read, failed states
- Cost tracking: per-message costs and totals
- Metadata: additional context like student/lesson IDs
- Template info: associated template name and type

## Services Used

- **notificationLogsService**: Main service for CRUD operations
- **Firebase Firestore**: Backend storage with real-time capabilities
- **React Query**: Caching and state management for API calls

## Performance Features

- **Pagination**: Loads data in chunks to handle large datasets
- **Client-side Filtering**: Fast text search and complex filters
- **Caching**: React Query caches results for better performance
- **Real-time Updates**: Optional WebSocket-like updates via Firebase

## Security

- **School Isolation**: All data is scoped to specific schools
- **Permission Checks**: Admin-only features are protected
- **Data Validation**: All inputs are validated before processing

## Testing

Use the "Create Sample Data" button in development mode to populate the viewer with realistic test data including:

- Various message types and statuses
- Different channels (SMS/WhatsApp)
- Cost variations
- Success and failure scenarios
- Recent and historical data

## Integration

The component is integrated into the TwilioSettings page as the "Logs" tab, replacing the basic logs placeholder. It automatically inherits the school context and user permissions from the parent component.