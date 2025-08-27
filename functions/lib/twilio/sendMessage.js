"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.schedulePaymentReminders = exports.scheduleLessonReminders = exports.sendTwilioMessage = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const twilio = require('twilio');
/**
 * Send SMS or WhatsApp message via Twilio
 */
exports.sendTwilioMessage = functions.https.onCall(async (data, context) => {
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
        if (!(config === null || config === void 0 ? void 0 : config.isActive)) {
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
    }
    catch (error) {
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
exports.scheduleLessonReminders = functions.pubsub
    .schedule('0 9 * * *') // Run daily at 9 AM
    .timeZone('UTC')
    .onRun(async (context) => {
    var _a;
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
        if (!settingsDoc.exists || !((_a = settingsDoc.data()) === null || _a === void 0 ? void 0 : _a.enabled)) {
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
            if (!studentDoc.exists)
                continue;
            const student = studentDoc.data();
            // Get user details for name
            const userDoc = await admin.firestore()
                .collection('users')
                .doc(student === null || student === void 0 ? void 0 : student.userId)
                .get();
            if (!userDoc.exists)
                continue;
            const user = userDoc.data();
            // Check if we should send reminder based on timing rules
            const shouldSend = checkReminderTiming(lesson.scheduled_date, settings === null || settings === void 0 ? void 0 : settings.timing);
            if (!shouldSend)
                continue;
            // Prepare template variables
            const variables = {
                name: `${user === null || user === void 0 ? void 0 : user.firstName} ${user === null || user === void 0 ? void 0 : user.lastName}`,
                subject: lesson.course_name,
                teacher: lesson.teacher_name,
                time: formatTime(lesson.scheduled_date),
                date: formatDate(lesson.scheduled_date)
            };
            // Send notification
            await sendNotificationToStudent(schoolId, lesson.student_id, 'lesson_reminder', variables, settings);
        }
    }
    return null;
});
/**
 * Schedule payment reminders
 */
exports.schedulePaymentReminders = functions.pubsub
    .schedule('0 10 * * *') // Run daily at 10 AM
    .timeZone('UTC')
    .onRun(async (context) => {
    var _a;
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
        if (!settingsDoc.exists || !((_a = settingsDoc.data()) === null || _a === void 0 ? void 0 : _a.enabled)) {
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
            const shouldSend = checkReminderTiming(payment.due_date, settings === null || settings === void 0 ? void 0 : settings.timing);
            if (!shouldSend)
                continue;
            // Get student details
            const studentDoc = await admin.firestore()
                .collection('students')
                .doc(payment.student_id)
                .get();
            if (!studentDoc.exists)
                continue;
            const student = studentDoc.data();
            // Get user details for name
            const userDoc = await admin.firestore()
                .collection('users')
                .doc(student === null || student === void 0 ? void 0 : student.userId)
                .get();
            if (!userDoc.exists)
                continue;
            const user = userDoc.data();
            // Prepare template variables
            const variables = {
                name: `${user === null || user === void 0 ? void 0 : user.firstName} ${user === null || user === void 0 ? void 0 : user.lastName}`,
                amount: formatCurrency(payment.amount, payment.currency),
                course: payment.course_name,
                date: formatDate(payment.due_date)
            };
            // Send notification
            await sendNotificationToStudent(schoolId, payment.student_id, 'payment_reminder', variables, settings);
        }
    }
    return null;
});
// Helper functions
async function sendNotificationToStudent(schoolId, studentId, type, variables, settings) {
    try {
        // Get student preferences
        const prefsDoc = await admin.firestore()
            .collection('studentNotificationPrefs')
            .doc(studentId)
            .get();
        const prefs = prefsDoc.exists ? prefsDoc.data() : null;
        if (prefs === null || prefs === void 0 ? void 0 : prefs.optedOut) {
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
            if ((prefs === null || prefs === void 0 ? void 0 : prefs.smsEnabled) !== false && (prefs === null || prefs === void 0 ? void 0 : prefs.phoneNumber)) {
                channels.push({ type: 'sms', phone: prefs.phoneNumber });
            }
        }
        if (settings.channel === 'both' || settings.channel === 'whatsapp') {
            if ((prefs === null || prefs === void 0 ? void 0 : prefs.whatsappEnabled) !== false && (prefs === null || prefs === void 0 ? void 0 : prefs.whatsappNumber)) {
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
                if (config === null || config === void 0 ? void 0 : config.isActive) {
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
    }
    catch (error) {
        console.error(`Error sending notification to student ${studentId}:`, error);
    }
}
function checkReminderTiming(eventDate, timingRules) {
    if (!timingRules || timingRules.length === 0)
        return false;
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
async function updateSpendTracking(schoolId, amount) {
    try {
        await admin.firestore()
            .collection('twilioConfigs')
            .doc(schoolId)
            .update({
            currentSpend: admin.firestore.FieldValue.increment(amount)
        });
    }
    catch (error) {
        console.error('Error updating spend tracking:', error);
    }
}
function formatTime(date) {
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}
function formatDate(date) {
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}
function formatCurrency(amount, currency) {
    const symbols = {
        USD: '$',
        EUR: '€',
        GBP: '£',
        RUB: '₽'
    };
    return `${symbols[currency] || currency} ${amount.toFixed(2)}`;
}
//# sourceMappingURL=sendMessage.js.map