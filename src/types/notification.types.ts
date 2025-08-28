export interface NotificationTemplate {
  id?: string;
  schoolId?: string;
  name: string;
  type: NotificationTemplateType;
  language: 'en' | 'ru';
  subject?: string; // For email notifications in future
  body: string;
  variables: string[]; // Available variables for this template
  isDefault: boolean;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export enum NotificationTemplateType {
  LESSON_REMINDER_1_DAY = 'lesson_reminder_1_day',
  LESSON_REMINDER_2_HOURS = 'lesson_reminder_2_hours',
  LESSON_REMINDER_15_MIN = 'lesson_reminder_15_min',
  PAYMENT_REMINDER = 'payment_reminder',
  LESSON_CANCELLATION = 'lesson_cancellation',
  CUSTOM = 'custom'
}

export interface NotificationRule {
  id?: string;
  schoolId?: string;
  type: NotificationRuleType;
  enabled: boolean;
  reminders: NotificationReminder[];
  recipients: NotificationRecipients;
  templateId?: string; // Reference to custom template
  createdAt?: Date;
  updatedAt?: Date;
}

export enum NotificationRuleType {
  LESSON_REMINDERS = 'lesson_reminders',
  PAYMENT_REMINDERS = 'payment_reminders',
  LESSON_CANCELLATION = 'lesson_cancellation'
}

export interface NotificationReminder {
  id: string;
  enabled: boolean;
  timing: NotificationTiming;
  channel: NotificationChannel;
  templateType: NotificationTemplateType;
  customTemplateId?: string;
}

export interface NotificationTiming {
  value: number;
  unit: 'minutes' | 'hours' | 'days';
  isCustom?: boolean;
}

export interface NotificationRecipients {
  student: boolean;
  parent: boolean;
  teacher?: boolean;
}

export enum NotificationChannel {
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
  BOTH = 'both'
}

export interface NotificationVariable {
  key: string;
  label: string;
  description: string;
  example: string;
}

// Predefined variables available for templates
export const NOTIFICATION_VARIABLES: NotificationVariable[] = [
  {
    key: 'studentName',
    label: 'Student Name',
    description: 'Full name of the student',
    example: 'John Doe'
  },
  {
    key: 'parentName', 
    label: 'Parent Name',
    description: 'Full name of the parent/guardian',
    example: 'Jane Doe'
  },
  {
    key: 'teacherName',
    label: 'Teacher Name', 
    description: 'Full name of the teacher',
    example: 'Mr. Smith'
  },
  {
    key: 'subject',
    label: 'Subject',
    description: 'Subject or course name',
    example: 'Mathematics'
  },
  {
    key: 'lessonTime',
    label: 'Lesson Time',
    description: 'Date and time of the lesson',
    example: 'Monday, Dec 25 at 2:00 PM'
  },
  {
    key: 'date',
    label: 'Date',
    description: 'General date field',
    example: 'December 25, 2024'
  },
  {
    key: 'amount',
    label: 'Amount',
    description: 'Payment amount',
    example: '$150.00'
  },
  {
    key: 'lessonDuration',
    label: 'Lesson Duration',
    description: 'Duration of the lesson',
    example: '60 minutes'
  },
  {
    key: 'location',
    label: 'Location',
    description: 'Lesson location or platform',
    example: 'Zoom Meeting'
  },
  {
    key: 'schoolName',
    label: 'School Name',
    description: 'Name of the educational institution',
    example: 'TutorFlow Academy'
  }
];

// Default templates in Russian and English
export const DEFAULT_TEMPLATES: Omit<NotificationTemplate, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>[] = [
  // Lesson Reminder - 1 Day Before
  {
    name: 'Lesson Reminder - 1 Day',
    type: NotificationTemplateType.LESSON_REMINDER_1_DAY,
    language: 'en',
    body: 'Hi {studentName}, this is a reminder that you have a {subject} lesson with {teacherName} tomorrow at {lessonTime}. Please be prepared and join on time!',
    variables: ['studentName', 'subject', 'teacherName', 'lessonTime'],
    isDefault: true,
    isActive: true
  },
  {
    name: 'Напоминание об уроке - 1 день',
    type: NotificationTemplateType.LESSON_REMINDER_1_DAY,
    language: 'ru',
    body: 'Привет {studentName}, напоминаем, что завтра в {lessonTime} у вас урок {subject} с {teacherName}. Пожалуйста, будьте готовы и присоединяйтесь вовремя!',
    variables: ['studentName', 'subject', 'teacherName', 'lessonTime'],
    isDefault: true,
    isActive: true
  },

  // Lesson Reminder - 2 Hours Before
  {
    name: 'Lesson Reminder - 2 Hours',
    type: NotificationTemplateType.LESSON_REMINDER_2_HOURS,
    language: 'en',
    body: 'Hi {studentName}, your {subject} lesson with {teacherName} starts in 2 hours at {lessonTime}. Don\'t forget to prepare your materials!',
    variables: ['studentName', 'subject', 'teacherName', 'lessonTime'],
    isDefault: true,
    isActive: true
  },
  {
    name: 'Напоминание об уроке - 2 часа',
    type: NotificationTemplateType.LESSON_REMINDER_2_HOURS,
    language: 'ru',
    body: 'Привет {studentName}, ваш урок {subject} с {teacherName} начнется через 2 часа в {lessonTime}. Не забудьте подготовить учебные материалы!',
    variables: ['studentName', 'subject', 'teacherName', 'lessonTime'],
    isDefault: true,
    isActive: true
  },

  // Lesson Reminder - 15 Minutes Before
  {
    name: 'Lesson Reminder - 15 Minutes',
    type: NotificationTemplateType.LESSON_REMINDER_15_MIN,
    language: 'en',
    body: 'Hi {studentName}, your {subject} lesson with {teacherName} starts in 15 minutes! Please join now: {location}',
    variables: ['studentName', 'subject', 'teacherName', 'location'],
    isDefault: true,
    isActive: true
  },
  {
    name: 'Напоминание об уроке - 15 минут',
    type: NotificationTemplateType.LESSON_REMINDER_15_MIN,
    language: 'ru',
    body: 'Привет {studentName}, ваш урок {subject} с {teacherName} начнется через 15 минут! Присоединяйтесь сейчас: {location}',
    variables: ['studentName', 'subject', 'teacherName', 'location'],
    isDefault: true,
    isActive: true
  },

  // Payment Reminder
  {
    name: 'Payment Reminder',
    type: NotificationTemplateType.PAYMENT_REMINDER,
    language: 'en',
    body: 'Hi {parentName}, this is a reminder that payment of {amount} for {studentName}\'s {subject} lessons is due on {date}. Please make the payment to avoid service interruption.',
    variables: ['parentName', 'amount', 'studentName', 'subject', 'date'],
    isDefault: true,
    isActive: true
  },
  {
    name: 'Напоминание об оплате',
    type: NotificationTemplateType.PAYMENT_REMINDER,
    language: 'ru',
    body: 'Привет {parentName}, напоминаем, что оплата в размере {amount} за уроки {subject} для {studentName} должна быть произведена до {date}. Пожалуйста, внесите оплату во избежание перерыва в обслуживании.',
    variables: ['parentName', 'amount', 'studentName', 'subject', 'date'],
    isDefault: true,
    isActive: true
  },

  // Lesson Cancellation
  {
    name: 'Lesson Cancellation',
    type: NotificationTemplateType.LESSON_CANCELLATION,
    language: 'en',
    body: 'Hi {studentName}, unfortunately your {subject} lesson with {teacherName} scheduled for {lessonTime} has been cancelled. We will contact you soon to reschedule. We apologize for any inconvenience.',
    variables: ['studentName', 'subject', 'teacherName', 'lessonTime'],
    isDefault: true,
    isActive: true
  },
  {
    name: 'Отмена урока',
    type: NotificationTemplateType.LESSON_CANCELLATION,
    language: 'ru',
    body: 'Привет {studentName}, к сожалению, ваш урок {subject} с {teacherName}, запланированный на {lessonTime}, отменен. Мы свяжемся с вами в ближайшее время для переноса. Приносим извинения за неудобства.',
    variables: ['studentName', 'subject', 'teacherName', 'lessonTime'],
    isDefault: true,
    isActive: true
  }
];

// Default notification rules
export const DEFAULT_NOTIFICATION_RULES: Omit<NotificationRule, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>[] = [
  {
    type: NotificationRuleType.LESSON_REMINDERS,
    enabled: true,
    reminders: [
      {
        id: 'reminder_1_day',
        enabled: true,
        timing: { value: 1, unit: 'days' },
        channel: NotificationChannel.BOTH,
        templateType: NotificationTemplateType.LESSON_REMINDER_1_DAY
      },
      {
        id: 'reminder_2_hours',
        enabled: true,
        timing: { value: 2, unit: 'hours' },
        channel: NotificationChannel.BOTH,
        templateType: NotificationTemplateType.LESSON_REMINDER_2_HOURS
      },
      {
        id: 'reminder_15_min',
        enabled: false,
        timing: { value: 15, unit: 'minutes' },
        channel: NotificationChannel.BOTH,
        templateType: NotificationTemplateType.LESSON_REMINDER_15_MIN
      }
    ],
    recipients: {
      student: true,
      parent: false,
      teacher: false
    }
  },
  {
    type: NotificationRuleType.PAYMENT_REMINDERS,
    enabled: true,
    reminders: [
      {
        id: 'payment_3_days',
        enabled: true,
        timing: { value: 3, unit: 'days' },
        channel: NotificationChannel.SMS,
        templateType: NotificationTemplateType.PAYMENT_REMINDER
      },
      {
        id: 'payment_1_day',
        enabled: true,
        timing: { value: 1, unit: 'days' },
        channel: NotificationChannel.BOTH,
        templateType: NotificationTemplateType.PAYMENT_REMINDER
      }
    ],
    recipients: {
      student: false,
      parent: true,
      teacher: false
    }
  },
  {
    type: NotificationRuleType.LESSON_CANCELLATION,
    enabled: true,
    reminders: [
      {
        id: 'cancellation_immediate',
        enabled: true,
        timing: { value: 0, unit: 'minutes' },
        channel: NotificationChannel.BOTH,
        templateType: NotificationTemplateType.LESSON_CANCELLATION
      }
    ],
    recipients: {
      student: true,
      parent: true,
      teacher: false
    }
  }
];