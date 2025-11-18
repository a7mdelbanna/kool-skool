import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';

const db = admin.firestore();

interface BroadcastRequest {
  schoolId: string;
  studentIds: string[];
  message: string;
  useTemplate?: boolean;
  templateId?: string;
}

interface BroadcastResult {
  success: boolean;
  total: number;
  sent: number;
  failed: number;
  results: {
    studentId: string;
    success: boolean;
    error?: string;
  }[];
}

/**
 * Send broadcast message to multiple students via Telegram
 */
export const sendTelegramBroadcast = functions.https.onCall(async (request: any) => {
  // Check authentication
  if (!request.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to send broadcast messages'
    );
  }

  // Check authorization (only admin and teacher can send broadcasts)
  const userRole = request.auth.token.role;
  if (!['admin', 'teacher'].includes(userRole)) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only staff members can send broadcast messages'
    );
  }

  const { schoolId, studentIds, message, useTemplate, templateId } = request.data as BroadcastRequest;

  // Validate input
  if (!schoolId || !studentIds || studentIds.length === 0 || !message) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing required fields: schoolId, studentIds, or message'
    );
  }

  try {
    // Get school settings to retrieve Telegram bot token
    const schoolDoc = await db.collection('schools').doc(schoolId).get();
    const schoolData = schoolDoc.data();

    if (!schoolData || !schoolData.telegramSettings?.botToken) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Telegram bot token not configured for this school'
      );
    }

    const botToken = schoolData.telegramSettings.botToken;
    const result: BroadcastResult = {
      success: true,
      total: studentIds.length,
      sent: 0,
      failed: 0,
      results: []
    };

    // Send message to each student
    for (const studentId of studentIds) {
      try {
        // Get student's Telegram account
        const telegramSnapshot = await db
          .collection('telegram_accounts')
          .where('schoolId', '==', schoolId)
          .where('studentId', '==', studentId)
          .where('status', '==', 'active')
          .limit(1)
          .get();

        if (telegramSnapshot.empty) {
          result.failed++;
          result.results.push({
            studentId,
            success: false,
            error: 'Student does not have an active Telegram account'
          });
          continue;
        }

        const telegramAccount = telegramSnapshot.docs[0].data();
        const chatId = telegramAccount.chatId;

        // Send message via Telegram API
        const telegramResponse = await fetch(
          `https://api.telegram.org/bot${botToken}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: message,
              parse_mode: 'HTML'
            })
          }
        );

        const telegramData: any = await telegramResponse.json();

        if (telegramData.ok) {
          // Store message in database
          await db.collection('telegram_messages').add({
            schoolId,
            studentId,
            chatId,
            direction: 'outgoing',
            messageText: message,
            messageType: 'text',
            metadata: {
              isBroadcast: true,
              broadcastId: `broadcast_${Date.now()}`,
              templateId: useTemplate ? templateId : undefined
            },
            sentAt: admin.firestore.Timestamp.now(),
            createdAt: admin.firestore.Timestamp.now()
          });

          result.sent++;
          result.results.push({
            studentId,
            success: true
          });
        } else {
          result.failed++;
          result.results.push({
            studentId,
            success: false,
            error: telegramData.description || 'Failed to send message'
          });
        }
      } catch (error: any) {
        console.error(`Error sending message to student ${studentId}:`, error);
        result.failed++;
        result.results.push({
          studentId,
          success: false,
          error: error.message || 'Unknown error'
        });
      }

      // Add small delay to avoid rate limiting (40 messages per second for Telegram)
      await new Promise(resolve => setTimeout(resolve, 30));
    }

    // Store broadcast history
    await db.collection('broadcast_history').add({
      schoolId,
      sentBy: request.auth.uid,
      message,
      templateId: useTemplate ? templateId : null,
      recipientCount: studentIds.length,
      sentCount: result.sent,
      failedCount: result.failed,
      results: result.results,
      createdAt: admin.firestore.Timestamp.now()
    });

    return result;
  } catch (error: any) {
    console.error('Error sending broadcast:', error);
    throw new functions.https.HttpsError(
      'internal',
      `Failed to send broadcast: ${error.message}`
    );
  }
});
