const admin = require('firebase-admin');
const db = admin.firestore();

/**
 * Format a date in a readable way
 */
function formatDate(date: any, language: 'en' | 'ru'): string {
  const d = date.toDate ? date.toDate() : new Date(date);

  if (language === 'ru') {
    return d.toLocaleDateString('ru-RU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Handle /schedule command - Show upcoming lessons
 */
export async function handleScheduleCommand(
  studentId: string,
  language: 'en' | 'ru'
): Promise<string> {
  try {
    // Get student's upcoming sessions
    const now = admin.firestore.Timestamp.now();
    const sessionsSnapshot = await db
      .collection('sessions')
      .where('studentId', '==', studentId)
      .where('scheduledDate', '>=', now)
      .where('status', '==', 'scheduled')
      .orderBy('scheduledDate', 'asc')
      .limit(5)
      .get();

    if (sessionsSnapshot.empty) {
      return language === 'ru'
        ? '📅 У вас нет запланированных уроков.'
        : '📅 You have no upcoming lessons scheduled.';
    }

    const messages = {
      en: '📅 <b>Your Upcoming Lessons</b>\n\n',
      ru: '📅 <b>Ваши предстоящие уроки</b>\n\n'
    };

    let response = messages[language];

    sessionsSnapshot.forEach((doc: any, index: number) => {
      const session = doc.data();
      const date = formatDate(session.scheduledDate, language);
      const time = session.scheduledTime || '';

      response += `${index + 1}. ${date}\n`;
      response += `   ⏰ ${time}\n`;
      if (session.duration) {
        response += `   ⏱ ${session.duration} ${language === 'ru' ? 'мин' : 'min'}\n`;
      }
      response += '\n';
    });

    return response;
  } catch (error) {
    console.error('Error in handleScheduleCommand:', error);
    return language === 'ru'
      ? '❌ Ошибка при получении расписания.'
      : '❌ Error fetching schedule.';
  }
}

/**
 * Handle /subscriptions command - Show active subscriptions
 */
export async function handleSubscriptionsCommand(
  studentId: string,
  language: 'en' | 'ru'
): Promise<string> {
  try {
    // Get student's active subscriptions
    const subscriptionsSnapshot = await db
      .collection('subscriptions')
      .where('studentId', '==', studentId)
      .where('status', '==', 'active')
      .get();

    if (subscriptionsSnapshot.empty) {
      return language === 'ru'
        ? '📚 У вас нет активных подписок.'
        : '📚 You have no active subscriptions.';
    }

    const messages = {
      en: '📚 <b>Your Active Subscriptions</b>\n\n',
      ru: '📚 <b>Ваши активные подписки</b>\n\n'
    };

    let response = messages[language];

    subscriptionsSnapshot.forEach((doc: any, index: number) => {
      const sub = doc.data();
      const startDate = formatDate(sub.startDate, language);
      const endDate = sub.endDate ? formatDate(sub.endDate, language) : 'N/A';

      response += `${index + 1}. ${sub.courseName || (language === 'ru' ? 'Курс' : 'Course')}\n`;
      response += `   📅 ${language === 'ru' ? 'Начало' : 'Start'}: ${startDate}\n`;
      if (sub.endDate) {
        response += `   📅 ${language === 'ru' ? 'Конец' : 'End'}: ${endDate}\n`;
      }
      response += `   ✅ ${language === 'ru' ? 'Завершено' : 'Completed'}: ${sub.sessionsCompleted || 0}\n`;
      response += `   ⏳ ${language === 'ru' ? 'Осталось' : 'Remaining'}: ${sub.sessionsRemaining || 0}\n`;
      response += '\n';
    });

    return response;
  } catch (error) {
    console.error('Error in handleSubscriptionsCommand:', error);
    return language === 'ru'
      ? '❌ Ошибка при получении подписок.'
      : '❌ Error fetching subscriptions.';
  }
}

/**
 * Handle /balance command - Show payment balance
 */
export async function handleBalanceCommand(
  studentId: string,
  language: 'en' | 'ru'
): Promise<string> {
  try {
    // Get student document
    const studentDoc = await db.collection('students').doc(studentId).get();

    if (!studentDoc.exists) {
      return language === 'ru'
        ? '❌ Студент не найден.'
        : '❌ Student not found.';
    }

    const student = studentDoc.data();

    // Get unpaid sessions
    const unpaidSessionsSnapshot = await db
      .collection('sessions')
      .where('studentId', '==', studentId)
      .where('paymentStatus', 'in', ['pending', 'overdue'])
      .get();

    let totalOwed = 0;
    let overdueCount = 0;

    unpaidSessionsSnapshot.forEach((doc: any) => {
      const session = doc.data();
      totalOwed += session.cost || 0;
      if (session.paymentStatus === 'overdue') {
        overdueCount++;
      }
    });

    const messages = {
      en: '💰 <b>Your Payment Balance</b>\n\n',
      ru: '💰 <b>Ваш платежный баланс</b>\n\n'
    };

    let response = messages[language];

    if (totalOwed === 0) {
      response += language === 'ru'
        ? '✅ У вас нет задолженностей!'
        : '✅ You have no outstanding balance!';
    } else {
      const currency = student.preferredCurrency || 'USD';
      response += `${language === 'ru' ? 'Общий долг' : 'Total Owed'}: ${totalOwed.toFixed(2)} ${currency}\n`;
      response += `${language === 'ru' ? 'Неоплаченные уроки' : 'Unpaid Sessions'}: ${unpaidSessionsSnapshot.size}\n`;

      if (overdueCount > 0) {
        response += `${language === 'ru' ? '⚠️ Просроченные' : '⚠️ Overdue'}: ${overdueCount}\n`;
      }
    }

    return response;
  } catch (error) {
    console.error('Error in handleBalanceCommand:', error);
    return language === 'ru'
      ? '❌ Ошибка при получении баланса.'
      : '❌ Error fetching balance.';
  }
}

/**
 * Handle /help command - Show available commands
 */
export async function handleHelpCommand(language: 'en' | 'ru'): Promise<string> {
  if (language === 'ru') {
    return `📖 <b>Доступные команды</b>\n\n` +
           `🗓 /schedule - Показать предстоящие уроки\n` +
           `📚 /subscriptions - Показать активные подписки\n` +
           `💰 /balance - Показать платежный баланс\n` +
           `🔗 /unlink - Отключить Telegram аккаунт\n` +
           `❓ /help - Показать это сообщение\n\n` +
           `Вы также можете написать нам напрямую, и администратор ответит вам!`;
  }

  return `📖 <b>Available Commands</b>\n\n` +
         `🗓 /schedule - View your upcoming lessons\n` +
         `📚 /subscriptions - View your active subscriptions\n` +
         `💰 /balance - Check your payment balance\n` +
         `🔗 /unlink - Unlink your Telegram account\n` +
         `❓ /help - Show this message\n\n` +
         `You can also message us directly, and an admin will respond!`;
}

/**
 * Store message in Firestore
 */
export async function storeMessage(
  schoolId: string,
  studentId: string,
  chatId: string,
  direction: 'incoming' | 'outgoing',
  messageText: string,
  messageType: 'text' | 'command' | 'callback',
  metadata?: any
): Promise<void> {
  try {
    await db.collection('telegram_messages').add({
      schoolId,
      studentId,
      chatId,
      direction,
      messageText,
      messageType,
      metadata: metadata || {},
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Error storing message:', error);
  }
}
