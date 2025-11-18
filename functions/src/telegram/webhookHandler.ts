const functions = require('firebase-functions');
const admin = require('firebase-admin');

const db = admin.firestore();

import {
  handleScheduleCommand,
  handleSubscriptionsCommand,
  handleBalanceCommand,
  handleHelpCommand,
  storeMessage
} from './commandHandlers';
import {
  generateAIResponse,
  logAIInteraction
} from './aiResponseHandler';

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    text?: string;
    from: { username?: string };
  };
  callback_query?: {
    id: string;
    from: { username?: string };
    message: { chat: { id: number }; message_id: number };
    data: string;
  };
}

/**
 * Send a Telegram message
 */
async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
  options?: {
    reply_markup?: any;
    parse_mode?: string;
  }
): Promise<void> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: options?.parse_mode || 'HTML',
      ...options
    })
  });
}

/**
 * Answer callback query (button click)
 */
async function answerCallbackQuery(
  botToken: string,
  callbackQueryId: string,
  text?: string
): Promise<void> {
  const url = `https://api.telegram.org/bot${botToken}/answerCallbackQuery`;

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text: text || ''
    })
  });
}

/**
 * Edit message text
 */
async function editMessageText(
  botToken: string,
  chatId: number,
  messageId: number,
  text: string,
  options?: {
    reply_markup?: any;
    parse_mode?: string;
  }
): Promise<void> {
  const url = `https://api.telegram.org/bot${botToken}/editMessageText`;

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: options?.parse_mode || 'HTML',
      ...options
    })
  });
}

/**
 * Extract bot token from settings collection
 */
async function getBotToken(schoolId: string): Promise<string | null> {
  const settingsDoc = await db.collection('telegram_settings').doc(schoolId).get();
  if (!settingsDoc.exists) return null;
  return settingsDoc.data().botToken || null;
}

/**
 * Handle /start command with linking code
 */
async function handleStartCommand(
  code: string,
  chatId: number,
  username: string | undefined,
  botToken: string
): Promise<void> {
  // Verify the linking code
  const linkingCodeDoc = await db.collection('telegram_linking_codes').doc(code).get();

  if (!linkingCodeDoc.exists) {
    await sendTelegramMessage(
      botToken,
      chatId.toString(),
      '❌ Invalid or expired linking code. Please request a new one from your school.'
    );
    return;
  }

  const linkingData = linkingCodeDoc.data();

  // Check if code is expired or already used
  if (linkingData.used || new Date() > linkingData.expiresAt.toDate()) {
    await sendTelegramMessage(
      botToken,
      chatId.toString(),
      '❌ This linking code has expired or already been used. Please request a new one.'
    );
    return;
  }

  // Get student info
  const studentDoc = await db.collection('students').doc(linkingData.studentId).get();
  if (!studentDoc.exists) {
    await sendTelegramMessage(
      botToken,
      chatId.toString(),
      '❌ Student not found. Please contact your school.'
    );
    return;
  }

  const student = studentDoc.data();
  const studentName = `${student.firstName} ${student.lastName}`;
  const defaultLanguage = linkingData.language || 'en';

  // Welcome message in both languages
  const welcomeMessages = {
    en: `🎓 <b>Welcome to Kool-Skool, ${studentName}!</b>\n\n` +
        `I'll help you stay updated with:\n` +
        `📚 Lesson reminders\n` +
        `💰 Payment notifications\n` +
        `📢 Important announcements\n\n` +
        `Let's get started! Please choose your preferred language:`,
    ru: `🎓 <b>Добро пожаловать в Kool-Skool, ${studentName}!</b>\n\n` +
        `Я помогу вам быть в курсе:\n` +
        `📚 Напоминаний об уроках\n` +
        `💰 Уведомлений об оплате\n` +
        `📢 Важных объявлений\n\n` +
        `Давайте начнем! Пожалуйста, выберите предпочитаемый язык:`
  };

  // Send welcome message with language selection
  await sendTelegramMessage(
    botToken,
    chatId.toString(),
    welcomeMessages[defaultLanguage],
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🇬🇧 English', callback_data: `lang_en_${code}` },
            { text: '🇷🇺 Русский', callback_data: `lang_ru_${code}` }
          ]
        ]
      }
    }
  );
}

/**
 * Handle language selection
 */
async function handleLanguageSelection(
  language: 'en' | 'ru',
  code: string,
  chatId: number,
  messageId: number,
  callbackQueryId: string,
  username: string | undefined,
  botToken: string
): Promise<void> {
  const linkingCodeDoc = await db.collection('telegram_linking_codes').doc(code).get();

  if (!linkingCodeDoc.exists) {
    await answerCallbackQuery(botToken, callbackQueryId, 'Invalid linking code');
    return;
  }

  const linkingData = linkingCodeDoc.data();
  const studentDoc = await db.collection('students').doc(linkingData.studentId).get();

  if (!studentDoc.exists) {
    await answerCallbackQuery(botToken, callbackQueryId, 'Student not found');
    return;
  }

  const student = studentDoc.data();
  const studentName = `${student.firstName} ${student.lastName}`;

  // Preference selection messages
  const preferenceMessages = {
    en: `✅ <b>Language set to English!</b>\n\n` +
        `Now, which notifications would you like to receive, ${studentName.split(' ')[0]}?`,
    ru: `✅ <b>Язык установлен на Русский!</b>\n\n` +
        `Теперь, какие уведомления вы хотите получать, ${studentName.split(' ')[0]}?`
  };

  const preferenceButtons = {
    en: [
      [{ text: '📚 Lesson Reminders Only', callback_data: `pref_lessons_${code}_${language}` }],
      [{ text: '💰 Payment Reminders Only', callback_data: `pref_payments_${code}_${language}` }],
      [{ text: '✨ Everything (Recommended)', callback_data: `pref_all_${code}_${language}` }]
    ],
    ru: [
      [{ text: '📚 Только напоминания об уроках', callback_data: `pref_lessons_${code}_${language}` }],
      [{ text: '💰 Только напоминания об оплате', callback_data: `pref_payments_${code}_${language}` }],
      [{ text: '✨ Все (Рекомендуется)', callback_data: `pref_all_${code}_${language}` }]
    ]
  };

  // Update message with preference selection
  await editMessageText(
    botToken,
    chatId,
    messageId,
    preferenceMessages[language],
    {
      reply_markup: {
        inline_keyboard: preferenceButtons[language]
      }
    }
  );

  await answerCallbackQuery(botToken, callbackQueryId);
}

/**
 * Handle notification preference selection
 */
async function handlePreferenceSelection(
  preference: 'lessons' | 'payments' | 'all',
  code: string,
  language: 'en' | 'ru',
  chatId: number,
  messageId: number,
  callbackQueryId: string,
  username: string | undefined,
  botToken: string
): Promise<void> {
  const linkingCodeDoc = await db.collection('telegram_linking_codes').doc(code).get();

  if (!linkingCodeDoc.exists) {
    await answerCallbackQuery(botToken, callbackQueryId, 'Invalid linking code');
    return;
  }

  const linkingData = linkingCodeDoc.data();

  // Update student with all preferences
  await db.collection('students').doc(linkingData.studentId).update({
    'telegramNotifications.chatId': chatId.toString(),
    'telegramNotifications.username': username || null,
    'telegramNotifications.linkedAt': admin.firestore.FieldValue.serverTimestamp(),
    'telegramNotifications.enabled': true,
    'telegramNotifications.language': language,
    'telegramNotifications.preferences': {
      lessonReminders: preference === 'lessons' || preference === 'all',
      paymentReminders: preference === 'payments' || preference === 'all'
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Mark code as used
  await db.collection('telegram_linking_codes').doc(code).update({ used: true });

  // Success messages
  const successMessages = {
    en: `🎉 <b>All set!</b>\n\n` +
        `Your account is now linked and you'll receive:\n` +
        `${preference === 'lessons' || preference === 'all' ? '✅ Lesson reminders\n' : ''}` +
        `${preference === 'payments' || preference === 'all' ? '✅ Payment notifications\n' : ''}` +
        `\nYou can change your preferences anytime by contacting your school.\n\n` +
        `Welcome to Kool-Skool! 🎓`,
    ru: `🎉 <b>Все готово!</b>\n\n` +
        `Ваш аккаунт теперь связан, и вы будете получать:\n` +
        `${preference === 'lessons' || preference === 'all' ? '✅ Напоминания об уроках\n' : ''}` +
        `${preference === 'payments' || preference === 'all' ? '✅ Уведомления об оплате\n' : ''}` +
        `\nВы можете изменить свои предпочтения в любое время, связавшись со школой.\n\n` +
        `Добро пожаловать в Kool-Skool! 🎓`
  };

  // Update message with success
  await editMessageText(
    botToken,
    chatId,
    messageId,
    successMessages[language]
  );

  await answerCallbackQuery(botToken, callbackQueryId, '✅ Setup complete!');
}

/**
 * Main webhook handler
 */
export const handleTelegramWebhook = functions.https.onRequest(async (req: any, res: any) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const update: TelegramUpdate = req.body;

    // Handle callback queries (button clicks)
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const chatId = callbackQuery.message.chat.id;
      const messageId = callbackQuery.message.message_id;
      const username = callbackQuery.from.username;
      const data = callbackQuery.data;

      console.log('Callback query received:', data);

      // Parse callback data
      if (data.startsWith('lang_')) {
        // Language selection: lang_{language}_{code}
        const [, language, code] = data.split('_');

        // Get bot token from linking code's school
        const linkingCodeDoc = await db.collection('telegram_linking_codes').doc(code).get();
        if (!linkingCodeDoc.exists) {
          res.status(200).send('OK');
          return;
        }

        const schoolId = linkingCodeDoc.data().schoolId;
        const botToken = await getBotToken(schoolId);

        if (!botToken) {
          res.status(200).send('OK');
          return;
        }

        await handleLanguageSelection(
          language as 'en' | 'ru',
          code,
          chatId,
          messageId,
          callbackQuery.id,
          username,
          botToken
        );
      } else if (data.startsWith('pref_')) {
        // Preference selection: pref_{preference}_{code}_{language}
        const parts = data.split('_');
        const preference = parts[1];
        const code = parts[2];
        const language = parts[3];

        // Get bot token
        const linkingCodeDoc = await db.collection('telegram_linking_codes').doc(code).get();
        if (!linkingCodeDoc.exists) {
          res.status(200).send('OK');
          return;
        }

        const schoolId = linkingCodeDoc.data().schoolId;
        const botToken = await getBotToken(schoolId);

        if (!botToken) {
          res.status(200).send('OK');
          return;
        }

        await handlePreferenceSelection(
          preference as 'lessons' | 'payments' | 'all',
          code,
          language as 'en' | 'ru',
          chatId,
          messageId,
          callbackQuery.id,
          username,
          botToken
        );
      }

      res.status(200).send('OK');
      return;
    }

    // Handle text messages
    if (update.message && update.message.text) {
      const message = update.message;
      const chatId = message.chat.id;
      const text = message.text;
      const username = message.from.username;

      // Handle /start command with linking code
      if (text.startsWith('/start ')) {
        const code = text.substring(7).trim();

        // Get bot token from linking code's school
        const linkingCodeDoc = await db.collection('telegram_linking_codes').doc(code).get();
        if (!linkingCodeDoc.exists) {
          res.status(200).send('OK');
          return;
        }

        const schoolId = linkingCodeDoc.data().schoolId;
        const botToken = await getBotToken(schoolId);

        if (!botToken) {
          res.status(200).send('OK');
          return;
        }

        await handleStartCommand(code, chatId, username, botToken);
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
          const student = studentDoc.data();
          const schoolId = student.schoolId;
          const botToken = await getBotToken(schoolId);

          if (botToken) {
            await studentDoc.ref.update({
              'telegramNotifications.chatId': null,
              'telegramNotifications.username': null,
              'telegramNotifications.enabled': false,
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            const language = student.telegramNotifications?.language || 'en';
            const unlinkMessages = {
              en: '✅ Your account has been successfully unlinked.',
              ru: '✅ Ваш аккаунт был успешно отключен.'
            };

            await sendTelegramMessage(
              botToken,
              chatId.toString(),
              unlinkMessages[language]
            );
          }
        }

        res.status(200).send('OK');
        return;
      }

      // Handle other commands for linked students
      // First, find the student by chatId
      const studentsSnapshot = await db
        .collection('students')
        .where('telegramNotifications.chatId', '==', chatId.toString())
        .limit(1)
        .get();

      if (!studentsSnapshot.empty) {
        const studentDoc = studentsSnapshot.docs[0];
        const student = studentDoc.data();
        const studentId = studentDoc.id;
        const schoolId = student.schoolId;
        const language = student.telegramNotifications?.language || 'en';
        const botToken = await getBotToken(schoolId);

        if (!botToken) {
          res.status(200).send('OK');
          return;
        }

        let responseMessage = '';
        let isCommand = false;

        // Handle different commands
        if (text === '/schedule' || text === '/schedule@' + (await getBotInfo(botToken))?.username) {
          responseMessage = await handleScheduleCommand(studentId, language);
          isCommand = true;
        } else if (text === '/subscriptions' || text === '/subscriptions@' + (await getBotInfo(botToken))?.username) {
          responseMessage = await handleSubscriptionsCommand(studentId, language);
          isCommand = true;
        } else if (text === '/balance' || text === '/balance@' + (await getBotInfo(botToken))?.username) {
          responseMessage = await handleBalanceCommand(studentId, language);
          isCommand = true;
        } else if (text === '/help' || text === '/help@' + (await getBotInfo(botToken))?.username) {
          responseMessage = await handleHelpCommand(language);
          isCommand = true;
        } else if (!text.startsWith('/')) {
          // Regular text message - store it first
          await storeMessage(
            schoolId,
            studentId,
            chatId.toString(),
            'incoming',
            text,
            'text'
          );

          // Generate AI response
          console.log('Generating AI response for student:', studentId);
          const aiResponse = await generateAIResponse(
            studentId,
            schoolId,
            text,
            language
          );

          console.log('AI response generated:', {
            shouldEscalate: aiResponse.shouldEscalate,
            messageLength: aiResponse.message.length,
            tokensUsed: aiResponse.tokensUsed
          });

          // Log AI interaction for analytics
          await logAIInteraction(schoolId, studentId, text, aiResponse);

          // If escalated, notify admin (optional - can add notification logic here)
          if (aiResponse.shouldEscalate) {
            console.log('Message escalated to admin:', aiResponse.escalationReason);
            // TODO: Add admin notification logic here if needed
          }

          responseMessage = aiResponse.message;
        }

        if (responseMessage) {
          // Store the command/message
          if (isCommand) {
            await storeMessage(
              schoolId,
              studentId,
              chatId.toString(),
              'incoming',
              text,
              'command',
              { commandName: text.split('@')[0] }
            );
          }

          // Send response
          await sendTelegramMessage(botToken, chatId.toString(), responseMessage);

          // Store the bot's response
          await storeMessage(
            schoolId,
            studentId,
            chatId.toString(),
            'outgoing',
            responseMessage,
            isCommand ? 'command' : 'text',
            isCommand ? { botResponse: text } : undefined
          );
        }
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(200).send('OK'); // Always return 200 to Telegram
  }
});

/**
 * Get bot info helper
 */
async function getBotInfo(botToken: string): Promise<any> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const data = await response.json();
    return data.ok ? data.result : null;
  } catch (error) {
    console.error('Error getting bot info:', error);
    return null;
  }
}
