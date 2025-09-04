/**
 * Migration script to convert existing UTC dates to Cairo timezone
 * This script will update all existing transactions, sessions, and subscriptions
 * to use Cairo timezone instead of UTC
 */

import { supabase } from '@/integrations/supabase/client';
import { databaseService } from '@/services/firebase/database.service';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const CAIRO_TIMEZONE = 'Africa/Cairo';

// Get school ID from localStorage
const getSchoolId = () => {
  const userData = localStorage.getItem('user');
  if (!userData) return null;
  const user = JSON.parse(userData);
  return user.schoolId;
};

/**
 * Convert a UTC date string to Cairo timezone date string
 */
const convertUTCToCairo = (utcDateStr: string): string => {
  if (!utcDateStr) return utcDateStr;
  
  try {
    // Parse the UTC date
    const utcDate = new Date(utcDateStr);
    
    // Convert to Cairo timezone
    const cairoDate = toZonedTime(utcDate, CAIRO_TIMEZONE);
    
    // Format based on whether it includes time or not
    if (utcDateStr.includes('T') || utcDateStr.includes(' ')) {
      // DateTime format: YYYY-MM-DD HH:MM:SS
      return format(cairoDate, 'yyyy-MM-dd HH:mm:ss');
    } else {
      // Date only format: YYYY-MM-DD
      return format(cairoDate, 'yyyy-MM-dd');
    }
  } catch (error) {
    console.error('Error converting date:', utcDateStr, error);
    return utcDateStr; // Return original if conversion fails
  }
};

/**
 * Migrate Supabase transactions
 */
const migrateTransactions = async () => {
  console.log('🔄 Starting transaction migration...');
  
  try {
    // Fetch all transactions
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*');
    
    if (error) throw error;
    
    console.log(`📊 Found ${transactions?.length || 0} transactions to migrate`);
    
    // Update each transaction
    for (const transaction of transactions || []) {
      if (transaction.transaction_date) {
        const newDate = convertUTCToCairo(transaction.transaction_date);
        
        if (newDate !== transaction.transaction_date) {
          const { error: updateError } = await supabase
            .from('transactions')
            .update({ transaction_date: newDate })
            .eq('id', transaction.id);
          
          if (updateError) {
            console.error(`❌ Error updating transaction ${transaction.id}:`, updateError);
          } else {
            console.log(`✅ Updated transaction ${transaction.id}: ${transaction.transaction_date} → ${newDate}`);
          }
        }
      }
    }
    
    console.log('✅ Transaction migration complete');
  } catch (error) {
    console.error('❌ Error migrating transactions:', error);
  }
};

/**
 * Migrate Supabase lesson sessions
 */
const migrateLessonSessions = async () => {
  console.log('🔄 Starting lesson session migration...');
  
  try {
    // Fetch all lesson sessions
    const { data: sessions, error } = await supabase
      .from('lesson_sessions')
      .select('*');
    
    if (error) throw error;
    
    console.log(`📊 Found ${sessions?.length || 0} sessions to migrate`);
    
    // Update each session
    for (const session of sessions || []) {
      if (session.scheduled_date) {
        const newDate = convertUTCToCairo(session.scheduled_date);
        
        if (newDate !== session.scheduled_date) {
          const { error: updateError } = await supabase
            .from('lesson_sessions')
            .update({ scheduled_date: newDate })
            .eq('id', session.id);
          
          if (updateError) {
            console.error(`❌ Error updating session ${session.id}:`, updateError);
          } else {
            console.log(`✅ Updated session ${session.id}: ${session.scheduled_date} → ${newDate}`);
          }
        }
      }
    }
    
    console.log('✅ Lesson session migration complete');
  } catch (error) {
    console.error('❌ Error migrating lesson sessions:', error);
  }
};

/**
 * Migrate Supabase subscriptions
 */
const migrateSubscriptions = async () => {
  console.log('🔄 Starting subscription migration...');
  
  try {
    // Fetch all subscriptions
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('*');
    
    if (error) throw error;
    
    console.log(`📊 Found ${subscriptions?.length || 0} subscriptions to migrate`);
    
    // Update each subscription
    for (const subscription of subscriptions || []) {
      if (subscription.start_date) {
        const newDate = convertUTCToCairo(subscription.start_date);
        
        if (newDate !== subscription.start_date) {
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({ start_date: newDate })
            .eq('id', subscription.id);
          
          if (updateError) {
            console.error(`❌ Error updating subscription ${subscription.id}:`, updateError);
          } else {
            console.log(`✅ Updated subscription ${subscription.id}: ${subscription.start_date} → ${newDate}`);
          }
        }
      }
    }
    
    console.log('✅ Subscription migration complete');
  } catch (error) {
    console.error('❌ Error migrating subscriptions:', error);
  }
};

/**
 * Migrate Firebase sessions
 */
const migrateFirebaseSessions = async () => {
  console.log('🔄 Starting Firebase session migration...');
  
  const schoolId = getSchoolId();
  if (!schoolId) {
    console.error('❌ No school ID found');
    return;
  }
  
  try {
    // Fetch all sessions from Firebase
    const sessions = await databaseService.query('sessions', {
      where: [{ field: 'schoolId', operator: '==', value: schoolId }]
    });
    
    console.log(`📊 Found ${sessions?.length || 0} Firebase sessions to migrate`);
    
    // Update each session
    for (const session of sessions || []) {
      let updated = false;
      const updates: any = {};
      
      // Check and convert scheduledDate
      if (session.scheduledDate) {
        const newDate = convertUTCToCairo(session.scheduledDate);
        if (newDate !== session.scheduledDate) {
          updates.scheduledDate = newDate;
          updated = true;
        }
      }
      
      // Check and convert scheduled_date (snake_case)
      if (session.scheduled_date) {
        const newDate = convertUTCToCairo(session.scheduled_date);
        if (newDate !== session.scheduled_date) {
          updates.scheduled_date = newDate;
          updated = true;
        }
      }
      
      if (updated) {
        await databaseService.update('sessions', session.id, updates);
        console.log(`✅ Updated Firebase session ${session.id}:`, updates);
      }
    }
    
    console.log('✅ Firebase session migration complete');
  } catch (error) {
    console.error('❌ Error migrating Firebase sessions:', error);
  }
};

/**
 * Migrate Firebase subscriptions
 */
const migrateFirebaseSubscriptions = async () => {
  console.log('🔄 Starting Firebase subscription migration...');
  
  const schoolId = getSchoolId();
  if (!schoolId) {
    console.error('❌ No school ID found');
    return;
  }
  
  try {
    // Fetch all subscriptions from Firebase
    const subscriptions = await databaseService.query('subscriptions', {
      where: [{ field: 'schoolId', operator: '==', value: schoolId }]
    });
    
    console.log(`📊 Found ${subscriptions?.length || 0} Firebase subscriptions to migrate`);
    
    // Update each subscription
    for (const subscription of subscriptions || []) {
      let updated = false;
      const updates: any = {};
      
      // Check and convert startDate
      if (subscription.startDate) {
        const newDate = convertUTCToCairo(subscription.startDate);
        if (newDate !== subscription.startDate) {
          updates.startDate = newDate;
          updated = true;
        }
      }
      
      // Check and convert start_date (snake_case)
      if (subscription.start_date) {
        const newDate = convertUTCToCairo(subscription.start_date);
        if (newDate !== subscription.start_date) {
          updates.start_date = newDate;
          updated = true;
        }
      }
      
      if (updated) {
        await databaseService.update('subscriptions', subscription.id, updates);
        console.log(`✅ Updated Firebase subscription ${subscription.id}:`, updates);
      }
    }
    
    console.log('✅ Firebase subscription migration complete');
  } catch (error) {
    console.error('❌ Error migrating Firebase subscriptions:', error);
  }
};

/**
 * Main migration function
 */
export const runTimezoneMigration = async () => {
  console.log('🚀 Starting Cairo timezone migration...');
  console.log('⏰ Converting all dates from UTC to Africa/Cairo timezone');
  
  try {
    // Migrate Supabase data
    await migrateTransactions();
    await migrateLessonSessions();
    await migrateSubscriptions();
    
    // Migrate Firebase data
    await migrateFirebaseSessions();
    await migrateFirebaseSubscriptions();
    
    console.log('🎉 Migration complete! All dates have been converted to Cairo timezone.');
    console.log('📝 Note: Please refresh the page to see the updated dates.');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
};

// Export for use in console or as a button in the UI
(window as any).runTimezoneMigration = runTimezoneMigration;

console.log('💡 Timezone migration script loaded.');
console.log('📝 To run the migration, execute: runTimezoneMigration()');
console.log('⚠️  WARNING: This will update all dates in your database. Make sure to backup first!');