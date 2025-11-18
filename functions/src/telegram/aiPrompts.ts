/**
 * AI Prompts and Templates for Telegram Chatbot
 * Supports bilingual responses (English and Russian)
 * Supports per-school personality customization
 */

export interface StudentContext {
  student: {
    firstName: string;
    lastName: string;
    courseName?: string;
    level?: string;
    status: string;
  };
  activeSubscriptions: Array<{
    session_count: number;
    start_date: string;
    end_date?: string;
    status: string;
  }>;
  nextLessons: Array<{
    scheduled_date: string;
    scheduled_time?: string;
    duration_minutes: number;
    status: string;
  }>;
  sessionsCompleted: number;
  unpaidAmount: number;
  unpaidSessionCount: number;
}

export interface AIPersonality {
  friendlinessLevel: 'formal' | 'friendly' | 'very_friendly';
  useHumor: boolean;
  tone: string; // e.g., "professional", "casual", "enthusiastic"
}

/**
 * Get personality instructions based on configuration
 */
function getPersonalityInstructions(personality: AIPersonality, language: 'en' | 'ru'): string {
  const { friendlinessLevel, useHumor, tone } = personality;

  // Friendliness level
  let friendlinessInstruction = '';
  if (language === 'ru') {
    switch (friendlinessLevel) {
      case 'formal':
        friendlinessInstruction = 'Будьте профессиональны и формальны. Используйте вежливую форму обращения.';
        break;
      case 'friendly':
        friendlinessInstruction = 'Будьте дружелюбны и доступны. Используйте теплый, но профессиональный тон.';
        break;
      case 'very_friendly':
        friendlinessInstruction = 'Будьте очень дружелюбны и неформальны. Создайте комфортную атмосферу.';
        break;
    }
  } else {
    switch (friendlinessLevel) {
      case 'formal':
        friendlinessInstruction = 'Be professional and formal. Use polite and respectful language.';
        break;
      case 'friendly':
        friendlinessInstruction = 'Be friendly and approachable. Use a warm but professional tone.';
        break;
      case 'very_friendly':
        friendlinessInstruction = 'Be very friendly and casual. Create a comfortable and relaxed atmosphere.';
        break;
    }
  }

  // Humor
  const humorInstruction = useHumor
    ? (language === 'ru'
      ? 'Можете использовать уместный юмор и эмодзи для создания позитивной атмосферы. 😊'
      : 'You can use appropriate humor and emojis to create a positive atmosphere. 😊')
    : (language === 'ru'
      ? 'Сохраняйте профессиональный тон, избегайте шуток.'
      : 'Maintain a professional tone, avoid jokes.');

  // Tone
  const toneInstruction = tone
    ? (language === 'ru'
      ? `Тон общения: ${tone}.`
      : `Communication tone: ${tone}.`)
    : '';

  return `${friendlinessInstruction} ${humorInstruction} ${toneInstruction}`.trim();
}

/**
 * Build system prompt for AI with student context and school customization
 */
export function buildSystemPrompt(
  context: StudentContext,
  language: 'en' | 'ru',
  personality: AIPersonality,
  customContext?: string,
  customInstructions?: string
): string {
  const languageInstruction = language === 'ru'
    ? 'ВАЖНО: Отвечайте ТОЛЬКО на русском языке. Будьте кратки (максимум 2-3 предложения).'
    : 'IMPORTANT: Respond ONLY in English. Be concise (max 2-3 sentences).';

  const personalityInstructions = getPersonalityInstructions(personality, language);

  const nextLesson = context.nextLessons[0];
  const subscription = context.activeSubscriptions[0];

  const nextLessonText = nextLesson
    ? `${new Date(nextLesson.scheduled_date).toLocaleDateString()} at ${nextLesson.scheduled_time || 'TBD'} (${nextLesson.duration_minutes} minutes)`
    : language === 'ru' ? 'Нет запланированных занятий' : 'No upcoming lessons';

  const subscriptionText = subscription
    ? `${subscription.session_count} sessions (${subscription.status})`
    : language === 'ru' ? 'Нет активной подписки' : 'No active subscription';

  const paymentStatusText = context.unpaidAmount > 0
    ? language === 'ru'
      ? `Задолженность: ${context.unpaidAmount} руб. (${context.unpaidSessionCount} занятий)`
      : `Balance due: ${context.unpaidAmount} (${context.unpaidSessionCount} sessions)`
    : language === 'ru' ? 'Нет задолженности' : 'No outstanding balance';

  // Build the complete system prompt
  let systemPrompt = `${languageInstruction}

${personalityInstructions}

You are a helpful AI assistant for an online education platform.

STUDENT INFORMATION:
- Name: ${context.student.firstName} ${context.student.lastName}
- Course: ${context.student.courseName || (language === 'ru' ? 'Не указан' : 'Not set')}
- Level: ${context.student.level || (language === 'ru' ? 'Не указан' : 'Not set')}
- Status: ${context.student.status}

SCHEDULE:
- Next lesson: ${nextLessonText}
- Sessions completed: ${context.sessionsCompleted}

SUBSCRIPTION:
- ${subscriptionText}

PAYMENT:
- ${paymentStatusText}`;

  // Add custom context if provided
  if (customContext && customContext.trim()) {
    systemPrompt += `\n\nSCHOOL INFORMATION:\n${customContext.trim()}`;
  }

  // Add standard rules
  systemPrompt += `\n\nRULES:
1. Answer questions about schedule, subscriptions, payments, and course info
2. Use the student's actual data from above - NEVER make up information
3. If you don't know something or the question requires admin help, say:
   ${language === 'ru'
    ? '"Этот вопрос требует помощи администратора. Я уведомлю его, и он ответит вам в ближайшее время."'
    : '"This question requires admin assistance. I\'ve notified an administrator who will respond to you shortly."'
  }
4. Do NOT share information about other students
5. Do NOT promise to make changes or take actions (this is read-only Phase 1)
6. For complaints, refunds, or sensitive issues, always escalate to admin

ESCALATION KEYWORDS (must escalate to admin):
${language === 'ru'
    ? '- возврат, жалоба, отменить, срочно, проблема, недоволен'
    : '- refund, complaint, cancel, urgent, problem, dissatisfied, unhappy'
  }`;

  // Add custom instructions if provided
  if (customInstructions && customInstructions.trim()) {
    systemPrompt += `\n\nADDITIONAL INSTRUCTIONS:\n${customInstructions.trim()}`;
  }

  return systemPrompt;
}

/**
 * Detect if message should be escalated to human admin
 */
export function shouldEscalateToHuman(
  message: string,
  context: StudentContext
): { shouldEscalate: boolean; reason?: string } {
  const lowerMessage = message.toLowerCase();

  // Escalation keywords (English and Russian)
  const escalationKeywords = [
    // English
    'refund', 'complaint', 'cancel subscription', 'talk to manager',
    'speak to human', 'real person', 'not happy', 'dissatisfied',
    'urgent', 'emergency', 'problem with teacher', 'change teacher',
    // Russian
    'возврат', 'жалоба', 'отменить подписку', 'менеджер',
    'человек', 'недоволен', 'срочно', 'проблема с преподавателем',
    'сменить преподавателя', 'не доволен'
  ];

  // Check for escalation keywords
  for (const keyword of escalationKeywords) {
    if (lowerMessage.includes(keyword)) {
      return {
        shouldEscalate: true,
        reason: `Contains sensitive keyword: "${keyword}"`
      };
    }
  }

  // Escalate if student account is not active
  if (context.student.status !== 'active') {
    return {
      shouldEscalate: true,
      reason: `Student status: ${context.student.status}`
    };
  }

  // NOTE: We removed auto-escalation based on unpaid amount alone
  // The AI system prompt already includes payment status information
  // Students should be able to ask about schedule/lessons even with outstanding balance
  // Only escalate payment-related questions if they contain keywords like "refund", "complaint", etc.

  return { shouldEscalate: false };
}

/**
 * Get escalation message for student
 */
export function getEscalationMessage(language: 'en' | 'ru', reason?: string): string {
  if (language === 'ru') {
    return `Я понимаю, что вам нужна помощь администратора. Я уведомил его о вашем сообщении, и он ответит вам в ближайшее время. Спасибо за ваше терпение! 🙏`;
  } else {
    return `I understand you need admin assistance. I've notified an administrator about your message, and they will respond to you shortly. Thank you for your patience! 🙏`;
  }
}

/**
 * Get fallback message when AI fails or is disabled
 */
export function getFallbackMessage(language: 'en' | 'ru'): string {
  if (language === 'ru') {
    return `✅ Сообщение получено! Администратор ответит в ближайшее время.`;
  } else {
    return `✅ Message received! An admin will respond shortly.`;
  }
}
