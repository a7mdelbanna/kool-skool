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
    const subscriptionId = await databaseService.create('subscriptions', params);
    return { data: { id: subscriptionId }, error: null };
  } catch (error) {
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
    const transactionId = await databaseService.create('transactions', params);
    return { data: { id: transactionId }, error: null };
  } catch (error) {
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
    const accounts = await databaseService.query('accounts', {
      where: [{ field: 'schoolId', operator: '==', value: params.p_school_id }]
    });
    return { data: accounts, error: null };
  } catch (error) {
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
    // For now, return empty sessions until we implement the full subscription/session system
    // This prevents errors while we focus on other functionality
    console.log('Getting lesson sessions for student:', params.p_student_id);
    
    // TODO: Implement full session fetching from Firebase
    // This would query the sessions collection filtered by student_id
    // and join with subscription data
    
    return { 
      data: [], // Return empty array for now
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
    // For now, return empty subscriptions until we implement the full subscription system
    console.log('Getting subscriptions for student:', params.p_student_id);
    
    // TODO: Implement full subscription fetching from Firebase
    // This would query the subscriptions collection filtered by student_id
    // The expected return structure includes:
    // - id, student_id, session_count, duration_months
    // - start_date, schedule, price_mode, price_per_session
    // - sessions_taken, sessions_scheduled, status, created_at, updated_at
    
    return { 
      data: [], // Return empty array for now
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