import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
const twilio = require('twilio');

// Notification system types and enums
enum NotificationTemplateType {
  LESSON_REMINDER_1_DAY = 'lesson_reminder_1_day',
  LESSON_REMINDER_2_HOURS = 'lesson_reminder_2_hours',
  LESSON_REMINDER_15_MIN = 'lesson_reminder_15_min',
  PAYMENT_REMINDER = 'payment_reminder',
  LESSON_CANCELLATION = 'lesson_cancellation',
  CUSTOM = 'custom'
}

enum NotificationRuleType {
  LESSON_REMINDERS = 'lesson_reminders',
  PAYMENT_REMINDERS = 'payment_reminders',
  LESSON_CANCELLATION = 'lesson_cancellation'
}

enum NotificationChannel {
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
  BOTH = 'both'
}

interface NotificationTemplate {
  id: string;
  schoolId: string;
  name: string;
  type: NotificationTemplateType;
  language: 'en' | 'ru';
  body: string;
  variables: string[];
  isDefault: boolean;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface NotificationTiming {
  value: number;
  unit: 'minutes' | 'hours' | 'days';
  isCustom?: boolean;
}

interface NotificationReminder {
  id: string;
  enabled: boolean;
  timing: NotificationTiming;
  channel: NotificationChannel;
  templateType: NotificationTemplateType;
  customTemplateId?: string;
}

interface NotificationRecipients {
  student: boolean;
  parent: boolean;
  teacher?: boolean;
}

interface NotificationRule {
  id: string;
  schoolId: string;
  type: NotificationRuleType;
  enabled: boolean;
  reminders: NotificationReminder[];
  recipients: NotificationRecipients;
  templateId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ParentInfo {
  name: string;
  relationship: 'mother' | 'father' | 'guardian';
  phone: string;
  countryCode: string;
  email: string;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  ageGroup: 'adult' | 'kid';
  phone?: string;
  countryCode?: string;
  parentInfo?: ParentInfo;
  userId: string;
  schoolId: string;
}

interface SendMessageRequest {
  schoolId: string;
  phone: string;
  message: string;
  channel: 'sms' | 'whatsapp';
  studentId?: string;
  notificationType?: string;
  isTest?: boolean;
}

/**
 * Test Twilio credentials without sending a message
 */
export const testTwilioCredentials = functions.https.onCall(async (data: {
  schoolId: string;
  accountSid: string;
  authToken: string;
  phoneNumberSms?: string;
  phoneNumberWhatsapp?: string;
}, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { accountSid, authToken, phoneNumberSms, phoneNumberWhatsapp } = data;
  
  try {
    // Basic validation
    if (!accountSid || !authToken) {
      throw new functions.https.HttpsError('invalid-argument', 'Account SID and Auth Token are required');
    }
    
    if (!accountSid.startsWith('AC')) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid Account SID format. Must start with "AC"');
    }
    
    if (authToken.length < 32) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid Auth Token format. Must be at least 32 characters');
    }
    
    // Initialize Twilio client to test credentials
    const client = twilio(accountSid, authToken);
    
    // Test the credentials by fetching account info
    let accountInfo;
    try {
      accountInfo = await client.api.accounts(accountSid).fetch();
    } catch (error: any) {
      console.error('Twilio credentials test failed:', error);
      if (error.code === 20003) {
        throw new functions.https.HttpsError('permission-denied', 'Invalid Twilio credentials. Please check your Account SID and Auth Token.');
      }
      throw new functions.https.HttpsError('internal', `Twilio API error: ${error.message}`);
    }
    
    // Validate phone numbers if provided
    const phoneValidation: any = {
      sms: null,
      whatsapp: null
    };
    
    if (phoneNumberSms) {
      try {
        const phoneNumber = await client.incomingPhoneNumbers.list({ phoneNumber: phoneNumberSms });
        phoneValidation.sms = {
          valid: phoneNumber.length > 0,
          message: phoneNumber.length > 0 
            ? 'SMS phone number is valid and configured' 
            : 'SMS phone number not found in your Twilio account'
        };
      } catch (error) {
        phoneValidation.sms = {
          valid: false,
          message: 'Error validating SMS phone number'
        };
      }
    }
    
    if (phoneNumberWhatsapp) {
      try {
        const cleanNumber = phoneNumberWhatsapp.replace('whatsapp:', '');
        const phoneNumber = await client.incomingPhoneNumbers.list({ phoneNumber: cleanNumber });
        phoneValidation.whatsapp = {
          valid: phoneNumber.length > 0,
          message: phoneNumber.length > 0 
            ? 'WhatsApp phone number is valid and configured' 
            : 'WhatsApp phone number not found in your Twilio account'
        };
      } catch (error) {
        phoneValidation.whatsapp = {
          valid: false,
          message: 'Error validating WhatsApp phone number'
        };
      }
    }
    
    return {
      valid: true,
      details: {
        accountSid: accountInfo.sid,
        accountStatus: accountInfo.status,
        accountType: accountInfo.type,
        friendlyName: accountInfo.friendlyName,
        phoneNumbers: phoneValidation,
        message: 'Twilio credentials are valid and working correctly'
      }
    };
    
  } catch (error: any) {
    console.error('Error testing Twilio credentials:', error);
    
    // Re-throw HttpsError as-is
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', `Credential test failed: ${error.message}`);
  }
});

/**
 * Send SMS or WhatsApp message via Twilio
 */
export const sendTwilioMessage = functions.https.onCall(async (data: SendMessageRequest, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { schoolId, phone, message, channel, studentId, notificationType, isTest } = data;
  
  try {
    // Get Twilio config from Firestore
    const configDoc = await admin.firestore()
      .collection('twilioConfigs')
      .doc(schoolId)
      .get();
    
    if (!configDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Twilio configuration not found');
    }
    
    const config = configDoc.data();
    
    if (!config?.isActive) {
      throw new functions.https.HttpsError('failed-precondition', 'Twilio integration is not active');
    }
    
    // Handle credentials (they might be encoded or plain text)
    let decodedAccountSid = config.accountSid;
    let decodedAuthToken = config.authToken;
    
    // Try to decode if they appear to be base64 encoded
    try {
      if (isBase64(config.accountSid)) {
        decodedAccountSid = Buffer.from(config.accountSid, 'base64').toString();
      }
      if (isBase64(config.authToken)) {
        decodedAuthToken = Buffer.from(config.authToken, 'base64').toString();
      }
    } catch (error) {
      console.warn('Using credentials as plain text (decoding failed)');
    }
    
    // Initialize Twilio client
    const client = twilio(decodedAccountSid, decodedAuthToken);
    
    // Prepare phone numbers with proper WhatsApp formatting
    let from = channel === 'whatsapp' 
      ? config.phoneNumberWhatsapp 
      : config.phoneNumberSms;
    
    // Ensure WhatsApp from number has proper whatsapp: prefix
    if (channel === 'whatsapp' && from && !from.startsWith('whatsapp:')) {
      from = `whatsapp:${from}`;
    }
    
    let to = phone;
    // Ensure WhatsApp to number has proper whatsapp: prefix
    if (channel === 'whatsapp' && !phone.startsWith('whatsapp:')) {
      to = `whatsapp:${phone}`;
    }
    
    // Log the formatted numbers for debugging
    console.log(`📱 Sending ${channel} message:`, {
      from: from,
      to: to,
      channel: channel
    });
    
    // Send message
    const messageResponse = await client.messages.create({
      body: message,
      from: from,
      to: to
    });
    
    // Log the message
    await admin.firestore()
      .collection('notificationLogs')
      .add({
        schoolId,
        recipientId: studentId || 'unknown',
        recipientPhone: phone,
        type: notificationType || 'manual',
        channel,
        status: 'sent',
        message,
        twilioSid: messageResponse.sid,
        cost: messageResponse.price ? parseFloat(messageResponse.price) : 0,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        isTest: isTest || false
      });
    
    // Update spend tracking
    if (messageResponse.price) {
      await updateSpendTracking(schoolId, parseFloat(messageResponse.price));
    }
    
    return {
      success: true,
      messageSid: messageResponse.sid,
      status: messageResponse.status
    };
    
  } catch (error: any) {
    console.error('Error sending Twilio message:', error);
    
    // Log failed attempt
    await admin.firestore()
      .collection('notificationLogs')
      .add({
        schoolId,
        recipientId: studentId || 'unknown',
        recipientPhone: phone,
        type: notificationType || 'manual',
        channel,
        status: 'failed',
        message,
        error: error.message,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        isTest: isTest || false
      });
    
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Schedule lesson reminders - Enhanced with notification system
 */
export const scheduleLessonReminders = functions.pubsub
  .schedule('*/30 * * * *') // Run every 30 minutes for better timing coverage
  .timeZone('UTC')
  .onRun(async (context) => {
    console.log('Running enhanced lesson reminder scheduler');
    
    const now = new Date();
    const endTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Look ahead 7 days
    
    // Get all schools with active Twilio
    const schoolsSnapshot = await admin.firestore()
      .collection('twilioConfigs')
      .where('isActive', '==', true)
      .get();
    
    let totalProcessed = 0;
    let totalSent = 0;
    
    for (const schoolDoc of schoolsSnapshot.docs) {
      const schoolId = schoolDoc.id;
      
      try {
        // Get notification rules for lesson reminders
        const notificationRule = await getNotificationRule(schoolId, NotificationRuleType.LESSON_REMINDERS);
        
        if (!notificationRule || !notificationRule.enabled) {
          console.log(`Lesson reminders not enabled for school ${schoolId}`);
          continue;
        }
        
        // Get upcoming lessons
        const lessonsSnapshot = await admin.firestore()
          .collection('sessions')
          .where('schoolId', '==', schoolId)
          .where('scheduled_date', '>=', now)
          .where('scheduled_date', '<=', endTime)
          .where('status', '==', 'scheduled')
          .get();
        
        console.log(`Found ${lessonsSnapshot.size} upcoming lessons for school ${schoolId}`);
        
        for (const lessonDoc of lessonsSnapshot.docs) {
          const lesson = lessonDoc.data();
          const lessonId = lessonDoc.id;
          totalProcessed++;
          
          // Get student details
          const studentDoc = await admin.firestore()
            .collection('students')
            .doc(lesson.student_id)
            .get();
          
          if (!studentDoc.exists) {
            console.log(`Student not found: ${lesson.student_id}`);
            continue;
          }
          
          const student = studentDoc.data() as Student;
          
          // Get user details for student name
          const userDoc = await admin.firestore()
            .collection('users')
            .doc(student.userId)
            .get();
          
          if (!userDoc.exists) {
            console.log(`User not found: ${student.userId}`);
            continue;
          }
          
          const user = userDoc.data();
          
          // Check each reminder timing
          for (const reminder of notificationRule.reminders) {
            if (!reminder.enabled) continue;
            
            // Check if we should send this reminder now
            const shouldSend = checkAdvancedReminderTiming(
              lesson.scheduled_date,
              reminder.timing,
              now
            );
            
            if (!shouldSend) continue;
            
            // Check if we already sent this reminder
            const reminderKey = `${lessonId}_${reminder.id}_${reminder.timing.value}${reminder.timing.unit}`;
            const alreadySent = await checkIfReminderSent(schoolId, reminderKey);
            
            if (alreadySent) {
              console.log(`Reminder already sent: ${reminderKey}`);
              continue;
            }
            
            // Prepare template variables
            const variables = {
              studentName: `${user?.firstName} ${user?.lastName}`,
              parentName: student.parentInfo?.name || '',
              teacherName: lesson.teacher_name || 'Your teacher',
              subject: lesson.course_name || 'your lesson',
              lessonTime: formatLessonTime(lesson.scheduled_date),
              date: formatDate(lesson.scheduled_date),
              lessonDuration: lesson.duration ? `${lesson.duration} minutes` : '60 minutes',
              location: lesson.location || 'Online',
              schoolName: lesson.school_name || 'TutorFlow'
            };
            
            // Send notification using new system
            const sent = await sendEnhancedNotification(
              schoolId,
              student,
              notificationRule,
              reminder,
              variables,
              lessonId
            );
            
            if (sent) {
              totalSent++;
              // Mark reminder as sent
              await markReminderAsSent(schoolId, reminderKey, {
                lessonId,
                studentId: student.id,
                reminderType: reminder.templateType,
                sentAt: now
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error processing school ${schoolId}:`, error);
      }
    }
    
    console.log(`Lesson reminders completed. Processed: ${totalProcessed}, Sent: ${totalSent}`);
    return { totalProcessed, totalSent };
  });

/**
 * Schedule payment reminders - Enhanced with notification system
 */
export const schedulePaymentReminders = functions.pubsub
  .schedule('0 */6 * * *') // Run every 6 hours for better timing coverage
  .timeZone('UTC')
  .onRun(async (context) => {
    console.log('Running enhanced payment reminder scheduler');
    
    const now = new Date();
    const endTime = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // Look ahead 30 days
    
    // Get all schools with active Twilio
    const schoolsSnapshot = await admin.firestore()
      .collection('twilioConfigs')
      .where('isActive', '==', true)
      .get();
    
    let totalProcessed = 0;
    let totalSent = 0;
    
    for (const schoolDoc of schoolsSnapshot.docs) {
      const schoolId = schoolDoc.id;
      
      try {
        // Get notification rules for payment reminders
        const notificationRule = await getNotificationRule(schoolId, NotificationRuleType.PAYMENT_REMINDERS);
        
        if (!notificationRule || !notificationRule.enabled) {
          console.log(`Payment reminders not enabled for school ${schoolId}`);
          continue;
        }
        
        // Get upcoming payments
        const paymentsSnapshot = await admin.firestore()
          .collection('payments')
          .where('schoolId', '==', schoolId)
          .where('status', '==', 'pending')
          .where('due_date', '>=', now)
          .where('due_date', '<=', endTime)
          .get();
        
        console.log(`Found ${paymentsSnapshot.size} upcoming payments for school ${schoolId}`);
        
        for (const paymentDoc of paymentsSnapshot.docs) {
          const payment = paymentDoc.data();
          const paymentId = paymentDoc.id;
          totalProcessed++;
          
          // Get student details
          const studentDoc = await admin.firestore()
            .collection('students')
            .doc(payment.student_id)
            .get();
          
          if (!studentDoc.exists) {
            console.log(`Student not found: ${payment.student_id}`);
            continue;
          }
          
          const student = studentDoc.data() as Student;
          
          // Get user details for student name
          const userDoc = await admin.firestore()
            .collection('users')
            .doc(student.userId)
            .get();
          
          if (!userDoc.exists) {
            console.log(`User not found: ${student.userId}`);
            continue;
          }
          
          const user = userDoc.data();
          
          // Check each reminder timing
          for (const reminder of notificationRule.reminders) {
            if (!reminder.enabled) continue;
            
            // Check if we should send this reminder now
            const shouldSend = checkAdvancedReminderTiming(
              payment.due_date,
              reminder.timing,
              now
            );
            
            if (!shouldSend) continue;
            
            // Check if we already sent this reminder
            const reminderKey = `${paymentId}_${reminder.id}_${reminder.timing.value}${reminder.timing.unit}`;
            const alreadySent = await checkIfReminderSent(schoolId, reminderKey);
            
            if (alreadySent) {
              console.log(`Payment reminder already sent: ${reminderKey}`);
              continue;
            }
            
            // Prepare template variables
            const variables = {
              studentName: `${user?.firstName} ${user?.lastName}`,
              parentName: student.parentInfo?.name || `${user?.firstName} ${user?.lastName}`,
              teacherName: payment.teacher_name || '',
              subject: payment.course_name || 'lessons',
              amount: formatCurrency(payment.amount, payment.currency || 'USD'),
              date: formatDate(payment.due_date),
              schoolName: payment.school_name || 'TutorFlow'
            };
            
            // Send notification using new system
            const sent = await sendEnhancedNotification(
              schoolId,
              student,
              notificationRule,
              reminder,
              variables,
              paymentId
            );
            
            if (sent) {
              totalSent++;
              // Mark reminder as sent
              await markReminderAsSent(schoolId, reminderKey, {
                paymentId,
                studentId: student.id,
                reminderType: reminder.templateType,
                sentAt: now
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error processing payments for school ${schoolId}:`, error);
      }
    }
    
    console.log(`Payment reminders completed. Processed: ${totalProcessed}, Sent: ${totalSent}`);
    return { totalProcessed, totalSent };
  });

// Enhanced Helper Functions for New Notification System

/**
 * Get notification rule for a school by type
 */
async function getNotificationRule(
  schoolId: string,
  ruleType: NotificationRuleType
): Promise<NotificationRule | null> {
  try {
    const rulesSnapshot = await admin.firestore()
      .collection('notificationRules')
      .where('schoolId', '==', schoolId)
      .where('type', '==', ruleType)
      .limit(1)
      .get();

    if (rulesSnapshot.empty) {
      console.log(`No notification rule found for school ${schoolId}, type ${ruleType}`);
      return null;
    }

    const doc = rulesSnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    } as NotificationRule;
  } catch (error) {
    console.error(`Error getting notification rule:`, error);
    return null;
  }
}

/**
 * Get notification template by type and language
 */
async function getNotificationTemplate(
  schoolId: string,
  templateType: NotificationTemplateType,
  language: 'en' | 'ru' = 'en'
): Promise<NotificationTemplate | null> {
  try {
    const templatesSnapshot = await admin.firestore()
      .collection('notificationTemplates')
      .where('schoolId', '==', schoolId)
      .where('type', '==', templateType)
      .where('language', '==', language)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (templatesSnapshot.empty) {
      console.log(`No template found for school ${schoolId}, type ${templateType}, language ${language}`);
      return null;
    }

    const doc = templatesSnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    } as NotificationTemplate;
  } catch (error) {
    console.error(`Error getting notification template:`, error);
    return null;
  }
}

/**
 * Enhanced timing check with better precision
 */
function checkAdvancedReminderTiming(
  eventDate: any,
  timing: NotificationTiming,
  currentTime: Date
): boolean {
  try {
    const event = eventDate.toDate ? eventDate.toDate() : new Date(eventDate);
    const now = currentTime;
    
    // Convert timing to milliseconds
    let timingMs = 0;
    switch (timing.unit) {
      case 'minutes':
        timingMs = timing.value * 60 * 1000;
        break;
      case 'hours':
        timingMs = timing.value * 60 * 60 * 1000;
        break;
      case 'days':
        timingMs = timing.value * 24 * 60 * 60 * 1000;
        break;
    }
    
    const targetTime = event.getTime() - timingMs;
    const currentTimeMs = now.getTime();
    
    // Check if we're within the reminder window (30 minutes before target time to 30 minutes after)
    const windowMs = 30 * 60 * 1000; // 30 minutes
    const isInWindow = currentTimeMs >= (targetTime - windowMs) && currentTimeMs <= (targetTime + windowMs);
    
    if (isInWindow) {
      console.log(`Reminder timing matched for ${timing.value} ${timing.unit} before event`);
    }
    
    return isInWindow;
  } catch (error) {
    console.error('Error checking reminder timing:', error);
    return false;
  }
}

/**
 * Check if a specific reminder has already been sent
 */
async function checkIfReminderSent(
  schoolId: string,
  reminderKey: string
): Promise<boolean> {
  try {
    const sentRemindersDoc = await admin.firestore()
      .collection('sentReminders')
      .doc(`${schoolId}_${reminderKey}`)
      .get();
    
    return sentRemindersDoc.exists;
  } catch (error) {
    console.error('Error checking if reminder was sent:', error);
    return false;
  }
}

/**
 * Mark a reminder as sent to prevent duplicates
 */
async function markReminderAsSent(
  schoolId: string,
  reminderKey: string,
  metadata: any
): Promise<void> {
  try {
    await admin.firestore()
      .collection('sentReminders')
      .doc(`${schoolId}_${reminderKey}`)
      .set({
        ...metadata,
        schoolId,
        reminderKey,
        sentAt: admin.firestore.FieldValue.serverTimestamp()
      });
  } catch (error) {
    console.error('Error marking reminder as sent:', error);
  }
}

/**
 * Process template variables in message body
 */
function processTemplateVariables(
  templateBody: string,
  variables: Record<string, string>
): string {
  let processedMessage = templateBody;
  
  // Replace all variables with actual values
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{${key}}`, 'g');
    processedMessage = processedMessage.replace(regex, value || '');
  });
  
  // Clean up any remaining unreplaced variables
  processedMessage = processedMessage.replace(/{\\w+}/g, '');
  
  return processedMessage.trim();
}

/**
 * Enhanced notification sending with template system and parent support
 */
async function sendEnhancedNotification(
  schoolId: string,
  student: Student,
  notificationRule: NotificationRule,
  reminder: NotificationReminder,
  variables: Record<string, string>,
  entityId: string
): Promise<boolean> {
  try {
    // Get the appropriate template
    const template = await getNotificationTemplate(
      schoolId,
      reminder.templateType,
      'en' // TODO: Add language detection based on student/parent preference
    );
    
    if (!template) {
      console.error(`Template not found for type ${reminder.templateType}`);
      return false;
    }
    
    // Process template with variables
    const message = processTemplateVariables(template.body, variables);
    
    if (!message) {
      console.error('Processed message is empty');
      return false;
    }
    
    // Determine recipients based on rule and student age
    const recipients = [];
    
    // Add student if specified in rule
    if (notificationRule.recipients.student) {
      if (student.phone && student.countryCode) {
        recipients.push({
          name: variables.studentName,
          phone: student.phone,
          countryCode: student.countryCode,
          type: 'student' as const
        });
      }
    }
    
    // Add parent if specified in rule and student is a kid or parent info exists
    if (notificationRule.recipients.parent) {
      if (student.ageGroup === 'kid' && student.parentInfo) {
        recipients.push({
          name: student.parentInfo.name,
          phone: student.parentInfo.phone,
          countryCode: student.parentInfo.countryCode,
          type: 'parent' as const
        });
      } else if (student.ageGroup === 'adult' && student.parentInfo) {
        // For adults, only send to parent if explicitly requested
        recipients.push({
          name: student.parentInfo.name,
          phone: student.parentInfo.phone,
          countryCode: student.parentInfo.countryCode,
          type: 'parent' as const
        });
      }
    }
    
    if (recipients.length === 0) {
      console.log(`No valid recipients for student ${student.id}`);
      return false;
    }
    
    // Get Twilio configuration
    const configDoc = await admin.firestore()
      .collection('twilioConfigs')
      .doc(schoolId)
      .get();
    
    if (!configDoc.exists || !configDoc.data()?.isActive) {
      console.error(`Twilio not configured or active for school ${schoolId}`);
      return false;
    }
    
    const config = configDoc.data()!;
    
    // Decode credentials
    let decodedAccountSid = config.accountSid;
    let decodedAuthToken = config.authToken;
    
    try {
      if (isBase64(config.accountSid)) {
        decodedAccountSid = Buffer.from(config.accountSid, 'base64').toString();
      }
      if (isBase64(config.authToken)) {
        decodedAuthToken = Buffer.from(config.authToken, 'base64').toString();
      }
    } catch (error) {
      console.warn('Using credentials as plain text');
    }
    
    const client = twilio(decodedAccountSid, decodedAuthToken);
    
    let sentCount = 0;
    
    // Send to each recipient via each channel
    for (const recipient of recipients) {
      const channels = getChannelsForReminder(reminder.channel);
      
      for (const channel of channels) {
        try {
          const result = await sendMessageViaChannel(
            client,
            config,
            recipient,
            message,
            channel,
            schoolId,
            student.id,
            reminder.templateType,
            entityId
          );
          
          if (result) {
            sentCount++;
          }
        } catch (error) {
          console.error(`Failed to send via ${channel} to ${recipient.type}:`, error);
        }
      }
    }
    
    return sentCount > 0;
  } catch (error) {
    console.error(`Error in sendEnhancedNotification:`, error);
    return false;
  }
}

/**
 * Get channels array from channel enum
 */
function getChannelsForReminder(channel: NotificationChannel): ('sms' | 'whatsapp')[] {
  switch (channel) {
    case NotificationChannel.SMS:
      return ['sms'];
    case NotificationChannel.WHATSAPP:
      return ['whatsapp'];
    case NotificationChannel.BOTH:
      return ['sms', 'whatsapp'];
    default:
      return ['sms'];
  }
}

/**
 * Send message via specific channel with proper formatting and logging
 */
async function sendMessageViaChannel(
  client: any,
  config: any,
  recipient: { name: string; phone: string; countryCode: string; type: 'student' | 'parent' },
  message: string,
  channel: 'sms' | 'whatsapp',
  schoolId: string,
  studentId: string,
  notificationType: NotificationTemplateType,
  entityId: string
): Promise<boolean> {
  try {
    // Format phone number with country code
    const fullPhone = recipient.countryCode + recipient.phone.replace(/^\+/, '');
    
    // Get appropriate Twilio phone number
    let fromNumber = channel === 'whatsapp' 
      ? config.phoneNumberWhatsapp 
      : config.phoneNumberSms;
    
    if (!fromNumber) {
      console.error(`No ${channel} phone number configured for school ${schoolId}`);
      return false;
    }
    
    // Format numbers for WhatsApp
    let to = fullPhone;
    let from = fromNumber;
    
    if (channel === 'whatsapp') {
      if (!from.startsWith('whatsapp:')) {
        from = `whatsapp:${from}`;
      }
      if (!to.startsWith('whatsapp:')) {
        to = `whatsapp:${to}`;
      }
    }
    
    console.log(`Sending ${channel} to ${recipient.type} (${recipient.name}):`, {
      from,
      to: to.replace(/\d(?=\d{4})/g, '*'), // Mask phone number for logging
      messageLength: message.length
    });
    
    // Send message
    const messageResponse = await client.messages.create({
      body: message,
      from: from,
      to: to
    });
    
    // Log successful send
    await admin.firestore()
      .collection('notificationLogs')
      .add({
        schoolId,
        studentId,
        recipientId: studentId,
        recipientName: recipient.name,
        recipientPhone: fullPhone,
        recipientType: recipient.type,
        entityId,
        type: notificationType,
        channel,
        status: 'sent',
        message,
        twilioSid: messageResponse.sid,
        cost: messageResponse.price ? parseFloat(messageResponse.price) : 0,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        isAutomated: true
      });
    
    // Update spend tracking
    if (messageResponse.price) {
      await updateSpendTracking(schoolId, parseFloat(messageResponse.price));
    }
    
    console.log(`✅ ${channel} sent successfully to ${recipient.type}:`, messageResponse.sid);
    return true;
  } catch (error: any) {
    console.error(`❌ Failed to send ${channel} to ${recipient.type}:`, error.message);
    
    // Log failed attempt
    await admin.firestore()
      .collection('notificationLogs')
      .add({
        schoolId,
        studentId,
        recipientId: studentId,
        recipientName: recipient.name,
        recipientPhone: recipient.countryCode + recipient.phone,
        recipientType: recipient.type,
        entityId,
        type: notificationType,
        channel,
        status: 'failed',
        message,
        error: error.message,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        isAutomated: true
      });
    
    return false;
  }
}

// Legacy function for backward compatibility
export async function sendNotificationToStudent(
  schoolId: string,
  studentId: string,
  type: string,
  variables: Record<string, string>,
  settings: any
): Promise<void> {
  console.warn('Using legacy sendNotificationToStudent function. Consider upgrading to sendEnhancedNotification.');
  
  try {
    // Get student data
    const studentDoc = await admin.firestore()
      .collection('students')
      .doc(studentId)
      .get();
    
    if (!studentDoc.exists) return;
    
    const student = studentDoc.data() as Student;
    
    // Parse template
    let message = settings.template || settings.body || '';
    for (const [key, value] of Object.entries(variables)) {
      message = message.replace(new RegExp(`{${key}}`, 'g'), value);
    }
    
    // Send using basic method
    if (student.phone && student.countryCode) {
      const channels = settings.channel === 'both' ? ['sms', 'whatsapp'] : [settings.channel];
      
      for (const channel of channels) {
        await sendTwilioMessageDirect(schoolId, {
          phone: student.countryCode + student.phone,
          message,
          channel: channel as 'sms' | 'whatsapp',
          studentId,
          notificationType: type
        });
      }
    }
  } catch (error) {
    console.error(`Error in legacy sendNotificationToStudent:`, error);
  }
}

/**
 * Direct message sending helper
 */
async function sendTwilioMessageDirect(
  schoolId: string,
  data: {
    phone: string;
    message: string;
    channel: 'sms' | 'whatsapp';
    studentId?: string;
    notificationType?: string;
  }
): Promise<void> {
  const { phone, message, channel } = data;
  
  try {
    const configDoc = await admin.firestore()
      .collection('twilioConfigs')
      .doc(schoolId)
      .get();
    
    if (!configDoc.exists || !configDoc.data()?.isActive) {
      throw new Error('Twilio configuration not found or inactive');
    }
    
    const config = configDoc.data()!;
    
    let decodedAccountSid = config.accountSid;
    let decodedAuthToken = config.authToken;
    
    try {
      if (isBase64(config.accountSid)) {
        decodedAccountSid = Buffer.from(config.accountSid, 'base64').toString();
      }
      if (isBase64(config.authToken)) {
        decodedAuthToken = Buffer.from(config.authToken, 'base64').toString();
      }
    } catch (error) {
      console.warn('Using credentials as plain text');
    }
    
    const client = twilio(decodedAccountSid, decodedAuthToken);
    
    let from = channel === 'whatsapp' 
      ? config.phoneNumberWhatsapp 
      : config.phoneNumberSms;
    
    let to = phone;
    
    if (channel === 'whatsapp') {
      if (!from.startsWith('whatsapp:')) {
        from = `whatsapp:${from}`;
      }
      if (!to.startsWith('whatsapp:')) {
        to = `whatsapp:${to}`;
      }
    }
    
    await client.messages.create({
      body: message,
      from: from,
      to: to
    });
    
    console.log(`Legacy message sent via ${channel}`);
  } catch (error) {
    console.error(`Error in sendTwilioMessageDirect:`, error);
    throw error;
  }
}

// Legacy function for backward compatibility - kept for existing integrations
export function checkReminderTiming(
  eventDate: any,
  timingRules: any[]
): boolean {
  console.warn('Using legacy checkReminderTiming function. Consider upgrading to checkAdvancedReminderTiming.');
  
  if (!timingRules || timingRules.length === 0) return false;
  
  const now = new Date();
  const event = eventDate.toDate ? eventDate.toDate() : new Date(eventDate);
  const hoursUntilEvent = (event.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  for (const rule of timingRules) {
    const triggerHours = rule.unit === 'days' 
      ? rule.value * 24 
      : rule.value;
    
    // Check if we're within 1 hour of the trigger time
    if (Math.abs(hoursUntilEvent - triggerHours) < 1) {
      return true;
    }
  }
  
  return false;
}

async function updateSpendTracking(schoolId: string, amount: number): Promise<void> {
  try {
    await admin.firestore()
      .collection('twilioConfigs')
      .doc(schoolId)
      .update({
        currentSpend: admin.firestore.FieldValue.increment(amount)
      });
  } catch (error) {
    console.error('Error updating spend tracking:', error as Error);
  }
}

// Enhanced formatting functions for templates

/**
 * Format lesson time with improved readability
 */
function formatLessonTime(date: any): string {
  const d = date.toDate ? date.toDate() : new Date(date);
  
  // Get day of week
  const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'long' });
  
  // Get date
  const dateStr = d.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric'
  });
  
  // Get time
  const timeStr = d.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
  
  return `${dayOfWeek}, ${dateStr} at ${timeStr}`;
}

export function formatTime(date: any): string {
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
}

function formatDate(date: any): string {
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
}

function formatCurrency(amount: number, currency: string = 'USD'): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    RUB: '₽',
    AED: 'AED ',
    SAR: 'SAR '
  };
  
  const symbol = symbols[currency] || `${currency} `;
  return `${symbol}${amount.toFixed(2)}`;
}

function isBase64(str: string): boolean {
  try {
    // Check if it's a valid base64 string and different from original when decoded
    const decoded = Buffer.from(str, 'base64').toString();
    const reencoded = Buffer.from(decoded).toString('base64');
    return reencoded === str && decoded !== str;
  } catch {
    return false;
  }
}

/**
 * Cleanup function to remove old sent reminders (run weekly)
 */
export const cleanupOldReminders = functions.pubsub
  .schedule('0 2 * * 0') // Run weekly on Sunday at 2 AM
  .timeZone('UTC')
  .onRun(async (context) => {
    console.log('Running cleanup for old sent reminders');
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep 30 days of history
    
    try {
      // Query old reminder records
      const oldRemindersSnapshot = await admin.firestore()
        .collection('sentReminders')
        .where('sentAt', '<=', cutoffDate)
        .limit(500) // Process in batches
        .get();
      
      if (oldRemindersSnapshot.empty) {
        console.log('No old reminders to clean up');
        return { deleted: 0 };
      }
      
      // Delete in batch
      const batch = admin.firestore().batch();
      oldRemindersSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      console.log(`Cleaned up ${oldRemindersSnapshot.size} old reminder records`);
      return { deleted: oldRemindersSnapshot.size };
    } catch (error: any) {
      console.error('Error cleaning up old reminders:', error);
      return { error: error.message || 'Unknown error' };
    }
  });

/**
 * Enhanced error handling for notification system
 */
export const handleNotificationErrors = functions.firestore
  .document('notificationLogs/{logId}')
  .onCreate(async (snap, context) => {
    const logData = snap.data();
    
    // Only process failed notifications
    if (logData.status !== 'failed' || !logData.isAutomated) {
      return null;
    }
    
    try {
      // Count recent failures for this school
      const recentFailuresSnapshot = await admin.firestore()
        .collection('notificationLogs')
        .where('schoolId', '==', logData.schoolId)
        .where('status', '==', 'failed')
        .where('sentAt', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
        .get();
      
      const failureCount = recentFailuresSnapshot.size;
      
      // Alert if too many failures
      if (failureCount >= 10) {
        console.error(`High failure rate detected for school ${logData.schoolId}: ${failureCount} failures in 24h`);
        
        // Could add email notification to admin here
        // await sendAdminAlert(logData.schoolId, failureCount);
      }
      
      // Check for specific error patterns
      if (logData.error?.includes('21611')) {
        // Invalid phone number error
        console.log(`Invalid phone number detected for ${logData.recipientPhone}`);
        // Could disable notifications for this number
      }
      
      return null;
    } catch (error) {
      console.error('Error in notification error handler:', error);
      return null;
    }
  });