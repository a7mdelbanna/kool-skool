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
    // Map the p_ prefixed params to actual field names
    const subscriptionData = {
      student_id: params.p_student_id,
      session_count: params.p_session_count,
      duration_months: params.p_duration_months,
      start_date: params.p_start_date,
      schedule: params.p_schedule,
      price_mode: params.p_price_mode,
      price_per_session: params.p_price_per_session,
      fixed_price: params.p_fixed_price,
      total_price: params.p_total_price,
      currency: params.p_currency,
      notes: params.p_notes || '',
      status: params.p_status || 'active',
      school_id: params.p_current_school_id,
      created_by: params.p_current_user_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
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
          subscription_id: subscriptionId,
          student_id: params.p_student_id,
          school_id: params.p_current_school_id,
          teacher_id: params.p_teacher_id || null,
          session_number: sessionNumber,
          scheduled_date: currentDate.toISOString().split('T')[0],
          scheduled_time: scheduledTime || '00:00',
          duration_minutes: 60, // Default duration
          status: 'scheduled',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
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
    
    // Query sessions from Firebase
    const sessions = await databaseService.query('sessions', {
      where: [{ field: 'student_id', operator: '==', value: params.p_student_id }]
    });
    
    // Map sessions to the expected format
    const mappedSessions = sessions.map((session: any) => ({
      id: session.id,
      subscription_id: session.subscription_id,
      student_id: session.student_id,
      teacher_id: session.teacher_id || null,
      session_number: session.session_number,
      scheduled_date: session.scheduled_date,
      scheduled_time: session.scheduled_time,
      duration_minutes: session.duration_minutes || 60,
      status: session.status || 'scheduled',
      attended: session.attended || false,
      notes: session.notes || '',
      created_at: session.created_at,
      updated_at: session.updated_at
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
    
    // Query subscriptions from Firebase
    const subscriptions = await databaseService.query('subscriptions', {
      where: [{ field: 'student_id', operator: '==', value: params.p_student_id }]
    });
    
    // For each subscription, calculate sessions taken and scheduled
    const enrichedSubscriptions = await Promise.all(subscriptions.map(async (subscription: any) => {
      // Get sessions for this subscription
      const sessions = await databaseService.query('sessions', {
        where: [{ field: 'subscription_id', operator: '==', value: subscription.id }]
      });
      
      // Count sessions by status
      const sessionsTaken = sessions.filter((s: any) => s.status === 'completed').length;
      const sessionsScheduled = sessions.filter((s: any) => s.status === 'scheduled').length;
      
      return {
        id: subscription.id,
        student_id: subscription.student_id,
        session_count: subscription.session_count,
        duration_months: subscription.duration_months,
        start_date: subscription.start_date,
        schedule: subscription.schedule,
        price_mode: subscription.price_mode,
        price_per_session: subscription.price_per_session,
        fixed_price: subscription.fixed_price,
        total_price: subscription.total_price,
        currency: subscription.currency,
        notes: subscription.notes,
        status: subscription.status,
        sessions_taken: sessionsTaken,
        sessions_scheduled: sessionsScheduled,
        created_at: subscription.created_at,
        updated_at: subscription.updated_at
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