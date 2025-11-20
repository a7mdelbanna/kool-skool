/**
 * TypeScript types for Trial Lessons (Пробные Уроки)
 *
 * Trial lessons are introductory sessions offered to potential students
 * to assess their level and demonstrate teaching methodology before
 * committing to a full subscription.
 */

// Subscription type enum
export type SubscriptionType = 'individual' | 'group' | 'trial';

// Trial lesson pricing types
export type TrialPricingType = 'free' | 'symbolic' | 'paid';

/**
 * Data required to create a new trial lesson
 */
export interface CreateTrialLessonData {
  studentId: string;
  teacherId?: string; // Optional - can be auto-assigned
  scheduledDate: string; // YYYY-MM-DD format
  scheduledTime: string; // HH:mm format
  priceAmount: number; // Flexible pricing - admin sets amount (can be 0 for free)
  currency: 'RUB' | 'USD';
  notes?: string;
  scheduleDay?: string; // e.g., "Monday", "Tuesday"
  durationMinutes?: number; // Default 30-60 minutes
}

/**
 * Trial lesson subscription (enhanced subscription type)
 */
export interface TrialSubscription {
  id: string;
  student_id: string;
  school_id: string;
  teacher_id?: string;
  subscription_type: 'trial';
  is_trial: true;
  session_count: 1; // Always 1 for trials
  duration_months: 1; // Always 1 for trials
  start_date: string;
  schedule: Array<{ day: string; time: string }>;
  price_mode: 'fixedPrice';
  total_price: number;
  currency: 'RUB' | 'USD';
  status: 'active' | 'completed' | 'cancelled';
  trial_completed: boolean;
  trial_completed_at?: string;
  converted_to_subscription_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Data for completing a trial lesson
 */
export interface CompleteTrialData {
  trialSubscriptionId: string;
  teacherFeedback?: string;
  studentLevelAssessed?: string; // e.g., "A1", "A2", "B1", etc.
  recommendedAction?: 'continue' | 'group' | 'not_ready';
}

/**
 * Data for converting trial to regular subscription
 */
export interface ConvertTrialData {
  trialSubscriptionId: string;
  sessionCount: number;
  durationMonths: number;
  schedule: Array<{ day: string; time: string }>;
  priceMode: 'perSession' | 'fixedPrice';
  pricePerSession?: number;
  fixedPrice?: number;
  totalPrice: number;
  currency: 'RUB' | 'USD';
  teacherId?: string; // Can inherit from trial or change
  notes?: string;
}

/**
 * Trial lesson statistics and analytics
 */
export interface TrialLessonStats {
  totalTrials: number;
  completedTrials: number;
  convertedTrials: number;
  conversionRate: number; // Percentage
  revenueFromTrials: number;
  pendingConversions: number; // Completed but not converted
}

/**
 * Trial lesson status for UI display
 */
export type TrialStatus =
  | 'scheduled'      // Trial booked but not completed
  | 'completed'      // Trial completed, waiting for conversion
  | 'converted'      // Trial converted to regular subscription
  | 'cancelled';     // Trial cancelled

/**
 * Helper to get trial status from subscription
 */
export function getTrialStatus(subscription: TrialSubscription): TrialStatus {
  if (subscription.status === 'cancelled') {
    return 'cancelled';
  }
  if (subscription.converted_to_subscription_id) {
    return 'converted';
  }
  if (subscription.trial_completed) {
    return 'completed';
  }
  return 'scheduled';
}

/**
 * Helper to check if subscription is a trial
 */
export function isTrialSubscription(subscription: any): subscription is TrialSubscription {
  return subscription.subscription_type === 'trial' && subscription.is_trial === true;
}
