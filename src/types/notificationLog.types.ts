export interface NotificationLog {
  id: string;
  schoolId: string;
  messageId?: string; // Twilio message SID
  recipientName: string;
  recipientPhone: string;
  recipientType: 'student' | 'parent' | 'teacher';
  notificationType: 'lesson_reminder' | 'payment_reminder' | 'lesson_cancellation' | 'custom';
  channel: 'sms' | 'whatsapp';
  status: 'sent' | 'failed' | 'pending' | 'delivered' | 'read';
  cost?: number; // Cost in USD
  currency?: string;
  message: string;
  messagePreview: string; // First 100 characters
  templateId?: string;
  templateName?: string;
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  errorMessage?: string;
  retryCount: number;
  metadata?: {
    studentId?: string;
    teacherId?: string;
    lessonId?: string;
    paymentId?: string;
    originalScheduledAt?: Date;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationLogFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  status?: NotificationLog['status'][];
  type?: NotificationLog['notificationType'][];
  channel?: NotificationLog['channel'][];
  recipientSearch?: string;
  templateId?: string;
}

export interface NotificationLogStats {
  totalSent: number;
  totalFailed: number;
  totalPending: number;
  totalDelivered: number;
  totalRead: number;
  totalCost: number;
  successRate: number;
  costByChannel: {
    sms: number;
    whatsapp: number;
  };
  sentByType: {
    lesson_reminder: number;
    payment_reminder: number;
    lesson_cancellation: number;
    custom: number;
  };
  sentByDay: {
    date: string;
    count: number;
    cost: number;
  }[];
}

export interface NotificationLogQuery {
  filters?: NotificationLogFilters;
  sortBy?: keyof NotificationLog;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}