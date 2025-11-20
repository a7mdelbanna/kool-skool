/**
 * Trial Lesson Service
 *
 * Handles trial lesson (пробные уроки) operations including:
 * - Creating trial lesson subscriptions
 * - Validating one-trial-per-student rule
 * - Completing trial lessons
 * - Converting trials to regular subscriptions
 */

import { supabase } from '@/integrations/supabase/client';
import { databaseService } from '@/services/firebase/database.service';
import { toast } from 'sonner';
import {
  CreateTrialLessonData,
  TrialSubscription,
  CompleteTrialData,
  ConvertTrialData,
  TrialLessonStats,
  isTrialSubscription
} from '@/types/trial.types';

/**
 * Check if student already has a trial lesson
 * Enforces business rule: one trial per student per school
 *
 * @param studentId - Student ID to check
 * @param schoolId - School ID to scope the check
 * @returns true if student has an existing trial, false otherwise
 */
export const hasTrialLesson = async (
  studentId: string,
  schoolId: string
): Promise<boolean> => {
  try {
    console.log(`[TrialLesson] Checking if student ${studentId} has trial in school ${schoolId}`);

    // Simplified query to avoid composite index requirement
    // Filter for cancelled status in memory instead of in query
    const { data, error } = await supabase
      .from('subscriptions')
      .select('id, status, subscription_type')
      .eq('student_id', studentId)
      .eq('school_id', schoolId)
      .eq('subscription_type', 'trial');

    if (error) {
      console.error('[TrialLesson] Error checking for existing trial:', error);
      throw error;
    }

    // Filter out cancelled trials in memory
    const activeTrials = data?.filter(sub => sub.status !== 'cancelled') || [];
    const hasTrial = activeTrials.length > 0;

    console.log(`[TrialLesson] Student ${studentId} has trial: ${hasTrial}`);

    return hasTrial;
  } catch (error) {
    console.error('[TrialLesson] Error in hasTrialLesson:', error);
    throw error;
  }
};

/**
 * Create a new trial lesson subscription
 *
 * Validates:
 * - Student doesn't already have a trial
 * - All required fields are present
 *
 * Creates:
 * - Trial subscription with subscription_type='trial'
 * - Initial session scheduled at the specified date/time
 *
 * @param data - Trial lesson creation data
 * @param schoolId - School ID for the trial
 * @returns Trial subscription ID
 */
export const createTrialLesson = async (
  data: CreateTrialLessonData,
  schoolId: string
): Promise<string> => {
  try {
    console.log('[TrialLesson] Creating trial lesson:', data);

    // Validation 1: Check if student already has a trial
    const existingTrial = await hasTrialLesson(data.studentId, schoolId);
    if (existingTrial) {
      const error = 'Student already has a trial lesson. Only one trial per student is allowed.';
      toast.error(error);
      throw new Error(error);
    }

    // Validation 2: Check required fields
    if (!data.scheduledDate || !data.scheduledTime) {
      throw new Error('Scheduled date and time are required for trial lessons');
    }

    if (data.priceAmount < 0) {
      throw new Error('Price amount cannot be negative');
    }

    // Combine date and time into schedule format
    const schedule = data.scheduleDay ? [{
      day: data.scheduleDay,
      time: data.scheduledTime
    }] : [];

    // Calculate end date (trials are always 1 month duration)
    const startDate = new Date(data.scheduledDate);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    // Prepare subscription data
    const subscriptionData = {
      student_id: data.studentId,
      school_id: schoolId,
      teacher_id: data.teacherId || null,
      subscription_type: 'trial',
      is_trial: true,
      session_count: 1, // Always 1 for trials
      duration_months: 1, // Always 1 for trials
      start_date: data.scheduledDate,
      end_date: endDate.toISOString().split('T')[0],
      schedule: schedule,
      price_mode: 'fixedPrice',
      total_price: data.priceAmount,
      currency: data.currency,
      status: 'active',
      trial_completed: false,
      notes: data.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('[TrialLesson] Inserting subscription:', subscriptionData);

    // Create the trial subscription in Supabase
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .insert(subscriptionData)
      .select()
      .single();

    if (subError) {
      console.error('[TrialLesson] Error creating subscription:', subError);
      throw subError;
    }

    console.log('[TrialLesson] Trial subscription created:', subscription.id);

    // Create the trial session
    const sessionData = {
      subscription_id: subscription.id,
      student_id: data.studentId,
      scheduled_date: data.scheduledDate,
      scheduled_time: data.scheduledTime,
      duration_minutes: data.durationMinutes || 30,
      status: 'scheduled',
      payment_status: data.priceAmount > 0 ? 'pending' : 'paid', // Free trials are marked as paid
      cost: data.priceAmount,
      notes: `Trial lesson - ${data.notes || ''}`,
      created_at: new Date().toISOString(),
      school_id: schoolId
    };

    console.log('[TrialLesson] Creating trial session:', sessionData);

    const { error: sessionError } = await supabase
      .from('sessions')
      .insert(sessionData);

    if (sessionError) {
      console.error('[TrialLesson] Error creating session:', sessionError);
      // Rollback subscription creation
      await supabase.from('subscriptions').delete().eq('id', subscription.id);
      throw sessionError;
    }

    console.log('[TrialLesson] Trial lesson created successfully');
    toast.success('Trial lesson scheduled successfully!');

    return subscription.id;
  } catch (error: any) {
    console.error('[TrialLesson] Error creating trial lesson:', error);
    toast.error(error.message || 'Failed to create trial lesson');
    throw error;
  }
};

/**
 * Complete a trial lesson
 * Marks the trial as completed and optionally stores feedback
 *
 * @param data - Trial completion data
 */
export const completeTrialLesson = async (data: CompleteTrialData): Promise<void> => {
  try {
    console.log('[TrialLesson] Completing trial:', data.trialSubscriptionId);

    // Update trial subscription
    const { error } = await supabase
      .from('subscriptions')
      .update({
        trial_completed: true,
        trial_completed_at: new Date().toISOString(),
        notes: data.teacherFeedback
          ? `Teacher Feedback: ${data.teacherFeedback}\nStudent Level: ${data.studentLevelAssessed || 'Not assessed'}\nRecommendation: ${data.recommendedAction || 'N/A'}`
          : undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', data.trialSubscriptionId)
      .eq('subscription_type', 'trial');

    if (error) {
      console.error('[TrialLesson] Error completing trial:', error);
      throw error;
    }

    // Mark the trial session as completed
    const { error: sessionError } = await supabase
      .from('sessions')
      .update({
        status: 'attended',
        updated_at: new Date().toISOString()
      })
      .eq('subscription_id', data.trialSubscriptionId);

    if (sessionError) {
      console.error('[TrialLesson] Error updating session status:', sessionError);
    }

    console.log('[TrialLesson] Trial completed successfully');
    toast.success('Trial lesson marked as completed');
  } catch (error: any) {
    console.error('[TrialLesson] Error in completeTrialLesson:', error);
    toast.error(error.message || 'Failed to complete trial lesson');
    throw error;
  }
};

/**
 * Convert a trial lesson to a regular subscription
 *
 * Creates a new subscription and links it to the trial
 *
 * @param data - Conversion data including new subscription details
 * @returns ID of the newly created subscription
 */
export const convertTrialToSubscription = async (
  data: ConvertTrialData,
  schoolId: string
): Promise<string> => {
  try {
    console.log('[TrialLesson] Converting trial to subscription:', data.trialSubscriptionId);

    // Get the trial subscription
    const { data: trialSub, error: trialError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', data.trialSubscriptionId)
      .eq('subscription_type', 'trial')
      .single();

    if (trialError || !trialSub) {
      throw new Error('Trial subscription not found');
    }

    // Check if already converted
    if (trialSub.converted_to_subscription_id) {
      throw new Error('Trial lesson has already been converted to a subscription');
    }

    // Calculate end date
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + data.durationMonths);

    // Create new regular subscription
    const newSubscriptionData = {
      student_id: trialSub.student_id,
      school_id: schoolId,
      teacher_id: data.teacherId || trialSub.teacher_id,
      subscription_type: 'individual', // Default to individual unless specified
      is_trial: false,
      session_count: data.sessionCount,
      duration_months: data.durationMonths,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      schedule: data.schedule,
      price_mode: data.priceMode,
      price_per_session: data.pricePerSession || null,
      fixed_price: data.fixedPrice || null,
      total_price: data.totalPrice,
      currency: data.currency,
      status: 'active',
      notes: data.notes ? `Converted from trial. ${data.notes}` : 'Converted from trial',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('[TrialLesson] Creating new subscription:', newSubscriptionData);

    // Insert new subscription
    const { data: newSub, error: newSubError } = await supabase
      .from('subscriptions')
      .insert(newSubscriptionData)
      .select()
      .single();

    if (newSubError) {
      console.error('[TrialLesson] Error creating new subscription:', newSubError);
      throw newSubError;
    }

    // Link trial to new subscription
    const { error: linkError } = await supabase
      .from('subscriptions')
      .update({
        converted_to_subscription_id: newSub.id,
        status: 'completed', // Mark trial as completed
        updated_at: new Date().toISOString()
      })
      .eq('id', data.trialSubscriptionId);

    if (linkError) {
      console.error('[TrialLesson] Error linking trial to subscription:', linkError);
      // Don't throw - the new subscription was created successfully
    }

    console.log('[TrialLesson] Trial converted successfully to subscription:', newSub.id);
    toast.success('Trial lesson converted to subscription successfully!');

    return newSub.id;
  } catch (error: any) {
    console.error('[TrialLesson] Error converting trial:', error);
    toast.error(error.message || 'Failed to convert trial to subscription');
    throw error;
  }
};

/**
 * Get trial lesson statistics for a school
 *
 * @param schoolId - School ID
 * @returns Trial lesson statistics
 */
export const getTrialLessonStats = async (schoolId: string): Promise<TrialLessonStats> => {
  try {
    console.log('[TrialLesson] Fetching stats for school:', schoolId);

    // Get all trials for the school
    const { data: trials, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('school_id', schoolId)
      .eq('subscription_type', 'trial');

    if (error) {
      console.error('[TrialLesson] Error fetching trial stats:', error);
      throw error;
    }

    const totalTrials = trials?.length || 0;
    const completedTrials = trials?.filter(t => t.trial_completed).length || 0;
    const convertedTrials = trials?.filter(t => t.converted_to_subscription_id).length || 0;
    const conversionRate = completedTrials > 0
      ? (convertedTrials / completedTrials) * 100
      : 0;
    const pendingConversions = trials?.filter(t =>
      t.trial_completed && !t.converted_to_subscription_id && t.status !== 'cancelled'
    ).length || 0;
    const revenueFromTrials = trials?.reduce((sum, t) => sum + (t.total_price || 0), 0) || 0;

    const stats: TrialLessonStats = {
      totalTrials,
      completedTrials,
      convertedTrials,
      conversionRate: Math.round(conversionRate * 10) / 10, // Round to 1 decimal
      revenueFromTrials,
      pendingConversions
    };

    console.log('[TrialLesson] Trial stats:', stats);
    return stats;
  } catch (error) {
    console.error('[TrialLesson] Error in getTrialLessonStats:', error);
    throw error;
  }
};

/**
 * Get a trial subscription by ID
 *
 * @param trialSubscriptionId - Trial subscription ID
 * @returns Trial subscription data
 */
export const getTrialLesson = async (
  trialSubscriptionId: string
): Promise<TrialSubscription | null> => {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', trialSubscriptionId)
      .eq('subscription_type', 'trial')
      .single();

    if (error) {
      console.error('[TrialLesson] Error fetching trial:', error);
      throw error;
    }

    return data as TrialSubscription;
  } catch (error) {
    console.error('[TrialLesson] Error in getTrialLesson:', error);
    return null;
  }
};

/**
 * Get all trial lessons for a student
 *
 * @param studentId - Student ID
 * @returns Array of trial subscriptions
 */
export const getStudentTrials = async (
  studentId: string
): Promise<TrialSubscription[]> => {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('student_id', studentId)
      .eq('subscription_type', 'trial')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[TrialLesson] Error fetching student trials:', error);
      throw error;
    }

    return (data || []) as TrialSubscription[];
  } catch (error) {
    console.error('[TrialLesson] Error in getStudentTrials:', error);
    return [];
  }
};

/**
 * Cancel a trial lesson
 *
 * @param trialSubscriptionId - Trial subscription ID
 */
export const cancelTrialLesson = async (trialSubscriptionId: string): Promise<void> => {
  try {
    console.log('[TrialLesson] Cancelling trial:', trialSubscriptionId);

    // Update subscription status
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', trialSubscriptionId)
      .eq('subscription_type', 'trial');

    if (error) {
      console.error('[TrialLesson] Error cancelling trial:', error);
      throw error;
    }

    // Cancel associated sessions
    const { error: sessionError } = await supabase
      .from('sessions')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('subscription_id', trialSubscriptionId);

    if (sessionError) {
      console.error('[TrialLesson] Error cancelling sessions:', sessionError);
    }

    console.log('[TrialLesson] Trial cancelled successfully');
    toast.success('Trial lesson cancelled');
  } catch (error: any) {
    console.error('[TrialLesson] Error in cancelTrialLesson:', error);
    toast.error(error.message || 'Failed to cancel trial lesson');
    throw error;
  }
};
