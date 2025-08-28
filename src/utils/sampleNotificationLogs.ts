import { NotificationLog } from '@/types/notificationLog.types';
import { notificationLogsService } from '@/services/notificationLogs.service';
import { subDays, subHours, subMinutes } from 'date-fns';

// Sample data generator for testing the notification logs viewer
export async function createSampleNotificationLogs(schoolId: string): Promise<void> {
  const sampleLogs: Omit<NotificationLog, 'id' | 'createdAt' | 'updatedAt'>[] = [
    // Recent successful lessons reminders
    {
      schoolId,
      recipientName: 'John Smith',
      recipientPhone: '+1234567890',
      recipientType: 'student',
      notificationType: 'lesson_reminder',
      channel: 'sms',
      status: 'delivered',
      cost: 0.0075,
      message: 'Hi John, reminder: You have Math lesson with Ms. Johnson at 2:00 PM tomorrow. Please be prepared and join on time!',
      messagePreview: 'Hi John, reminder: You have Math lesson with Ms. Johnson at 2:00 PM tomorrow...',
      templateName: 'Lesson Reminder - 1 Day',
      sentAt: subDays(new Date(), 1),
      deliveredAt: subDays(subMinutes(new Date(), 45), 1),
      retryCount: 0,
      messageId: 'SM1234567890abcdef',
      metadata: {
        studentId: 'student1',
        teacherId: 'teacher1',
        lessonId: 'lesson1',
        originalScheduledAt: subDays(new Date(), 1)
      }
    },
    {
      schoolId,
      recipientName: 'Sarah Wilson',
      recipientPhone: '+1987654321',
      recipientType: 'parent',
      notificationType: 'payment_reminder',
      channel: 'whatsapp',
      status: 'read',
      cost: 0.0055,
      message: 'Hi Sarah, this is a reminder that payment of $150.00 for Emma\'s Math lessons is due on March 25, 2024. Please make the payment to avoid service interruption.',
      messagePreview: 'Hi Sarah, this is a reminder that payment of $150.00 for Emma\'s Math lessons...',
      templateName: 'Payment Reminder',
      sentAt: subDays(new Date(), 2),
      deliveredAt: subDays(subMinutes(new Date(), 30), 2),
      readAt: subDays(subMinutes(new Date(), 15), 2),
      retryCount: 0,
      messageId: 'SM9876543210fedcba',
      metadata: {
        studentId: 'student2',
        paymentId: 'payment1',
        amount: 150.00
      }
    },
    {
      schoolId,
      recipientName: 'Mike Johnson',
      recipientPhone: '+1122334455',
      recipientType: 'student',
      notificationType: 'lesson_reminder',
      channel: 'sms',
      status: 'sent',
      cost: 0.0075,
      message: 'Hi Mike, your Physics lesson with Dr. Brown starts in 2 hours at 10:00 AM. Don\'t forget to prepare your materials!',
      messagePreview: 'Hi Mike, your Physics lesson with Dr. Brown starts in 2 hours at 10:00 AM...',
      templateName: 'Lesson Reminder - 2 Hours',
      sentAt: subHours(new Date(), 3),
      retryCount: 0,
      messageId: 'SM1122334455ghijk',
      metadata: {
        studentId: 'student3',
        teacherId: 'teacher2',
        lessonId: 'lesson2'
      }
    },
    // Failed message example
    {
      schoolId,
      recipientName: 'Lisa Brown',
      recipientPhone: '+1555666777',
      recipientType: 'student',
      notificationType: 'lesson_reminder',
      channel: 'whatsapp',
      status: 'failed',
      cost: 0,
      message: 'Hi Lisa, your Chemistry lesson with Prof. Davis scheduled for 3:00 PM today has been cancelled. We will contact you soon to reschedule. We apologize for any inconvenience.',
      messagePreview: 'Hi Lisa, your Chemistry lesson with Prof. Davis scheduled for 3:00 PM today...',
      templateName: 'Lesson Cancellation',
      sentAt: subHours(new Date(), 5),
      errorMessage: 'Invalid phone number format',
      retryCount: 2,
      messageId: 'SM5556667777lmnop',
      metadata: {
        studentId: 'student4',
        teacherId: 'teacher3',
        lessonId: 'lesson3'
      }
    },
    // Pending message
    {
      schoolId,
      recipientName: 'David Lee',
      recipientPhone: '+1333444555',
      recipientType: 'parent',
      notificationType: 'payment_reminder',
      channel: 'sms',
      status: 'pending',
      cost: 0,
      message: 'Hi David, payment of $200.00 for Alex\'s English lessons is due on March 30, 2024. Please make the payment to avoid service interruption.',
      messagePreview: 'Hi David, payment of $200.00 for Alex\'s English lessons is due on March 30...',
      templateName: 'Payment Reminder',
      sentAt: subMinutes(new Date(), 10),
      retryCount: 0,
      metadata: {
        studentId: 'student5',
        paymentId: 'payment2',
        amount: 200.00
      }
    },
    // More historical data
    {
      schoolId,
      recipientName: 'Emma Thompson',
      recipientPhone: '+1777888999',
      recipientType: 'student',
      notificationType: 'lesson_reminder',
      channel: 'whatsapp',
      status: 'delivered',
      cost: 0.0055,
      message: 'Hi Emma, your Spanish lesson with Señora Martinez starts in 15 minutes! Please join now: https://zoom.us/j/123456789',
      messagePreview: 'Hi Emma, your Spanish lesson with Señora Martinez starts in 15 minutes!...',
      templateName: 'Lesson Reminder - 15 Minutes',
      sentAt: subDays(new Date(), 3),
      deliveredAt: subDays(subMinutes(new Date(), 5), 3),
      retryCount: 0,
      messageId: 'SM7778889999qrstu',
      metadata: {
        studentId: 'student6',
        teacherId: 'teacher4',
        lessonId: 'lesson4',
        location: 'https://zoom.us/j/123456789'
      }
    },
    // Custom notification
    {
      schoolId,
      recipientName: 'Robert Garcia',
      recipientPhone: '+1999000111',
      recipientType: 'parent',
      notificationType: 'custom',
      channel: 'sms',
      status: 'delivered',
      cost: 0.0075,
      message: 'Dear Robert, we\'re excited to inform you that your daughter Sofia has shown excellent progress in Mathematics. Keep up the great work!',
      messagePreview: 'Dear Robert, we\'re excited to inform you that your daughter Sofia has shown...',
      templateName: 'Progress Update',
      sentAt: subDays(new Date(), 7),
      deliveredAt: subDays(subMinutes(new Date(), 20), 7),
      retryCount: 0,
      messageId: 'SM9990001111vwxyz',
      metadata: {
        studentId: 'student7',
        teacherId: 'teacher1',
        subject: 'Mathematics'
      }
    },
    // More recent data for testing real-time
    {
      schoolId,
      recipientName: 'Test Student',
      recipientPhone: '+1000000001',
      recipientType: 'student',
      notificationType: 'lesson_reminder',
      channel: 'sms',
      status: 'delivered',
      cost: 0.0075,
      message: 'Test message for real-time updates',
      messagePreview: 'Test message for real-time updates',
      templateName: 'Test Template',
      sentAt: subMinutes(new Date(), 2),
      deliveredAt: subMinutes(new Date(), 1),
      retryCount: 0,
      messageId: 'SM0000000001test'
    }
  ];

  try {
    console.log('Creating sample notification logs...');
    for (const log of sampleLogs) {
      await notificationLogsService.createLog(log);
    }
    console.log(`Created ${sampleLogs.length} sample notification logs`);
  } catch (error) {
    console.error('Error creating sample logs:', error);
    throw error;
  }
}

// Utility to clear all logs for a school (for testing)
export async function clearNotificationLogs(schoolId: string): Promise<void> {
  try {
    // This would need to be implemented in the service
    console.log('Clear logs functionality would be implemented here');
  } catch (error) {
    console.error('Error clearing logs:', error);
    throw error;
  }
}