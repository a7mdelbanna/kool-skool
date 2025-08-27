# Twilio Integration Documentation

## Overview

The TutorFlow Assistant now includes comprehensive Twilio integration for SMS and WhatsApp notifications, allowing schools to automate communication with students about lessons, payments, and schedule changes.

## Features

### 🔔 Notification Types
1. **Lesson Reminders** - Automated reminders before scheduled lessons
2. **Payment Reminders** - Payment due date notifications
3. **Attendance Confirmations** - Post-lesson attendance status
4. **Schedule Changes** - Immediate notifications for rescheduling

### 📱 Communication Channels
- **SMS** - Traditional text messaging
- **WhatsApp** - WhatsApp Business messaging
- **Dual Channel** - Send via both simultaneously

### ⚙️ Configuration Options
- Per-school Twilio credentials
- Channel selection per notification type
- Customizable message templates
- Flexible timing rules
- Monthly budget limits
- Quiet hours enforcement

## Setup Guide

### 1. Twilio Account Setup

1. Create a [Twilio account](https://www.twilio.com/try-twilio)
2. Purchase a phone number for SMS
3. Set up WhatsApp Business (requires approval)
4. Note your Account SID and Auth Token

### 2. Configure in TutorFlow

1. Navigate to **Settings > Communications**
2. Enter Twilio credentials:
   - Account SID
   - Auth Token
   - SMS Phone Number
   - WhatsApp Number (format: `whatsapp:+1234567890`)
3. Set monthly budget (optional)
4. Enable integration

### 3. Configure Notification Templates

1. Go to **Templates** tab
2. For each notification type:
   - Enable/disable
   - Select channel (SMS/WhatsApp/Both)
   - Customize message template
   - Set timing rules

### 4. Test Configuration

1. Go to **Test** tab
2. Enter test phone number
3. Select channel
4. Send test message
5. Verify delivery

## Message Templates

### Available Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{name}` | Student full name | John Smith |
| `{subject}` | Course/subject name | Mathematics |
| `{teacher}` | Teacher name | Ms. Johnson |
| `{time}` | Lesson time | 3:00 PM |
| `{date}` | Lesson/payment date | Jan 15, 2024 |
| `{amount}` | Payment amount | $150.00 |
| `{course}` | Course name | English B1 |
| `{status}` | Attendance status | Present |

### Template Examples

**Lesson Reminder:**
```
Hi {name}, reminder: You have {subject} lesson with {teacher} at {time} tomorrow.
```

**Payment Reminder:**
```
Hi {name}, payment of {amount} for {course} is due on {date}. Please pay to avoid service interruption.
```

**Schedule Change:**
```
Important: Your {subject} lesson scheduled for {original_time} has been rescheduled to {new_time}.
```

## Timing Rules

Configure when notifications are sent:

| Type | Default Timing | Configurable |
|------|---------------|--------------|
| Lesson Reminder | 24h, 1h before | ✅ |
| Payment Reminder | 3 days, 1 day before | ✅ |
| Attendance | Immediately after | ❌ |
| Schedule Change | Immediately | ❌ |

## Student Preferences

Students can manage their notification preferences:

- **Opt-out** - Complete opt-out from all notifications
- **Channel preference** - SMS only, WhatsApp only, or both
- **Quiet hours** - No notifications during specified hours
- **Phone numbers** - Separate numbers for SMS and WhatsApp

## Cost Management

### Budget Controls
- Set monthly spending limit
- Track current month spend
- Automatic stop when limit reached
- Cost per message logging

### Typical Costs (USD)
- SMS: $0.0075 - $0.05 per message
- WhatsApp: $0.005 - $0.05 per message
- Varies by country and volume

## Automation

### Scheduled Jobs
The system runs automated schedulers:

1. **Daily at 9 AM UTC** - Process lesson reminders
2. **Daily at 10 AM UTC** - Process payment reminders
3. **Real-time** - Schedule changes and attendance

### Cloud Functions
- `sendTwilioMessage` - Core message sending
- `scheduleLessonReminders` - Daily lesson reminder job
- `schedulePaymentReminders` - Daily payment reminder job

## Security

### Data Protection
- Credentials encrypted at rest
- TLS for all API communications
- Role-based access (Admin only)
- Audit logging for all messages

### Compliance
- GDPR compliant opt-out mechanism
- Student data privacy protected
- Message content logging optional
- Retention policies configurable

## Monitoring

### Delivery Logs
View message delivery status:
- **Sent** - Message dispatched
- **Delivered** - Confirmed delivery
- **Failed** - Delivery failed
- **Pending** - In queue

### Analytics
- Total messages sent
- Delivery success rate
- Channel distribution
- Cost analysis
- Student engagement

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Messages not sending | Check credentials and phone number format |
| WhatsApp not working | Ensure WhatsApp Business approval |
| Budget exceeded | Increase limit or wait for reset |
| Student not receiving | Check opt-out status and phone number |

### Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 21211 | Invalid phone number | Check format |
| 21408 | Permission denied | Verify account |
| 21610 | Message blocked | Check spam filters |
| 63003 | WhatsApp not approved | Complete approval |

## API Reference

### Service Methods

```typescript
// Get configuration
twilioService.getConfig(schoolId: string): Promise<TwilioConfig>

// Save configuration
twilioService.saveConfig(schoolId: string, config: TwilioConfig): Promise<void>

// Send test message
twilioService.sendTestMessage(schoolId: string, params: TestMessageParams): Promise<void>

// Send notification
twilioService.sendNotification(
  schoolId: string,
  studentId: string,
  type: string,
  variables: Record<string, string>
): Promise<void>

// Get logs
twilioService.getNotificationLogs(schoolId: string, limit?: number): Promise<NotificationLog[]>
```

## Best Practices

1. **Test before enabling** - Always test with your own number first
2. **Start with one channel** - Begin with SMS before adding WhatsApp
3. **Monitor costs** - Set conservative budgets initially
4. **Respect preferences** - Honor student opt-outs immediately
5. **Use templates** - Maintain consistent messaging
6. **Track delivery** - Monitor logs for failed messages
7. **Time appropriately** - Avoid early morning or late night
8. **Keep messages short** - SMS has 160 character limit

## Support

For Twilio-specific issues:
- [Twilio Support](https://support.twilio.com)
- [Twilio Status](https://status.twilio.com)

For TutorFlow integration issues:
- Contact your system administrator
- Check the error logs in Settings > Communications > Logs