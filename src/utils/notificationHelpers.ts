import { NotificationTiming, NotificationTemplateType, NotificationChannel, NotificationRuleType } from '@/types/notification.types';

/**
 * Format timing display string
 */
export const formatTimingDisplay = (timing: NotificationTiming): string => {
  if (timing.value === 0) {
    return 'Immediately';
  }
  
  const unit = timing.value === 1 ? timing.unit.slice(0, -1) : timing.unit;
  return `${timing.value} ${unit} before`;
};

/**
 * Get template type icon
 */
export const getTemplateTypeIcon = (type: NotificationTemplateType): string => {
  switch (type) {
    case NotificationTemplateType.LESSON_REMINDER_1_DAY:
    case NotificationTemplateType.LESSON_REMINDER_2_HOURS:
    case NotificationTemplateType.LESSON_REMINDER_15_MIN:
      return '📚';
    case NotificationTemplateType.PAYMENT_REMINDER:
      return '💰';
    case NotificationTemplateType.LESSON_CANCELLATION:
      return '❌';
    default:
      return '📄';
  }
};

/**
 * Get channel icon
 */
export const getChannelIcon = (channel: NotificationChannel): string => {
  switch (channel) {
    case NotificationChannel.SMS:
      return '📱';
    case NotificationChannel.WHATSAPP:
      return '💬';
    case NotificationChannel.BOTH:
      return '📱💬';
    default:
      return '📱';
  }
};

/**
 * Get rule type description
 */
export const getRuleTypeDescription = (type: NotificationRuleType): string => {
  switch (type) {
    case NotificationRuleType.LESSON_REMINDERS:
      return 'Send automatic reminders before lessons to help students prepare and arrive on time.';
    case NotificationRuleType.PAYMENT_REMINDERS:
      return 'Send payment reminders to parents before payment due dates to avoid service interruptions.';
    case NotificationRuleType.LESSON_CANCELLATION:
      return 'Send immediate notifications when lessons are cancelled or rescheduled.';
    default:
      return '';
  }
};

/**
 * Validate timing configuration
 */
export const validateTiming = (timing: NotificationTiming): { isValid: boolean; error?: string } => {
  if (timing.value < 0) {
    return { isValid: false, error: 'Timing value cannot be negative' };
  }
  
  if (timing.unit === 'minutes' && timing.value > 1440) {
    return { isValid: false, error: 'Timing cannot exceed 24 hours (1440 minutes)' };
  }
  
  if (timing.unit === 'hours' && timing.value > 168) {
    return { isValid: false, error: 'Timing cannot exceed 7 days (168 hours)' };
  }
  
  if (timing.unit === 'days' && timing.value > 30) {
    return { isValid: false, error: 'Timing cannot exceed 30 days' };
  }
  
  return { isValid: true };
};

/**
 * Get preset timing options for different reminder types
 */
export const getPresetTimingOptions = (templateType: NotificationTemplateType): NotificationTiming[] => {
  switch (templateType) {
    case NotificationTemplateType.LESSON_REMINDER_1_DAY:
      return [
        { value: 1, unit: 'days' },
        { value: 2, unit: 'days' },
        { value: 3, unit: 'days' },
      ];
    case NotificationTemplateType.LESSON_REMINDER_2_HOURS:
      return [
        { value: 2, unit: 'hours' },
        { value: 4, unit: 'hours' },
        { value: 6, unit: 'hours' },
      ];
    case NotificationTemplateType.LESSON_REMINDER_15_MIN:
      return [
        { value: 15, unit: 'minutes' },
        { value: 30, unit: 'minutes' },
        { value: 60, unit: 'minutes' },
      ];
    case NotificationTemplateType.PAYMENT_REMINDER:
      return [
        { value: 1, unit: 'days' },
        { value: 3, unit: 'days' },
        { value: 7, unit: 'days' },
      ];
    default:
      return [
        { value: 15, unit: 'minutes' },
        { value: 1, unit: 'hours' },
        { value: 1, unit: 'days' },
      ];
  }
};