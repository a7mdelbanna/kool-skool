import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  Timestamp,
  orderBy
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { twilioService } from './twilio.service';
import { notificationSettingsService } from './notificationSettings.service';
import { notificationLogsService } from './notificationLogs.service';
import { paymentMethodsService } from './paymentMethods.service';
import { 
  NotificationRule, 
  NotificationTemplate,
  NotificationChannel,
  NotificationRuleType
} from '@/types/notification.types';
import { format, addDays, addHours, addMinutes, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  parent_phone?: string;
  parent_email?: string;
  parent_name?: string;
  school_id: string;
  teacher_id?: string;
}

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  schoolId: string;
}

interface Session {
  id: string;
  studentId: string;
  teacherId: string;
  date: string;
  time: string;
  duration: string;
  status: string;
  schoolId: string;
  subject?: string;
  notes?: string;
  notificationsSent?: {
    [key: string]: boolean;
  };
}

interface Payment {
  id: string;
  studentId: string;
  amount: number;
  dueDate: Date;
  status: 'pending' | 'paid' | 'overdue';
  schoolId: string;
  description?: string;
  notificationsSent?: {
    [key: string]: boolean;
  };
}

class NotificationSchedulerService {
  /**
   * Get teacher's zoom link
   */
  private async getTeacherZoomLink(teacherId: string): Promise<string> {
    try {
      const teacherDoc = await getDoc(doc(db, 'users', teacherId));
      if (teacherDoc.exists()) {
        const teacher = teacherDoc.data();
        return teacher.zoomLink || '';
      }
      return '';
    } catch (error) {
      console.error('Error fetching teacher zoom link:', error);
      return '';
    }
  }

  /**
   * Get phone number for a recipient
   */
  private async getRecipientPhone(
    recipientType: 'student' | 'parent' | 'teacher',
    studentId?: string,
    teacherId?: string,
    schoolId?: string
  ): Promise<{ phone: string; name: string } | null> {
    try {
      if (recipientType === 'teacher' && teacherId) {
        const teacherDoc = await getDoc(doc(db, 'users', teacherId));
        if (teacherDoc.exists()) {
          const teacher = teacherDoc.data() as Teacher;
          return {
            phone: teacher.phone || '',
            name: `${teacher.firstName} ${teacher.lastName}`
          };
        }
      }

      if ((recipientType === 'student' || recipientType === 'parent') && studentId) {
        const studentDoc = await getDoc(doc(db, 'students', studentId));
        if (studentDoc.exists()) {
          const student = studentDoc.data() as Student;
          
          if (recipientType === 'parent') {
            return {
              phone: student.parent_phone || '',
              name: student.parent_name || 'Parent'
            };
          } else {
            return {
              phone: student.phone || '',
              name: `${student.first_name} ${student.last_name}`
            };
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting recipient phone:', error);
      return null;
    }
  }

  /**
   * Replace template variables with actual values
   */
  private replaceTemplateVariables(
    template: string,
    variables: Record<string, string>
  ): string {
    let message = template;
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{${key}}`, 'g');
      message = message.replace(regex, value);
    });
    
    return message;
  }

  /**
   * Check and send lesson reminders
   */
  async checkAndSendLessonReminders(schoolId: string): Promise<void> {
    try {
      // Get notification rules for lesson reminders
      const rules = await notificationSettingsService.getNotificationRules(schoolId);
      const lessonReminderRule = rules.find(r => r.type === NotificationRuleType.LESSON_REMINDER);
      
      if (!lessonReminderRule || !lessonReminderRule.enabled) {
        console.log('Lesson reminder notifications are disabled');
        return;
      }

      // Get upcoming sessions
      const sessionsQuery = query(
        collection(db, 'sessions'),
        where('schoolId', '==', schoolId),
        where('status', '==', 'scheduled'),
        where('date', '>=', format(new Date(), 'yyyy-MM-dd')),
        orderBy('date', 'asc'),
        orderBy('time', 'asc')
      );

      const sessionsSnapshot = await getDocs(sessionsQuery);
      const sessions = sessionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Session[];

      // Get templates
      const templates = await notificationSettingsService.getTemplates(schoolId);

      // Process each session
      for (const session of sessions) {
        await this.processSessionReminders(session, lessonReminderRule, templates);
      }
    } catch (error) {
      console.error('Error checking lesson reminders:', error);
    }
  }

  /**
   * Process reminders for a single session
   */
  private async processSessionReminders(
    session: Session,
    rule: NotificationRule,
    templates: NotificationTemplate[]
  ): Promise<void> {
    try {
      const sessionDateTime = new Date(`${session.date} ${session.time}`);
      const now = new Date();

      // Get student and teacher info
      const student = await this.getStudentInfo(session.studentId);
      const teacher = await this.getTeacherInfo(session.teacherId);

      if (!student) {
        console.error('Student not found for session:', session.id);
        return;
      }

      // Check each reminder in the rule
      for (const reminder of rule.reminders || []) {
        // Calculate when the reminder should be sent
        let reminderTime: Date;
        
        switch (reminder.timing?.unit) {
          case 'days':
            reminderTime = addDays(sessionDateTime, -(reminder.timing?.value || 0));
            break;
          case 'hours':
            reminderTime = addHours(sessionDateTime, -(reminder.timing?.value || 0));
            break;
          case 'minutes':
            reminderTime = addMinutes(sessionDateTime, -(reminder.timing?.value || 0));
            break;
          default:
            continue;
        }

        // Check if it's time to send this reminder
        const shouldSend = isAfter(now, reminderTime) && isBefore(now, sessionDateTime);
        
        // Check if already sent
        const reminderKey = `${reminder.timing?.value}_${reminder.timing?.unit}_${reminder.channel}`;
        const alreadySent = session.notificationsSent?.[reminderKey];

        if (shouldSend && !alreadySent) {
          // Find appropriate template
          const template = templates.find(t => 
            t.type === NotificationTemplateType.LESSON_REMINDER_1_DAY ||
            t.type === NotificationTemplateType.LESSON_REMINDER_2_HOURS
          );

          if (!template) {
            console.error('No template found for lesson reminder');
            continue;
          }

          // Get teacher's zoom link
          const zoomLink = await this.getTeacherZoomLink(session.teacherId);
          
          // Prepare variables
          const variables = {
            studentName: `${student.first_name} ${student.last_name}`,
            parentName: student.parent_name || 'Parent',
            teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Teacher',
            subject: session.subject || 'Lesson',
            lessonTime: format(sessionDateTime, 'EEEE, MMMM d at h:mm a'),
            date: format(sessionDateTime, 'MMMM d, yyyy'),
            time: session.time,
            duration: session.duration,
            schoolName: 'TutorFlow Academy',
            location: zoomLink || 'Online', // For backward compatibility
            zoomLink: zoomLink || 'Meeting link will be provided'
          };

          // Send to configured recipients
          const recipients = [];
          
          if (rule.recipients?.student) {
            const studentPhone = await this.getRecipientPhone('student', session.studentId);
            if (studentPhone) recipients.push({ type: 'student', ...studentPhone });
          }
          
          if (rule.recipients?.parent) {
            const parentPhone = await this.getRecipientPhone('parent', session.studentId);
            if (parentPhone) recipients.push({ type: 'parent', ...parentPhone });
          }
          
          if (rule.recipients?.teacher) {
            const teacherPhone = await this.getRecipientPhone('teacher', undefined, session.teacherId);
            if (teacherPhone) recipients.push({ type: 'teacher', ...teacherPhone });
          }

          // Send notifications
          for (const recipient of recipients) {
            const message = this.replaceTemplateVariables(template.body, variables);
            
            // Send based on channel
            if (reminder.channel === 'sms' || reminder.channel === 'both') {
              await this.sendNotification(
                recipient.phone,
                message,
                'sms',
                recipient.name,
                recipient.type,
                session.schoolId,
                template.id,
                template.name,
                NotificationRuleType.LESSON_REMINDER
              );
            }
            
            if (reminder.channel === 'whatsapp' || reminder.channel === 'both') {
              await this.sendNotification(
                recipient.phone,
                message,
                'whatsapp',
                recipient.name,
                recipient.type,
                session.schoolId,
                template.id,
                template.name,
                NotificationRuleType.LESSON_REMINDER
              );
            }
          }

          // Mark as sent (would update in Firebase)
          await this.markReminderAsSent(session.id, reminderKey);
        }
      }
    } catch (error) {
      console.error('Error processing session reminders:', error);
    }
  }

  /**
   * Send notification and log it
   */
  private async sendNotification(
    phone: string,
    message: string,
    channel: 'sms' | 'whatsapp',
    recipientName: string,
    recipientType: string,
    schoolId: string,
    templateId?: string,
    templateName?: string,
    notificationType?: NotificationRuleType
  ): Promise<void> {
    try {
      // MASTER TOGGLE CHECK - Check if Twilio is enabled
      const config = await twilioService.getConfig(schoolId);
      
      if (!config || !config.isActive) {
        console.log('Twilio integration is disabled (master toggle off), skipping notification for:', recipientName);
        return;
      }
      
      // Check what channels are actually configured
      const hasSMS = !!config.phoneNumberSms;
      const hasWhatsApp = !!config.phoneNumberWhatsapp;
      
      if (!hasSMS && !hasWhatsApp) {
        console.log('No phone numbers configured, skipping notification');
        return;
      }
      
      // Determine which channel to actually use based on availability
      let actualChannel = channel;
      if (channel === 'sms' && !hasSMS && hasWhatsApp) {
        actualChannel = 'whatsapp';
        console.log('SMS not configured, using WhatsApp as fallback for:', recipientName);
      } else if (channel === 'whatsapp' && !hasWhatsApp && hasSMS) {
        actualChannel = 'sms';
        console.log('WhatsApp not configured, using SMS as fallback for:', recipientName);
      } else if ((channel === 'sms' && !hasSMS) || (channel === 'whatsapp' && !hasWhatsApp)) {
        console.log(`Channel ${channel} not configured and no fallback available for:`, recipientName);
        return;
      }
      
      // Send the message using the same method as test flow
      const result = await twilioService.sendTestMessage(
        schoolId,
        {
          phone,
          message,
          channel: actualChannel
        }
      );

      // Log the notification
      await notificationLogsService.createLog({
        schoolId,
        recipientName,
        recipientPhone: phone,
        recipientType,
        channel: actualChannel,
        message,
        messagePreview: message.substring(0, 100),
        status: result && result.success ? 'sent' : 'failed',
        notificationType: notificationType || 'custom',
        templateId,
        templateName,
        sentAt: new Date(),
        cost: result?.data?.cost || 0,
        twilioSid: result?.data?.sid,
        errorMessage: result && !result.success ? result.error : undefined
      });
    } catch (error) {
      console.error('Error sending notification:', error);
      
      // Log failed attempt
      await notificationLogsService.createLog({
        schoolId,
        recipientName,
        recipientPhone: phone,
        recipientType,
        channel,
        message,
        messagePreview: message.substring(0, 100),
        status: 'failed',
        notificationType: notificationType || 'custom',
        templateId,
        templateName,
        sentAt: new Date(),
        cost: 0,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Check and send payment reminders
   */
  async checkAndSendPaymentReminders(schoolId: string): Promise<void> {
    try {
      // Get notification rules for payment reminders
      const rules = await notificationSettingsService.getNotificationRules(schoolId);
      const paymentReminderRule = rules.find(r => r.type === NotificationRuleType.PAYMENT_REMINDER);
      
      if (!paymentReminderRule || !paymentReminderRule.enabled) {
        console.log('Payment reminder notifications are disabled');
        return;
      }

      // Get pending payments
      const paymentsQuery = query(
        collection(db, 'payments'),
        where('schoolId', '==', schoolId),
        where('status', '==', 'pending'),
        orderBy('dueDate', 'asc')
      );

      const paymentsSnapshot = await getDocs(paymentsQuery);
      const payments = paymentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dueDate: doc.data().dueDate?.toDate()
      })) as Payment[];

      // Get templates
      const templates = await notificationSettingsService.getTemplates(schoolId);

      // Process each payment
      for (const payment of payments) {
        await this.processPaymentReminders(payment, paymentReminderRule, templates);
      }
    } catch (error) {
      console.error('Error checking payment reminders:', error);
    }
  }

  /**
   * Get student information
   */
  private async getStudentInfo(studentId: string): Promise<Student | null> {
    try {
      const studentDoc = await getDoc(doc(db, 'students', studentId));
      if (studentDoc.exists()) {
        return { id: studentDoc.id, ...studentDoc.data() } as Student;
      }
      return null;
    } catch (error) {
      console.error('Error getting student info:', error);
      return null;
    }
  }

  /**
   * Get teacher information
   */
  private async getTeacherInfo(teacherId: string): Promise<Teacher | null> {
    try {
      const teacherDoc = await getDoc(doc(db, 'users', teacherId));
      if (teacherDoc.exists()) {
        return { id: teacherDoc.id, ...teacherDoc.data() } as Teacher;
      }
      return null;
    } catch (error) {
      console.error('Error getting teacher info:', error);
      return null;
    }
  }

  /**
   * Mark reminder as sent for a session
   */
  private async markReminderAsSent(sessionId: string, reminderKey: string): Promise<void> {
    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      const sessionDoc = await getDoc(sessionRef);
      
      if (sessionDoc.exists()) {
        const currentNotifications = sessionDoc.data().notificationsSent || {};
        currentNotifications[reminderKey] = true;
        
        await sessionRef.update({
          notificationsSent: currentNotifications
        });
      }
    } catch (error) {
      console.error('Error marking reminder as sent:', error);
    }
  }

  /**
   * Process payment reminders
   */
  private async processPaymentReminders(
    payment: Payment,
    rule: NotificationRule,
    templates: NotificationTemplate[]
  ): Promise<void> {
    try {
      const now = new Date();
      const dueDate = payment.dueDate;

      // Get student info
      const student = await this.getStudentInfo(payment.studentId);
      if (!student) {
        console.error('Student not found for payment:', payment.id);
        return;
      }

      // Check each reminder in the rule
      for (const reminder of rule.reminders || []) {
        // Calculate when the reminder should be sent
        let reminderTime: Date;
        
        switch (reminder.timing?.unit) {
          case 'days':
            reminderTime = addDays(dueDate, -(reminder.timing?.value || 0));
            break;
          case 'hours':
            reminderTime = addHours(dueDate, -(reminder.timing?.value || 0));
            break;
          default:
            continue;
        }

        // Check if it's time to send this reminder
        const shouldSend = isAfter(now, reminderTime) && isBefore(now, dueDate);
        
        // Check if already sent
        const reminderKey = `${reminder.timing?.value}_${reminder.timing?.unit}_${reminder.channel}`;
        const alreadySent = payment.notificationsSent?.[reminderKey];

        if (shouldSend && !alreadySent) {
          // Find appropriate template
          const template = templates.find(t => 
            t.type === NotificationTemplateType.PAYMENT_REMINDER
          );

          if (!template) {
            console.error('No template found for payment reminder');
            continue;
          }

          // Get payment method details
          let paymentMethodName = 'Payment';
          let paymentInstructions = '';
          
          if (payment.paymentMethodId) {
            const paymentMethod = await paymentMethodsService.getPaymentMethod(payment.paymentMethodId);
            if (paymentMethod) {
              paymentMethodName = paymentMethod.name;
              paymentInstructions = paymentMethod.instructions || '';
            }
          }
          
          // Prepare variables
          const variables = {
            studentName: `${student.first_name} ${student.last_name}`,
            parentName: student.parent_name || 'Parent',
            amount: `$${payment.amount.toFixed(2)}`,
            dueDate: format(dueDate, 'MMMM d, yyyy'),
            description: payment.description || 'Payment',
            schoolName: 'TutorFlow Academy',
            paymentMethod: paymentMethodName,
            paymentInstructions: paymentInstructions
          };

          // Send to configured recipients (usually parents for payments)
          const recipients = [];
          
          if (rule.recipients?.parent) {
            const parentPhone = await this.getRecipientPhone('parent', payment.studentId);
            if (parentPhone) recipients.push({ type: 'parent', ...parentPhone });
          }
          
          if (rule.recipients?.student) {
            const studentPhone = await this.getRecipientPhone('student', payment.studentId);
            if (studentPhone) recipients.push({ type: 'student', ...studentPhone });
          }

          // Send notifications
          for (const recipient of recipients) {
            const message = this.replaceTemplateVariables(template.body, variables);
            
            // Send based on channel
            if (reminder.channel === 'sms' || reminder.channel === 'both') {
              await this.sendNotification(
                recipient.phone,
                message,
                'sms',
                recipient.name,
                recipient.type,
                payment.schoolId,
                template.id,
                template.name,
                NotificationRuleType.PAYMENT_REMINDER
              );
            }
            
            if (reminder.channel === 'whatsapp' || reminder.channel === 'both') {
              await this.sendNotification(
                recipient.phone,
                message,
                'whatsapp',
                recipient.name,
                recipient.type,
                payment.schoolId,
                template.id,
                template.name,
                NotificationRuleType.PAYMENT_REMINDER
              );
            }
          }

          // Mark as sent
          await this.markPaymentReminderAsSent(payment.id, reminderKey);
        }
      }
    } catch (error) {
      console.error('Error processing payment reminders:', error);
    }
  }

  /**
   * Mark payment reminder as sent
   */
  private async markPaymentReminderAsSent(paymentId: string, reminderKey: string): Promise<void> {
    try {
      const paymentRef = doc(db, 'payments', paymentId);
      const paymentDoc = await getDoc(paymentRef);
      
      if (paymentDoc.exists()) {
        const currentNotifications = paymentDoc.data().notificationsSent || {};
        currentNotifications[reminderKey] = true;
        
        await paymentRef.update({
          notificationsSent: currentNotifications
        });
      }
    } catch (error) {
      console.error('Error marking payment reminder as sent:', error);
    }
  }

  /**
   * Run all scheduled checks
   */
  async runScheduledChecks(schoolId: string): Promise<void> {
    console.log('Running scheduled notification checks for school:', schoolId);
    
    await Promise.all([
      this.checkAndSendLessonReminders(schoolId),
      this.checkAndSendPaymentReminders(schoolId)
    ]);
    
    console.log('Scheduled checks completed');
  }
}

export const notificationSchedulerService = new NotificationSchedulerService();