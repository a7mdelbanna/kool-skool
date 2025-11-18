/**
 * AI Response Handler for Telegram Chatbot
 * Generates intelligent responses using OpenAI GPT models
 * Supports per-school configuration and customization
 */

import OpenAI from 'openai';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v2';
import {
  buildSystemPrompt,
  shouldEscalateToHuman,
  getEscalationMessage,
  getFallbackMessage,
  StudentContext,
  AIPersonality
} from './aiPrompts';

const db = admin.firestore();

export interface AIConfiguration {
  enabled: boolean;
  apiKey: string;
  model: 'gpt-3.5-turbo' | 'gpt-4' | 'gpt-4-turbo' | 'gpt-4o-mini';
  maxTokens: number;
  customContext?: string;
  personality: AIPersonality;
  customInstructions?: string;
}

export interface AIResponse {
  message: string;
  shouldEscalate: boolean;
  escalationReason?: string;
  confidence: number;
  tokensUsed?: number;
}

/**
 * Fetch school AI configuration from Firestore
 */
async function getAIConfiguration(schoolId: string): Promise<AIConfiguration | null> {
  try {
    const schoolDoc = await db.collection('schools').doc(schoolId).get();

    if (!schoolDoc.exists) {
      functions.logger.warn('School not found', { schoolId });
      return null;
    }

    const schoolData = schoolDoc.data();
    const aiConfig = schoolData?.aiConfiguration;

    if (!aiConfig || !aiConfig.enabled) {
      functions.logger.info('AI not enabled for school', { schoolId });
      return null;
    }

    if (!aiConfig.apiKey) {
      functions.logger.warn('AI enabled but no API key configured', { schoolId });
      return null;
    }

    return {
      enabled: aiConfig.enabled || false,
      apiKey: aiConfig.apiKey,
      model: aiConfig.model || 'gpt-3.5-turbo',
      maxTokens: aiConfig.maxTokens || 150,
      customContext: aiConfig.customContext || '',
      personality: {
        friendlinessLevel: aiConfig.personality?.friendlinessLevel || 'friendly',
        useHumor: aiConfig.personality?.useHumor || false,
        tone: aiConfig.personality?.tone || 'professional'
      },
      customInstructions: aiConfig.customInstructions || ''
    };

  } catch (error: any) {
    functions.logger.error('Failed to fetch AI configuration', {
      error: error.message,
      schoolId
    });
    return null;
  }
}

/**
 * Generate AI response for student message
 */
export async function generateAIResponse(
  studentId: string,
  schoolId: string,
  message: string,
  language: 'en' | 'ru'
): Promise<AIResponse> {
  try {
    // 1. Check if AI is enabled for this school
    const aiConfig = await getAIConfiguration(schoolId);

    if (!aiConfig) {
      // AI not enabled, return fallback
      return {
        message: getFallbackMessage(language),
        shouldEscalate: true,
        escalationReason: 'AI not enabled for this school',
        confidence: 0.0
      };
    }

    // 2. Fetch student context
    const context = await getStudentContext(studentId, schoolId);

    if (!context) {
      // If we can't find student data, escalate to admin
      return {
        message: getFallbackMessage(language),
        shouldEscalate: true,
        escalationReason: 'Student context not found',
        confidence: 0.0
      };
    }

    // 3. Check if should escalate to human
    const escalationCheck = shouldEscalateToHuman(message, context);

    if (escalationCheck.shouldEscalate) {
      functions.logger.info('Message escalated to admin', {
        studentId,
        schoolId,
        reason: escalationCheck.reason,
        message: message.substring(0, 100)
      });

      return {
        message: getEscalationMessage(language, escalationCheck.reason),
        shouldEscalate: true,
        escalationReason: escalationCheck.reason,
        confidence: 1.0
      };
    }

    // 4. Build AI prompt with school's custom context and personality
    const systemPrompt = buildSystemPrompt(
      context,
      language,
      aiConfig.personality,
      aiConfig.customContext,
      aiConfig.customInstructions
    );

    // 5. Call OpenAI API with school's API key
    const openai = new OpenAI({
      apiKey: aiConfig.apiKey
    });

    functions.logger.info('Calling OpenAI API', {
      model: aiConfig.model,
      maxTokens: aiConfig.maxTokens,
      studentId,
      schoolId,
      messageLength: message.length
    });

    const completion = await openai.chat.completions.create({
      model: aiConfig.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: aiConfig.maxTokens,
      temperature: 0.7,
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 0.0
    });

    const aiMessage = completion.choices[0].message.content || '';
    const tokensUsed = completion.usage?.total_tokens || 0;

    // Check if AI wants to escalate
    const aiWantsToEscalate = aiMessage.toLowerCase().includes('admin') ||
      aiMessage.toLowerCase().includes('администратор');

    functions.logger.info('AI response generated', {
      studentId,
      schoolId,
      tokensUsed,
      responseLength: aiMessage.length,
      aiWantsToEscalate
    });

    return {
      message: aiMessage,
      shouldEscalate: aiWantsToEscalate,
      escalationReason: aiWantsToEscalate ? 'AI detected need for human assistance' : undefined,
      confidence: 0.8,
      tokensUsed
    };

  } catch (error: any) {
    functions.logger.error('AI response generation failed', {
      error: error.message,
      stack: error.stack,
      studentId,
      schoolId
    });

    // Fall back to generic auto-reply
    return {
      message: getFallbackMessage(language),
      shouldEscalate: true,
      escalationReason: `AI error: ${error.message}`,
      confidence: 0.0
    };
  }
}

/**
 * Fetch student context from Firestore
 * Uses parallel queries for optimal performance
 */
async function getStudentContext(
  studentId: string,
  schoolId: string
): Promise<StudentContext | null> {
  try {
    const now = admin.firestore.Timestamp.now();

    // Parallel fetches for speed
    const [
      studentDoc,
      subscriptionsSnapshot
    ] = await Promise.all([
      // Student data - use document ID directly
      db.collection('students').doc(studentId).get(),

      // Active subscriptions - Firebase uses camelCase for subscriptions
      db.collection('subscriptions')
        .where('studentId', '==', studentId)
        .where('status', '==', 'active')
        .get()
    ]);

    // Fetch sessions - try multiple field name variants
    let allSessionsSnapshot;
    try {
      // Try snake_case first (student_id)
      allSessionsSnapshot = await db.collection('sessions')
        .where('student_id', '==', studentId)
        .get();

      functions.logger.info('Sessions query with student_id', {
        count: allSessionsSnapshot.size,
        studentId
      });
    } catch (error: any) {
      functions.logger.warn('Failed to query sessions with student_id', { error: error.message });
    }

    // If no results, try camelCase (studentId)
    if (!allSessionsSnapshot || allSessionsSnapshot.empty) {
      try {
        allSessionsSnapshot = await db.collection('sessions')
          .where('studentId', '==', studentId)
          .get();

        functions.logger.info('Sessions query with studentId (camelCase)', {
          count: allSessionsSnapshot.size,
          studentId
        });
      } catch (error: any) {
        functions.logger.warn('Failed to query sessions with studentId', { error: error.message });
      }
    }

    // If still no results, try querying by subscription_id
    if (!allSessionsSnapshot || allSessionsSnapshot.empty) {
      const subscriptionIds = subscriptionsSnapshot.docs.map(doc => doc.id);
      if (subscriptionIds.length > 0) {
        const sessionDocs: any[] = [];

        for (const subId of subscriptionIds) {
          try {
            const sessionsForSub = await db.collection('sessions')
              .where('subscription_id', '==', subId)
              .get();

            sessionsForSub.docs.forEach(doc => sessionDocs.push(doc));
          } catch (error: any) {
            functions.logger.warn('Failed to query sessions with subscription_id', {
              subscriptionId: subId,
              error: error.message
            });
          }
        }

        // Create a fake snapshot-like object
        allSessionsSnapshot = {
          docs: sessionDocs,
          size: sessionDocs.length,
          empty: sessionDocs.length === 0
        } as any;

        functions.logger.info('Sessions query via subscription_id', {
          count: allSessionsSnapshot.size,
          subscriptionIds
        });
      }
    }

    if (!studentDoc.exists) {
      functions.logger.warn('Student not found', { studentId, schoolId });
      return null;
    }

    const studentData = studentDoc.data()!;

    // Calculate payment status following Students.tsx logic (lines 298-398)
    let totalPaidAllSubs = 0;
    let totalPriceAllSubs = 0;
    let hasOverdue = false;
    let hasPartial = false;

    // For each subscription, calculate total paid from transactions
    for (const subDoc of subscriptionsSnapshot.docs) {
      const subscription = subDoc.data();
      const subscriptionId = subDoc.id;
      const totalPrice = parseFloat(subscription.total_price || subscription.totalPrice || 0);

      if (totalPrice <= 0) continue;

      totalPriceAllSubs += totalPrice;

      // Fetch transactions for this subscription
      const transactionsSnapshot = await db.collection('transactions')
        .where('subscription_id', '==', subscriptionId)
        .where('type', '==', 'income')
        .get();

      let totalPaid = 0;
      for (const txDoc of transactionsSnapshot.docs) {
        const amount = parseFloat(txDoc.data().amount || 0);
        if (amount > 0) {
          totalPaid += amount;
        }
      }

      totalPaidAllSubs += totalPaid;

      // Calculate payment percentage for this subscription
      const paymentPercentage = (totalPaid / totalPrice) * 100;

      functions.logger.info('Subscription payment calculation', {
        subscriptionId,
        totalPrice,
        totalPaid,
        paymentPercentage: paymentPercentage.toFixed(1)
      });

      // Check payment status - following Students.tsx logic
      if (paymentPercentage >= 99.9) {
        // Fully paid - good
      } else if (paymentPercentage > 0.1) {
        hasPartial = true;
      } else {
        hasOverdue = true;
      }
    }

    const unpaidAmount = Math.max(totalPriceAllSubs - totalPaidAllSubs, 0);

    // Calculate sessions metrics
    let sessionsCompleted = 0;
    let upcomingSessions: any[] = [];

    // Safety check - ensure we have sessions snapshot
    if (!allSessionsSnapshot) {
      allSessionsSnapshot = { docs: [], size: 0, empty: true } as any;
      functions.logger.warn('No sessions snapshot available', { studentId });
    }

    for (const sessionDoc of allSessionsSnapshot.docs) {
      const session = sessionDoc.data();
      const sessionDate = session.scheduled_date?.toDate ? session.scheduled_date.toDate() : new Date(session.scheduled_date);

      // Count completed sessions (attended status)
      if (session.status === 'attended') {
        sessionsCompleted++;
      }

      // Collect upcoming scheduled sessions
      if (session.status === 'scheduled' && sessionDate >= now.toDate()) {
        upcomingSessions.push({
          scheduled_date: session.scheduled_date?.toDate?.()?.toISOString() || session.scheduled_date,
          scheduled_time: session.scheduledTime || session.scheduled_time,
          duration_minutes: session.durationMinutes || session.duration_minutes || 60,
          status: session.status || 'scheduled'
        });
      }
    }

    // Sort upcoming sessions by date (ascending)
    upcomingSessions.sort((a, b) => {
      const dateA = new Date(a.scheduled_date);
      const dateB = new Date(b.scheduled_date);
      return dateA.getTime() - dateB.getTime();
    });

    // Build context object
    const context: StudentContext = {
      student: {
        firstName: studentData.first_name || studentData.firstName || '',
        lastName: studentData.last_name || studentData.lastName || '',
        courseName: studentData.course_name || studentData.courseName,
        level: studentData.level,
        status: studentData.status || 'active'
      },
      activeSubscriptions: subscriptionsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          session_count: data.sessionCount || data.session_count || 0,
          start_date: data.startDate || data.start_date || '',
          end_date: data.endDate || data.end_date,
          status: data.status || 'active'
        };
      }),
      nextLessons: upcomingSessions.slice(0, 5), // Limit to next 5 lessons
      sessionsCompleted,
      unpaidAmount,
      unpaidSessionCount: unpaidAmount > 0 ? 1 : 0 // Simple flag: has debt or not
    };

    functions.logger.info('Student context fetched with accurate calculations', {
      studentId,
      schoolId,
      activeSubscriptions: context.activeSubscriptions.length,
      nextLessons: context.nextLessons.length,
      sessionsCompleted,
      unpaidAmount,
      totalPaid: totalPaidAllSubs,
      totalPrice: totalPriceAllSubs,
      paymentStatus: hasOverdue ? 'overdue' : hasPartial ? 'partial' : 'paid',
      nextSessionDate: upcomingSessions[0]?.scheduled_date || 'none'
    });

    return context;

  } catch (error: any) {
    functions.logger.error('Failed to fetch student context', {
      error: error.message,
      studentId,
      schoolId
    });
    return null;
  }
}

/**
 * Log AI interaction for analytics
 */
export async function logAIInteraction(
  schoolId: string,
  studentId: string,
  userMessage: string,
  aiResponse: AIResponse
): Promise<void> {
  try {
    await db.collection('ai_chat_logs').add({
      schoolId,
      studentId,
      userMessage,
      aiMessage: aiResponse.message,
      wasEscalated: aiResponse.shouldEscalate,
      escalationReason: aiResponse.escalationReason || null,
      confidence: aiResponse.confidence,
      tokensUsed: aiResponse.tokensUsed || 0,
      timestamp: admin.firestore.Timestamp.now()
    });
  } catch (error: any) {
    functions.logger.error('Failed to log AI interaction', {
      error: error.message,
      studentId,
      schoolId
    });
  }
}
