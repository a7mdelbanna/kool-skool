
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Type definitions
export interface Course {
  id: string;
  name: string;
  lesson_type: string;
  school_id: string;
  created_at: string;
  updated_at: string;
}

export interface StudentRecord {
  id: string;
  school_id: string;
  user_id: string;
  teacher_id?: string;
  course_id?: string;
  age_group?: string;
  level?: string;
  phone?: string;
  created_at: string;
  first_name: string;
  last_name: string;
  email: string;
  course_name?: string;
  lesson_type?: string;
  teacher_first_name?: string;
  teacher_last_name?: string;
  teacher_email?: string;
  payment_status: string;
  lessons_count: number;
  next_session_date?: string;
  next_payment_date?: string;
  next_payment_amount?: number;
  subscription_progress: string;
}

export interface UserLoginResponse {
  success: boolean;
  message?: string;
  user_id?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  school_id?: string;
}

export interface SchoolSetupResponse {
  success: boolean;
  message?: string;
  school_id?: string;
  user_id?: string;
}

export interface CreateStudentResponse {
  success: boolean;
  message?: string;
  student_id?: string;
  user_id?: string;
}

export interface TeamMemberResponse {
  success: boolean;
  message?: string;
  user_id?: string;
}

export const getCurrentUserInfo = async () => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.log('No user found');
    return null;
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id);

  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  return data;
};

export const getStudentsWithDetails = async (schoolId: string) => {
  console.log('Fetching students for school:', schoolId);

  const { data, error } = await supabase.from('students')
    .select(`
      id,
      created_at,
      first_name,
      last_name,
      date_of_birth,
      email,
      phone_number,
      address,
      city,
      state,
      zip_code,
      grade_level,
      parent_guardian_name,
      parent_guardian_email,
      parent_guardian_phone,
      notes,
      student_classes (
        class_id,
        classes (
          class_name
        )
      )
    `)
    .eq('school_id', schoolId);

  if (error) {
    console.error('Error fetching students:', error);
    return [];
  }

  console.log('Students fetched:', data);
  return data;
};

export const getStudentPayments = async (studentId: string) => {
  console.log('Fetching payments for student:', studentId);

  const { data, error } = await supabase
    .from('student_payments')
    .select('*')
    .eq('student_id', studentId);

  if (error) {
    console.error('Error fetching student payments:', error);
    return [];
  }

  console.log('Payments fetched:', data);
  return data;
};

export const addStudentPayment = async (paymentData: {
  student_id: string;
  amount: number;
  currency: string;
  payment_date: string;
  payment_method: string;
  status: string;
  notes: string;
}) => {
  console.log('Adding payment:', paymentData);

  const { data, error } = await supabase
    .from('student_payments')
    .insert(paymentData)
    .select()
    .single();

  if (error) {
    console.error('Error adding payment:', error);
    throw error;
  }

  return data;
};

export const deleteStudentPayment = async (paymentId: string) => {
  console.log('Deleting payment:', paymentId);

  const { error } = await supabase
    .from('student_payments')
    .delete()
    .eq('id', paymentId);

  if (error) {
    console.error('Error deleting payment:', error);
    throw error;
  }
};

export const getSchoolTransactions = async (schoolId: string) => {
  console.log('Fetching transactions for school:', schoolId);

  const { data, error } = await supabase
    .from('school_transactions')
    .select(`
      *,
      tags (
        id,
        name,
        color
      )
    `)
    .eq('school_id', schoolId);

  if (error) {
    console.error('Error fetching school transactions:', error);
    return [];
  }

  console.log('Transactions fetched:', data);
  return data;
};

export const getSchoolTags = async (schoolId: string) => {
  console.log('Fetching tags for school:', schoolId);

  const { data, error } = await supabase
    .from('school_tags')
    .select('*')
    .eq('school_id', schoolId);

  if (error) {
    console.error('Error fetching tags:', error);
    return [];
  }

  console.log('Tags fetched:', data);
  return data;
};

// Add missing functions for transaction management
export const getSchoolCategories = async (schoolId: string) => {
  console.log('🏷️ Fetching categories for school:', schoolId);
  
  const { data, error } = await supabase.rpc('get_school_categories', {
    p_school_id: schoolId
  });
  
  if (error) {
    console.error('❌ Error fetching categories:', error);
    throw error;
  }
  
  console.log('✅ Categories fetched:', data);
  return data || [];
};

export const getSchoolContacts = async (schoolId: string) => {
  console.log('👥 Fetching contacts for school:', schoolId);
  
  const { data, error } = await supabase.rpc('get_school_contacts', {
    p_school_id: schoolId
  });
  
  if (error) {
    console.error('❌ Error fetching contacts:', error);
    throw error;
  }
  
  console.log('✅ Contacts fetched:', data);
  return data || [];
};

export const getSchoolContactTypes = async (schoolId: string) => {
  console.log('📋 Fetching contact types for school:', schoolId);
  
  const { data, error } = await supabase
    .from('contact_types')
    .select('*')
    .eq('school_id', schoolId)
    .eq('is_active', true);
  
  if (error) {
    console.error('❌ Error fetching contact types:', error);
    throw error;
  }
  
  console.log('✅ Contact types fetched:', data);
  return data || [];
};

export const createContactType = async (schoolId: string, name: string, color: string) => {
  console.log('➕ Creating contact type:', { schoolId, name, color });
  
  const { data, error } = await supabase
    .from('contact_types')
    .insert({
      school_id: schoolId,
      name,
      color,
      is_active: true
    })
    .select()
    .single();
  
  if (error) {
    console.error('❌ Error creating contact type:', error);
    throw error;
  }
  
  console.log('✅ Contact type created:', data);
  return data;
};

export const updateContactType = async (contactTypeId: string, name: string, color: string) => {
  console.log('✏️ Updating contact type:', { contactTypeId, name, color });
  
  const { data, error } = await supabase
    .from('contact_types')
    .update({
      name,
      color,
      updated_at: new Date().toISOString()
    })
    .eq('id', contactTypeId)
    .select()
    .single();
  
  if (error) {
    console.error('❌ Error updating contact type:', error);
    throw error;
  }
  
  console.log('✅ Contact type updated:', data);
  return data;
};

export const deleteContactType = async (contactTypeId: string) => {
  console.log('🗑️ Deleting contact type:', contactTypeId);
  
  const { error } = await supabase
    .from('contact_types')
    .delete()
    .eq('id', contactTypeId);
  
  if (error) {
    console.error('❌ Error deleting contact type:', error);
    throw error;
  }
  
  console.log('✅ Contact type deleted');
};

export const getSchoolAccounts = async (schoolId: string) => {
  console.log('🏦 Fetching accounts for school:', schoolId);
  
  const { data, error } = await supabase.rpc('get_school_accounts', {
    p_school_id: schoolId
  });
  
  if (error) {
    console.error('❌ Error fetching accounts:', error);
    throw error;
  }
  
  console.log('✅ Accounts fetched:', data);
  return data || [];
};

export const getSchoolCourses = async (schoolId: string) => {
  console.log('📚 Fetching courses for school:', schoolId);
  
  const { data, error } = await supabase.rpc('get_school_courses', {
    p_school_id: schoolId
  });
  
  if (error) {
    console.error('❌ Error fetching courses:', error);
    throw error;
  }
  
  console.log('✅ Courses fetched:', data);
  return data || [];
};

export const createCourse = async (courseData: {
  school_id: string;
  name: string;
  lesson_type: string;
}) => {
  console.log('➕ Creating course:', courseData);
  
  const { data, error } = await supabase
    .from('courses')
    .insert(courseData)
    .select()
    .single();
  
  if (error) {
    console.error('❌ Error creating course:', error);
    throw error;
  }
  
  console.log('✅ Course created:', data);
  return data;
};

export const updateCourse = async (courseId: string, courseData: {
  name: string;
  lesson_type: string;
}) => {
  console.log('✏️ Updating course:', courseId, courseData);
  
  const { data, error } = await supabase
    .from('courses')
    .update({
      ...courseData,
      updated_at: new Date().toISOString()
    })
    .eq('id', courseId)
    .select()
    .single();
  
  if (error) {
    console.error('❌ Error updating course:', error);
    throw error;
  }
  
  console.log('✅ Course updated:', data);
  return data;
};

export const deleteCourse = async (courseId: string) => {
  console.log('🗑️ Deleting course:', courseId);
  
  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', courseId);
  
  if (error) {
    console.error('❌ Error deleting course:', error);
    throw error;
  }
  
  console.log('✅ Course deleted');
};

export const getSchoolTeachers = async (schoolId: string) => {
  console.log('👨‍🏫 Fetching teachers for school:', schoolId);
  
  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, email')
    .eq('school_id', schoolId)
    .eq('role', 'teacher');
  
  if (error) {
    console.error('❌ Error fetching teachers:', error);
    throw error;
  }
  
  console.log('✅ Teachers fetched:', data);
  return data || [];
};

export const createStudent = async (studentData: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  teacher_id?: string;
  course_id?: string;
  age_group?: string;
  level?: string;
  phone?: string;
  current_user_id: string;
}) => {
  console.log('👤 Creating student:', studentData);
  
  const { data, error } = await supabase.rpc('create_student', {
    student_email: studentData.email,
    student_password: studentData.password,
    student_first_name: studentData.first_name,
    student_last_name: studentData.last_name,
    teacher_id: studentData.teacher_id,
    course_id: studentData.course_id,
    age_group: studentData.age_group,
    level: studentData.level,
    phone: studentData.phone,
    current_user_id: studentData.current_user_id
  });
  
  if (error) {
    console.error('❌ Error creating student:', error);
    throw error;
  }
  
  console.log('✅ Student created:', data);
  return data;
};

export const getTeamMembers = async (schoolId: string) => {
  console.log('👥 Fetching team members for school:', schoolId);
  
  const { data, error } = await supabase.rpc('get_team_members', {
    p_school_id: schoolId
  });
  
  if (error) {
    console.error('❌ Error fetching team members:', error);
    throw error;
  }
  
  console.log('✅ Team members fetched:', data);
  return data || [];
};

export const getStudentSubscriptions = async (studentId: string) => {
  console.log('📋 Fetching subscriptions for student:', studentId);
  
  const { data, error } = await supabase.rpc('get_student_subscriptions', {
    p_student_id: studentId
  });
  
  if (error) {
    console.error('❌ Error fetching subscriptions:', error);
    throw error;
  }
  
  console.log('✅ Subscriptions fetched:', data);
  return data || [];
};

export const addStudentSubscription = async (subscriptionData: any) => {
  console.log('➕ Adding subscription:', subscriptionData);
  
  const { data, error } = await supabase.rpc('add_student_subscription', subscriptionData);
  
  if (error) {
    console.error('❌ Error adding subscription:', error);
    throw error;
  }
  
  console.log('✅ Subscription added:', data);
  return data;
};

export const deleteStudentSubscription = async (subscriptionId: string) => {
  console.log('🗑️ Deleting subscription:', subscriptionId);
  
  const { error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('id', subscriptionId);
  
  if (error) {
    console.error('❌ Error deleting subscription:', error);
    throw error;
  }
  
  console.log('✅ Subscription deleted');
};

export const getStudentLessonSessions = async (studentId: string) => {
  console.log('📅 Fetching lesson sessions for student:', studentId);
  
  const { data, error } = await supabase.rpc('get_lesson_sessions', {
    p_student_id: studentId
  });
  
  if (error) {
    console.error('❌ Error fetching lesson sessions:', error);
    throw error;
  }
  
  console.log('✅ Lesson sessions fetched:', data);
  return data || [];
};

export const handleSessionAction = async (sessionId: string, action: string, newDatetime?: string) => {
  console.log('⚡ Handling session action:', { sessionId, action, newDatetime });
  
  const { data, error } = await supabase.rpc('handle_session_action', {
    p_session_id: sessionId,
    p_action: action,
    p_new_datetime: newDatetime || null
  });
  
  if (error) {
    console.error('❌ Error handling session action:', error);
    throw error;
  }
  
  console.log('✅ Session action completed:', data);
  return data;
};

export const createTransaction = async (transactionData: {
  school_id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  currency: string;
  transaction_date: string;
  description: string;
  notes?: string | null;
  contact_id?: string | null;
  category_id?: string | null;
  from_account_id?: string | null;
  to_account_id?: string | null;
  payment_method?: string | null;
  receipt_number?: string | null;
  receipt_url?: string | null;
  tax_amount?: number;
  tax_rate?: number;
  is_recurring?: boolean;
  recurring_frequency?: string | null;
  recurring_end_date?: string | null;
  tag_ids?: string[] | null;
}) => {
  console.log('💰 Creating transaction:', transactionData);
  
  const { data, error } = await supabase.rpc('create_transaction', {
    p_school_id: transactionData.school_id,
    p_type: transactionData.type,
    p_amount: transactionData.amount,
    p_currency: transactionData.currency,
    p_transaction_date: transactionData.transaction_date,
    p_description: transactionData.description,
    p_notes: transactionData.notes,
    p_contact_id: transactionData.contact_id,
    p_category_id: transactionData.category_id,
    p_from_account_id: transactionData.from_account_id,
    p_to_account_id: transactionData.to_account_id,
    p_payment_method: transactionData.payment_method,
    p_receipt_number: transactionData.receipt_number,
    p_receipt_url: transactionData.receipt_url,
    p_tax_amount: transactionData.tax_amount || 0,
    p_tax_rate: transactionData.tax_rate || 0,
    p_is_recurring: transactionData.is_recurring || false,
    p_recurring_frequency: transactionData.recurring_frequency,
    p_recurring_end_date: transactionData.recurring_end_date,
    p_tag_ids: transactionData.tag_ids,
  });
  
  if (error) {
    console.error('❌ Error creating transaction:', error);
    throw error;
  }
  
  console.log('✅ Transaction created with ID:', data);
  return data;
};
