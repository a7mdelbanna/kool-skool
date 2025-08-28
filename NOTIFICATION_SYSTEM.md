# Notification Templates System

## Overview

The notification templates system provides comprehensive management of automated notifications for TutorFlow. It supports multiple languages, customizable templates, and flexible delivery rules.

## Features

### 1. Notification Templates
- **Default Templates**: Pre-built templates in Russian and English
- **Custom Templates**: Create custom templates for specific needs
- **Variable Support**: Dynamic content with variables like `{studentName}`, `{lessonTime}`, etc.
- **Multi-language**: English and Russian language support
- **Preview Functionality**: Preview templates with sample data

### 2. Notification Rules
- **Lesson Reminders**: Configure timing for lesson reminders (1 day, 2 hours, 15 minutes)
- **Payment Reminders**: Set up payment due date reminders
- **Lesson Cancellation**: Immediate notifications for cancelled lessons
- **Recipient Management**: Choose between students, parents, or both
- **Channel Selection**: SMS, WhatsApp, or both delivery channels

### 3. Template Editor
- **Rich Editor**: Full-featured template editing interface
- **Variable Insertion**: Easy insertion of dynamic variables
- **Validation**: Real-time template validation and error checking
- **Preview Mode**: Live preview with sample data

## Template Types

### Lesson Reminders
- **1 Day Before**: `lesson_reminder_1_day`
- **2 Hours Before**: `lesson_reminder_2_hours`
- **15 Minutes Before**: `lesson_reminder_15_min`

### Payment & Cancellation
- **Payment Reminder**: `payment_reminder`
- **Lesson Cancellation**: `lesson_cancellation`
- **Custom**: `custom` templates

## Available Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{studentName}` | Full name of the student | John Doe |
| `{parentName}` | Full name of the parent/guardian | Jane Doe |
| `{teacherName}` | Full name of the teacher | Mr. Smith |
| `{subject}` | Subject or course name | Mathematics |
| `{lessonTime}` | Date and time of the lesson | Monday, Dec 25 at 2:00 PM |
| `{date}` | General date field | December 25, 2024 |
| `{amount}` | Payment amount | $150.00 |
| `{lessonDuration}` | Duration of the lesson | 60 minutes |
| `{location}` | Lesson location or platform | Zoom Meeting |
| `{schoolName}` | Name of the educational institution | TutorFlow Academy |

## Default Templates

### English Templates

#### Lesson Reminder - 1 Day
```
Hi {studentName}, this is a reminder that you have a {subject} lesson with {teacherName} tomorrow at {lessonTime}. Please be prepared and join on time!
```

#### Lesson Reminder - 2 Hours
```
Hi {studentName}, your {subject} lesson with {teacherName} starts in 2 hours at {lessonTime}. Don't forget to prepare your materials!
```

#### Lesson Reminder - 15 Minutes
```
Hi {studentName}, your {subject} lesson with {teacherName} starts in 15 minutes! Please join now: {location}
```

#### Payment Reminder
```
Hi {parentName}, this is a reminder that payment of {amount} for {studentName}'s {subject} lessons is due on {date}. Please make the payment to avoid service interruption.
```

#### Lesson Cancellation
```
Hi {studentName}, unfortunately your {subject} lesson with {teacherName} scheduled for {lessonTime} has been cancelled. We will contact you soon to reschedule. We apologize for any inconvenience.
```

### Russian Templates

All templates are also available in Russian with culturally appropriate translations.

## Usage

### Accessing the Notification System

1. Navigate to **Settings** → **Communication Settings** → **Notification Rules** tab
2. Initialize default templates and rules if none exist
3. Configure notification rules for each type
4. Customize templates as needed

### Creating Custom Templates

1. Go to the **Notification Rules** tab
2. Scroll to **Message Templates** section
3. Click **Create Template**
4. Fill in template details:
   - Name
   - Type
   - Language
   - Message body with variables
5. Use the preview function to test
6. Save the template

### Configuring Notification Rules

1. For each rule type (Lesson Reminders, Payment Reminders, etc.):
   - Enable/disable the rule
   - Set recipients (students, parents, both)
   - Configure individual reminders:
     - Timing (15 minutes to 30 days)
     - Delivery channel (SMS, WhatsApp, both)
     - Template selection

### Managing Templates

- **Edit**: Modify existing templates (custom templates only)
- **Delete**: Remove custom templates (default templates cannot be deleted)
- **Preview**: See how templates look with sample data
- **Language**: Switch between English and Russian versions

## Technical Implementation

### File Structure
```
/src/types/notification.types.ts          - Type definitions
/src/services/notificationSettings.service.ts - Service layer
/src/components/NotificationTemplateEditor.tsx - Template editor
/src/utils/notificationHelpers.ts        - Utility functions
```

### Firebase Collections
- `notificationTemplates` - Template storage
- `notificationRules` - Rule configuration
- `notificationLogs` - Delivery logs (existing)

### Integration Points
- Extends existing `TwilioSettings.tsx` component
- Uses existing `twilioService` for message delivery
- Integrates with Firebase Firestore for data persistence

## Best Practices

### Template Design
- Keep messages concise and clear
- Always include student/parent names for personalization
- Include essential information like time and subject
- Use appropriate tone for the audience
- Test templates with preview function

### Rule Configuration
- Don't over-notify - balance frequency with effectiveness
- Consider time zones when setting reminder times
- Use appropriate channels for different message types
- Set realistic timing windows

### Maintenance
- Regularly review and update templates
- Monitor delivery logs for effectiveness
- Adjust timing based on user feedback
- Keep default templates as fallbacks

## Troubleshooting

### Common Issues
1. **Templates not showing**: Check if default templates are initialized
2. **Variables not working**: Ensure correct variable syntax with braces
3. **Rules not saving**: Check for validation errors in forms
4. **Messages not sending**: Verify Twilio configuration in main settings

### Error Messages
- Template validation errors are shown in real-time
- Rule configuration issues are highlighted with specific guidance
- Network/service errors include recovery suggestions

## Future Enhancements

### Planned Features
- Email notification support
- Advanced scheduling with time zone awareness
- A/B testing for template effectiveness
- Bulk template import/export
- Advanced variable formatting (date/time formats)
- Conditional logic in templates
- Integration with calendar events
- Mobile app push notifications

### Customization Options
- Custom variable definitions
- Template approval workflows
- Role-based template management
- School-specific branding in messages