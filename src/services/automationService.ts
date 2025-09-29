import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  addDoc,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { format, addDays, isBefore, isAfter, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  isEnabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AutomationTrigger {
  type: 'schedule' | 'event' | 'condition';
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time?: string; // HH:mm format
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
  };
  event?: {
    collection: string;
    action: 'created' | 'updated' | 'deleted';
    filters?: Record<string, any>;
  };
  condition?: {
    field: string;
    operator: '==' | '!=' | '<' | '>' | '<=' | '>=' | 'contains' | 'not-contains';
    value: any;
  };
}

export interface AutomationAction {
  type: 'send-notification' | 'update-field' | 'create-task' | 'send-email' | 'send-reminder';
  config: Record<string, any>;
}

export interface AutomationLog {
  id: string;
  ruleId: string;
  ruleName: string;
  status: 'success' | 'failed' | 'partial';
  executedAt: Date;
  duration: number; // in ms
  results: {
    totalActions: number;
    successfulActions: number;
    failedActions: number;
    details: string[];
  };
  error?: string;
}

class AutomationService {
  private activeRules: Map<string, AutomationRule> = new Map();
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  /**
   * Initialize automation service
   */
  async initialize(schoolId: string): Promise<void> {
    if (this.isRunning) return;

    console.log('🤖 Initializing automation service for school:', schoolId);
    this.isRunning = true;

    // Load automation rules
    await this.loadRules(schoolId);

    // Schedule automated tasks
    this.scheduleAutomatedTasks(schoolId);

    // Set up event listeners
    this.setupEventListeners(schoolId);
  }

  /**
   * Load automation rules from database
   */
  private async loadRules(schoolId: string): Promise<void> {
    try {
      const rulesQuery = query(
        collection(db, 'automationRules'),
        where('schoolId', '==', schoolId),
        where('isEnabled', '==', true)
      );

      const snapshot = await getDocs(rulesQuery);
      this.activeRules.clear();

      snapshot.forEach((doc) => {
        const rule = { id: doc.id, ...doc.data() } as AutomationRule;
        this.activeRules.set(rule.id, rule);
      });

      console.log(`Loaded ${this.activeRules.size} automation rules`);
    } catch (error) {
      console.error('Error loading automation rules:', error);
    }
  }

  /**
   * Schedule automated tasks based on rules
   */
  private scheduleAutomatedTasks(schoolId: string): void {
    // Clear existing scheduled jobs
    this.scheduledJobs.forEach(job => clearInterval(job));
    this.scheduledJobs.clear();

    // Schedule daily automated tasks
    this.scheduleDailyTasks(schoolId);

    // Schedule rule-based tasks
    this.activeRules.forEach(rule => {
      if (rule.trigger.type === 'schedule' && rule.trigger.schedule) {
        this.scheduleRule(rule, schoolId);
      }
    });
  }

  /**
   * Schedule daily automated tasks
   */
  private scheduleDailyTasks(schoolId: string): void {
    // Run daily tasks every day at 9 AM
    const dailyTasksInterval = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 9 && now.getMinutes() === 0) {
        this.runDailyAutomations(schoolId);
      }
    }, 60000); // Check every minute

    this.scheduledJobs.set('daily-tasks', dailyTasksInterval);
  }

  /**
   * Schedule a specific rule
   */
  private scheduleRule(rule: AutomationRule, schoolId: string): void {
    if (!rule.trigger.schedule) return;

    const { frequency, time } = rule.trigger.schedule;
    let interval: number;

    switch (frequency) {
      case 'daily':
        interval = 24 * 60 * 60 * 1000; // 24 hours
        break;
      case 'weekly':
        interval = 7 * 24 * 60 * 60 * 1000; // 7 days
        break;
      case 'monthly':
        interval = 30 * 24 * 60 * 60 * 1000; // 30 days (approximate)
        break;
      default:
        return;
    }

    const job = setInterval(() => {
      this.executeRule(rule, schoolId);
    }, interval);

    this.scheduledJobs.set(rule.id, job);
  }

  /**
   * Run daily automated tasks
   */
  private async runDailyAutomations(schoolId: string): Promise<void> {
    console.log('🔄 Running daily automations...');

    // 1. Send payment reminders
    await this.sendPaymentReminders(schoolId);

    // 2. Check and mark overdue payments
    await this.markOverduePayments(schoolId);

    // 3. Send lesson reminders
    await this.sendLessonReminders(schoolId);

    // 4. Update student attendance status
    await this.updateAttendanceStatus(schoolId);

    // 5. Generate daily reports
    await this.generateDailyReports(schoolId);

    // 6. Clean up old notifications
    await this.cleanupOldNotifications(schoolId);

    // 7. Check subscription expirations
    await this.checkSubscriptionExpirations(schoolId);

    console.log('✅ Daily automations completed');
  }

  /**
   * Send payment reminders
   */
  private async sendPaymentReminders(schoolId: string): Promise<void> {
    try {
      const tomorrow = addDays(new Date(), 1);
      const threeDaysFromNow = addDays(new Date(), 3);

      const paymentsQuery = query(
        collection(db, 'payments'),
        where('school_id', '==', schoolId),
        where('status', '==', 'pending'),
        where('due_date', '>=', Timestamp.fromDate(tomorrow)),
        where('due_date', '<=', Timestamp.fromDate(threeDaysFromNow))
      );

      const snapshot = await getDocs(paymentsQuery);
      let remindersCount = 0;

      for (const paymentDoc of snapshot.docs) {
        const payment = paymentDoc.data();

        // Create reminder notification
        await addDoc(collection(db, 'notifications'), {
          school_id: schoolId,
          type: 'payment_reminder',
          title: 'Payment Due Soon',
          message: `Payment of $${payment.amount} for ${payment.student_name} is due on ${format(payment.due_date.toDate(), 'MMM dd, yyyy')}`,
          student_id: payment.student_id,
          payment_id: paymentDoc.id,
          status: 'unread',
          created_at: serverTimestamp(),
          priority: 'high'
        });

        remindersCount++;
      }

      if (remindersCount > 0) {
        console.log(`📧 Sent ${remindersCount} payment reminders`);
        toast.success(`Sent ${remindersCount} payment reminders`);
      }
    } catch (error) {
      console.error('Error sending payment reminders:', error);
    }
  }

  /**
   * Mark overdue payments
   */
  private async markOverduePayments(schoolId: string): Promise<void> {
    try {
      const today = startOfDay(new Date());

      const paymentsQuery = query(
        collection(db, 'payments'),
        where('school_id', '==', schoolId),
        where('status', '==', 'pending'),
        where('due_date', '<', Timestamp.fromDate(today))
      );

      const snapshot = await getDocs(paymentsQuery);
      let overdueCount = 0;

      for (const paymentDoc of snapshot.docs) {
        await updateDoc(doc(db, 'payments', paymentDoc.id), {
          status: 'overdue',
          overdue_since: serverTimestamp(),
          updated_at: serverTimestamp()
        });
        overdueCount++;
      }

      if (overdueCount > 0) {
        console.log(`⚠️ Marked ${overdueCount} payments as overdue`);
        toast.warning(`${overdueCount} payments marked as overdue`);
      }
    } catch (error) {
      console.error('Error marking overdue payments:', error);
    }
  }

  /**
   * Send lesson reminders
   */
  private async sendLessonReminders(schoolId: string): Promise<void> {
    try {
      const today = startOfDay(new Date());
      const tomorrow = endOfDay(addDays(new Date(), 1));

      const sessionsQuery = query(
        collection(db, 'sessions'),
        where('schoolId', '==', schoolId),
        where('scheduled_date', '>=', Timestamp.fromDate(today)),
        where('scheduled_date', '<=', Timestamp.fromDate(tomorrow)),
        where('reminder_sent', '!=', true)
      );

      const snapshot = await getDocs(sessionsQuery);
      let remindersCount = 0;

      for (const sessionDoc of snapshot.docs) {
        const session = sessionDoc.data();

        // Create lesson reminder
        await addDoc(collection(db, 'notifications'), {
          school_id: schoolId,
          type: 'lesson_reminder',
          title: 'Upcoming Lesson',
          message: `Lesson with ${session.student_name} scheduled for ${format(session.scheduled_date.toDate(), 'MMM dd, yyyy HH:mm')}`,
          student_id: session.student_id,
          session_id: sessionDoc.id,
          status: 'unread',
          created_at: serverTimestamp(),
          priority: 'medium'
        });

        // Mark reminder as sent
        await updateDoc(doc(db, 'sessions', sessionDoc.id), {
          reminder_sent: true,
          reminder_sent_at: serverTimestamp()
        });

        remindersCount++;
      }

      if (remindersCount > 0) {
        console.log(`📚 Sent ${remindersCount} lesson reminders`);
        toast.success(`Sent ${remindersCount} lesson reminders`);
      }
    } catch (error) {
      console.error('Error sending lesson reminders:', error);
    }
  }

  /**
   * Update attendance status
   */
  private async updateAttendanceStatus(schoolId: string): Promise<void> {
    try {
      const yesterday = endOfDay(addDays(new Date(), -1));

      const sessionsQuery = query(
        collection(db, 'sessions'),
        where('schoolId', '==', schoolId),
        where('scheduled_date', '<', Timestamp.fromDate(yesterday)),
        where('status', '==', 'scheduled')
      );

      const snapshot = await getDocs(sessionsQuery);
      let updatedCount = 0;

      for (const sessionDoc of snapshot.docs) {
        // Mark as missed if attendance not marked
        await updateDoc(doc(db, 'sessions', sessionDoc.id), {
          status: 'missed',
          updated_at: serverTimestamp()
        });
        updatedCount++;
      }

      if (updatedCount > 0) {
        console.log(`📝 Updated ${updatedCount} session attendance statuses`);
      }
    } catch (error) {
      console.error('Error updating attendance status:', error);
    }
  }

  /**
   * Generate daily reports
   */
  private async generateDailyReports(schoolId: string): Promise<void> {
    try {
      const today = new Date();
      const startOfToday = startOfDay(today);
      const endOfToday = endOfDay(today);

      // Collect daily metrics
      const [payments, sessions, students] = await Promise.all([
        getDocs(query(
          collection(db, 'payments'),
          where('school_id', '==', schoolId),
          where('payment_date', '>=', Timestamp.fromDate(startOfToday)),
          where('payment_date', '<=', Timestamp.fromDate(endOfToday))
        )),
        getDocs(query(
          collection(db, 'sessions'),
          where('schoolId', '==', schoolId),
          where('scheduled_date', '>=', Timestamp.fromDate(startOfToday)),
          where('scheduled_date', '<=', Timestamp.fromDate(endOfToday))
        )),
        getDocs(query(
          collection(db, 'students'),
          where('schoolId', '==', schoolId),
          where('created_at', '>=', Timestamp.fromDate(startOfToday)),
          where('created_at', '<=', Timestamp.fromDate(endOfToday))
        ))
      ]);

      let totalRevenue = 0;
      payments.forEach(doc => {
        const payment = doc.data();
        if (payment.status === 'paid') {
          totalRevenue += payment.amount;
        }
      });

      // Create daily report
      await addDoc(collection(db, 'reports'), {
        school_id: schoolId,
        type: 'daily',
        date: Timestamp.fromDate(today),
        metrics: {
          revenue: totalRevenue,
          sessions_count: sessions.size,
          new_students: students.size,
          payments_received: payments.size
        },
        created_at: serverTimestamp()
      });

      console.log('📊 Daily report generated');
    } catch (error) {
      console.error('Error generating daily report:', error);
    }
  }

  /**
   * Clean up old notifications
   */
  private async cleanupOldNotifications(schoolId: string): Promise<void> {
    try {
      const thirtyDaysAgo = addDays(new Date(), -30);

      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('school_id', '==', schoolId),
        where('created_at', '<', Timestamp.fromDate(thirtyDaysAgo)),
        where('status', '==', 'read')
      );

      const snapshot = await getDocs(notificationsQuery);
      let deletedCount = 0;

      for (const notificationDoc of snapshot.docs) {
        await updateDoc(doc(db, 'notifications', notificationDoc.id), {
          archived: true,
          archived_at: serverTimestamp()
        });
        deletedCount++;
      }

      if (deletedCount > 0) {
        console.log(`🧹 Archived ${deletedCount} old notifications`);
      }
    } catch (error) {
      console.error('Error cleaning up notifications:', error);
    }
  }

  /**
   * Check subscription expirations
   */
  private async checkSubscriptionExpirations(schoolId: string): Promise<void> {
    try {
      const sevenDaysFromNow = addDays(new Date(), 7);

      const subscriptionsQuery = query(
        collection(db, 'subscriptions'),
        where('school_id', '==', schoolId),
        where('status', '==', 'active'),
        where('end_date', '<=', Timestamp.fromDate(sevenDaysFromNow))
      );

      const snapshot = await getDocs(subscriptionsQuery);

      for (const subDoc of snapshot.docs) {
        const subscription = subDoc.data();
        const daysUntilExpiry = Math.ceil(
          (subscription.end_date.toDate().getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );

        // Create expiration warning
        await addDoc(collection(db, 'notifications'), {
          school_id: schoolId,
          type: 'subscription_expiring',
          title: 'Subscription Expiring Soon',
          message: `${subscription.student_name}'s subscription expires in ${daysUntilExpiry} days`,
          student_id: subscription.student_id,
          subscription_id: subDoc.id,
          status: 'unread',
          created_at: serverTimestamp(),
          priority: 'high'
        });
      }

      if (snapshot.size > 0) {
        console.log(`⏰ ${snapshot.size} subscription expiration warnings sent`);
      }
    } catch (error) {
      console.error('Error checking subscription expirations:', error);
    }
  }

  /**
   * Execute a specific automation rule
   */
  private async executeRule(rule: AutomationRule, schoolId: string): Promise<void> {
    const startTime = Date.now();
    const log: AutomationLog = {
      id: `log-${Date.now()}`,
      ruleId: rule.id,
      ruleName: rule.name,
      status: 'success',
      executedAt: new Date(),
      duration: 0,
      results: {
        totalActions: rule.actions.length,
        successfulActions: 0,
        failedActions: 0,
        details: []
      }
    };

    try {
      console.log(`🔄 Executing automation rule: ${rule.name}`);

      for (const action of rule.actions) {
        try {
          await this.executeAction(action, schoolId);
          log.results.successfulActions++;
          log.results.details.push(`✅ ${action.type} executed successfully`);
        } catch (error) {
          log.results.failedActions++;
          log.results.details.push(`❌ ${action.type} failed: ${error}`);
          log.status = log.results.failedActions === rule.actions.length ? 'failed' : 'partial';
        }
      }

      log.duration = Date.now() - startTime;

      // Save execution log
      await this.saveExecutionLog(log, schoolId);

      // Update rule's last run time
      await updateDoc(doc(db, 'automationRules', rule.id), {
        lastRun: serverTimestamp(),
        nextRun: this.calculateNextRun(rule)
      });

    } catch (error) {
      console.error(`Error executing rule ${rule.name}:`, error);
      log.status = 'failed';
      log.error = String(error);
      await this.saveExecutionLog(log, schoolId);
    }
  }

  /**
   * Execute a specific action
   */
  private async executeAction(action: AutomationAction, schoolId: string): Promise<void> {
    switch (action.type) {
      case 'send-notification':
        await this.sendNotification(action.config, schoolId);
        break;
      case 'update-field':
        await this.updateField(action.config, schoolId);
        break;
      case 'create-task':
        await this.createTask(action.config, schoolId);
        break;
      case 'send-email':
        await this.sendEmail(action.config, schoolId);
        break;
      case 'send-reminder':
        await this.sendReminder(action.config, schoolId);
        break;
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Action: Send notification
   */
  private async sendNotification(config: Record<string, any>, schoolId: string): Promise<void> {
    await addDoc(collection(db, 'notifications'), {
      school_id: schoolId,
      type: config.type || 'automated',
      title: config.title,
      message: config.message,
      status: 'unread',
      created_at: serverTimestamp(),
      priority: config.priority || 'medium',
      automated: true
    });
  }

  /**
   * Action: Update field
   */
  private async updateField(config: Record<string, any>, schoolId: string): Promise<void> {
    const { collection: collectionName, documentId, field, value } = config;
    await updateDoc(doc(db, collectionName, documentId), {
      [field]: value,
      updated_at: serverTimestamp(),
      updated_by_automation: true
    });
  }

  /**
   * Action: Create task
   */
  private async createTask(config: Record<string, any>, schoolId: string): Promise<void> {
    await addDoc(collection(db, 'todos'), {
      school_id: schoolId,
      title: config.title,
      description: config.description,
      status: 'pending',
      priority: config.priority || 'medium',
      due_date: config.dueDate ? Timestamp.fromDate(new Date(config.dueDate)) : null,
      created_at: serverTimestamp(),
      created_by_automation: true
    });
  }

  /**
   * Action: Send email (placeholder - would integrate with email service)
   */
  private async sendEmail(config: Record<string, any>, schoolId: string): Promise<void> {
    // This would integrate with an email service like SendGrid or AWS SES
    console.log(`📧 Email would be sent to: ${config.to} with subject: ${config.subject}`);

    // Log the email send attempt
    await addDoc(collection(db, 'emailLogs'), {
      school_id: schoolId,
      to: config.to,
      subject: config.subject,
      body: config.body,
      status: 'queued',
      created_at: serverTimestamp()
    });
  }

  /**
   * Action: Send reminder
   */
  private async sendReminder(config: Record<string, any>, schoolId: string): Promise<void> {
    await addDoc(collection(db, 'reminders'), {
      school_id: schoolId,
      type: config.type,
      title: config.title,
      message: config.message,
      target: config.target, // student_id, teacher_id, etc.
      remind_at: Timestamp.fromDate(new Date(config.remindAt)),
      created_at: serverTimestamp(),
      status: 'pending'
    });
  }

  /**
   * Calculate next run time for a rule
   */
  private calculateNextRun(rule: AutomationRule): Timestamp {
    if (!rule.trigger.schedule) {
      return Timestamp.fromDate(new Date());
    }

    const { frequency } = rule.trigger.schedule;
    let nextRun = new Date();

    switch (frequency) {
      case 'daily':
        nextRun = addDays(nextRun, 1);
        break;
      case 'weekly':
        nextRun = addDays(nextRun, 7);
        break;
      case 'monthly':
        nextRun = addDays(nextRun, 30);
        break;
    }

    return Timestamp.fromDate(nextRun);
  }

  /**
   * Save execution log
   */
  private async saveExecutionLog(log: AutomationLog, schoolId: string): Promise<void> {
    await addDoc(collection(db, 'automationLogs'), {
      ...log,
      school_id: schoolId,
      created_at: serverTimestamp()
    });
  }

  /**
   * Set up event listeners for event-based triggers
   */
  private setupEventListeners(schoolId: string): void {
    // This would set up Firestore listeners for event-based automation triggers
    // For example, listening to new student registrations, payment completions, etc.
    console.log('📡 Event listeners set up for automation triggers');
  }

  /**
   * Stop automation service
   */
  stop(): void {
    console.log('🛑 Stopping automation service');

    // Clear all scheduled jobs
    this.scheduledJobs.forEach(job => clearInterval(job));
    this.scheduledJobs.clear();

    // Clear active rules
    this.activeRules.clear();

    this.isRunning = false;
  }

  /**
   * Get automation status
   */
  getStatus(): { isRunning: boolean; activeRules: number; scheduledJobs: number } {
    return {
      isRunning: this.isRunning,
      activeRules: this.activeRules.size,
      scheduledJobs: this.scheduledJobs.size
    };
  }
}

// Export singleton instance
export const automationService = new AutomationService();