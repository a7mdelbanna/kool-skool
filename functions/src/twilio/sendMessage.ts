import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
const twilio = require('twilio');

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
    
    // Decrypt credentials (in production, use KMS)
    const accountSid = Buffer.from(config.accountSid, 'base64').toString();
    const authToken = Buffer.from(config.authToken, 'base64').toString();
    
    // Initialize Twilio client
    const client = twilio(accountSid, authToken);
    
    // Prepare phone numbers
    const from = channel === 'whatsapp' 
      ? config.phoneNumberWhatsapp 
      : config.phoneNumberSms;
    
    const to = channel === 'whatsapp' && !phone.startsWith('whatsapp:')
      ? `whatsapp:${phone}`
      : phone;
    
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
 * Schedule lesson reminders
 */
export const scheduleLessonReminders = functions.pubsub
  .schedule('0 9 * * *') // Run daily at 9 AM
  .timeZone('UTC')
  .onRun(async (context) => {
    console.log('Running lesson reminder scheduler');
    
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get all schools with active Twilio
    const schoolsSnapshot = await admin.firestore()
      .collection('twilioConfigs')
      .where('isActive', '==', true)
      .get();
    
    for (const schoolDoc of schoolsSnapshot.docs) {
      const schoolId = schoolDoc.id;
      
      // Get notification settings
      const settingsDoc = await admin.firestore()
        .collection('notificationSettings')
        .doc(`${schoolId}_lesson_reminder`)
        .get();
      
      if (!settingsDoc.exists || !settingsDoc.data()?.enabled) {
        continue;
      }
      
      const settings = settingsDoc.data();
      
      // Get tomorrow's lessons
      const lessonsSnapshot = await admin.firestore()
        .collection('sessions')
        .where('schoolId', '==', schoolId)
        .where('scheduled_date', '>=', now)
        .where('scheduled_date', '<=', tomorrow)
        .where('status', '==', 'scheduled')
        .get();
      
      for (const lessonDoc of lessonsSnapshot.docs) {
        const lesson = lessonDoc.data();
        
        // Get student details
        const studentDoc = await admin.firestore()
          .collection('students')
          .doc(lesson.student_id)
          .get();
        
        if (!studentDoc.exists) continue;
        
        const student = studentDoc.data();
        
        // Get user details for name
        const userDoc = await admin.firestore()
          .collection('users')
          .doc(student?.userId)
          .get();
        
        if (!userDoc.exists) continue;
        
        const user = userDoc.data();
        
        // Check if we should send reminder based on timing rules
        const shouldSend = checkReminderTiming(lesson.scheduled_date, settings?.timing);
        
        if (!shouldSend) continue;
        
        // Prepare template variables
        const variables = {
          name: `${user?.firstName} ${user?.lastName}`,
          subject: lesson.course_name,
          teacher: lesson.teacher_name,
          time: formatTime(lesson.scheduled_date),
          date: formatDate(lesson.scheduled_date)
        };
        
        // Send notification
        await sendNotificationToStudent(
          schoolId,
          lesson.student_id,
          'lesson_reminder',
          variables,
          settings
        );
      }
    }
    
    return null;
  });

/**
 * Schedule payment reminders
 */
export const schedulePaymentReminders = functions.pubsub
  .schedule('0 10 * * *') // Run daily at 10 AM
  .timeZone('UTC')
  .onRun(async (context) => {
    console.log('Running payment reminder scheduler');
    
    const now = new Date();
    
    // Get all schools with active Twilio
    const schoolsSnapshot = await admin.firestore()
      .collection('twilioConfigs')
      .where('isActive', '==', true)
      .get();
    
    for (const schoolDoc of schoolsSnapshot.docs) {
      const schoolId = schoolDoc.id;
      
      // Get notification settings
      const settingsDoc = await admin.firestore()
        .collection('notificationSettings')
        .doc(`${schoolId}_payment_reminder`)
        .get();
      
      if (!settingsDoc.exists || !settingsDoc.data()?.enabled) {
        continue;
      }
      
      const settings = settingsDoc.data();
      
      // Get upcoming payments
      const paymentsSnapshot = await admin.firestore()
        .collection('payments')
        .where('schoolId', '==', schoolId)
        .where('status', '==', 'pending')
        .where('due_date', '>=', now)
        .get();
      
      for (const paymentDoc of paymentsSnapshot.docs) {
        const payment = paymentDoc.data();
        
        // Check if we should send reminder based on timing rules
        const shouldSend = checkReminderTiming(payment.due_date, settings?.timing);
        
        if (!shouldSend) continue;
        
        // Get student details
        const studentDoc = await admin.firestore()
          .collection('students')
          .doc(payment.student_id)
          .get();
        
        if (!studentDoc.exists) continue;
        
        const student = studentDoc.data();
        
        // Get user details for name
        const userDoc = await admin.firestore()
          .collection('users')
          .doc(student?.userId)
          .get();
        
        if (!userDoc.exists) continue;
        
        const user = userDoc.data();
        
        // Prepare template variables
        const variables = {
          name: `${user?.firstName} ${user?.lastName}`,
          amount: formatCurrency(payment.amount, payment.currency),
          course: payment.course_name,
          date: formatDate(payment.due_date)
        };
        
        // Send notification
        await sendNotificationToStudent(
          schoolId,
          payment.student_id,
          'payment_reminder',
          variables,
          settings
        );
      }
    }
    
    return null;
  });

// Helper functions

async function sendNotificationToStudent(
  schoolId: string,
  studentId: string,
  type: string,
  variables: Record<string, string>,
  settings: any
): Promise<void> {
  try {
    // Get student preferences
    const prefsDoc = await admin.firestore()
      .collection('studentNotificationPrefs')
      .doc(studentId)
      .get();
    
    const prefs = prefsDoc.exists ? prefsDoc.data() : null;
    
    if (prefs?.optedOut) {
      console.log(`Student ${studentId} has opted out`);
      return;
    }
    
    // Parse template
    let message = settings.template;
    for (const [key, value] of Object.entries(variables)) {
      message = message.replace(new RegExp(`{${key}}`, 'g'), value);
    }
    
    // Determine channels
    const channels = [];
    if (settings.channel === 'both' || settings.channel === 'sms') {
      if (prefs?.smsEnabled !== false && prefs?.phoneNumber) {
        channels.push({ type: 'sms', phone: prefs.phoneNumber });
      }
    }
    if (settings.channel === 'both' || settings.channel === 'whatsapp') {
      if (prefs?.whatsappEnabled !== false && prefs?.whatsappNumber) {
        channels.push({ type: 'whatsapp', phone: prefs.whatsappNumber });
      }
    }
    
    // Send via each channel
    for (const channel of channels) {
      // Direct call to send message
      const configDoc = await admin.firestore()
        .collection('twilioConfigs')
        .doc(schoolId)
        .get();
      
      if (configDoc.exists) {
        const config = configDoc.data();
        if (config?.isActive) {
          const accountSid = Buffer.from(config.accountSid, 'base64').toString();
          const authToken = Buffer.from(config.authToken, 'base64').toString();
          const client = twilio(accountSid, authToken);
          
          const from = channel.type === 'whatsapp' 
            ? config.phoneNumberWhatsapp 
            : config.phoneNumberSms;
          
          const to = channel.type === 'whatsapp' && !channel.phone.startsWith('whatsapp:')
            ? `whatsapp:${channel.phone}`
            : channel.phone;
          
          await client.messages.create({
            body: message,
            from: from,
            to: to
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error sending notification to student ${studentId}:`, error);
  }
}

function checkReminderTiming(
  eventDate: any,
  timingRules: any[]
): boolean {
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
    console.error('Error updating spend tracking:', error);
  }
}

function formatTime(date: any): string {
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

function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    RUB: '₽'
  };
  
  return `${symbols[currency] || currency} ${amount.toFixed(2)}`;
}