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
      console.log('Creating sessions for subscription:', subscriptionId);
      console.log('Schedule:', params.p_schedule);
      console.log('Session count:', params.p_session_count);
      
      // Generate sessions based on schedule
      const sessions = [];
      const startDate = new Date(params.p_start_date);
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      // Get the schedule details
      const schedule = params.p_schedule[0]; // For now, use first schedule item
      const scheduledDay = schedule.day;
      const scheduledTime = schedule.time;
      
      // Find the day index for the scheduled day
      const dayIndex = daysOfWeek.findIndex(day => day.toLowerCase() === scheduledDay.toLowerCase());
      
      // Calculate actual session dates based on schedule
      let currentDate = new Date(startDate);
      let sessionsCreated = 0;
      
      // Find the first occurrence of the scheduled day
      while (currentDate.getDay() !== dayIndex && sessionsCreated < 100) { // Safety limit
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Create sessions on the scheduled day of each week
      for (let sessionNumber = 1; sessionNumber <= params.p_session_count; sessionNumber++) {
        const sessionData = {
          subscriptionId: subscriptionId,  // Use camelCase for Firebase
          studentId: params.p_student_id,
          schoolId: params.p_current_school_id,
          teacherId: params.p_teacher_id || null,
          sessionNumber: sessionNumber,
          scheduledDate: currentDate.toISOString().split('T')[0],
          scheduledTime: scheduledTime || '00:00',
          durationMinutes: 60, // Default duration
          status: 'scheduled',
          countsTowardCompletion: true, // New sessions count toward completion
          indexInSub: sessionNumber, // Track session index in subscription
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        const sessionId = await databaseService.create('sessions', sessionData);
        sessions.push({ id: sessionId, ...sessionData });
        
        // Move to next week for the next session
        currentDate.setDate(currentDate.getDate() + 7);
        sessionsCreated++;
      }
      
      console.log('Created sessions:', sessions.length);
    } else {
      console.log('No schedule or session count provided, skipping session creation');
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
    console.log('💳 Creating transaction with params:', params);
    
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
      subscription_id: params.p_subscription_id || null,
      student_id: params.p_student_id || null,
      status: 'completed', // Add status field as completed by default
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('💳 Transaction data to save:', transactionData);
    
    const transactionId = await databaseService.create('transactions', transactionData);
    
    console.log('✅ Transaction created with ID:', transactionId);
    
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
    
    console.log('Fetched currencies for school:', params.p_school_id, 'Count:', mappedCurrencies.length);
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
    
    console.log('Fetched accounts for school:', params.p_school_id, 'Count:', mappedAccounts.length);
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
    console.log('Getting lesson sessions for student:', params.p_student_id);
    
    // First, let's check if there are ANY sessions in the database
    const allSessions = await databaseService.query('sessions', {});
    console.log(`Total sessions in database: ${allSessions.length}`);
    if (allSessions.length > 0) {
      console.log('Sample session fields:', Object.keys(allSessions[0]));
      console.log('Sample session:', allSessions[0]);
    }
    
    // Query sessions from Firebase - try both camelCase and snake_case field names
    // First try camelCase (new format)
    let sessions = await databaseService.query('sessions', {
      where: [{ field: 'studentId', operator: '==', value: params.p_student_id }]
    });
    console.log(`Found ${sessions.length} sessions with studentId field`);
    
    // If no results, try snake_case (old format)
    if (!sessions || sessions.length === 0) {
      console.log('No sessions found with studentId, trying student_id...');
      sessions = await databaseService.query('sessions', {
        where: [{ field: 'student_id', operator: '==', value: params.p_student_id }]
      });
      console.log(`Found ${sessions.length} sessions with student_id field`);
    }
    
    // Map sessions to the expected format (Firebase uses camelCase, return snake_case)
    const mappedSessions = sessions.map((session: any) => ({
      id: session.id,
      subscription_id: session.subscriptionId || session.subscription_id,
      student_id: session.studentId || session.student_id,
      teacher_id: session.teacherId || session.teacher_id || null,
      session_number: session.sessionNumber || session.session_number,
      scheduled_date: session.scheduledDate || session.scheduled_date,
      scheduled_time: session.scheduledTime || session.scheduled_time,
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
    
    console.log(`Found ${mappedSessions.length} sessions for student ${params.p_student_id}`);
    
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
    console.log('Getting subscriptions for student:', params.p_student_id);
    
    // First, let's check if there are ANY subscriptions in the database
    const allSubscriptions = await databaseService.query('subscriptions', {});
    console.log(`Total subscriptions in database: ${allSubscriptions.length}`);
    if (allSubscriptions.length > 0) {
      console.log('Sample subscription fields:', Object.keys(allSubscriptions[0]));
      console.log('Sample subscription:', allSubscriptions[0]);
    }
    
    // Query subscriptions from Firebase - try both camelCase and snake_case field names
    // First try camelCase (new format)
    let subscriptions = await databaseService.query('subscriptions', {
      where: [{ field: 'studentId', operator: '==', value: params.p_student_id }]
    });
    console.log(`Found ${subscriptions.length} subscriptions with studentId field`);
    
    // If no results, try snake_case (old format)
    if (!subscriptions || subscriptions.length === 0) {
      console.log('No subscriptions found with studentId, trying student_id...');
      subscriptions = await databaseService.query('subscriptions', {
        where: [{ field: 'student_id', operator: '==', value: params.p_student_id }]
      });
      console.log(`Found ${subscriptions.length} subscriptions with student_id field`);
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
    console.log('🎯 Handling session action:', params);
    
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
          // Get the original session to store its date
          const originalSession = await databaseService.getById('sessions', p_session_id);
          const originalDate = originalSession?.scheduled_date || 'unknown date';
          
          updates.scheduled_date = p_new_datetime.split('T')[0];
          updates.scheduled_time = p_new_datetime.split('T')[1]?.split('.')[0] || '00:00';
          updates.status = 'scheduled'; // Keep as scheduled, not rescheduled
          updates.counts_toward_completion = true; // Still counts
          updates.original_date = originalDate; // Store original date
          updates.notes = (originalSession?.notes || '') + ` [Rescheduled from ${originalDate}]`;
        }
        break;
      case 'moved':
        // When moving a session, mark it as moved and create a replacement
        const session = await databaseService.getById('sessions', p_session_id);
        if (!session) {
          throw new Error('Session not found');
        }
        
        // Mark original session as moved (doesn't count toward completion)
        updates.status = 'rescheduled';
        updates.counts_toward_completion = false;
        updates.original_date = session.scheduled_date; // Store for display
        updates.notes = (session.notes || '') + ` [Moved to another date]`;
        
        // Update the original session
        await databaseService.update('sessions', p_session_id, updates);
        
        // Find the next available date that matches the subscription schedule
        const subscription = await databaseService.getById('subscriptions', session.subscription_id);
        if (subscription && subscription.schedule && subscription.schedule.length > 0) {
          const schedule = subscription.schedule[0];
          const scheduledDay = schedule.day;
          const scheduledTime = schedule.time || '00:00';
          
          // Get all sessions for this subscription to find the last date
          const allSessions = await databaseService.query('sessions', {
            where: [{ field: 'subscription_id', operator: '==', value: session.subscription_id }]
          });
          
          // Find the latest scheduled date
          let latestDate = new Date();
          allSessions.forEach((s: any) => {
            const sessionDate = new Date(s.scheduled_date);
            if (sessionDate > latestDate && s.status === 'scheduled') {
              latestDate = sessionDate;
            }
          });
          
          // Calculate next occurrence of the scheduled day after the latest date
          const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const targetDayIndex = daysOfWeek.findIndex(d => d === scheduledDay.toLowerCase());
          
          let nextDate = new Date(latestDate);
          nextDate.setDate(nextDate.getDate() + 7); // Start from next week
          
          // Find the next occurrence of the target day
          while (nextDate.getDay() !== targetDayIndex) {
            nextDate.setDate(nextDate.getDate() + 1);
          }
          
          // Create the replacement session
          const replacementSession = {
            subscription_id: session.subscription_id,
            student_id: session.student_id,
            school_id: session.school_id,
            teacher_id: session.teacher_id,
            session_number: session.session_number,
            scheduled_date: nextDate.toISOString().split('T')[0],
            scheduled_time: scheduledTime,
            duration_minutes: session.duration_minutes || 60,
            status: 'scheduled',
            counts_toward_completion: true,
            moved_from_session_id: p_session_id,
            notes: `[Moved from ${session.scheduled_date}]`,
            original_date: session.scheduled_date,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          const newSessionId = await databaseService.create('sessions', replacementSession);
          console.log('✅ Created replacement session:', newSessionId);
          
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
      default:
        throw new Error(`Unknown action: ${p_action}`);
    }
    
    // For non-moved actions, apply the updates
    if (p_action !== 'moved') {
      updates.updated_at = new Date().toISOString();
      
      // Update the session in Firebase
      await databaseService.update('sessions', p_session_id, updates);
      
      console.log('✅ Session updated successfully:', p_session_id, updates);
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
    console.log('Getting transactions for school:', params.p_school_id);
    
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
    
    // Get student and contact names for transactions
    const studentIds = new Set<string>();
    const contactIds = new Set<string>();
    
    transactions.forEach((t: any) => {
      if (t.studentId) studentIds.add(t.studentId);
      if (t.student_id) studentIds.add(t.student_id);
      if (t.contactId) contactIds.add(t.contactId);
      if (t.contact_id) contactIds.add(t.contact_id);
    });
    
    // Fetch students and their user data
    const studentMap = new Map<string, string>();
    if (studentIds.size > 0) {
      const students = await databaseService.query('students', {
        where: [{ field: 'schoolId', operator: '==', value: params.p_school_id }]
      });
      
      // Get user data for students
      for (const student of students) {
        if (studentIds.has(student.id)) {
          try {
            const user = await databaseService.getById('users', student.userId);
            if (user) {
              const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
              studentMap.set(student.id, fullName || 'Unknown Student');
            }
          } catch (error) {
            console.warn('Could not fetch user for student:', student.id);
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
    
    // Enrich transactions with account and contact/student names
    const enrichedTransactions = transactions.map((transaction: any) => {
      const studentId = transaction.studentId || transaction.student_id;
      const contactId = transaction.contactId || transaction.contact_id;
      
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
        // Ensure consistent field names
        amount: transaction.amount || 0,
        currency: transaction.currency || 'USD',
        status: transaction.status || 'completed',
        // Include the IDs for debugging
        student_id: studentId,
        contact_id: contactId
      };
    });
    
    console.log(`Found ${enrichedTransactions.length} transactions for school`);
    
    return { 
      data: enrichedTransactions,
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

export default supabase;