import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  addDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { authService } from '@/services/firebase/auth.service';
import { databaseService } from '@/services/firebase/database.service';

// Global DEBUG flag - set to true only when debugging database issues
const DEBUG_MODE = true;

// This file provides a migration layer from Supabase to Firebase
// It maps Supabase-like operations to Firebase operations

interface SupabaseResponse<T> {
  data: T | null;
  error: any;
}

interface SupabaseArrayResponse<T> {
  data: T[] | null;
  error: any;
}

// Simulated Supabase client that redirects to Firebase
export const supabase = {
  auth: {
    signUp: async ({ email, password }: any) => {
      try {
        const [firstName, lastName] = email.split('@')[0].split('.');
        const user = await authService.signUp(
          email, 
          password, 
          firstName || 'User', 
          lastName || 'Name'
        );
        return { data: { user }, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },

    signInWithPassword: async ({ email, password }: any) => {
      try {
        const userProfile = await authService.signIn(email, password);
        return { 
          data: { 
            user: userProfile,
            session: { access_token: 'firebase-token' }
          }, 
          error: null 
        };
      } catch (error) {
        return { data: null, error };
      }
    },

    signOut: async () => {
      try {
        await authService.signOut();
        return { error: null };
      } catch (error) {
        return { error };
      }
    },

    getUser: async () => {
      const user = authService.getCurrentUser();
      return { data: { user }, error: null };
    },

    getSession: async () => {
      const user = authService.getCurrentUser();
      return { 
        data: { 
          session: user ? { access_token: 'firebase-token' } : null 
        }, 
        error: null 
      };
    },

    onAuthStateChange: (callback: any) => {
      // Firebase auth state listener
      const unsubscribe = authService.auth.onAuthStateChanged((user) => {
        callback(user ? 'SIGNED_IN' : 'SIGNED_OUT', user);
      });
      
      return { data: { subscription: { unsubscribe } } };
    }
  },

  from: (tableName: string) => {
    return new SupabaseQueryBuilder(tableName);
  },

  rpc: async (functionName: string, params?: any) => {
    // Map Supabase RPC calls to Firebase Functions or direct operations
    switch (functionName) {
      case 'create_user_with_password':
        return handleCreateUser(params);
      case 'add_student_subscription':
        return handleAddSubscription(params);
      case 'generate_lesson_sessions_v2':
        return handleGenerateSessions(params);
      case 'get_teacher_schedule_conflicts':
        return handleScheduleConflicts(params);
      case 'create_transaction':
        return handleCreateTransaction(params);
      case 'get_school_tags':
        return handleGetSchoolTags(params);
      case 'get_payment_with_tags':
        return handleGetPaymentWithTags(params);
      case 'add_payment_tag':
        return handleAddPaymentTag(params);
      case 'remove_payment_tag':
        return handleRemovePaymentTag(params);
      case 'get_school_currencies':
        return handleGetSchoolCurrencies(params);
      case 'get_school_accounts':
        return handleGetSchoolAccounts(params);
      case 'debug_subscription_access':
        return handleDebugSubscriptionAccess(params);
      case 'renew_subscription':
        return handleRenewSubscription(params);
      case 'get_school_groups':
        return handleGetSchoolGroups(params);
      case 'delete_group_with_related_data':
        return handleDeleteGroupWithRelatedData(params);
      case 'get_all_licenses_with_schools':
        return handleGetAllLicensesWithSchools(params);
      case 'update_license_status':
        return handleUpdateLicenseStatus(params);
      case 'get_students_with_details':
        return handleGetStudentsWithDetails(params);
      case 'verify_license_and_create_school':
        return handleVerifyLicenseAndCreateSchool(params);
      case 'get_school_categories':
        return handleGetSchoolCategories(params);
      case 'create_default_categories':
        return handleCreateDefaultCategories(params);
      case 'get_lesson_sessions':
        return handleGetLessonSessions(params);
      case 'get_student_subscriptions':
        return handleGetStudentSubscriptions(params);
      case 'set_default_currency':
        return handleSetDefaultCurrency(params);
      case 'handle_session_action':
        return handleSessionActionRPC(params);
      case 'get_school_transactions':
        return handleGetSchoolTransactions(params);
      case 'get_students_password_info':
        return handleGetStudentsPasswordInfo(params);
      case 'get_user_password_hash':
        return handleGetUserPasswordHash(params);
      case 'update_student_password':
        return handleUpdateStudentPassword(params);
      case 'verify_password_update':
        return handleVerifyPasswordUpdate(params);
      case 'update_subscription_with_related_data':
        return handleUpdateSubscriptionWithRelatedData(params);
      default:
        console.warn(`RPC function ${functionName} not implemented`);
        return { data: null, error: new Error('Function not implemented') };
    }
  }
};

// Supabase-like query builder for Firebase
class SupabaseQueryBuilder {
  private tableName: string;
  private constraints: any[] = [];
  private selectFields: string = '*';
  private singleResult: boolean = false;
  private insertData: any = null;
  private updateData: any = null;
  private deleteMode: boolean = false;
  private upsertData: any = null;
  private documentId: string | null = null;

  constructor(tableName: string) {
    this.tableName = mapTableName(tableName);
  }

  select(fields: string = '*') {
    this.selectFields = fields;
    return this;
  }

  insert(data: any | any[]) {
    this.insertData = data;
    return this;
  }

  update(data: any) {
    this.updateData = data;
    return this;
  }

  upsert(data: any) {
    this.upsertData = data;
    return this;
  }

  delete() {
    this.deleteMode = true;
    return this;
  }

  eq(field: string, value: any) {
    if (field === 'id') {
      this.documentId = value;
    } else {
      this.constraints.push(where(field, '==', value));
    }
    return this;
  }

  neq(field: string, value: any) {
    this.constraints.push(where(field, '!=', value));
    return this;
  }

  in(field: string, values: any[]) {
    this.constraints.push(where(field, 'in', values));
    return this;
  }

  contains(field: string, value: any) {
    this.constraints.push(where(field, 'array-contains', value));
    return this;
  }

  gt(field: string, value: any) {
    this.constraints.push(where(field, '>', value));
    return this;
  }

  gte(field: string, value: any) {
    this.constraints.push(where(field, '>=', value));
    return this;
  }

  lt(field: string, value: any) {
    this.constraints.push(where(field, '<', value));
    return this;
  }

  lte(field: string, value: any) {
    this.constraints.push(where(field, '<=', value));
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    const direction = options?.ascending === false ? 'desc' : 'asc';
    this.constraints.push(orderBy(field, direction));
    return this;
  }

  limit(count: number) {
    this.constraints.push(limit(count));
    return this;
  }

  single() {
    this.singleResult = true;
    return this;
  }

  maybeSingle() {
    this.singleResult = true;
    return this;
  }

  async then(resolve: any, reject: any) {
    try {
      let result;

      if (this.insertData) {
        result = await this.handleInsert();
      } else if (this.updateData) {
        result = await this.handleUpdate();
      } else if (this.deleteMode) {
        result = await this.handleDelete();
      } else if (this.upsertData) {
        result = await this.handleUpsert();
      } else {
        result = await this.handleSelect();
      }

      resolve(result);
    } catch (error) {
      reject(error);
    }
  }

  private async handleSelect(): Promise<SupabaseResponse<any> | SupabaseArrayResponse<any>> {
    try {
      if (this.documentId) {
        // Single document fetch
        const docSnap = await getDoc(doc(db, this.tableName, this.documentId));
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() };
          return { data: this.singleResult ? data : [data], error: null };
        }
        return { data: this.singleResult ? null : [], error: null };
      }

      // Query multiple documents
      const q = query(collection(db, this.tableName), ...this.constraints);
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      if (this.singleResult) {
        return { data: data[0] || null, error: null };
      }
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  private async handleInsert(): Promise<SupabaseResponse<any> | SupabaseArrayResponse<any>> {
    try {
      const dataArray = Array.isArray(this.insertData) ? this.insertData : [this.insertData];
      const results = [];

      for (const item of dataArray) {
        const docData = {
          ...item,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        };
        
        if (item.id) {
          await setDoc(doc(db, this.tableName, item.id), docData);
          results.push({ id: item.id, ...docData });
        } else {
          const docRef = await addDoc(collection(db, this.tableName), docData);
          results.push({ id: docRef.id, ...docData });
        }
      }

      return { 
        data: Array.isArray(this.insertData) ? results : results[0], 
        error: null 
      };
    } catch (error) {
      return { data: null, error };
    }
  }

  private async handleUpdate(): Promise<SupabaseResponse<any>> {
    try {
      if (this.documentId) {
        await updateDoc(doc(db, this.tableName, this.documentId), {
          ...this.updateData,
          updated_at: serverTimestamp()
        });
        return { data: { id: this.documentId, ...this.updateData }, error: null };
      }

      // Update multiple documents matching query
      const q = query(collection(db, this.tableName), ...this.constraints);
      const querySnapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      querySnapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          ...this.updateData,
          updated_at: serverTimestamp()
        });
      });
      
      await batch.commit();
      return { data: this.updateData, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  private async handleDelete(): Promise<{ error: any }> {
    try {
      if (this.documentId) {
        await deleteDoc(doc(db, this.tableName, this.documentId));
        return { error: null };
      }

      // Delete multiple documents matching query
      const q = query(collection(db, this.tableName), ...this.constraints);
      const querySnapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      querySnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  private async handleUpsert(): Promise<SupabaseResponse<any>> {
    try {
      const dataArray = Array.isArray(this.upsertData) ? this.upsertData : [this.upsertData];
      const results = [];

      for (const item of dataArray) {
        const docData = {
          ...item,
          updated_at: serverTimestamp()
        };
        
        if (item.id) {
          // Check if exists
          const docRef = doc(db, this.tableName, item.id);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            await updateDoc(docRef, docData);
          } else {
            await setDoc(docRef, {
              ...docData,
              created_at: serverTimestamp()
            });
          }
          results.push({ id: item.id, ...docData });
        } else {
          // Create new
          const docRef = await addDoc(collection(db, this.tableName), {
            ...docData,
            created_at: serverTimestamp()
          });
          results.push({ id: docRef.id, ...docData });
        }
      }

      return { 
        data: Array.isArray(this.upsertData) ? results : results[0], 
        error: null 
      };
    } catch (error) {
      return { data: null, error };
    }
  }
}

// Helper function to map Supabase table names to Firebase collection names
function mapTableName(supabaseTable: string): string {
  const mapping: { [key: string]: string } = {
    'lesson_sessions': 'sessions',
    'group_students': 'groups/{groupId}/students',
    'transaction_tags': 'transactions/{transactionId}/tags',
    'transaction_categories': 'transactionCategories',
    'student_levels': 'studentLevels',
    'contact_types': 'contactTypes'
  };
  
  return mapping[supabaseTable] || supabaseTable;
}

// RPC function handlers
async function handleCreateUser(params: any) {
  try {
    const uid = await authService.createUser(params);
    return { data: { id: uid }, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

async function handleAddSubscription(params: any) {
  try {
    // Map the p_ prefixed params to Firebase camelCase field names
    const subscriptionData = {
      studentId: params.p_student_id,  // Use camelCase for Firebase
      sessionCount: params.p_session_count,
      durationMonths: params.p_duration_months,
      startDate: params.p_start_date,
      schedule: params.p_schedule,
      priceMode: params.p_price_mode,
      pricePerSession: params.p_price_per_session,
      fixedPrice: params.p_fixed_price,
      totalPrice: params.p_total_price,
      currency: params.p_currency,
      notes: params.p_notes || '',
      status: params.p_status || 'active',
      schoolId: params.p_current_school_id,
      createdBy: params.p_current_user_id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const subscriptionId = await databaseService.create('subscriptions', subscriptionData);
    
    // Also generate the lesson sessions for this subscription
    if (params.p_schedule && params.p_schedule.length > 0 && params.p_session_count > 0) {
      if (DEBUG_MODE) {
        console.log('Creating sessions for subscription:', subscriptionId);
        console.log('Schedule:', params.p_schedule);
        console.log('Session count:', params.p_session_count);
      }
      
      // Generate sessions based on schedule
      const sessions = [];
      const startDate = new Date(params.p_start_date);
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      // Get all scheduled days and times
      const scheduleItems = params.p_schedule || [];
      if (scheduleItems.length === 0) {
        console.warn('No schedule items provided');
        return { data: [{ id: subscriptionId, ...subscriptionData }], error: null };
      }
      
      // Convert schedule days to day indices and sort them
      const scheduledDays = scheduleItems.map(item => ({
        dayIndex: daysOfWeek.findIndex(day => day.toLowerCase() === item.day.toLowerCase()),
        time: item.time
      })).sort((a, b) => a.dayIndex - b.dayIndex);
      
      if (DEBUG_MODE) {
        console.log('Processing schedule with days:', scheduledDays);
      }
      
      // Find the first scheduled session date
      let currentDate = new Date(startDate);
      let sessionDates = [];
      
      // Generate all session dates
      while (sessionDates.length < params.p_session_count) {
        const currentDayIndex = currentDate.getDay();
        
        // Check if current date matches any scheduled day
        const matchingSchedule = scheduledDays.find(s => s.dayIndex === currentDayIndex);
        
        if (matchingSchedule && currentDate >= startDate) {
          sessionDates.push({
            date: new Date(currentDate),
            time: matchingSchedule.time
          });
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
        
        // Safety limit to prevent infinite loop
        if (currentDate > new Date(startDate.getTime() + (365 * 24 * 60 * 60 * 1000))) {
          console.warn('Reached safety limit while generating sessions');
          break;
        }
      }
      
      // Create session records
      for (let i = 0; i < sessionDates.length; i++) {
        const sessionNumber = i + 1;
        const { date, time } = sessionDates[i];
        
        // Parse the time string (e.g., "18:00" or "6:00 PM")
        let hours = 0;
        let minutes = 0;
        
        if (time) {
          if (time.includes(':')) {
            const parts = time.split(':');
            hours = parseInt(parts[0]);
            minutes = parseInt(parts[1]) || 0;
            
            // Handle PM indicator if present
            if (time.toUpperCase().includes('PM') && hours !== 12) {
              hours += 12;
            } else if (time.toUpperCase().includes('AM') && hours === 12) {
              hours = 0;
            }
          }
        }
        
        // Create a date at midnight local time (Cairo)
        const sessionDate = new Date(date);
        // Set to midnight in local time
        sessionDate.setHours(0, 0, 0, 0);
        
        // Create the final datetime by adding hours and minutes
        // This ensures we're working with Cairo local time
        const sessionDateTime = new Date(sessionDate);
        sessionDateTime.setHours(hours, minutes, 0, 0);
        
        const sessionData = {
          subscriptionId: subscriptionId,  // Use camelCase for Firebase
          studentId: params.p_student_id,
          schoolId: params.p_current_school_id,
          teacherId: params.p_teacher_id || null,
          sessionNumber: sessionNumber,
          scheduledDate: date.toISOString().split('T')[0],
          scheduledTime: time || '00:00',
          scheduledDateTime: sessionDateTime.toISOString(), // Full datetime for proper timezone handling
          durationMinutes: params.p_session_duration_minutes || 60,
          status: 'scheduled',
          countsTowardCompletion: true, // New sessions count toward completion
          indexInSub: sessionNumber, // Track session index in subscription
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        const sessionId = await databaseService.create('sessions', sessionData);
        sessions.push({ id: sessionId, ...sessionData });
      }
      
      if (DEBUG_MODE) console.log('Created sessions:', sessions.length);
    } else {
      if (DEBUG_MODE) console.log('No schedule or session count provided, skipping session creation');
    }
    
    // Return in the format expected by the frontend (array with subscription as first element)
    return { 
      data: [{ 
        id: subscriptionId,
        ...subscriptionData
      }], 
      error: null 
    };
  } catch (error) {
    console.error('Error creating subscription:', error);
    return { data: null, error };
  }
}

async function handleUpdateSubscriptionWithRelatedData(params: any) {
  try {
    const DEBUG_MODE = true;
    if (DEBUG_MODE) {
      console.log('Updating subscription with params:', params);
    }
    
    const subscriptionId = params.p_subscription_id;
    if (!subscriptionId) {
      throw new Error('Subscription ID is required');
    }
    
    // Update the subscription
    const updateData: any = {
      sessionCount: params.p_session_count,
      durationMonths: params.p_duration_months,
      sessionDurationMinutes: params.p_session_duration_minutes || 60,
      startDate: params.p_start_date,
      schedule: params.p_schedule,
      priceMode: params.p_price_mode,
      pricePerSession: params.p_price_per_session,
      fixedPrice: params.p_fixed_price,
      totalPrice: params.p_total_price,
      currency: params.p_currency,
      notes: params.p_notes || '',
      status: params.p_status || 'active',
      updatedAt: new Date().toISOString()
    };
    
    await databaseService.update('subscriptions', subscriptionId, updateData);
    
    // Delete existing sessions for this subscription
    const existingSessions = await databaseService.query('sessions', {
      where: [{ field: 'subscriptionId', operator: '==', value: subscriptionId }]
    });
    
    // Delete each existing session
    for (const session of existingSessions) {
      await databaseService.delete('sessions', session.id);
    }
    
    // Regenerate sessions with the new schedule
    if (params.p_schedule && params.p_schedule.length > 0 && params.p_session_count > 0) {
      const sessions = [];
      const startDate = new Date(params.p_start_date);
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      // Get all scheduled days and times
      const scheduleItems = params.p_schedule || [];
      
      // Convert schedule days to day indices and sort them
      const scheduledDays = scheduleItems.map(item => ({
        dayIndex: daysOfWeek.findIndex(day => day.toLowerCase() === item.day.toLowerCase()),
        time: item.time
      })).sort((a, b) => a.dayIndex - b.dayIndex);
      
      // Find the first scheduled session date
      let currentDate = new Date(startDate);
      let sessionDates = [];
      
      // Generate all session dates
      while (sessionDates.length < params.p_session_count) {
        const currentDayIndex = currentDate.getDay();
        
        // Check if current date matches any scheduled day
        const matchingSchedule = scheduledDays.find(s => s.dayIndex === currentDayIndex);
        
        if (matchingSchedule && currentDate >= startDate) {
          sessionDates.push({
            date: new Date(currentDate),
            time: matchingSchedule.time
          });
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
        
        // Safety limit to prevent infinite loop
        if (currentDate > new Date(startDate.getTime() + (365 * 24 * 60 * 60 * 1000))) {
          console.warn('Reached safety limit while generating sessions');
          break;
        }
      }
      
      // Get the student ID from the subscription
      const subscription = await databaseService.getById('subscriptions', subscriptionId);
      const studentId = subscription?.studentId || subscription?.student_id;
      
      // Create session records
      for (let i = 0; i < sessionDates.length; i++) {
        const sessionNumber = i + 1;
        const { date, time } = sessionDates[i];
        
        // Parse the time string to get hours and minutes
        let hours = 0;
        let minutes = 0;
        
        if (time) {
          if (time.includes(':')) {
            const parts = time.split(':');
            hours = parseInt(parts[0]);
            minutes = parseInt(parts[1]) || 0;
            
            // Handle PM indicator if present
            if (time.toUpperCase().includes('PM') && hours !== 12) {
              hours += 12;
            } else if (time.toUpperCase().includes('AM') && hours === 12) {
              hours = 0;
            }
          }
        }
        
        // Create a date at midnight local time (Cairo)
        const sessionDate = new Date(date);
        sessionDate.setHours(0, 0, 0, 0);
        
        // Create the final datetime by adding hours and minutes
        const sessionDateTime = new Date(sessionDate);
        sessionDateTime.setHours(hours, minutes, 0, 0);
        
        const sessionData = {
          subscriptionId: subscriptionId,
          studentId: studentId,
          schoolId: params.p_current_school_id,
          teacherId: subscription?.teacherId || null,
          sessionNumber: sessionNumber,
          scheduledDate: date.toISOString().split('T')[0],
          scheduledTime: time || '00:00',
          scheduledDateTime: sessionDateTime.toISOString(), // Full datetime for proper timezone handling
          durationMinutes: params.p_session_duration_minutes || 60,
          status: 'scheduled',
          countsTowardCompletion: true,
          indexInSub: sessionNumber,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        const sessionId = await databaseService.create('sessions', sessionData);
        sessions.push({ id: sessionId, ...sessionData });
      }
      
      if (DEBUG_MODE) console.log('Regenerated sessions:', sessions.length);
    }
    
    return { 
      data: { 
        success: true, 
        message: 'Subscription updated successfully' 
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Error updating subscription:', error);
    return { data: null, error };
  }
}

async function handleGenerateSessions(params: any) {
  // This would call a Cloud Function or implement session generation logic
  try {
    // Implementation here
    return { data: { success: true }, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

async function handleScheduleConflicts(params: any) {
  // Check for schedule conflicts
  try {
    const sessions = await databaseService.query('sessions', {
      where: [
        { field: 'teacherId', operator: '==', value: params.teacher_id },
        { field: 'scheduledDate', operator: '==', value: params.date }
      ]
    });
    
    return { data: sessions, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

async function handleCreateTransaction(params: any) {
  try {
    if (DEBUG_MODE) console.log('💳 Creating transaction with params:', params);
    
    // Map the p_ prefixed params to actual field names
    const transactionData = {
      school_id: params.p_school_id,
      type: params.p_type || 'income',
      amount: params.p_amount,
      currency: params.p_currency,
      transaction_date: params.p_transaction_date,
      description: params.p_description,
      notes: params.p_notes,
      to_account_id: params.p_to_account_id,
      from_account_id: params.p_from_account_id || null,
      payment_method: params.p_payment_method || 'Cash',
      tag_ids: params.p_tag_ids || [],
      category_id: params.p_category_id || null, // Add category_id field
      subscription_id: params.p_subscription_id || null,
      student_id: params.p_student_id || null,
      status: 'completed', // Add status field as completed by default
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    if (DEBUG_MODE) console.log('💳 Transaction data to save:', transactionData);
    
    const transactionId = await databaseService.create('transactions', transactionData);
    
    if (DEBUG_MODE) console.log('✅ Transaction created with ID:', transactionId);
    
    return { data: transactionId, error: null }; // Return just the ID, not wrapped in object
  } catch (error) {
    console.error('❌ Error creating transaction:', error);
    return { data: null, error };
  }
}

// Additional RPC handlers for complete migration
async function handleGetSchoolTags(params: any) {
  try {
    const tags = await databaseService.query('transactionCategories', {
      where: [{ field: 'schoolId', operator: '==', value: params.p_school_id }]
    });
    return { data: tags, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

async function handleGetPaymentWithTags(params: any) {
  try {
    const payment = await databaseService.getById('transactions', params.p_payment_id);
    const tags = await databaseService.query(`transactions/${params.p_payment_id}/tags`, {});
    return { data: { ...payment, tags }, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

async function handleAddPaymentTag(params: any) {
  try {
    await databaseService.create(`transactions/${params.p_payment_id}/tags`, {
      tagId: params.p_tag_id,
      addedAt: new Date().toISOString()
    });
    return { data: { success: true }, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

async function handleRemovePaymentTag(params: any) {
  try {
    const tags = await databaseService.query(`transactions/${params.p_payment_id}/tags`, {
      where: [{ field: 'tagId', operator: '==', value: params.p_tag_id }]
    });
    if (tags.length > 0) {
      await databaseService.delete(`transactions/${params.p_payment_id}/tags`, tags[0].id);
    }
    return { data: { success: true }, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

async function handleGetSchoolCurrencies(params: any) {
  try {
    // Query currencies with the correct field name 'school_id'
    const currencies = await databaseService.query('currencies', {
      where: [{ field: 'school_id', operator: '==', value: params.p_school_id }]
    });
    
    // Map the field names to match what the UI expects
    const mappedCurrencies = currencies.map((currency: any) => ({
      id: currency.id,
      name: currency.name,
      symbol: currency.symbol,
      code: currency.code,
      exchange_rate: currency.exchange_rate || 1,
      is_default: currency.is_default || false,
      created_at: currency.created_at || currency.createdAt,
      school_id: currency.school_id || currency.schoolId
    }));
    
    if (DEBUG_MODE) console.log('Fetched currencies for school:', params.p_school_id, 'Count:', mappedCurrencies.length);
    return { data: mappedCurrencies, error: null };
  } catch (error) {
    console.error('Error fetching school currencies:', error);
    return { data: null, error };
  }
}

async function handleGetSchoolAccounts(params: any) {
  try {
    // Query accounts with the correct field name 'school_id'
    const accounts = await databaseService.query('accounts', {
      where: [{ field: 'school_id', operator: '==', value: params.p_school_id }]
    });
    
    // Map the field names to match what the UI expects and enrich with currency information
    const mappedAccounts = await Promise.all(accounts.map(async (account: any) => {
      // Fetch currency information for each account
      let currencyInfo = {
        currency_name: null,
        currency_symbol: null,
        currency_code: null
      };
      
      if (account.currency_id) {
        try {
          const currency = await databaseService.getById('currencies', account.currency_id);
          if (currency) {
            currencyInfo = {
              currency_name: currency.name,
              currency_symbol: currency.symbol,
              currency_code: currency.code
            };
          }
        } catch (error) {
          console.warn('Error fetching currency info for account:', account.id, error);
        }
      }
      
      return {
        id: account.id,
        name: account.name,
        type: account.type,
        account_number: account.account_number,
        color: account.color,
        exclude_from_stats: account.exclude_from_stats || false,
        is_archived: account.is_archived || false,
        created_at: account.created_at || account.createdAt,
        currency_id: account.currency_id,
        ...currencyInfo,
        school_id: account.school_id || account.schoolId
      };
    }));
    
    if (DEBUG_MODE) console.log('Fetched accounts for school:', params.p_school_id, 'Count:', mappedAccounts.length);
    return { data: mappedAccounts, error: null };
  } catch (error) {
    console.error('Error fetching school accounts:', error);
    return { data: null, error };
  }
}

async function handleDebugSubscriptionAccess(params: any) {
  try {
    // Debug function - just return success
    return { data: { can_delete: true, can_update: true }, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

async function handleRenewSubscription(params: any) {
  try {
    const subscriptionId = await databaseService.create('subscriptions', {
      ...params,
      status: 'active',
      createdAt: new Date().toISOString()
    });
    return { data: { id: subscriptionId, success: true }, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

async function handleGetSchoolGroups(params: any) {
  try {
    const groups = await databaseService.query('groups', {
      where: [{ field: 'schoolId', operator: '==', value: params.p_school_id }]
    });
    // Enrich with student count
    const enrichedGroups = await Promise.all(groups.map(async (group: any) => {
      const students = await databaseService.query(`groups/${group.id}/students`, {});
      return {
        ...group,
        student_count: students.length
      };
    }));
    return { data: enrichedGroups, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

async function handleDeleteGroupWithRelatedData(params: any) {
  try {
    // Delete group students first
    const groupStudents = await databaseService.query(`groups/${params.p_group_id}/students`, {});
    for (const student of groupStudents) {
      await databaseService.delete(`groups/${params.p_group_id}/students`, student.id);
    }
    // Delete the group
    await databaseService.delete('groups', params.p_group_id);
    return { data: { success: true }, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

async function handleGetAllLicensesWithSchools(params: any) {
  try {
    const licenses = await databaseService.query('licenses', {});
    // Enrich with school data
    const enrichedLicenses = await Promise.all(licenses.map(async (license: any) => {
      let schoolData = null;
      if (license.schoolId) {
        schoolData = await databaseService.getById('schools', license.schoolId);
      }
      return {
        ...license,
        school_name: schoolData?.name || null,
        school_created_at: schoolData?.createdAt || null
      };
    }));
    return { data: enrichedLicenses, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

async function handleUpdateLicenseStatus(params: any) {
  try {
    await databaseService.update('licenses', params.p_license_id, {
      status: params.p_is_active ? 'active' : 'inactive'
    });
    return { data: { success: true }, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

async function handleGetStudentsWithDetails(params: any) {
  try {
    const students = await databaseService.query('students', {
      where: [{ field: 'schoolId', operator: '==', value: params.p_school_id }]
    });
    // Enrich with user data
    const enrichedStudents = await Promise.all(students.map(async (student: any) => {
      const user = await databaseService.getById('users', student.userId);
      return {
        ...student,
        first_name: user?.firstName,
        last_name: user?.lastName,
        email: user?.email
      };
    }));
    return { data: enrichedStudents, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

async function handleVerifyLicenseAndCreateSchool(params: any) {
  try {
    // Verify license
    const licenses = await databaseService.query('licenses', {
      where: [{ field: 'key', operator: '==', value: params.license_key }]
    });
    
    if (!licenses || licenses.length === 0) {
      return { data: { success: false, message: 'Invalid license key' }, error: null };
    }
    
    const license = licenses[0];
    
    if (license.status !== 'active') {
      return { data: { success: false, message: 'License is not active' }, error: null };
    }
    
    if (license.schoolId) {
      return { data: { success: false, message: 'License has already been used' }, error: null };
    }
    
    // Create school
    const schoolId = await databaseService.create('schools', {
      name: params.school_name,
      licenseId: license.id,
      status: 'active'
    });
    
    // Update license
    await databaseService.update('licenses', license.id, {
      schoolId,
      status: 'active'
    });
    
    // Create admin user
    const uid = await authService.createUser({
      email: params.admin_email,
      password: params.admin_password,
      firstName: params.admin_first_name,
      lastName: params.admin_last_name,
      role: 'admin',
      schoolId
    });
    
    return { 
      data: { 
        success: true, 
        school_id: schoolId,
        user_id: uid
      }, 
      error: null 
    };
  } catch (error) {
    return { data: { success: false, message: error.message }, error };
  }
}

async function handleGetSchoolCategories(params: any) {
  try {
    const categories = await databaseService.query('transactionCategories', {
      where: [
        { field: 'school_id', operator: '==', value: params.p_school_id },
        { field: 'is_active', operator: '==', value: true }
      ],
      orderBy: [{ field: 'name', direction: 'asc' }]
    });
    
    // Build hierarchical structure with full paths and levels
    const categoriesWithHierarchy = categories.map((cat: any) => {
      let fullPath = cat.name;
      let level = 0;
      
      if (cat.parent_id) {
        const parent = categories.find((p: any) => p.id === cat.parent_id);
        if (parent) {
          fullPath = `${parent.name} > ${cat.name}`;
          level = 1;
          
          // Check for grandparent
          if (parent.parent_id) {
            const grandparent = categories.find((gp: any) => gp.id === parent.parent_id);
            if (grandparent) {
              fullPath = `${grandparent.name} > ${parent.name} > ${cat.name}`;
              level = 2;
            }
          }
        }
      }
      
      return {
        ...cat,
        full_path: fullPath,
        level: level
      };
    });
    
    return { data: categoriesWithHierarchy, error: null };
  } catch (error) {
    console.error('Error fetching school categories:', error);
    return { data: null, error };
  }
}

async function handleCreateDefaultCategories(params: any) {
  try {
    const defaultCategories = [
      // Income categories
      { name: 'Course Fees', type: 'income', color: '#10B981', parent_id: null },
      { name: 'Registration', type: 'income', color: '#059669', parent_id: null },
      { name: 'Material Sales', type: 'income', color: '#047857', parent_id: null },
      { name: 'Other Income', type: 'income', color: '#065F46', parent_id: null },
      
      // Expense categories
      { name: 'Salaries', type: 'expense', color: '#EF4444', parent_id: null },
      { name: 'Rent', type: 'expense', color: '#DC2626', parent_id: null },
      { name: 'Utilities', type: 'expense', color: '#B91C1C', parent_id: null },
      { name: 'Materials', type: 'expense', color: '#991B1B', parent_id: null },
      { name: 'Marketing', type: 'expense', color: '#7F1D1D', parent_id: null },
      { name: 'Other Expenses', type: 'expense', color: '#450A0A', parent_id: null },
      
      // Transfer categories
      { name: 'Bank Transfer', type: 'transfer', color: '#3B82F6', parent_id: null },
      { name: 'Cash Transfer', type: 'transfer', color: '#2563EB', parent_id: null }
    ];
    
    // Create categories in batch
    for (const category of defaultCategories) {
      await databaseService.create('transactionCategories', {
        ...category,
        school_id: params.p_school_id,
        is_active: true
      });
    }
    
    return { data: { success: true }, error: null };
  } catch (error) {
    console.error('Error creating default categories:', error);
    return { data: null, error };
  }
}

// Handle get_lesson_sessions RPC function
async function handleGetLessonSessions(params: { p_student_id: string }) {
  try {
    if (DEBUG_MODE) {
      console.log('Getting lesson sessions for student:', params.p_student_id);
      
      // First, let's check if there are ANY sessions in the database
      const allSessions = await databaseService.query('sessions', {});
      console.log(`Total sessions in database: ${allSessions.length}`);
      if (allSessions.length > 0) {
        console.log('Sample session fields:', Object.keys(allSessions[0]));
        console.log('Sample session:', allSessions[0]);
      }
    }
    
    // Query sessions from Firebase - try both camelCase and snake_case field names
    // First try camelCase (new format)
    let sessions = await databaseService.query('sessions', {
      where: [{ field: 'studentId', operator: '==', value: params.p_student_id }]
    });
    
    // If no results, try snake_case (old format)
    if (!sessions || sessions.length === 0) {
      sessions = await databaseService.query('sessions', {
        where: [{ field: 'student_id', operator: '==', value: params.p_student_id }]
      });
    }
    
    // Map sessions to the expected format (Firebase uses camelCase, return snake_case)
    const mappedSessions = sessions.map((session: any) => ({
      id: session.id,
      subscription_id: session.subscriptionId || session.subscription_id,
      student_id: session.studentId || session.student_id,
      teacher_id: session.teacherId || session.teacher_id || null,
      session_number: session.sessionNumber || session.session_number,
      scheduled_date: session.scheduledDateTime || session.scheduledDate || session.scheduled_date,
      scheduled_time: session.scheduledTime || session.scheduled_time,
      scheduled_datetime: session.scheduledDateTime || null,
      duration_minutes: session.durationMinutes || session.duration_minutes || 60,
      status: session.status || 'scheduled',
      attended: session.attended || false,
      notes: session.notes || '',
      counts_toward_completion: session.countsTowardCompletion !== false ? true : false,
      index_in_sub: session.indexInSub || session.index_in_sub || null,
      original_session_index: session.originalSessionIndex || session.original_session_index || null,
      moved_from_session_id: session.movedFromSessionId || session.moved_from_session_id || null,
      created_at: session.createdAt || session.created_at,
      updated_at: session.updatedAt || session.updated_at,
      cost: session.cost || null,
      payment_status: session.paymentStatus || session.payment_status || null
    }));
    
    return { 
      data: mappedSessions,
      error: null 
    };
  } catch (error) {
    console.error('Error getting lesson sessions:', error);
    return { data: null, error };
  }
}

// Handle get_student_subscriptions RPC function
async function handleGetStudentSubscriptions(params: { p_student_id: string }) {
  try {
    if (DEBUG_MODE) console.log('Getting subscriptions for student:', params.p_student_id);
    
    // First, let's check if there are ANY subscriptions in the database
    if (DEBUG_MODE) {
      const allSubscriptions = await databaseService.query('subscriptions', {});
      console.log(`Total subscriptions in database: ${allSubscriptions.length}`);
      if (allSubscriptions.length > 0) {
        console.log('Sample subscription fields:', Object.keys(allSubscriptions[0]));
        console.log('Sample subscription:', allSubscriptions[0]);
      }
    }
    
    // Query subscriptions from Firebase - try both camelCase and snake_case field names
    // First try camelCase (new format)
    let subscriptions = await databaseService.query('subscriptions', {
      where: [{ field: 'studentId', operator: '==', value: params.p_student_id }]
    });
    if (DEBUG_MODE) console.log(`Found ${subscriptions.length} subscriptions with studentId field`);
    
    // If no results, try snake_case (old format)
    if (!subscriptions || subscriptions.length === 0) {
      if (DEBUG_MODE) console.log('No subscriptions found with studentId, trying student_id...');
      subscriptions = await databaseService.query('subscriptions', {
        where: [{ field: 'student_id', operator: '==', value: params.p_student_id }]
      });
      if (DEBUG_MODE) console.log(`Found ${subscriptions.length} subscriptions with student_id field`);
    }
    
    // For each subscription, calculate sessions taken and scheduled
    const enrichedSubscriptions = await Promise.all(subscriptions.map(async (subscription: any) => {
      // Get sessions for this subscription - try both camelCase and snake_case
      let sessions = await databaseService.query('sessions', {
        where: [{ field: 'subscriptionId', operator: '==', value: subscription.id }]
      });
      
      // If no results, try snake_case (old format)
      if (!sessions || sessions.length === 0) {
        sessions = await databaseService.query('sessions', {
          where: [{ field: 'subscription_id', operator: '==', value: subscription.id }]
        });
      }
      
      // Count sessions by status WITH counts_toward_completion logic (matching Supabase RPC)
      // IMPORTANT: Cancelled sessions ALWAYS count toward completion regardless of the flag
      const sessionsCompleted = sessions.filter((s: any) => {
        const countsToward = s.countsTowardCompletion ?? s.counts_toward_completion ?? true;
        return (s.status === 'completed' && countsToward === true) || 
               s.status === 'cancelled'; // Cancelled always counts
      }).length;
      
      const sessionsAttended = sessions.filter((s: any) => {
        const countsToward = s.countsTowardCompletion ?? s.counts_toward_completion ?? true;
        return s.status === 'completed' && countsToward === true;
      }).length;
      
      const sessionsCancelled = sessions.filter((s: any) => 
        s.status === 'cancelled' // Count ALL cancelled sessions
      ).length;
      
      const sessionsScheduled = sessions.filter((s: any) => 
        s.status === 'scheduled'
      ).length;
      
      return {
        id: subscription.id,
        student_id: subscription.studentId || subscription.student_id,
        session_count: subscription.sessionCount || subscription.session_count,
        duration_months: subscription.durationMonths || subscription.duration_months,
        start_date: subscription.startDate || subscription.start_date,
        schedule: subscription.schedule,
        price_mode: subscription.priceMode || subscription.price_mode,
        price_per_session: subscription.pricePerSession || subscription.price_per_session,
        fixed_price: subscription.fixedPrice || subscription.fixed_price,
        total_price: subscription.totalPrice || subscription.total_price,
        currency: subscription.currency,
        notes: subscription.notes,
        status: subscription.status,
        // Use the correct field names expected by the UI
        sessions_completed: sessionsCompleted,
        sessions_attended: sessionsAttended,
        sessions_cancelled: sessionsCancelled,
        sessions_scheduled: sessionsScheduled,
        // Keep legacy fields for compatibility
        sessions_taken: sessionsCompleted,
        created_at: subscription.createdAt || subscription.created_at,
        updated_at: subscription.updatedAt || subscription.updated_at
      };
    }));
    
    return { 
      data: enrichedSubscriptions,
      error: null 
    };
  } catch (error) {
    console.error('Error getting student subscriptions:', error);
    return { data: null, error };
  }
}

// Handle session action RPC function
async function handleSessionActionRPC(params: any) {
  try {
    if (DEBUG_MODE) console.log('🎯 Handling session action:', params);
    
    const { p_session_id, p_action, p_new_datetime } = params;
    
    if (!p_session_id || !p_action) {
      throw new Error('Session ID and action are required');
    }
    
    const updates: any = {};
    
    switch (p_action) {
      case 'attended':
      case 'complete':
        updates.status = 'completed';
        updates.attended = true;
        updates.counts_toward_completion = true;
        break;
      case 'cancelled':
        updates.status = 'cancelled';
        updates.attended = false;
        updates.counts_toward_completion = true; // Cancelled sessions DO count toward completion
        break;
      case 'rescheduled':
        if (p_new_datetime) {
          // Get the original session to store its date and create a replacement
          const originalSession = await databaseService.getById('sessions', p_session_id);
          if (!originalSession) {
            throw new Error('Session not found');
          }
          
          // Get the original date for the note
          const originalDate = originalSession.scheduled_date || originalSession.scheduledDate || originalSession.scheduled_datetime || null;
          const originalDateFormatted = originalDate 
            ? new Date(originalDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
            : 'unknown date';
          
          // Parse the new datetime
          const newDate = new Date(p_new_datetime);
          const newDateFormatted = newDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
          
          // Mark original session as rescheduled (doesn't count toward completion)
          updates.status = 'rescheduled';
          updates.counts_toward_completion = false;
          updates.original_date = originalDate;
          updates.notes = (originalSession.notes || '') + ` [Rescheduled to ${newDateFormatted}]`;
          
          // Update the original session
          await databaseService.update('sessions', p_session_id, updates);
          
          // Create the replacement session at the new date/time
          const replacementSession: any = {
            // Use both field naming conventions for subscription ID
            subscription_id: originalSession.subscription_id || originalSession.subscriptionId,
            subscriptionId: originalSession.subscription_id || originalSession.subscriptionId,
            
            // New schedule information
            scheduled_date: p_new_datetime.split('T')[0],
            scheduledDate: p_new_datetime.split('T')[0],
            scheduled_time: p_new_datetime.split('T')[1]?.split('.')[0] || '00:00',
            scheduledTime: p_new_datetime.split('T')[1]?.split('.')[0] || '00:00',
            
            // Session metadata
            status: 'scheduled',
            attended: false,
            counts_toward_completion: true,
            countsTowardCompletion: true,
            
            // Reference to original rescheduled session
            moved_from_session_id: p_session_id,
            
            // Descriptive note about the reschedule
            notes: `[Rescheduled from ${originalDateFormatted}]`,
            
            // Timestamps
            created_at: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          // Add student_id in both formats
          const studentId = originalSession.student_id || originalSession.studentId;
          if (studentId) {
            replacementSession.student_id = studentId;
            replacementSession.studentId = studentId;
          }
          
          // Add school_id in both formats
          const schoolId = originalSession.school_id || originalSession.schoolId;
          if (schoolId) {
            replacementSession.school_id = schoolId;
            replacementSession.schoolId = schoolId;
          }
          
          // Add teacher_id in both formats
          const teacherId = originalSession.teacher_id || originalSession.teacherId;
          if (teacherId) {
            replacementSession.teacher_id = teacherId;
            replacementSession.teacherId = teacherId;
          }
          
          // Add cost if it exists
          if (originalSession.cost !== undefined && originalSession.cost !== null) {
            replacementSession.cost = originalSession.cost;
          }
          
          // Add payment_status if it exists
          if (originalSession.payment_status || originalSession.paymentStatus) {
            replacementSession.payment_status = originalSession.payment_status || originalSession.paymentStatus;
            replacementSession.paymentStatus = originalSession.payment_status || originalSession.paymentStatus;
          }
          
          // Keep the original session number and index
          const sessionNumber = originalSession.session_number || originalSession.sessionNumber || originalSession.index_in_sub || originalSession.indexInSub;
          if (sessionNumber !== undefined && sessionNumber !== null) {
            replacementSession.session_number = sessionNumber;
            replacementSession.sessionNumber = sessionNumber;
            replacementSession.index_in_sub = sessionNumber;
            replacementSession.indexInSub = sessionNumber;
          }
          
          // Store original date if available
          if (originalDate) {
            replacementSession.original_date = originalDate;
            replacementSession.originalDate = originalDate;
          }
          
          const newSessionId = await databaseService.create('sessions', replacementSession);
          if (DEBUG_MODE) console.log('✅ Created rescheduled replacement session:', newSessionId);
          
          return { 
            data: { 
              success: true, 
              message: `Session rescheduled successfully to ${replacementSession.scheduled_date} at ${replacementSession.scheduled_time}`,
              new_session_id: newSessionId
            }, 
            error: null 
          };
        }
        break;
      case 'moved':
        // When moving a session, mark it as moved and create a replacement
        const session = await databaseService.getById('sessions', p_session_id);
        if (!session) {
          throw new Error('Session not found');
        }
        
        // Log session structure for debugging
        if (DEBUG_MODE) {
          console.log('📋 Session data for move operation:', {
            id: p_session_id,
            has_scheduled_date: !!session.scheduled_date,
            has_scheduled_datetime: !!session.scheduled_datetime,
            scheduled_date: session.scheduled_date,
            scheduled_datetime: session.scheduled_datetime
          });
        }
        
        // Mark original session as moved (doesn't count toward completion)
        updates.status = 'rescheduled';
        updates.counts_toward_completion = false;
        
        // Only set original_date if we have a valid date value
        if (session.scheduled_date) {
          updates.original_date = session.scheduled_date;
        } else if (session.scheduled_datetime) {
          // Try alternative date field
          updates.original_date = session.scheduled_datetime;
        }
        // If no date is available, we simply don't set original_date
        
        // We'll update this note after calculating the next date
        let movedToNote = ` [Moved to another date]`; // Will be updated later
        updates.notes = (session.notes || '') + movedToNote;
        
        // Store the update but don't apply it yet - we'll update after calculating the date
        const pendingUpdate = { ...updates };
        
        // Get the subscription ID (handle both naming conventions)
        const subscriptionId = session.subscription_id || session.subscriptionId;
        if (DEBUG_MODE) {
          console.log('📋 Looking for subscription with ID:', subscriptionId);
          console.log('📋 Session fields:', Object.keys(session));
        }
        
        if (!subscriptionId) {
          console.warn('⚠️ No subscription ID found in session, cannot create replacement');
          return { 
            data: { 
              success: true, 
              message: 'Session marked as moved (no replacement created - subscription ID not found)' 
            }, 
            error: null 
          };
        }
        
        // Find the next available date that matches the subscription schedule
        const subscription = await databaseService.getById('subscriptions', subscriptionId);
        if (subscription && subscription.schedule && subscription.schedule.length > 0) {
          // Get all sessions for this subscription to find the last date
          // Query BOTH field naming conventions and combine results
          const sessionsWithUnderscore = await databaseService.query('sessions', {
            where: [{ field: 'subscription_id', operator: '==', value: subscriptionId }]
          });
          
          const sessionsWithCamelCase = await databaseService.query('sessions', {
            where: [{ field: 'subscriptionId', operator: '==', value: subscriptionId }]
          });
          
          if (DEBUG_MODE) {
            console.log('📊 Session query results:');
            console.log('  Sessions with subscription_id:', sessionsWithUnderscore.length);
            console.log('  Sessions with subscriptionId:', sessionsWithCamelCase.length);
          }
          
          // Combine both results, avoiding duplicates based on session ID
          const sessionMap = new Map();
          [...sessionsWithUnderscore, ...sessionsWithCamelCase].forEach(session => {
            sessionMap.set(session.id, session);
          });
          const allSessions = Array.from(sessionMap.values());
          
          // Calculate when the subscription ends based on total sessions and schedule
          // This is more reliable than looking at session dates which might be missing
          
          const totalSessions = subscription.session_count || subscription.sessionCount || 12;
          const startDate = subscription.start_date || subscription.startDate;
          
          if (DEBUG_MODE) {
            console.log('📊 Calculating subscription end date:');
            console.log('  Total sessions in subscription:', totalSessions);
            console.log('  Start date:', startDate);
            console.log('  Schedule:', subscription.schedule);
            console.log('  Sessions found in database:', allSessions.length);
          }
          
          let latestDate: Date;
          
          // Method 1: Calculate based on subscription parameters (most reliable)
          if (startDate && subscription.schedule && subscription.schedule.length > 0) {
            const start = new Date(startDate);
            const scheduleDays = subscription.schedule.map((s: any) => {
              const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
                .findIndex(d => d === s.day.toLowerCase());
              return dayIndex;
            }).filter(d => d !== -1).sort((a, b) => a - b);
            
            if (scheduleDays.length > 0) {
              // Calculate the date of each session sequentially
              let currentDate = new Date(start);
              let sessionCount = 0;
              let lastSessionDate = new Date(start);
              
              // Move to the first scheduled day from start date
              while (!scheduleDays.includes(currentDate.getDay())) {
                currentDate.setDate(currentDate.getDate() + 1);
              }
              
              // Count through all sessions to find the last one
              while (sessionCount < totalSessions) {
                if (scheduleDays.includes(currentDate.getDay())) {
                  sessionCount++;
                  lastSessionDate = new Date(currentDate);
                  if (DEBUG_MODE && sessionCount <= 3) {
                    console.log(`  Session ${sessionCount}: ${currentDate.toDateString()}`);
                  }
                }
                if (sessionCount < totalSessions) {
                  currentDate.setDate(currentDate.getDate() + 1);
                }
              }
              
              latestDate = new Date(lastSessionDate);
              
              if (DEBUG_MODE) {
                console.log('  Last session date (session #' + totalSessions + '):', latestDate.toDateString());
                console.log('  Sessions per week:', scheduleDays.length);
                console.log('  Total sessions:', totalSessions);
                console.log('  Schedule days:', scheduleDays.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', '));
              }
            } else {
              // Fallback if schedule parsing fails
              latestDate = new Date(start);
              latestDate.setDate(latestDate.getDate() + 90); // Default 3 months
            }
          } else {
            // Method 2: Fallback to finding latest session date if available
            latestDate = null;
            let sessionDates: string[] = [];
            
            allSessions.forEach((s: any) => {
              if (s.scheduled_date) {
                sessionDates.push(`${s.scheduled_date} (status: ${s.status}, id: ${s.id})`);
                const sessionDate = new Date(s.scheduled_date);
                if (!latestDate || sessionDate > latestDate) {
                  latestDate = sessionDate;
                }
              }
            });
            
            // If still no date found, use today
            if (!latestDate) {
              latestDate = new Date();
              if (DEBUG_MODE) {
                console.log('  ⚠️ Warning: Could not calculate end date, using today');
              }
            }
            
            if (DEBUG_MODE && sessionDates.length > 0) {
              console.log('  Found session dates:', sessionDates.sort());
            }
          }
          
          if (DEBUG_MODE) {
            console.log('🔍 Finding next available date for moved session:');
            console.log('  Subscription ID:', subscriptionId);
            console.log('  Total sessions found:', allSessions.length);
            console.log('  Latest session date determined:', latestDate.toISOString());
            console.log('  Subscription schedule:', subscription.schedule);
          }
          
          // Get all scheduled days from the subscription
          const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const scheduledDays = subscription.schedule.map((s: any) => ({
            dayIndex: daysOfWeek.findIndex(d => d === s.day.toLowerCase()),
            time: s.time || '00:00'
          })).filter((s: any) => s.dayIndex !== -1);
          
          // Also check for any existing moved sessions (replacement sessions) after the subscription end date
          // These sessions will have the same subscription_id but will be after the original subscription period
          let actualLatestDate = new Date(latestDate);
          
          // Find any replacement sessions that are after the calculated end date
          const replacementSessions = allSessions.filter((s: any) => {
            // Check if this is a replacement session (has moved_from_session_id or notes indicating it was moved)
            const isReplacement = s.moved_from_session_id || 
                                (s.notes && s.notes.includes('[Moved from'));
            if (!isReplacement) return false;
            
            // Check if it has a scheduled date
            const sessionDate = s.scheduled_date || s.scheduledDate;
            if (!sessionDate) return false;
            
            // Check if it's after the original subscription end date
            const sDate = new Date(sessionDate);
            return sDate >= latestDate;
          });
          
          if (replacementSessions.length > 0) {
            // Find the latest replacement session date
            replacementSessions.forEach((s: any) => {
              const sessionDate = new Date(s.scheduled_date || s.scheduledDate);
              if (sessionDate > actualLatestDate) {
                actualLatestDate = sessionDate;
                if (DEBUG_MODE) {
                  console.log('  Found later replacement session:', s.id, 'on', sessionDate.toDateString());
                }
              }
            });
          }
          
          if (DEBUG_MODE && replacementSessions.length > 0) {
            console.log('  Found', replacementSessions.length, 'existing replacement sessions');
            console.log('  Updated latest date to:', actualLatestDate.toDateString());
          }
          
          // Find the next available day that matches any of the scheduled days
          let nextDate = new Date(actualLatestDate);
          nextDate.setDate(nextDate.getDate() + 1); // Start from the day after the latest session (including moved sessions)
          
          let foundNextDate = false;
          let daysChecked = 0;
          let selectedTime = '00:00';
          
          while (!foundNextDate && daysChecked < 14) { // Check up to 2 weeks ahead
            const currentDayIndex = nextDate.getDay();
            const matchingSchedule = scheduledDays.find((s: any) => s.dayIndex === currentDayIndex);
            
            if (matchingSchedule) {
              foundNextDate = true;
              selectedTime = matchingSchedule.time;
            } else {
              nextDate.setDate(nextDate.getDate() + 1);
              daysChecked++;
            }
          }
          
          // If no matching day found in 2 weeks, fallback to first scheduled day
          if (!foundNextDate && scheduledDays.length > 0) {
            const firstSchedule = scheduledDays[0];
            while (nextDate.getDay() !== firstSchedule.dayIndex) {
              nextDate.setDate(nextDate.getDate() + 1);
            }
            selectedTime = firstSchedule.time;
          }
          
          if (DEBUG_MODE) {
            console.log('📅 Calculated next available date for moved session:');
            console.log('  Next date:', nextDate.toISOString());
            console.log('  Selected time:', selectedTime);
            console.log('  Day of week:', daysOfWeek[nextDate.getDay()]);
          }
          
          // Create the replacement session
          // Get the original session date for the note
          const originalDate = session.scheduled_date || session.scheduledDate || session.scheduled_datetime || null;
          const originalDateFormatted = originalDate 
            ? new Date(originalDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
            : 'unknown date';
          
          // Format the date where the session is being moved to
          const movedToDateFormatted = nextDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
          
          // Update the original session with the actual date it was moved to
          pendingUpdate.notes = (session.notes || '') + ` [Moved to ${movedToDateFormatted}]`;
          await databaseService.update('sessions', p_session_id, pendingUpdate);
          
          // Build replacement session with BOTH field naming conventions for compatibility
          const replacementSession: any = {
            // Use both field naming conventions for subscription ID
            subscription_id: subscriptionId,
            subscriptionId: subscriptionId,
            
            // Schedule information
            scheduled_date: nextDate.toISOString().split('T')[0],
            scheduledDate: nextDate.toISOString().split('T')[0],
            scheduled_time: selectedTime,
            scheduledTime: selectedTime,
            
            // Duration in both formats
            duration_minutes: session.duration_minutes || session.durationMinutes || 60,
            durationMinutes: session.duration_minutes || session.durationMinutes || 60,
            
            // Status and completion
            status: 'scheduled',
            counts_toward_completion: true,
            countsTowardCompletion: true,
            
            // Reference to original moved session
            moved_from_session_id: p_session_id,
            
            // Descriptive note about the move
            notes: `[Moved from ${originalDateFormatted}]`,
            
            // Timestamps
            created_at: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          // Add student_id in both formats
          const studentId = session.student_id || session.studentId;
          if (studentId) {
            replacementSession.student_id = studentId;
            replacementSession.studentId = studentId;
          }
          
          // Add school_id in both formats
          const schoolId = session.school_id || session.schoolId;
          if (schoolId) {
            replacementSession.school_id = schoolId;
            replacementSession.schoolId = schoolId;
          }
          
          // Add teacher_id in both formats
          const teacherId = session.teacher_id || session.teacherId;
          if (teacherId) {
            replacementSession.teacher_id = teacherId;
            replacementSession.teacherId = teacherId;
          }
          
          // Add cost if it exists
          if (session.cost !== undefined && session.cost !== null) {
            replacementSession.cost = session.cost;
          }
          
          // Add payment_status if it exists
          if (session.payment_status || session.paymentStatus) {
            replacementSession.payment_status = session.payment_status || session.paymentStatus;
            replacementSession.paymentStatus = session.payment_status || session.paymentStatus;
          }
          
          // Keep the original session number and index
          const sessionNumber = session.session_number || session.sessionNumber || session.index_in_sub || session.indexInSub;
          if (sessionNumber !== undefined && sessionNumber !== null) {
            replacementSession.session_number = sessionNumber;
            replacementSession.sessionNumber = sessionNumber;
            replacementSession.index_in_sub = sessionNumber;
            replacementSession.indexInSub = sessionNumber;
          }
          
          // Store original date if available
          if (originalDate) {
            replacementSession.original_date = originalDate;
            replacementSession.originalDate = originalDate;
          }
          
          const newSessionId = await databaseService.create('sessions', replacementSession);
          if (DEBUG_MODE) console.log('✅ Created replacement session:', newSessionId);
          
          return { 
            data: { 
              success: true, 
              message: `Session moved successfully. New session created for ${replacementSession.scheduled_date}`,
              new_session_id: newSessionId
            }, 
            error: null 
          };
        }
        
        // If no schedule found, just mark as moved without creating replacement
        return { 
          data: { 
            success: true, 
            message: 'Session marked as moved (no replacement created - schedule not found)' 
          }, 
          error: null 
        };
      case 'restore':
        // Restore a moved session back to scheduled state
        const restoredSession = await databaseService.getById('sessions', p_session_id);
        if (!restoredSession) {
          throw new Error('Session not found');
        }
        
        // Only allow restoring sessions that were moved (status = 'rescheduled')
        if (restoredSession.status !== 'rescheduled') {
          throw new Error('Only moved sessions can be restored');
        }
        
        // Find and delete the replacement session that was created when this session was moved
        // The replacement session will have moved_from_session_id pointing to this session
        const replacementSessions = await databaseService.query('sessions', {
          where: [{ field: 'moved_from_session_id', operator: '==', value: p_session_id }]
        });
        
        if (replacementSessions.length > 0) {
          // Delete the replacement session(s)
          for (const replacementSession of replacementSessions) {
            if (DEBUG_MODE) console.log('🗑️ Deleting replacement session:', replacementSession.id);
            await databaseService.delete('sessions', replacementSession.id);
          }
        }
        
        // Restore the session to scheduled state
        updates.status = 'scheduled';
        updates.counts_toward_completion = true;
        
        // Clean up the notes - remove the "[Moved to ...]" or "[Rescheduled to ...]" text
        if (restoredSession.notes) {
          // Handle both moved and rescheduled formats
          updates.notes = restoredSession.notes
            .replace(/ \[Moved to [^\]]+\]/g, '') // Moved format with date
            .replace(/ \[Rescheduled to [^\]]+\]/g, '') // Rescheduled format with date
            .replace(' [Moved to another date]', '') // Old moved format
            .replace('[Moved to another date]', '')
            .trim();
          if (updates.notes === '') {
            updates.notes = null;
          }
        }
        
        // Remove the original_date field since we're restoring
        updates.original_date = null;
        
        if (DEBUG_MODE) console.log('✅ Restoring session to scheduled state:', p_session_id);
        
        break;
      default:
        throw new Error(`Unknown action: ${p_action}`);
    }
    
    // For non-moved actions, apply the updates
    if (p_action !== 'moved') {
      updates.updated_at = new Date().toISOString();
      
      // Update the session in Firebase
      await databaseService.update('sessions', p_session_id, updates);
      
      if (DEBUG_MODE) console.log('✅ Session updated successfully:', p_session_id, updates);
      
      // Update subscription session counts
      const session = await databaseService.getById('sessions', p_session_id);
      if (session && session.subscription_id) {
        // Get all sessions for this subscription to recalculate counts
        // Query BOTH field naming conventions and combine results
        const sessionsWithUnderscore = await databaseService.query('sessions', {
          where: [{ field: 'subscription_id', operator: '==', value: session.subscription_id }]
        });
        
        const sessionsWithCamelCase = await databaseService.query('sessions', {
          where: [{ field: 'subscriptionId', operator: '==', value: session.subscription_id }]
        });
        
        // Combine both results, avoiding duplicates
        const sessionMap = new Map();
        [...sessionsWithUnderscore, ...sessionsWithCamelCase].forEach(s => {
          sessionMap.set(s.id, s);
        });
        const allSessions = Array.from(sessionMap.values());
        
        // Calculate new counts
        const sessionsAttended = allSessions.filter((s: any) => s.status === 'completed' && s.counts_toward_completion).length;
        const sessionsCancelled = allSessions.filter((s: any) => s.status === 'cancelled' && s.counts_toward_completion).length;
        const sessionsCompleted = sessionsAttended + sessionsCancelled; // Both count as completed for progress
        const sessionsScheduled = allSessions.filter((s: any) => s.status === 'scheduled').length;
        
        // Update subscription with new counts
        await databaseService.update('subscriptions', session.subscription_id, {
          sessions_attended: sessionsAttended,
          sessions_cancelled: sessionsCancelled,
          sessions_completed: sessionsCompleted,
          sessions_scheduled: sessionsScheduled,
          updated_at: new Date().toISOString()
        });
        
        if (DEBUG_MODE) console.log('✅ Updated subscription counts:', {
          subscription_id: session.subscription_id,
          attended: sessionsAttended,
          cancelled: sessionsCancelled,
          completed: sessionsCompleted,
          scheduled: sessionsScheduled
        });
      }
    }
    
    return { 
      data: { 
        success: true, 
        message: `Session ${p_action} successfully` 
      }, 
      error: null 
    };
  } catch (error) {
    console.error('❌ Error handling session action:', error);
    return { 
      data: null, 
      error 
    };
  }
}

// Handle get_school_transactions RPC function
async function handleGetSchoolTransactions(params: { p_school_id: string }) {
  try {
    if (DEBUG_MODE) console.log('Getting transactions for school:', params.p_school_id);
    
    // Query all transactions for the school
    const transactions = await databaseService.query('transactions', {
      where: [{ field: 'school_id', operator: '==', value: params.p_school_id }]
    });
    
    // Get account names for the transactions
    const accountIds = new Set<string>();
    transactions.forEach((t: any) => {
      if (t.to_account_id) accountIds.add(t.to_account_id);
      if (t.from_account_id) accountIds.add(t.from_account_id);
    });
    
    // Fetch account details
    const accountMap = new Map<string, any>();
    for (const accountId of accountIds) {
      try {
        const account = await databaseService.getById('accounts', accountId);
        if (account) {
          accountMap.set(accountId, account);
        }
      } catch (error) {
        console.warn('Could not fetch account:', accountId);
      }
    }
    
    // Get student, contact, and category IDs for transactions
    const studentIds = new Set<string>();
    const contactIds = new Set<string>();
    const categoryIds = new Set<string>();
    
    transactions.forEach((t: any) => {
      if (t.studentId) studentIds.add(t.studentId);
      if (t.student_id) studentIds.add(t.student_id);
      if (t.contactId) contactIds.add(t.contactId);
      if (t.contact_id) contactIds.add(t.contact_id);
      if (t.categoryId) categoryIds.add(t.categoryId);
      if (t.category_id) categoryIds.add(t.category_id);
    });
    
    // Fetch students and their user data
    const studentMap = new Map<string, string>();
    let students: any[] = [];
    if (studentIds.size > 0) {
      students = await databaseService.query('students', {
        where: [{ field: 'schoolId', operator: '==', value: params.p_school_id }]
      });
      
      // Get user data for students
      for (const student of students) {
        if (studentIds.has(student.id)) {
          try {
            let studentName = 'Unknown Student';
            
            // First try to get name from user data
            const userId = student.userId || student.user_id;
            if (userId) {
              try {
                const user = await databaseService.getById('users', userId);
                if (user) {
                  studentName = `${user.firstName || user.first_name || ''} ${user.lastName || user.last_name || ''}`.trim();
                }
              } catch (error) {
                console.warn('Could not fetch user for student:', student.id, error);
              }
            }
            
            // If still unknown, try to get name from student's own fields
            if (studentName === 'Unknown Student' || !studentName) {
              const firstName = student.firstName || student.first_name || '';
              const lastName = student.lastName || student.last_name || '';
              if (firstName || lastName) {
                studentName = `${firstName} ${lastName}`.trim();
              }
            }
            
            studentMap.set(student.id, studentName || 'Unknown Student');
            console.log(`💳 Transaction student name for ${student.id}: ${studentName}`);
            
          } catch (error) {
            console.warn('Error processing student:', student.id, error);
            studentMap.set(student.id, 'Unknown Student');
          }
        }
      }
    }
    
    // Fetch contacts
    const contactMap = new Map<string, string>();
    if (contactIds.size > 0) {
      const contacts = await databaseService.query('contacts', {
        where: [{ field: 'schoolId', operator: '==', value: params.p_school_id }]
      });
      
      contacts.forEach((contact: any) => {
        if (contactIds.has(contact.id)) {
          contactMap.set(contact.id, contact.name || 'Unknown Contact');
        }
      });
    }
    
    // Fetch categories
    const categoryMap = new Map<string, string>();
    if (categoryIds.size > 0 || studentIds.size > 0) {
      // Try both field name formats for categories
      let categories = await databaseService.query('transaction_categories', {
        where: [{ field: 'schoolId', operator: '==', value: params.p_school_id }]
      });
      
      // If no results, try snake_case format
      if (!categories || categories.length === 0) {
        categories = await databaseService.query('transaction_categories', {
          where: [{ field: 'school_id', operator: '==', value: params.p_school_id }]
        });
      }
      
      // Map all categories by ID, not just the ones in categoryIds
      // This ensures we have all income categories available for students
      categories.forEach((category: any) => {
        categoryMap.set(category.id, category.name || 'Unknown Category');
      });
    }
    
    // Enrich transactions with account, contact/student, and category names
    // Filter out transactions for non-existent students
    const enrichedTransactions = await Promise.all(transactions.map(async (transaction: any) => {
      const studentId = transaction.studentId || transaction.student_id;
      const contactId = transaction.contactId || transaction.contact_id;
      let categoryId = transaction.categoryId || transaction.category_id;
      
      // Check if student exists - if student_id is set but student doesn't exist, skip this transaction
      if (studentId) {
        const studentExists = students.find(s => s.id === studentId);
        if (!studentExists) {
          console.log(`⚠️ Filtering out transaction for non-existent student: ${studentId}`);
          return null; // Will be filtered out below
        }
      }
      
      // If transaction has no category but has a student, try to get category from student
      if (!categoryId && studentId) {
        try {
          const student = students.find(s => s.id === studentId);
          if (student && (student.income_category_id || student.incomeCategoryId)) {
            categoryId = student.income_category_id || student.incomeCategoryId;
            console.log(`📂 Using student's income category for transaction: ${categoryId}`);
            
            // Update the transaction in the database to have this category_id for future
            await databaseService.update('transactions', transaction.id, {
              category_id: categoryId
            });
          }
        } catch (error) {
          console.warn('Could not update transaction category:', error);
        }
      }
      
      let contactName = null;
      
      if (studentId && studentMap.has(studentId)) {
        contactName = studentMap.get(studentId);
      } else if (contactId && contactMap.has(contactId)) {
        contactName = contactMap.get(contactId);
      }
      
      return {
        ...transaction,
        to_account_name: transaction.to_account_id ? accountMap.get(transaction.to_account_id)?.name : null,
        from_account_name: transaction.from_account_id ? accountMap.get(transaction.from_account_id)?.name : null,
        contact_name: contactName,
        category_name: categoryId ? categoryMap.get(categoryId) : null,
        // Ensure consistent field names
        amount: transaction.amount || 0,
        currency: transaction.currency || 'USD',
        status: transaction.status || 'completed',
        // Include the IDs for debugging
        student_id: studentId,
        contact_id: contactId,
        category_id: categoryId
      };
    }));
    
    // Filter out null entries (transactions for non-existent students)
    const validTransactions = enrichedTransactions.filter(t => t !== null);
    
    if (DEBUG_MODE) {
      console.log(`Found ${transactions.length} total transactions`);
      console.log(`Returning ${validTransactions.length} valid transactions (filtered ${transactions.length - validTransactions.length} orphaned)`);
    }
    
    return { 
      data: validTransactions,
      error: null 
    };
  } catch (error) {
    console.error('Error getting school transactions:', error);
    return { data: null, error };
  }
}

// Handle set_default_currency RPC function
async function handleSetDefaultCurrency(params: { p_currency_id: string, p_school_id: string }) {
  try {
    // First, unset all other currencies as default
    const currencies = await databaseService.query('currencies', {
      where: [{ field: 'school_id', operator: '==', value: params.p_school_id }]
    });
    
    // Update all currencies to not be default
    for (const currency of currencies) {
      if (currency.is_default) {
        await databaseService.update('currencies', currency.id, {
          is_default: false,
          updated_at: new Date().toISOString()
        });
      }
    }
    
    // Set the specified currency as default
    await databaseService.update('currencies', params.p_currency_id, {
      is_default: true,
      updated_at: new Date().toISOString()
    });
    
    return { data: { success: true }, error: null };
  } catch (error) {
    console.error('Error setting default currency:', error);
    return { data: null, error };
  }
}

// Handle get_students_password_info RPC function
async function handleGetStudentsPasswordInfo(params: { p_school_id: string }) {
  try {
    if (DEBUG_MODE) console.log('Getting students password info for school:', params.p_school_id);
    
    // Get all students for the school
    const students = await databaseService.query('students', {
      where: [{ field: 'schoolId', operator: '==', value: params.p_school_id }]
    });
    
    if (DEBUG_MODE) console.log(`Found ${students.length} students`);
    
    // For each student, get their user data to check for password
    const passwordInfo = await Promise.all(students.map(async (student: any) => {
      try {
        const user = await databaseService.getById('users', student.userId);
        
        // Check if user has password (temp password or has auth account)
        const hasPassword = !!(user?.tempPassword || (user?.needsAuthAccount === false));
        
        return {
          user_id: student.userId,
          has_password: hasPassword,
          password_length: hasPassword ? (user?.tempPassword?.length || 8) : 0
        };
      } catch (error) {
        console.warn('Could not fetch user for student:', student.id);
        return {
          user_id: student.userId,
          has_password: false,
          password_length: 0
        };
      }
    }));
    
    if (DEBUG_MODE) console.log(`Returning password info for ${passwordInfo.length} students`);
    
    return { data: passwordInfo, error: null };
  } catch (error) {
    console.error('Error getting students password info:', error);
    return { data: null, error };
  }
}

// Handle get_user_password_hash RPC function (returns plain text password)
async function handleGetUserPasswordHash(params: { p_user_id: string }) {
  try {
    if (DEBUG_MODE) console.log('Getting password for user:', params.p_user_id);
    
    const user = await databaseService.getById('users', params.p_user_id);
    
    if (!user) {
      if (DEBUG_MODE) console.log('User not found:', params.p_user_id);
      return { data: null, error: null };
    }
    
    // Return the temp password if it exists
    if (user.tempPassword) {
      return { 
        data: [{
          user_id: params.p_user_id,
          password_hash: user.tempPassword, // This is actually plain text
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName
        }], 
        error: null 
      };
    }
    
    if (DEBUG_MODE) console.log('No password set for user:', params.p_user_id);
    return { data: [], error: null };
  } catch (error) {
    console.error('Error getting user password:', error);
    return { data: null, error };
  }
}

// Handle update_student_password RPC function
async function handleUpdateStudentPassword(params: { p_user_id: string, p_password: string }) {
  try {
    if (DEBUG_MODE) console.log('Updating password for user:', params.p_user_id);
    
    // Update the user document with the new temporary password
    await databaseService.update('users', params.p_user_id, {
      tempPassword: params.p_password,
      needsAuthAccount: true, // Mark that they need an auth account
      updatedAt: new Date().toISOString()
    });
    
    if (DEBUG_MODE) console.log('Password updated successfully for user:', params.p_user_id);
    
    return { 
      data: { 
        success: true, 
        message: 'Password updated successfully' 
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Error updating student password:', error);
    return { 
      data: { 
        success: false, 
        message: error.message 
      }, 
      error 
    };
  }
}

// Handle verify_password_update RPC function
async function handleVerifyPasswordUpdate(params: { p_user_id: string }) {
  try {
    if (DEBUG_MODE) console.log('Verifying password update for user:', params.p_user_id);
    
    const user = await databaseService.getById('users', params.p_user_id);
    
    if (!user) {
      return { data: [], error: null };
    }
    
    const hasPassword = !!(user.tempPassword);
    
    return { 
      data: [{
        has_password: hasPassword,
        password_hash_length: hasPassword ? user.tempPassword.length : 0
      }], 
      error: null 
    };
  } catch (error) {
    console.error('Error verifying password update:', error);
    return { data: [], error };
  }
}

export default supabase;