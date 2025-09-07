// Migration from Supabase to Firebase
// This file now exports the Firebase migration layer that mimics Supabase API

import { supabase as firebaseSupabase } from '@/services/migration/supabaseToFirebase';
import { auth } from '@/config/firebase';
import { authService } from '@/services/firebase/auth.service';
import { databaseService } from '@/services/firebase/database.service';
import { toZonedTime } from 'date-fns-tz';

// Re-export the Firebase migration layer as supabase
export const supabase = firebaseSupabase;

// Keep all the existing interfaces for compatibility
export interface StudentRecord {
  id: string;
  created_at?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  country_code?: string;
  countryCode?: string; // Support both camelCase and snake_case
  course_name: string;
  lesson_type: 'individual' | 'group';
  age_group: 'adult' | 'kid' | 'Adult' | 'Kid';
  level: string; // Allow any string to support custom levels like A1, A2, B1, etc.
  teacher_id?: string;
  school_id?: string;
  payment_status?: 'paid' | 'pending' | 'overdue';
  next_payment_date?: string;
  next_payment_amount?: number;
  lessons_count?: number;
  next_session_date?: string;
  subscription_progress?: string;
  parent_info?: {
    name: string;
    phone: string;
    countryCode: string;
    email: string;
    relationship: string;
  };
}

export interface CourseRecord {
  id: string;
  created_at?: string;
  name: string;
  type: 'individual' | 'group';
  school_id?: string;
}

export interface Course {
  id: string;
  school_id: string;
  name: string;
  lesson_type: 'individual' | 'group';
  created_at: string;
  updated_at: string;
}

export interface CreateStudentResponse {
  success: boolean;
  student_id?: string;
  user_id?: string;
  message?: string;
}

export interface UserLoginResponse {
  success: boolean;
  user_id?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  school_id?: string;
  message?: string;
}

export interface SchoolSetupResponse {
  success: boolean;
  school_id?: string;
  user_id?: string;
  message?: string;
}

export interface TeamMemberResponse {
  success: boolean;
  user_id?: string;
  message?: string;
}

export interface ContactType {
  id: string;
  school_id: string;
  name: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LessonSession {
  id: string;
  subscription_id: string;
  student_id: string;
  scheduled_date: string;
  scheduled_time?: string;
  scheduled_datetime?: string;
  duration_minutes: number;
  status: string;
  payment_status: string;
  cost: number;
  notes?: string;
  created_at: string;
  index_in_sub?: number;
  counts_toward_completion?: boolean;
  original_session_index?: number;
  moved_from_session_id?: string;
}

export interface Subscription {
  id: string;
  student_id: string;
  session_count: number;
  duration_months: number;
  start_date: string;
  schedule: any;
  price_mode: string;
  price_per_session?: number;
  fixed_price?: number;
  total_price: number;
  currency: string;
  notes?: string;
  status: string;
  created_at: string;
}

export interface PaymentRecord {
  id: string;
  created_at?: string;
  student_id: string;
  amount: number;
  currency: string;
  payment_date: string;
  payment_method: string;
  status: string;
  notes?: string;
}

export interface SchoolTag {
  id: string;
  created_at?: string;
  school_id: string;
  name: string;
  color: string;
}

export interface TransactionRecord {
  id: string;
  created_at?: string;
  school_id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  currency: string;
  transaction_date: string;
  description: string;
  notes?: string;
  contact_id?: string;
  category_id?: string;
  from_account_id?: string;
  to_account_id?: string;
  payment_method: string;
  receipt_number?: string;
  receipt_url?: string;
  tax_amount?: number;
  tax_rate?: number;
  is_recurring?: boolean;
  recurring_frequency?: string;
  recurring_end_date?: string;
}

export interface RpcResponse {
  success: boolean;
  message: string;
  [key: string]: any;
}

// Migrate all the existing functions to use Firebase

export const getStudentsWithDetails = async (schoolId: string | undefined) => {
  if (!schoolId) {
    return [];
  }

  try {
    const students = await databaseService.query('students', {
      where: [{ field: 'schoolId', operator: '==', value: schoolId }]
    });
    
    // Enrich with user data and subscription info
    const enrichedStudents = await Promise.all(students.map(async (student: any) => {
      // Skip if no userId
      let user = null;
      if (student.userId) {
        user = await databaseService.getById('users', student.userId);
      }
      
      // Fetch teacher data if teacherId exists
      let teacherFirstName = '';
      let teacherLastName = '';
      if (student.teacherId) {
        try {
          const teacher = await databaseService.getById('users', student.teacherId);
          if (teacher) {
            teacherFirstName = teacher.firstName || '';
            teacherLastName = teacher.lastName || '';
          }
        } catch (error) {
          console.warn(`Could not fetch teacher data for ID ${student.teacherId}:`, error);
        }
      }
      
      // Fetch active subscriptions for progress calculation
      let subscriptionProgress = '0/0';
      let nextSessionDate = null;
      let nextPaymentDate = null;  // Keep as null initially, don't default to today
      let nextPaymentAmount = null;
      let nextPaymentCurrency = null;
      let paymentStatus = 'overdue'; // Default payment status
      
      try {
        console.log(`🔍 Fetching subscriptions for student ${student.id}...`);
        
        // Get active subscriptions for this student
        const subscriptions = await databaseService.query('subscriptions', {
          where: [
            { field: 'student_id', operator: '==', value: student.id },
            { field: 'status', operator: '==', value: 'active' }
          ]
        });
        
        console.log(`📋 Found ${subscriptions?.length || 0} active subscriptions for student ${student.id}:`, subscriptions);
        
        if (subscriptions && subscriptions.length > 0) {
          // Use RPC function to get accurate session progress (same as subscription tab)
          try {
            console.log(`🔄 Calling RPC get_student_subscriptions for student ${student.id}...`);
            const { data: rpcSubscriptions, error: rpcError } = await supabase.rpc('get_student_subscriptions', {
              p_student_id: student.id
            });
            
            if (rpcError) {
              console.error(`❌ RPC Error for student ${student.id}:`, rpcError);
            }
            
            console.log(`📊 RPC Response for student ${student.id}:`, { data: rpcSubscriptions, error: rpcError });
            
            if (!rpcError && rpcSubscriptions && rpcSubscriptions.length > 0) {
              console.log(`📊 RPC Subscriptions for student ${student.id}:`, rpcSubscriptions);
              
              // Use RPC data which has the correct progress calculation
              let totalCompleted = 0;
              let totalSessions = 0;
              let earliestNextSession = null;
              let earliestNextPayment = null;
              let nextPaymentAmt = 0;
              let nextPaymentCurr = null;
              let totalPaid = 0;
              let totalPrice = 0;
              
              for (const rpcSub of rpcSubscriptions) {
                console.log(`📊 Processing subscription ${rpcSub.id}:`, rpcSub);
                // Use the pre-calculated sessions_completed from RPC - THIS WORKS PERFECTLY DON'T CHANGE
                totalCompleted += rpcSub.sessions_completed || 0;
                totalSessions += rpcSub.session_count || 0;
                totalPrice += rpcSub.total_price || 0;
                
                // Calculate total_paid manually like SubscriptionsTab does
                let subscriptionPaid = 0;
                
                try {
                  // Get payments from student_payments table
                  const { data: studentPayments, error: studentPaymentsError } = await supabase
                    .from('student_payments')
                    .select('amount')
                    .eq('student_id', student.id);
                  
                  const studentPaymentTotal = (studentPayments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0);
                  
                  // Get transaction payments for this subscription
                  let transactionPaymentTotal = 0;
                  try {
                    const transactions = await databaseService.query('transactions', {
                      where: [
                        { field: 'subscription_id', operator: '==', value: rpcSub.id },
                        { field: 'type', operator: '==', value: 'income' }
                      ]
                    });
                    transactionPaymentTotal = (transactions || []).reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
                  } catch (error) {
                    console.error('Error fetching transaction payments:', error);
                  }
                  
                  subscriptionPaid = studentPaymentTotal + transactionPaymentTotal;
                  totalPaid += subscriptionPaid;
                } catch (error) {
                  console.error('Error calculating payments for subscription:', rpcSub.id, error);
                }
                
                // Fetch sessions for this subscription to find next scheduled session
                try {
                  // Try both field names for compatibility
                  let sessions = await databaseService.query('sessions', {
                    where: [
                      { field: 'subscriptionId', operator: '==', value: rpcSub.id }
                    ]
                  });
                  
                  // If no results with camelCase, try snake_case
                  if (!sessions || sessions.length === 0) {
                    sessions = await databaseService.query('sessions', {
                      where: [
                        { field: 'subscription_id', operator: '==', value: rpcSub.id }
                      ]
                    });
                  }
                  
                  console.log(`📅 Sessions for subscription ${rpcSub.id}:`, sessions?.length || 0, sessions);
                  
                  if (sessions && sessions.length > 0) {
                    // Find next scheduled session (using sessions tab logic)
                    const upcomingSessions = sessions
                      .filter((s: any) => s.status === 'scheduled' && new Date(s.scheduled_date) >= new Date())
                      .sort((a: any, b: any) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime());
                    
                    if (upcomingSessions.length > 0) {
                      const nextSession = new Date(upcomingSessions[0].scheduled_date);
                      if (!earliestNextSession || nextSession < earliestNextSession) {
                        earliestNextSession = nextSession;
                      }
                    }
                    
                    // Calculate next payment based on last scheduled session (using finances logic)
                    // Match ExpectedPaymentsSection logic exactly
                    const validSessions = sessions.filter((s: any) => {
                      const scheduledDate = s.scheduledDate || s.scheduled_date;
                      if (!scheduledDate) return false;
                      const date = new Date(scheduledDate);
                      return !isNaN(date.getTime()) && s.status !== 'cancelled';
                    });
                    
                    const userTimezone = 'Africa/Cairo';
                    
                    if (validSessions.length > 0 && rpcSub.schedule) {
                      // Sort to get the last scheduled session (matching ExpectedPaymentsSection)
                      const sortedSessions = validSessions.sort((a: any, b: any) => {
                        const dateA = new Date(a.scheduledDate || a.scheduled_date);
                        const dateB = new Date(b.scheduledDate || b.scheduled_date);
                        return dateB.getTime() - dateA.getTime();
                      });
                      const lastSession = sortedSessions[0];
                      const lastSessionDateUTC = new Date(lastSession.scheduledDate || lastSession.scheduled_date);
                      
                      // Validate the date
                      if (!isNaN(lastSessionDateUTC.getTime())) {
                        // Convert to Cairo timezone
                        const lastSessionDate = toZonedTime(lastSessionDateUTC, userTimezone);
                        
                        // Get schedule day (matching ExpectedPaymentsSection)
                        const schedule = Array.isArray(rpcSub.schedule) ? rpcSub.schedule[0] : rpcSub.schedule;
                        const scheduledDay = schedule?.day;
                        
                        if (scheduledDay) {
                          const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                          const targetDayIndex = daysOfWeek.indexOf(scheduledDay);
                          
                          if (targetDayIndex !== -1) {
                            // Start from the day after the last session (in Cairo timezone)
                            let nextPaymentDate = new Date(lastSessionDate);
                            nextPaymentDate.setDate(nextPaymentDate.getDate() + 1);
                            
                            // Find the next occurrence of the target day
                            while (nextPaymentDate.getDay() !== targetDayIndex) {
                              nextPaymentDate.setDate(nextPaymentDate.getDate() + 1);
                            }
                            
                            if (!earliestNextPayment || nextPaymentDate < earliestNextPayment) {
                              earliestNextPayment = nextPaymentDate;
                              // For next payment, always show the full subscription price
                              nextPaymentAmt = rpcSub.total_price || 0;
                              nextPaymentCurr = rpcSub.currency || 'RUB';
                            }
                          }
                        }
                      }
                    } else if (validSessions.length === 0 && rpcSub.schedule) {
                      // If no sessions yet, set payment date to today (in Cairo timezone)
                      const today = toZonedTime(new Date(), userTimezone);
                      
                      if (!earliestNextPayment || today < earliestNextPayment) {
                        earliestNextPayment = today;
                        nextPaymentAmt = rpcSub.total_price || 0;
                        nextPaymentCurr = rpcSub.currency || 'RUB';
                      }
                    }
                  }
                } catch (error) {
                  console.error('Error fetching sessions for subscription:', rpcSub.id, error);
                }
              }
              
              // Keep progress calculation EXACTLY as is - IT WORKS PERFECTLY
              subscriptionProgress = `${totalCompleted}/${totalSessions}`;
              
              // Format next session date
              if (earliestNextSession) {
                // Format as short date like in SessionsTab
                const formatDate = (date: Date) => {
                  const today = new Date();
                  const tomorrow = new Date(today);
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  
                  if (date.toDateString() === today.toDateString()) {
                    return 'Today';
                  } else if (date.toDateString() === tomorrow.toDateString()) {
                    return 'Tomorrow';
                  } else {
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  }
                };
                nextSessionDate = formatDate(earliestNextSession);
              } else {
                nextSessionDate = null;
              }
              
              nextPaymentDate = earliestNextPayment ? earliestNextPayment.toISOString() : null;
              nextPaymentAmount = nextPaymentAmt;
              nextPaymentCurrency = nextPaymentCurr;
              
              console.log(`💰 Next payment for student ${student.id}:`, {
                earliestNextPayment,
                nextPaymentDate,
                nextPaymentAmount,
                nextPaymentCurrency
              });
              
              // Calculate payment status using subscription tab logic
              if (totalPrice > 0) {
                const paymentPercentage = (totalPaid / totalPrice) * 100;
                if (paymentPercentage >= 100) {
                  paymentStatus = 'paid';
                } else if (paymentPercentage > 0) {
                  paymentStatus = 'partial';
                } else {
                  paymentStatus = 'overdue';
                }
              }
            } else {
              // Fallback to manual calculation if RPC fails
              console.log('❗ RPC failed or returned no data, falling back to direct session query');
              
              // Directly query sessions for this student to calculate next payment like ExpectedPaymentsSection
              try {
                // First try to find ANY subscription for this student
                const anySubscriptions = await databaseService.query('subscriptions', {
                  where: [
                    { field: 'student_id', operator: '==', value: student.id }
                  ]
                });
                
                console.log(`🔍 Found ${anySubscriptions?.length || 0} total subscriptions for student ${student.id}`);
                
                if (anySubscriptions && anySubscriptions.length > 0) {
                  // Get the active subscription or the most recent one
                  const activeSubscription = anySubscriptions.find((s: any) => s.status === 'active') || anySubscriptions[0];
                  
                  if (activeSubscription) {
                    console.log(`📋 Using subscription ${activeSubscription.id} for payment calculation`);
                    
                    // Query sessions for this subscription
                    const sessions = await databaseService.query('sessions', {
                      where: [
                        { field: 'subscription_id', operator: '==', value: activeSubscription.id }
                      ]
                    });
                    
                    const validSessions = sessions?.filter((s: any) => s.status !== 'cancelled') || [];
                    console.log(`📅 Found ${validSessions.length} valid sessions`);
                    
                    if (validSessions.length > 0) {
                      // Find the last session
                      const sortedSessions = validSessions.sort((a: any, b: any) => {
                        const dateA = new Date(a.scheduled_date || a.scheduledDate);
                        const dateB = new Date(b.scheduled_date || b.scheduledDate);
                        return dateB.getTime() - dateA.getTime();
                      });
                      
                      const lastSession = sortedSessions[0];
                      const lastSessionDateUTC = new Date(lastSession.scheduled_date || lastSession.scheduledDate);
                      
                      // Convert to Cairo timezone
                      const userTimezone = 'Africa/Cairo';
                      const lastSessionDate = toZonedTime(lastSessionDateUTC, userTimezone);
                      
                      console.log(`📅 Last session date: ${lastSessionDate.toISOString()}`);
                      
                      // Calculate next payment date using schedule
                      const schedule = activeSubscription.schedule;
                      if (schedule) {
                        const firstSchedule = Array.isArray(schedule) ? schedule[0] : schedule;
                        const scheduledDay = firstSchedule.day;
                        
                        if (scheduledDay) {
                          const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                          const targetDayIndex = daysOfWeek.indexOf(scheduledDay);
                          
                          if (targetDayIndex !== -1) {
                            // Start from the day after the last session
                            let calcNextPayment = new Date(lastSessionDate);
                            calcNextPayment.setDate(calcNextPayment.getDate() + 1);
                            
                            // Find the next occurrence of the target day
                            while (calcNextPayment.getDay() !== targetDayIndex) {
                              calcNextPayment.setDate(calcNextPayment.getDate() + 1);
                            }
                            
                            nextPaymentDate = calcNextPayment.toISOString();
                            nextPaymentAmount = activeSubscription.total_price || activeSubscription.totalPrice || 0;
                            nextPaymentCurrency = activeSubscription.currency || 'RUB';
                            
                            console.log(`💰 Calculated next payment: ${nextPaymentDate}, Amount: ${nextPaymentAmount} ${nextPaymentCurrency}`);
                          }
                        }
                      }
                    } else {
                      // No sessions yet, payment is due today
                      const today = toZonedTime(new Date(), 'Africa/Cairo');
                      nextPaymentDate = today.toISOString();
                      nextPaymentAmount = activeSubscription.total_price || activeSubscription.totalPrice || 0;
                      nextPaymentCurrency = activeSubscription.currency || 'RUB';
                      
                      console.log(`💰 No sessions yet, payment due today: ${nextPaymentAmount} ${nextPaymentCurrency}`);
                    }
                    
                    // Calculate subscription progress
                    subscriptionProgress = `${validSessions.filter((s: any) => s.status === 'completed').length}/${activeSubscription.session_count || activeSubscription.sessionCount || 0}`;
                  }
                }
              } catch (fallbackError) {
                console.error('❌ Fallback calculation error:', fallbackError);
              }
              
              // Keep existing manual calculation logic as secondary fallback
              let totalCompleted = 0;
              let totalSessions = 0;
              let earliestNextSession = null;
              let earliestNextPayment = null;
              let nextPaymentAmt = 0;
              let nextPaymentCurr = null;
              let totalPaid = 0;
              let totalPrice = 0;
              
              for (const subscription of subscriptions) {
                // Add subscription session count even if no sessions exist yet
                if (subscription.session_count && subscription.session_count > 0) {
                  totalSessions += subscription.session_count;
                }
                
                // Get sessions for this subscription
                const sessions = await databaseService.query('sessions', {
                  where: [
                    { field: 'subscription_id', operator: '==', value: subscription.id }
                  ]
                });
                
                // Fetch payments for this subscription to calculate payment status
                try {
                  const transactions = await databaseService.query('transactions', {
                    where: [
                      { field: 'subscription_id', operator: '==', value: subscription.id },
                      { field: 'type', operator: '==', value: 'income' }
                    ]
                  });
                  
                  const subscriptionPaid = transactions ? transactions.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) : 0;
                  totalPaid += subscriptionPaid;
                  totalPrice += subscription.total_price || 0;
                } catch (error) {
                  console.error('Error fetching payments for subscription:', subscription.id, error);
                }
                
                if (sessions) {
                  // Count completed sessions (attended status)
                  const completedSessions = sessions.filter((s: any) => s.status === 'attended').length;
                  totalCompleted += completedSessions;
                  
                  // If we didn't already add session_count above (for subscriptions without sessions yet)
                  if (!subscription.session_count || subscription.session_count === 0) {
                    // Use actual session count if subscription doesn't have session_count set
                    totalSessions += sessions.length;
                  }
                  
                  // Find next scheduled session
                  const upcomingSessions = sessions
                    .filter((s: any) => s.status === 'scheduled' && new Date(s.scheduled_date) > new Date())
                    .sort((a: any, b: any) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime());
                  
                  if (upcomingSessions.length > 0) {
                    const nextSession = new Date(upcomingSessions[0].scheduled_date);
                    if (!earliestNextSession || nextSession < earliestNextSession) {
                      earliestNextSession = nextSession;
                    }
                  }
                  
                  // Calculate next payment based on last session
                  const lastScheduledSession = sessions
                    .filter((s: any) => s.scheduled_date)
                    .sort((a: any, b: any) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime())[0];
                  
                  if (lastScheduledSession && subscription.schedule) {
                    const schedule = Array.isArray(subscription.schedule) ? subscription.schedule[0] : subscription.schedule;
                    if (schedule && schedule.day) {
                      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                      const targetDayIndex = daysOfWeek.indexOf(schedule.day);
                      
                      if (targetDayIndex !== -1) {
                        let nextPayment = new Date(lastScheduledSession.scheduled_date);
                        nextPayment.setDate(nextPayment.getDate() + 1);
                        
                        while (nextPayment.getDay() !== targetDayIndex) {
                          nextPayment.setDate(nextPayment.getDate() + 1);
                        }
                        
                        if (!earliestNextPayment || nextPayment < earliestNextPayment) {
                          earliestNextPayment = nextPayment;
                          nextPaymentAmt = subscription.price_per_session || subscription.total_price || 0;
                          nextPaymentCurr = subscription.currency || 'USD';
                        }
                      }
                    }
                  }
                }
              }
              
              // Calculate payment status based on total payments
              if (totalPrice > 0) {
                const paymentPercentage = (totalPaid / totalPrice) * 100;
                if (paymentPercentage >= 100) {
                  paymentStatus = 'paid';
                } else if (paymentPercentage > 0) {
                  paymentStatus = 'partial';
                } else {
                  paymentStatus = 'overdue';
                }
                
                // Keep overdue status for unpaid or check if partially paid is late
                if (paymentStatus === 'partial' && earliestNextPayment && new Date(earliestNextPayment) < new Date()) {
                  paymentStatus = 'overdue';
                }
              }
              
              subscriptionProgress = `${totalCompleted}/${totalSessions}`;
              nextSessionDate = earliestNextSession ? earliestNextSession.toISOString() : null;
              nextPaymentDate = earliestNextPayment ? earliestNextPayment.toISOString() : null;
              nextPaymentAmount = nextPaymentAmt;
              nextPaymentCurrency = nextPaymentCurr;
            }
          } catch (error) {
            console.error('Error using RPC for student subscriptions:', error);
          }
        }
      } catch (error) {
        console.error('Error fetching subscription data for student:', student.id, error);
      }
      
      // Map the fields correctly for the UI
      // For bulk-uploaded students, use the data directly from student record
      return {
        ...student,
        first_name: student.firstName || user?.firstName || '',
        last_name: student.lastName || user?.lastName || '',
        email: student.email || user?.email || '',
        phone: student.phone || user?.phoneNumber || '',
        countryCode: student.countryCode || student.country_code || '',
        course_name: student.courseName || '',
        lesson_type: student.lessonType || 'individual',
        age_group: student.ageGroup || 'adult',
        level: student.level || '',
        teacher_id: student.teacherId || '',
        teacher_first_name: teacherFirstName,
        teacher_last_name: teacherLastName,
        payment_status: paymentStatus, // Use calculated payment status
        lessons_count: student.totalLessonsTaken || 0,
        next_session_date: nextSessionDate,
        next_payment_date: nextPaymentDate,
        next_payment_amount: nextPaymentAmount,
        next_payment_currency: nextPaymentCurrency,
        subscription_progress: subscriptionProgress,
        user_id: student.userId || '',
        parent_info: student.parentInfo || student.parent_info || null,
        // Additional info fields
        social_links: student.socialLinks || student.social_links || [],
        birthday: student.birthday || null,
        teacher_preference: student.teacherPreference || student.teacher_preference || 'any',
        additional_notes: student.additionalNotes || student.additional_notes || '',
        interests: student.interests || []
      };
    }));
    
    return enrichedStudents;
  } catch (error) {
    console.error('Error fetching students:', error);
    throw error;
  }
};

export const createStudent = async (studentData: {
  student_email?: string;  // Made optional
  student_password?: string;  // Made optional
  first_name: string;
  last_name: string;
  teacher_id: string;
  course_id: string;
  course_name?: string;
  age_group: string;
  level: string;
  lesson_type?: string;
  phone?: string;
  parent_info?: any;  // Added parent_info
  [key: string]: any;  // Allow additional fields
}): Promise<CreateStudentResponse> => {
  console.log('[createStudent] Received student data:', studentData);
  console.log('[createStudent] Age group:', studentData.age_group);
  console.log('[createStudent] Parent info:', studentData.parent_info);
  
  try {
    // Get schoolId from the user object, not from a separate localStorage item
    const userData = localStorage.getItem('user');
    const user = userData ? JSON.parse(userData) : null;
    const schoolId = user?.schoolId || '';
    
    if (!schoolId) {
      console.error('No schoolId found in user object');
      return {
        success: false,
        message: 'School ID not found. Please log in again.'
      };
    }
    
    // If email is provided, create a full user account
    if (studentData.student_email && studentData.student_password) {
      // Build the student data object conditionally
      const authStudentData: any = {
        teacherId: studentData.teacher_id,
        courseId: studentData.course_id,
        courseName: studentData.course_name,
        lessonType: studentData.lesson_type || 'individual',
        ageGroup: studentData.age_group as any,
        level: studentData.level as any
      };
      
      // Only add parent_info if it exists and is not null
      if (studentData.parent_info !== null && studentData.parent_info !== undefined) {
        authStudentData.parent_info = studentData.parent_info;
      }
      
      // Add phone if provided
      if (studentData.phone) {
        authStudentData.phone = studentData.phone;
      }
      
      console.log('[createStudent] Calling authService.createStudent with:', authStudentData);
      
      const uid = await authService.createStudent(
        {
          email: studentData.student_email,
          password: studentData.student_password,
          firstName: studentData.first_name,
          lastName: studentData.last_name,
          role: 'student',
          schoolId: schoolId
        },
        authStudentData
      );

      return {
        success: true,
        student_id: uid,
        user_id: uid
      };
    } else {
      // Create student without user account (similar to bulk upload)
      const studentId = Date.now().toString(); // Generate unique ID
      
      const studentRecord: any = {
        firstName: studentData.first_name,
        lastName: studentData.last_name,
        schoolId: schoolId,
        teacherId: studentData.teacher_id,
        courseId: studentData.course_id,
        course_name: studentData.course_name,
        lesson_type: studentData.lesson_type || 'individual',
        age_group: studentData.age_group,
        level: studentData.level,
        payment_status: 'pending',
        created_at: new Date().toISOString(),
        status: 'active'
      };
      
      // Add optional fields
      if (studentData.phone) {
        studentRecord.phone = studentData.phone;
      }
      // Only add parent_info if it exists and is not null
      if (studentData.parent_info !== null && studentData.parent_info !== undefined) {
        studentRecord.parent_info = studentData.parent_info;
      }
      if (studentData.countryCode) {
        studentRecord.country_code = studentData.countryCode;
      }
      if (studentData.income_category_id) {
        studentRecord.income_category_id = studentData.income_category_id;
      }
      
      // Create the student record in Firebase
      await databaseService.create('students', studentRecord, studentId);
      
      return {
        success: true,
        student_id: studentId,
        user_id: null  // No user account created
      };
    }
  } catch (error: any) {
    console.error('Error creating student:', error);
    return {
      success: false,
      message: error.message
    };
  }
};

export const updateStudent = async (id: string, updates: Partial<StudentRecord>) => {
  try {
    console.log('Updating student with ID:', id);
    console.log('Updates to apply:', updates);
    
    // Ensure we have a valid student ID
    if (!id) {
      throw new Error('Student ID is required for update');
    }
    
    // Check if the student exists first
    const existingStudent = await databaseService.getById('students', id);
    if (!existingStudent) {
      throw new Error(`Student with ID ${id} not found`);
    }
    
    // Separate user fields from student fields
    const userFields: any = {};
    const studentFields: any = {};
    
    // Fields that belong to the users collection
    if (updates.first_name !== undefined) {
      userFields.firstName = updates.first_name;
    }
    if (updates.last_name !== undefined) {
      userFields.lastName = updates.last_name;
    }
    if (updates.email !== undefined) {
      userFields.email = updates.email;
    }
    
    // All other fields belong to the students collection
    // Map camelCase to snake_case for Firebase consistency
    const camelToSnakeMap: Record<string, string> = {
      'parentInfo': 'parent_info',
      'socialLinks': 'social_links',
      'teacherPreference': 'teacher_preference',
      'additionalNotes': 'additional_notes',
      'lessonType': 'lesson_type',
      'ageGroup': 'age_group',
      'courseName': 'course_name',
      'teacherId': 'teacher_id',
      'paymentStatus': 'payment_status',
      'countryCode': 'country_code',
      'income_category_id': 'income_category_id' // Already snake_case, keep as is
    };
    
    Object.keys(updates).forEach(key => {
      if (!['first_name', 'last_name', 'email'].includes(key)) {
        // Use mapped snake_case key if available, otherwise use original key
        const fieldKey = camelToSnakeMap[key] || key;
        studentFields[fieldKey] = (updates as any)[key];
        
        // Log parent info specifically for debugging
        if (key === 'parentInfo' || key === 'parent_info') {
          console.log(`Mapping ${key} to ${fieldKey}:`, (updates as any)[key]);
        }
      }
    });
    
    // Update user document if there are user fields to update AND a user document exists
    if (Object.keys(userFields).length > 0) {
      const userId = existingStudent.userId || id; // Use userId if available, otherwise assume id is userId
      console.log('Checking if user document exists:', userId);
      
      // Check if user document exists before trying to update
      const userDoc = await databaseService.getById('users', userId);
      if (userDoc) {
        console.log('Updating user document:', userId, userFields);
        await databaseService.update('users', userId, userFields);
      } else {
        console.log('No user document found for student, skipping user fields update');
        // For bulk-uploaded students, we can store these fields directly in the student document
        // Only add fields that have values (not undefined)
        if (userFields.firstName !== undefined) {
          studentFields.firstName = userFields.firstName;
        }
        if (userFields.lastName !== undefined) {
          studentFields.lastName = userFields.lastName;
        }
        if (userFields.email !== undefined && userFields.email !== '') {
          studentFields.email = userFields.email;
        }
      }
    }
    
    // Update student document
    if (Object.keys(studentFields).length > 0) {
      // Remove any undefined values to avoid Firebase errors
      const cleanedStudentFields = Object.entries(studentFields).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as any);
      
      console.log('Updating student document:', id, cleanedStudentFields);
      await databaseService.update('students', id, cleanedStudentFields);
    }
    
    console.log('Student updated successfully');
    return { id, ...updates };
  } catch (error) {
    console.error('Error updating student:', error);
    throw error;
  }
};

export const deleteStudent = async (id: string) => {
  try {
    await databaseService.delete('students', id);
    return { success: true };
  } catch (error) {
    console.error('Error deleting student:', error);
    throw error;
  }
};

export const getCourses = async (schoolId: string | undefined) => {
  if (!schoolId) {
    console.warn('No school ID provided to getCourses');
    return [];
  }

  try {
    return await databaseService.query('courses', {
      where: [{ field: 'schoolId', operator: '==', value: schoolId }]
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    throw error;
  }
};

export const getSchoolCourses = async (schoolId: string): Promise<Course[]> => {
  return getCourses(schoolId) as Promise<Course[]>;
};

export const getSchoolTeachers = async (schoolId: string) => {
  try {
    const teachers = await databaseService.query('users', {
      where: [
        { field: 'schoolId', operator: '==', value: schoolId },
        { field: 'role', operator: 'in', value: ['teacher', 'admin'] }
      ]
    });
    
    return teachers.map((teacher: any) => ({
      ...teacher,
      display_name: `${teacher.firstName} ${teacher.lastName}`,
      first_name: teacher.firstName,
      last_name: teacher.lastName
    }));
  } catch (error) {
    console.error('Error fetching school teachers:', error);
    throw error;
  }
};

export const updateCourse = async (courseId: string, name: string, lessonType: string) => {
  try {
    await databaseService.update('courses', courseId, {
      name,
      lesson_type: lessonType
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating course:', error);
    throw error;
  }
};

export const deleteCourse = async (courseId: string) => {
  try {
    await databaseService.delete('courses', courseId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting course:', error);
    throw error;
  }
};

export const createCourse = async (name: string, type: 'individual' | 'group') => {
  const userData = localStorage.getItem('user');
  const user = userData ? JSON.parse(userData) : null;

  if (!user || !user.schoolId) {
    throw new Error('Authentication required to create a course.');
  }

  try {
    const courseId = await databaseService.create('courses', {
      name,
      lesson_type: type,
      schoolId: user.schoolId
    });
    
    return { id: courseId, success: true };
  } catch (error) {
    console.error('Error creating course:', error);
    throw error;
  }
};

export const getStudentPayments = async (studentId: string) => {
  try {
    return await databaseService.query('transactions', {
      where: [
        { field: 'studentId', operator: '==', value: studentId },
        { field: 'type', operator: '==', value: 'income' }
      ],
      orderBy: [{ field: 'transactionDate', direction: 'desc' }]
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    throw error;
  }
};

export const addStudentPayment = async (paymentData: any) => {
  try {
    const paymentId = await databaseService.create('transactions', {
      ...paymentData,
      type: 'income'
    });
    return { id: paymentId, ...paymentData };
  } catch (error) {
    console.error('Error adding payment:', error);
    throw error;
  }
};

export const deleteStudentPayment = async (paymentId: string) => {
  try {
    await databaseService.delete('transactions', paymentId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting payment:', error);
    throw error;
  }
};

export const createPayment = async (paymentData: Omit<PaymentRecord, 'id' | 'created_at'>) => {
  return addStudentPayment(paymentData);
};

export const updatePayment = async (id: string, updates: Partial<PaymentRecord>) => {
  try {
    await databaseService.update('transactions', id, updates);
    return { id, ...updates };
  } catch (error) {
    console.error('Error updating payment:', error);
    throw error;
  }
};

export const deletePayment = async (id: string) => {
  return deleteStudentPayment(id);
};

export const getCurrentUserInfo = async () => {
  const userData = localStorage.getItem('user');
  if (!userData) {
    return [];
  }

  const user = JSON.parse(userData);
  const schoolId = user.schoolId;
  const role = user.role;

  if (!schoolId) {
    return [];
  }

  return [{
    user_school_id: schoolId,
    user_role: role
  }];
};

export const getSchoolTags = async (schoolId: string | undefined) => {
  if (!schoolId) {
    console.warn('No school ID provided to getSchoolTags');
    return [];
  }

  try {
    return await databaseService.query('transactionCategories', {
      where: [{ field: 'schoolId', operator: '==', value: schoolId }]
    });
  } catch (error) {
    console.error('Error fetching school tags:', error);
    throw error;
  }
};

export const createSchoolTag = async (tagData: Omit<SchoolTag, 'id' | 'created_at'>) => {
  try {
    const tagId = await databaseService.create('transactionCategories', tagData);
    return { id: tagId, ...tagData };
  } catch (error) {
    console.error('Error creating school tag:', error);
    throw error;
  }
};

export const updateSchoolTag = async (id: string, updates: Partial<SchoolTag>) => {
  try {
    await databaseService.update('transactionCategories', id, updates);
    return { id, ...updates };
  } catch (error) {
    console.error('Error updating school tag:', error);
    throw error;
  }
};

export const deleteSchoolTag = async (id: string) => {
  try {
    await databaseService.delete('transactionCategories', id);
    return { success: true };
  } catch (error) {
    console.error('Error deleting school tag:', error);
    throw error;
  }
};

export const getSchoolContactTypes = async (schoolId: string): Promise<ContactType[]> => {
  try {
    return await databaseService.query('contactTypes', {
      where: [
        { field: 'schoolId', operator: '==', value: schoolId },
        { field: 'is_active', operator: '==', value: true }
      ]
    });
  } catch (error) {
    console.error('Error fetching contact types:', error);
    throw error;
  }
};

export const createContactType = async (schoolId: string, name: string, color: string) => {
  try {
    const id = await databaseService.create('contactTypes', {
      schoolId,
      name,
      color,
      is_active: true
    });
    return { id, schoolId, name, color };
  } catch (error) {
    console.error('Error creating contact type:', error);
    throw error;
  }
};

export const updateContactType = async (id: string, name: string, color: string) => {
  try {
    await databaseService.update('contactTypes', id, { name, color });
    return { id, name, color };
  } catch (error) {
    console.error('Error updating contact type:', error);
    throw error;
  }
};

export const deleteContactType = async (id: string) => {
  try {
    await databaseService.delete('contactTypes', id);
    return { success: true };
  } catch (error) {
    console.error('Error deleting contact type:', error);
    throw error;
  }
};

export const getStudentLessonSessions = async (studentId: string): Promise<LessonSession[]> => {
  try {
    console.log('Fetching lesson sessions for student:', studentId);
    
    // Use Supabase RPC call to get sessions from migration layer
    const { data, error } = await supabase.rpc('get_lesson_sessions', {
      p_student_id: studentId
    });
    
    if (error) {
      console.error('Error fetching lesson sessions:', error);
      throw error;
    }
    
    console.log(`Found ${data?.length || 0} sessions for student ${studentId}`);
    
    // Sort in memory by scheduled_date descending
    return (data || []).sort((a: any, b: any) => {
      const dateA = new Date(a.scheduled_date || a.scheduledDate || a.created_at);
      const dateB = new Date(b.scheduled_date || b.scheduledDate || b.created_at);
      return dateB.getTime() - dateA.getTime(); // Descending order
    });
  } catch (error) {
    console.error('Error fetching lesson sessions:', error);
    throw error;
  }
};

export const handleSessionAction = async (sessionId: string, action: string, newDatetime?: string) => {
  try {
    // Use the RPC function to handle session actions properly
    const { data, error } = await supabase.rpc('handle_session_action', {
      p_session_id: sessionId,
      p_action: action,
      p_new_datetime: newDatetime
    });
    
    if (error) {
      console.error('Error handling session action:', error);
      throw error;
    }
    
    return data || { success: true, message: `Session ${action} successfully` };
  } catch (error) {
    console.error('Error handling session action:', error);
    throw error;
  }
};

export const getStudentSubscriptions = async (studentId: string): Promise<Subscription[]> => {
  try {
    console.log('Fetching subscriptions for student:', studentId);
    
    // Use Supabase RPC call to get subscriptions from migration layer
    const { data, error } = await supabase.rpc('get_student_subscriptions', {
      p_student_id: studentId
    });
    
    if (error) {
      console.error('Error fetching subscriptions:', error);
      throw error;
    }
    
    console.log(`Found ${data?.length || 0} subscriptions for student ${studentId}`);
    
    return data || [];
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    throw error;
  }
};

export const addStudentSubscription = async (subscriptionData: any) => {
  try {
    const subscriptionId = await databaseService.create('subscriptions', {
      studentId: subscriptionData.student_id,
      sessionCount: subscriptionData.session_count,
      durationMonths: subscriptionData.duration_months,
      startDate: subscriptionData.start_date,
      schedule: subscriptionData.schedule,
      priceMode: subscriptionData.price_mode,
      pricePerSession: subscriptionData.price_per_session,
      fixedPrice: subscriptionData.fixed_price,
      totalPrice: subscriptionData.total_price,
      currency: subscriptionData.currency,
      notes: subscriptionData.notes,
      status: subscriptionData.status,
      schoolId: localStorage.getItem('schoolId')
    });

    // If there's an initial payment, create a transaction
    if (subscriptionData.initial_payment_amount > 0) {
      await databaseService.create('transactions', {
        type: 'income',
        amount: subscriptionData.initial_payment_amount,
        currency: subscriptionData.currency,
        transactionDate: new Date().toISOString(),
        description: 'Initial subscription payment',
        paymentMethod: subscriptionData.payment_method || 'Cash',
        notes: subscriptionData.payment_notes || '',
        studentId: subscriptionData.student_id,
        subscriptionId,
        schoolId: localStorage.getItem('schoolId')
      });
    }

    return { id: subscriptionId, success: true };
  } catch (error) {
    console.error('Error adding subscription:', error);
    throw error;
  }
};

export const deleteStudentSubscriptionEnhanced = async (subscriptionId: string) => {
  try {
    // Delete related sessions first
    const sessions = await databaseService.query('sessions', {
      where: [{ field: 'subscriptionId', operator: '==', value: subscriptionId }]
    });
    
    for (const session of sessions) {
      await databaseService.delete('sessions', session.id);
    }
    
    // Delete the subscription
    await databaseService.delete('subscriptions', subscriptionId);
    
    return { success: true, message: 'Subscription deleted successfully' };
  } catch (error) {
    console.error('Error deleting subscription:', error);
    throw error;
  }
};

export const deleteStudentSubscription = deleteStudentSubscriptionEnhanced;

export const updateStudentSubscriptionEnhanced = async (
  subscriptionId: string,
  subscriptionData: any
) => {
  try {
    await databaseService.update('subscriptions', subscriptionId, {
      sessionCount: subscriptionData.sessionCount,
      durationMonths: subscriptionData.durationMonths,
      startDate: subscriptionData.startDate.toISOString().split('T')[0],
      schedule: subscriptionData.schedule,
      priceMode: subscriptionData.priceMode,
      pricePerSession: subscriptionData.pricePerSession,
      fixedPrice: subscriptionData.fixedPrice,
      totalPrice: subscriptionData.totalPrice,
      currency: subscriptionData.currency,
      notes: subscriptionData.notes,
      status: subscriptionData.status
    });
    
    return { success: true, message: 'Subscription updated successfully' };
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
};

export const getTeamMembers = async (schoolId: string) => {
  try {
    // Fetch all users with the schoolId
    const allUsers = await databaseService.query('users', {
      where: [{ field: 'schoolId', operator: '==', value: schoolId }]
    });
    
    // Filter out students - only return teachers, admins, managers, etc.
    const teamMembers = allUsers.filter((user: any) => {
      return user.role && user.role !== 'student';
    });
    
    // Map fields to match UI expectations
    const mappedTeamMembers = teamMembers.map((member: any) => ({
      id: member.id || member.uid,
      first_name: member.firstName || member.first_name,
      last_name: member.lastName || member.last_name,
      email: member.email,
      role: member.role,
      created_at: member.createdAt || member.created_at
    }));
    
    return mappedTeamMembers;
  } catch (error) {
    console.error('Error fetching team members:', error);
    throw error;
  }
};

export const getSchoolTransactions = async (schoolId: string | undefined) => {
  if (!schoolId) {
    console.warn('No school ID provided to getSchoolTransactions');
    return [];
  }

  try {
    // First get all transactions for the school without ordering
    // Firebase requires an index for compound queries with orderBy on multiple fields
    const transactions = await databaseService.query('transactions', {
      where: [{ field: 'school_id', operator: '==', value: schoolId }]
    });
    
    // Sort in memory to avoid Firebase index requirement
    const sortedTransactions = transactions.sort((a: any, b: any) => {
      const dateA = new Date(a.transaction_date || a.transactionDate || a.created_at);
      const dateB = new Date(b.transaction_date || b.transactionDate || b.created_at);
      return dateB.getTime() - dateA.getTime(); // Descending order
    });
    
    return sortedTransactions;
  } catch (error) {
    console.error('Error fetching school transactions:', error);
    throw error;
  }
};

export const createTransaction = async (transactionData: any) => {
  try {
    // Clean up the data - convert undefined to null for Firebase
    const cleanData: any = {
      school_id: transactionData.school_id,
      type: transactionData.type,
      amount: transactionData.amount,
      currency: transactionData.currency,
      transaction_date: transactionData.transaction_date,
      description: transactionData.description || '',
      notes: transactionData.notes || null,
      contact_id: transactionData.contact_id || null,
      category_id: transactionData.category_id || null,
      from_account_id: transactionData.from_account_id || null,
      to_account_id: transactionData.to_account_id || null,
      payment_method: transactionData.payment_method || null,
      receipt_number: transactionData.receipt_number || null,
      receipt_url: transactionData.receipt_url || null,
      tax_amount: transactionData.tax_amount || 0,
      tax_rate: transactionData.tax_rate || 0,
      is_recurring: transactionData.is_recurring || false,
      recurring_frequency: transactionData.recurring_frequency || null,
      recurring_end_date: transactionData.recurring_end_date || null,
      subscription_id: transactionData.subscription_id || null,
      student_id: transactionData.student_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Remove any fields that are still undefined
    Object.keys(cleanData).forEach(key => {
      if (cleanData[key] === undefined) {
        delete cleanData[key];
      }
    });

    const transactionId = await databaseService.create('transactions', cleanData);

    // Handle tags if provided
    if (transactionData.tag_ids && transactionData.tag_ids.length > 0) {
      for (const tagId of transactionData.tag_ids) {
        await databaseService.create(`transactions/${transactionId}/tags`, {
          tagId,
          addedAt: new Date().toISOString()
        });
      }
    }

    return { id: transactionId, success: true };
  } catch (error) {
    console.error('Error in createTransaction:', error);
    throw error;
  }
};