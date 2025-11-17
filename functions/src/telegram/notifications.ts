const functions = require('firebase-functions');
const admin = require('firebase-admin');

const db = admin.firestore();

interface TelegramConfig {
  botToken: string;
  botUsername?: string;
  isActive: boolean;
  defaultLanguage: 'en' | 'ru';
  reminderTimings: {
    lessonReminder: string;
    subscriptionExpiry: string;
  };
}

interface NotificationTemplate {
  body: string;
  language: 'en' | 'ru';
  type: string;
}

interface NotificationRule {
  enabled: boolean;
  reminders: Array<{
    enabled: boolean;
    timing: {
      value: number;
      unit: 'minutes' | 'hours' | 'days';
    };
    channel: string;
  }>;
}

/**
 * Send a message via Telegram Bot API
 */
async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });

    const data = await response.json();

    if (data.ok) {
      return { success: true };
    } else {
      return { success: false, error: data.description };
    }
  } catch (error: any) {
    console.error('Error sending Telegram message:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Parse template with variables
 */
function parseTemplate(template: string, variables: Record<string, string>): string {
  let message = template;

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{${key}}`, 'g');
    message = message.replace(regex, value);
  }

  return message;
}

/**
 * Log notification to Firestore
 */
async function logNotification(logData: any): Promise<void> {
  await db.collection('notification_logs').add({
    ...logData,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Format date for notifications
 */
function formatDate(date: Date, language: 'en' | 'ru'): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };

  const locale = language === 'ru' ? 'ru-RU' : 'en-US';
  return date.toLocaleDateString(locale, options);
}

/**
 * Scheduled function: Send Telegram lesson reminders
 * Runs every 30 minutes to check for upcoming lessons
 */
export const sendTelegramLessonReminders = functions.pubsub
  .schedule('every 30 minutes')
  .onRun(async () => {
    console.log('Starting Telegram lesson reminders check...');

    try {
      // Get all schools with active Telegram integration
      const schoolsSnapshot = await db
        .collection('telegram_settings')
        .where('isActive', '==', true)
        .get();

      if (schoolsSnapshot.empty) {
        console.log('No schools with active Telegram integration');
        return null;
      }

      let totalSent = 0;

      // Process each school
      for (const schoolDoc of schoolsSnapshot.docs) {
        const schoolId = schoolDoc.id;
        const config = schoolDoc.data() as TelegramConfig;

        console.log(`Processing school: ${schoolId}`);

        // Get notification rules for lesson reminders
        const rulesDoc = await db
          .collection('notificationRules')
          .doc(`${schoolId}_lesson_reminders`)
          .get();

        if (!rulesDoc.exists) {
          console.log(`No lesson reminder rules for school: ${schoolId}`);
          continue;
        }

        const rules = rulesDoc.data() as NotificationRule;

        if (!rules.enabled) {
          console.log(`Lesson reminders disabled for school: ${schoolId}`);
          continue;
        }

        // Process each reminder timing
        for (const reminder of rules.reminders) {
          if (!reminder.enabled || reminder.channel !== 'telegram') {
            continue;
          }

          const now = new Date();
          const reminderTime = new Date();

          // Calculate the time window for this reminder
          if (reminder.timing.unit === 'minutes') {
            reminderTime.setMinutes(now.getMinutes() + reminder.timing.value);
          } else if (reminder.timing.unit === 'hours') {
            reminderTime.setHours(now.getHours() + reminder.timing.value);
          } else if (reminder.timing.unit === 'days') {
            reminderTime.setDate(now.getDate() + reminder.timing.value);
          }

          // Create a 30-minute window around the reminder time
          const windowStart = new Date(reminderTime.getTime() - 15 * 60 * 1000);
          const windowEnd = new Date(reminderTime.getTime() + 15 * 60 * 1000);

          // Find sessions in this time window
          const sessionsSnapshot = await db
            .collection('sessions')
            .where('schoolId', '==', schoolId)
            .where('status', '==', 'scheduled')
            .where('scheduled_date', '>=', admin.firestore.Timestamp.fromDate(windowStart))
            .where('scheduled_date', '<=', admin.firestore.Timestamp.fromDate(windowEnd))
            .get();

          console.log(`Found ${sessionsSnapshot.size} sessions for ${reminder.timing.value} ${reminder.timing.unit} reminder`);

          // Process each session
          for (const sessionDoc of sessionsSnapshot.docs) {
            const session = sessionDoc.data();

            // Get student with Telegram enabled
            const studentDoc = await db
              .collection('students')
              .doc(session.studentId)
              .get();

            if (!studentDoc.exists) continue;

            const student = studentDoc.data();

            // Check if student has Telegram enabled
            if (!student.telegramNotifications?.enabled || !student.telegramNotifications?.chatId) {
              console.log(`Student ${session.studentId} doesn't have Telegram enabled`);
              continue;
            }

            // Get teacher info
            const teacherDoc = await db
              .collection('users')
              .doc(session.teacherId)
              .get();

            const teacher = teacherDoc.exists ? teacherDoc.data() : null;

            // Get the appropriate template
            const language = student.telegramNotifications.language || config.defaultLanguage || 'en';
            const templatesSnapshot = await db
              .collection('notificationTemplates')
              .where('schoolId', '==', schoolId)
              .where('type', '==', `lesson_reminder_${reminder.timing.value}_${reminder.timing.unit}`)
              .where('language', '==', language)
              .where('isActive', '==', true)
              .limit(1)
              .get();

            let templateBody = '';

            if (!templatesSnapshot.empty) {
              templateBody = templatesSnapshot.docs[0].data().body;
            } else {
              // Use default template
              if (language === 'ru') {
                templateBody = 'Привет {studentName}, напоминаем, что у вас урок {subject} с {teacherName} в {lessonTime}.';
              } else {
                templateBody = 'Hi {studentName}, reminder: you have a {subject} lesson with {teacherName} at {lessonTime}.';
              }
            }

            // Prepare variables
            const lessonDate = session.scheduled_date.toDate();
            const variables = {
              studentName: `${student.firstName} ${student.lastName}`,
              subject: session.subject || student.courseName || 'your',
              teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : 'your teacher',
              lessonTime: formatDate(lessonDate, language),
              zoomLink: session.zoom_link || ''
            };

            const message = parseTemplate(templateBody, variables);

            // Send the message
            const result = await sendTelegramMessage(
              config.botToken,
              student.telegramNotifications.chatId,
              message
            );

            // Log the notification
            await logNotification({
              schoolId,
              recipientName: variables.studentName,
              recipientPhone: student.telegramNotifications.chatId,
              recipientType: 'student',
              notificationType: 'lesson_reminder',
              channel: 'telegram',
              status: result.success ? 'sent' : 'failed',
              message,
              error: result.error || null,
              sentAt: admin.firestore.FieldValue.serverTimestamp(),
              metadata: {
                studentId: student.id,
                sessionId: sessionDoc.id,
                reminderTiming: `${reminder.timing.value} ${reminder.timing.unit}`
              }
            });

            if (result.success) {
              totalSent++;
              console.log(`Sent lesson reminder to ${variables.studentName}`);
            } else {
              console.error(`Failed to send to ${variables.studentName}: ${result.error}`);
            }
          }
        }
      }

      console.log(`Telegram lesson reminders completed. Total sent: ${totalSent}`);
      return null;
    } catch (error) {
      console.error('Error in sendTelegramLessonReminders:', error);
      throw error;
    }
  });

/**
 * Scheduled function: Send Telegram subscription expiry reminders
 * Runs daily at 9 AM to check for expiring subscriptions
 */
export const sendTelegramSubscriptionReminders = functions.pubsub
  .schedule('every day 09:00')
  .timeZone('UTC')
  .onRun(async () => {
    console.log('Starting Telegram subscription expiry reminders check...');

    try {
      // Get all schools with active Telegram integration
      const schoolsSnapshot = await db
        .collection('telegram_settings')
        .where('isActive', '==', true)
        .get();

      if (schoolsSnapshot.empty) {
        console.log('No schools with active Telegram integration');
        return null;
      }

      let totalSent = 0;

      // Process each school
      for (const schoolDoc of schoolsSnapshot.docs) {
        const schoolId = schoolDoc.id;
        const config = schoolDoc.data() as TelegramConfig;

        console.log(`Processing subscriptions for school: ${schoolId}`);

        // Get notification rules for subscription expiry
        const rulesDoc = await db
          .collection('notificationRules')
          .doc(`${schoolId}_subscription_expiry`)
          .get();

        if (!rulesDoc.exists) {
          console.log(`No subscription expiry rules for school: ${schoolId}`);
          continue;
        }

        const rules = rulesDoc.data() as NotificationRule;

        if (!rules.enabled) {
          console.log(`Subscription expiry reminders disabled for school: ${schoolId}`);
          continue;
        }

        // Get all active subscriptions for this school
        const subscriptionsSnapshot = await db
          .collection('subscriptions')
          .where('schoolId', '==', schoolId)
          .where('status', '==', 'active')
          .get();

        console.log(`Found ${subscriptionsSnapshot.size} active subscriptions`);

        // Process each subscription
        for (const subDoc of subscriptionsSnapshot.docs) {
          const subscription = subDoc.data();

          // Get all sessions for this subscription to find the last scheduled date
          const sessionsSnapshot = await db
            .collection('sessions')
            .where('subscriptionId', '==', subDoc.id)
            .orderBy('scheduled_date', 'desc')
            .limit(1)
            .get();

          if (sessionsSnapshot.empty) continue;

          const lastSession = sessionsSnapshot.docs[0].data();
          const endDate = lastSession.scheduled_date.toDate();
          const now = new Date();
          const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          // Check if we should send a reminder based on the configured timing
          for (const reminder of rules.reminders) {
            if (!reminder.enabled || reminder.channel !== 'telegram') {
              continue;
            }

            const reminderDays = reminder.timing.unit === 'days' ? reminder.timing.value :
                                reminder.timing.unit === 'hours' ? Math.ceil(reminder.timing.value / 24) : 1;

            if (daysUntilExpiry === reminderDays) {
              // Get student with Telegram enabled
              const studentDoc = await db
                .collection('students')
                .doc(subscription.student_id)
                .get();

              if (!studentDoc.exists) continue;

              const student = studentDoc.data();

              // Check if student (or parent) has Telegram enabled
              if (!student.telegramNotifications?.enabled || !student.telegramNotifications?.chatId) {
                console.log(`Student ${subscription.student_id} doesn't have Telegram enabled`);
                continue;
              }

              // Get remaining sessions
              const allSessionsSnapshot = await db
                .collection('sessions')
                .where('subscriptionId', '==', subDoc.id)
                .where('status', '==', 'scheduled')
                .get();

              const sessionsRemaining = allSessionsSnapshot.size;

              // Get the appropriate template
              const language = student.telegramNotifications.language || config.defaultLanguage || 'en';
              const templatesSnapshot = await db
                .collection('notificationTemplates')
                .where('schoolId', '==', schoolId)
                .where('type', '==', 'subscription_expiry')
                .where('language', '==', language)
                .where('isActive', '==', true)
                .limit(1)
                .get();

              let templateBody = '';

              if (!templatesSnapshot.empty) {
                templateBody = templatesSnapshot.docs[0].data().body;
              } else {
                // Use default template
                if (language === 'ru') {
                  templateBody = 'Привет {parentName}, подписка {studentName} на уроки {subject} истекает через {daysUntilExpiry} дней - {subscriptionEndDate}. У вас осталось {sessionsRemaining} занятий. Пожалуйста, продлите подписку.';
                } else {
                  templateBody = 'Hi {parentName}, {studentName}\'s subscription for {subject} lessons expires in {daysUntilExpiry} days on {subscriptionEndDate}. You have {sessionsRemaining} sessions remaining. Please renew.';
                }
              }

              // Prepare variables
              const variables = {
                parentName: student.parentName || `${student.firstName}'s parent`,
                studentName: `${student.firstName} ${student.lastName}`,
                subject: student.courseName || 'the',
                daysUntilExpiry: daysUntilExpiry.toString(),
                subscriptionEndDate: formatDate(endDate, language),
                sessionsRemaining: sessionsRemaining.toString()
              };

              const message = parseTemplate(templateBody, variables);

              // Send the message
              const result = await sendTelegramMessage(
                config.botToken,
                student.telegramNotifications.chatId,
                message
              );

              // Log the notification
              await logNotification({
                schoolId,
                recipientName: variables.parentName,
                recipientPhone: student.telegramNotifications.chatId,
                recipientType: 'parent',
                notificationType: 'subscription_expiry',
                channel: 'telegram',
                status: result.success ? 'sent' : 'failed',
                message,
                error: result.error || null,
                sentAt: admin.firestore.FieldValue.serverTimestamp(),
                metadata: {
                  studentId: student.id,
                  subscriptionId: subDoc.id,
                  daysUntilExpiry,
                  sessionsRemaining
                }
              });

              if (result.success) {
                totalSent++;
                console.log(`Sent subscription expiry reminder for ${variables.studentName}`);
              } else {
                console.error(`Failed to send to ${variables.parentName}: ${result.error}`);
              }
            }
          }
        }
      }

      console.log(`Telegram subscription reminders completed. Total sent: ${totalSent}`);
      return null;
    } catch (error) {
      console.error('Error in sendTelegramSubscriptionReminders:', error);
      throw error;
    }
  });

/**
 * HTTP Callable Function: Handle Telegram webhook (for bot commands like /start, /link, /unlink)
 */
export const handleTelegramWebhook = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const update = req.body;

    // Check if this is a message
    if (!update.message) {
      res.status(200).send('OK');
      return;
    }

    const message = update.message;
    const chatId = message.chat.id;
    const text = message.text;
    const username = message.from.username;

    // Handle /start command with linking code
    if (text && text.startsWith('/start ')) {
      const code = text.substring(7).trim();

      // Verify the linking code
      const linkingCodeDoc = await db
        .collection('telegram_linking_codes')
        .doc(code)
        .get();

      if (!linkingCodeDoc.exists) {
        // Invalid code
        await sendTelegramMessage(
          extractBotTokenFromRequest(req),
          chatId.toString(),
          'Invalid or expired linking code. Please try again.'
        );
        res.status(200).send('OK');
        return;
      }

      const linkingData = linkingCodeDoc.data();

      // Check if code is expired or already used
      if (linkingData.used || new Date() > linkingData.expiresAt.toDate()) {
        await sendTelegramMessage(
          extractBotTokenFromRequest(req),
          chatId.toString(),
          'This linking code has expired or already been used. Please request a new one.'
        );
        res.status(200).send('OK');
        return;
      }

      // Link the student
      await db
        .collection('students')
        .doc(linkingData.studentId)
        .update({
          'telegramNotifications.chatId': chatId.toString(),
          'telegramNotifications.username': username || null,
          'telegramNotifications.linkedAt': admin.firestore.FieldValue.serverTimestamp(),
          'telegramNotifications.enabled': true,
          'telegramNotifications.language': 'en', // Default, can be changed later
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

      // Mark code as used
      await db
        .collection('telegram_linking_codes')
        .doc(code)
        .update({ used: true });

      await sendTelegramMessage(
        extractBotTokenFromRequest(req),
        chatId.toString(),
        '✅ Your Telegram account has been successfully linked! You will now receive lesson and subscription reminders here.'
      );

      res.status(200).send('OK');
      return;
    }

    // Handle /unlink command
    if (text === '/unlink') {
      // Find student with this chat ID
      const studentsSnapshot = await db
        .collection('students')
        .where('telegramNotifications.chatId', '==', chatId.toString())
        .limit(1)
        .get();

      if (!studentsSnapshot.empty) {
        const studentDoc = studentsSnapshot.docs[0];
        await studentDoc.ref.update({
          'telegramNotifications.chatId': null,
          'telegramNotifications.username': null,
          'telegramNotifications.enabled': false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await sendTelegramMessage(
          extractBotTokenFromRequest(req),
          chatId.toString(),
          '✅ Your Telegram account has been unlinked. You will no longer receive notifications.'
        );
      } else {
        await sendTelegramMessage(
          extractBotTokenFromRequest(req),
          chatId.toString(),
          'No linked account found.'
        );
      }

      res.status(200).send('OK');
      return;
    }

    // Handle /status command
    if (text === '/status') {
      const studentsSnapshot = await db
        .collection('students')
        .where('telegramNotifications.chatId', '==', chatId.toString())
        .limit(1)
        .get();

      if (!studentsSnapshot.empty) {
        const student = studentsSnapshot.docs[0].data();
        const status = student.telegramNotifications.enabled ? 'Enabled' : 'Disabled';
        await sendTelegramMessage(
          extractBotTokenFromRequest(req),
          chatId.toString(),
          `📊 Notification Status: ${status}\n👤 Student: ${student.firstName} ${student.lastName}`
        );
      } else {
        await sendTelegramMessage(
          extractBotTokenFromRequest(req),
          chatId.toString(),
          'No linked account found. Use a linking code from your school admin to get started.'
        );
      }

      res.status(200).send('OK');
      return;
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Error handling Telegram webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * Helper function to extract bot token from request
 * The webhook URL should include the bot token in the path
 */
function extractBotTokenFromRequest(req: any): string {
  // Assuming webhook URL is: /telegram-webhook/{botToken}
  const pathParts = req.path.split('/');
  return pathParts[pathParts.length - 1];
}
