# Telegram Notification System - Setup Guide

## Overview

The Telegram notification system provides automated notifications to students via Telegram for lesson reminders and subscription expiry alerts. Students can link their Telegram accounts using QR codes, and admins can configure notification templates, timing, and rules.

## Features

✅ **Automated Notifications**
- Lesson reminders (customizable timing: 15 minutes, 2 hours, 1 day, etc.)
- Subscription expiry notifications (7 days before by default)

✅ **Student Linking**
- QR code-based account linking
- Deep link support for easy onboarding
- `/start`, `/link`, `/unlink` bot commands

✅ **Admin Configuration**
- Bot token management
- Message templates (English & Russian)
- Notification rules and timing
- Real-time notification logs

✅ **Multi-language Support**
- English and Russian templates
- Student-specific language preferences

---

## Step 1: Create Your Telegram Bot

### 1.1 Open Telegram and Find BotFather

1. Open Telegram on your phone or desktop
2. Search for **@BotFather**
3. Click "Start" to begin conversation

### 1.2 Create New Bot

1. Send command: `/newbot`
2. Choose a **display name** (e.g., "Kool Skool Notifications")
3. Choose a **username** (must end with "bot", e.g., "koolskool_notify_bot")
4. BotFather will respond with:
   - ✅ Your **bot token** (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
   - 🔗 A link to access your bot

**⚠️ IMPORTANT**: Save your bot token securely! You'll need it for configuration.

### 1.3 Customize Your Bot (Optional)

Make your bot look professional:

```
/setdescription
```
Example: "Get automated notifications about your lessons and payments from Kool Skool"

```
/setabouttext
```
Example: "Official Kool Skool notification bot"

```
/setuserpic
```
Upload a profile picture for your bot

---

## Step 2: Configure Telegram in Your CRM

### 2.1 Access Telegram Settings

1. Log in to your CRM admin dashboard
2. Navigate to **Settings** → **Telegram Notifications** (route: `/settings/telegram`)

### 2.2 Enter Bot Configuration

1. **Bot Token**: Paste the token from BotFather
2. Click **Verify Bot Token** to confirm it's valid
3. **Default Language**: Choose English or Russian
4. **Active**: Toggle ON to enable notifications
5. Click **Save Configuration**

After verification, you'll see:
- ✅ Bot name
- ✅ Bot username
- ✅ Verification status

---

## Step 3: Configure Notification Rules

### 3.1 Navigate to Notification Rules Tab

In Telegram Settings, click the **"Notification Rules"** tab.

### 3.2 Configure Lesson Reminders

Available timing options:
- ✅ 15 minutes before lesson
- ✅ 2 hours before lesson
- ✅ 1 day before lesson
- ✅ Custom timing

For each reminder:
1. Enable/disable the reminder
2. Set timing (value + unit: minutes/hours/days)
3. Select channel (Telegram)
4. Choose recipients (students, parents, teachers)

### 3.3 Configure Subscription Expiry Notifications

Default: 7 days before subscription ends

Customize:
1. Enable/disable subscription notifications
2. Set timing (default: 7 days)
3. Select recipients (typically parents)

### 3.4 Save Rules

Click **"Save Rules"** to apply changes.

---

## Step 4: Customize Message Templates

### 4.1 Navigate to Templates Tab

In Telegram Settings, click the **"Templates"** tab.

### 4.2 Available Templates

**Lesson Reminder Templates:**
- `lesson_reminder_1_day` - 1 day before
- `lesson_reminder_2_hours` - 2 hours before
- `lesson_reminder_15_min` - 15 minutes before

**Subscription Expiry Template:**
- `subscription_expiry` - Subscription ending soon

### 4.3 Template Variables

Use these placeholders in your messages:

| Variable | Description | Example |
|----------|-------------|---------|
| `{studentName}` | Student's full name | "John Doe" |
| `{parentName}` | Parent's full name | "Jane Doe" |
| `{teacherName}` | Teacher's full name | "Mr. Smith" |
| `{subject}` | Course/subject name | "Mathematics" |
| `{lessonTime}` | Formatted lesson time | "Monday, Dec 25 at 2:00 PM" |
| `{zoomLink}` | Zoom meeting link | "https://zoom.us/j/123..." |
| `{subscriptionEndDate}` | Subscription end date | "January 15, 2025" |
| `{daysUntilExpiry}` | Days until expiry | "7" |
| `{sessionsRemaining}` | Sessions left | "3" |

### 4.4 Example Template (English)

```
Hi {studentName}, reminder: you have a {subject} lesson with {teacherName} at {lessonTime}.

Join here: {zoomLink}

See you soon! 📚
```

### 4.5 Example Template (Russian)

```
Привет {studentName}, напоминаем, что у вас урок {subject} с {teacherName} в {lessonTime}.

Присоединяйтесь: {zoomLink}

До встречи! 📚
```

### 4.6 Create/Edit Templates

1. Click **"New Template"** or **Edit** on existing template
2. Fill in template details
3. Use variable picker to insert placeholders
4. Preview template with sample data
5. Save template

---

## Step 5: Link Student Accounts

### 5.1 Two Methods for Linking

**Method 1: QR Code (Recommended)**
1. Go to Student Detail page
2. Find "Telegram Notifications" card
3. Click **"Generate QR Code"**
4. Student scans QR code with Telegram
5. Student clicks "Start" in bot
6. Account automatically linked ✅

**Method 2: Linking Code**
1. Generate linking code for student
2. Share code with student
3. Student opens your bot in Telegram
4. Student sends: `/start CODE`
5. Account linked ✅

### 5.2 Verify Linking

In Student Detail page, you'll see:
- ✅ **Status**: Linked (green badge)
- 👤 **Username**: @student_username
- 🆔 **Chat ID**: 123456789
- 🌐 **Language**: EN/RU
- 📅 **Linked At**: Date/time

### 5.3 Unlink Account

If needed:
1. Click **"Unlink"** button
2. Confirm action
3. Account unlinked

Student can also self-unlink using bot command: `/unlink`

---

## Step 6: Deploy Cloud Functions

### 6.1 Install Firebase CLI (if not installed)

```bash
npm install -g firebase-tools
```

### 6.2 Login to Firebase

```bash
firebase login
```

### 6.3 Deploy Functions

```bash
cd functions
npm install
firebase deploy --only functions
```

This deploys:
- ✅ `sendTelegramLessonReminders` - Runs every 30 minutes
- ✅ `sendTelegramSubscriptionReminders` - Runs daily at 9 AM UTC
- ✅ `handleTelegramWebhook` - Handles bot commands

### 6.4 Set Up Webhook (Optional)

For bot commands to work, set up webhook:

1. Get your Cloud Function URL:
```
https://[region]-[project-id].cloudfunctions.net/handleTelegramWebhook
```

2. Set webhook using BotFather or API:
```
https://api.telegram.org/bot[YOUR_BOT_TOKEN]/setWebhook?url=[YOUR_FUNCTION_URL]
```

---

## Step 7: Test the System

### 7.1 Test Bot Token

1. In Telegram Settings, **Configuration** tab
2. Enter bot token
3. Click **"Verify Bot Token"**
4. Should show ✅ with bot info

### 7.2 Test Notifications

1. Go to **"Test Notifications"** tab
2. Enter a **Chat ID** (your own Telegram chat ID)
3. Write a test message
4. Click **"Send Test Message"**
5. Check Telegram for the message

**How to get your Chat ID:**
1. Start your bot in Telegram
2. Send any message to your bot
3. Visit: `https://api.telegram.org/bot[TOKEN]/getUpdates`
4. Look for "chat":{"id": YOUR_CHAT_ID}

### 7.3 Test Student Linking

1. Generate QR code for a test student
2. Scan with your phone
3. Open in Telegram
4. Click "Start"
5. Verify linking in Student Detail page

### 7.4 Check Logs

1. Go to **"Logs"** tab in Telegram Settings
2. View all sent notifications
3. Filter by:
   - Date range
   - Status (sent, failed, pending)
   - Notification type
   - Student name

---

## Bot Commands Reference

Students can use these commands in your bot:

| Command | Description | Example |
|---------|-------------|---------|
| `/start` | Start bot and view welcome message | `/start` |
| `/start CODE` | Link account using code | `/start ABC12345` |
| `/unlink` | Unlink Telegram account | `/unlink` |
| `/status` | Check notification status | `/status` |

---

## Troubleshooting

### Bot Token Invalid

**Problem**: "Invalid bot token" error

**Solution**:
1. Double-check token from BotFather
2. Ensure no extra spaces
3. Token format: `123456789:ABCdefGHI...`
4. Create new bot if token lost

### Notifications Not Sending

**Problem**: Students not receiving notifications

**Checklist**:
- ✅ Bot configuration active?
- ✅ Student account linked?
- ✅ Notification rules enabled?
- ✅ Cloud Functions deployed?
- ✅ Student has Telegram notifications enabled?

### QR Code Not Working

**Problem**: QR code doesn't link account

**Solution**:
1. Check QR code expiry (24 hours)
2. Generate new code
3. Ensure bot username is correct
4. Try manual linking code instead

### Scheduled Notifications Not Working

**Problem**: Auto-reminders not being sent

**Solution**:
1. Check Cloud Functions logs in Firebase Console
2. Verify functions are deployed: `firebase functions:list`
3. Check function execution logs for errors
4. Ensure notification rules are enabled
5. Verify student has upcoming lessons/expiring subscriptions

---

## Security Best Practices

🔒 **Protect Bot Token**
- Never commit bot token to git
- Store in Firebase environment config
- Rotate token if exposed

🔒 **Student Data Privacy**
- Only link verified students
- Provide unlink option
- Don't share chat IDs publicly

🔒 **Rate Limiting**
- Telegram API limits: 30 messages/second
- Cloud Functions handle rate limiting automatically

---

## Cost Considerations

💰 **Telegram Notifications: FREE!**

Unlike SMS/WhatsApp:
- ✅ Unlimited free messages
- ✅ No per-message costs
- ✅ No monthly fees
- ✅ Only pay for Firebase Cloud Functions execution (minimal)

**Estimated Cloud Function Costs:**
- 100 students, 2 reminders/day each = 6,000 invocations/month
- Firebase free tier: 2 million invocations/month
- **Result: FREE for most schools!**

---

## Advanced Configuration

### Custom Notification Timing

Edit notification rules to set custom timing:

```typescript
{
  id: 'custom_reminder',
  enabled: true,
  timing: { value: 3, unit: 'hours' }, // 3 hours before
  channel: 'telegram',
  templateType: 'lesson_reminder_custom'
}
```

### Multi-Language Templates

Create templates for each language:

1. Create English template
2. Create Russian template (same type, different language)
3. System auto-selects based on student's language preference

### Webhook vs Polling

**Webhook (Recommended for Production):**
- Real-time bot command processing
- More efficient
- Requires HTTPS endpoint

**Polling (Development):**
- Simpler setup
- No webhook needed
- Slightly delayed responses

---

## Support & Resources

📚 **Documentation**:
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Firebase Cloud Functions](https://firebase.google.com/docs/functions)
- [BotFather Commands](https://core.telegram.org/bots#6-botfather)

🐛 **Issues**:
- Check Firebase Functions logs
- Check Telegram API responses
- Review notification logs in CRM

💬 **Need Help?**
- Review this guide
- Check troubleshooting section
- Contact technical support

---

## Changelog

**Version 1.0.0** - Initial Release
- ✅ Lesson reminders
- ✅ Subscription expiry notifications
- ✅ QR code linking
- ✅ Multi-language templates
- ✅ Admin configuration UI
- ✅ Notification logs

---

## Next Steps

Now that your Telegram notification system is set up:

1. ✅ **Test thoroughly** with your own account
2. ✅ **Link a few test students** to validate
3. ✅ **Monitor notification logs** for first week
4. ✅ **Gather feedback** from students/parents
5. ✅ **Adjust templates** based on feedback
6. ✅ **Roll out to all students** gradually

**Congratulations! Your Telegram notification system is ready! 🎉**
