const functions = require('firebase-functions');
const admin = require('firebase-admin');

const db = admin.firestore();

/**
 * Send a message from admin to a student via Telegram
 */
export const sendTelegramAdminMessage = functions.https.onCall(async (data: any, context: any) => {
  // Verify caller is authenticated and is admin
  if (!context.auth || !['admin', 'teacher'].includes(context.auth.token.role)) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only staff can send messages'
    );
  }

  const { schoolId, studentId, message } = data;

  if (!schoolId || !studentId || !message) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing required fields'
    );
  }

  // Verify school matches
  if (context.auth.token.schoolId !== schoolId) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Cannot send messages to students from other schools'
    );
  }

  try {
    // Get student
    const studentDoc = await db.collection('students').doc(studentId).get();

    if (!studentDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Student not found'
      );
    }

    const student = studentDoc.data();

    // Check if student has Telegram linked
    if (!student.telegramNotifications?.chatId || !student.telegramNotifications?.enabled) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Student does not have Telegram linked'
      );
    }

    const chatId = student.telegramNotifications.chatId;

    // Get bot token
    const settingsDoc = await db.collection('telegram_settings').doc(schoolId).get();

    if (!settingsDoc.exists || !settingsDoc.data().botToken) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Telegram bot not configured'
      );
    }

    const botToken = settingsDoc.data().botToken;

    // Send message via Telegram API
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });

    const result = await response.json();

    if (!result.ok) {
      throw new functions.https.HttpsError(
        'internal',
        'Failed to send Telegram message: ' + (result.description || 'Unknown error')
      );
    }

    // Store message in database
    await db.collection('telegram_messages').add({
      schoolId,
      studentId,
      chatId,
      direction: 'outgoing',
      messageText: message,
      messageType: 'text',
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, messageId: result.result.message_id };
  } catch (error: any) {
    console.error('Error sending admin message:', error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      error.message || 'Failed to send message'
    );
  }
});
