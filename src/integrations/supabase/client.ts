import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://clacmtyxfdtfgjkozmqf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsYWNtdHl4ZmR0Zmdqa296bXFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4OTEzMzgsImV4cCI6MjA2NjQ2NzMzOH0.HKKmBmDpQdZ7-hcpj7wM8IJPFVD52T-IfThF9jpjdvY';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Define types for data consistency
export interface StudentRecord {
  id: string;
  created_at?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  course_name: string;
  lesson_type: 'individual' | 'group';
  age_group: 'adult' | 'kid';
  level: 'beginner' | 'intermediate' | 'advanced' | 'fluent';
  teacher_id?: string;
  school_id?: string;
  payment_status?: 'paid' | 'pending' | 'overdue';
  next_payment_date?: string;
  next_payment_amount?: number;
  lessons_count?: number;
  next_session_date?: string;
  subscription_progress?: string;
}

export interface CourseRecord {
  id: string;
  created_at?: string;
  name: string;
  type: 'individual' | 'group';
  school_id?: string;
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

// Function to get students with details
export const getStudentsWithDetails = async (schoolId: string | undefined) => {
  if (!schoolId) {
    console.warn('No school ID provided to getStudentsWithDetails');
    return [];
  }

  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('school_id', schoolId);

  if (error) {
    console.error('Error fetching students:', error);
    throw error;
  }

  return data || [];
};

// Function to create a new student
export const createStudent = async (studentData: Omit<StudentRecord, 'id' | 'created_at'>) => {
  const { data, error } = await supabase
    .from('students')
    .insert([studentData])
    .select()
    .single();

  if (error) {
    console.error('Error creating student:', error);
    throw error;
  }

  return data;
};

// Function to update an existing student
export const updateStudent = async (id: string, updates: Partial<StudentRecord>) => {
  const { data, error } = await supabase
    .from('students')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating student:', error);
    throw error;
  }

  return data;
};

// Function to delete a student
export const deleteStudent = async (id: string) => {
  const { data, error } = await supabase
    .from('students')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting student:', error);
    throw error;
  }

  return data;
};

// Function to get courses for a specific school
export const getCourses = async (schoolId: string | undefined) => {
  if (!schoolId) {
    console.warn('No school ID provided to getCourses');
    return [];
  }

  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('school_id', schoolId);

  if (error) {
    console.error('Error fetching courses:', error);
    throw error;
  }

  return data || [];
};

// Function to create a new course
export const createCourse = async (name: string, type: 'individual' | 'group') => {
  const user = supabase.auth.user();

  if (!user) {
    console.error('User not authenticated.');
    throw new Error('Authentication required to create a course.');
  }

  const schoolId = user.user_metadata.schoolId;

  if (!schoolId) {
    console.error('School ID not found in user metadata.');
    throw new Error('School ID is required to create a course.');
  }

  const { data, error } = await supabase
    .from('courses')
    .insert([{ name, type, school_id: schoolId }])
    .select()
    .single();

  if (error) {
    console.error('Error creating course:', error);
    throw error;
  }

  return data;
};

// Function to get payments for a specific student
export const getStudentPayments = async (studentId: string) => {
    const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', studentId);

    if (error) {
        console.error('Error fetching payments:', error);
        throw error;
    }

    return data || [];
};

// Function to create a new payment
export const createPayment = async (paymentData: Omit<PaymentRecord, 'id' | 'created_at'>) => {
  const { data, error } = await supabase
    .from('payments')
    .insert([paymentData])
    .select()
    .single();

  if (error) {
    console.error('Error creating payment:', error);
    throw error;
  }

  return data;
};

// Function to update an existing payment
export const updatePayment = async (id: string, updates: Partial<PaymentRecord>) => {
  const { data, error } = await supabase
    .from('payments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating payment:', error);
    throw error;
  }

  return data;
};

// Function to delete a payment
export const deletePayment = async (id: string) => {
  const { data, error } = await supabase
    .from('payments')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting payment:', error);
    throw error;
  }

  return data;
};

// Function to get current user info
export const getCurrentUserInfo = async () => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.warn('No user signed in.');
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id);

  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  return data || null;
};

// Function to get school tags
export const getSchoolTags = async (schoolId: string | undefined) => {
  if (!schoolId) {
    console.warn('No school ID provided to getSchoolTags');
    return [];
  }

  const { data, error } = await supabase
    .from('school_tags')
    .select('*')
    .eq('school_id', schoolId);

  if (error) {
    console.error('Error fetching school tags:', error);
    throw error;
  }

  return data || [];
};

// Function to create a new school tag
export const createSchoolTag = async (tagData: Omit<SchoolTag, 'id' | 'created_at'>) => {
  const { data, error } = await supabase
    .from('school_tags')
    .insert([tagData])
    .select()
    .single();

  if (error) {
    console.error('Error creating school tag:', error);
    throw error;
  }

  return data;
};

// Function to update an existing school tag
export const updateSchoolTag = async (id: string, updates: Partial<SchoolTag>) => {
  const { data, error } = await supabase
    .from('school_tags')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating school tag:', error);
    throw error;
  }

  return data;
};

// Function to delete a school tag
export const deleteSchoolTag = async (id: string) => {
  const { data, error } = await supabase
    .from('school_tags')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting school tag:', error);
    throw error;
  }

  return data;
};

// Function to get school transactions
export const getSchoolTransactions = async (schoolId: string | undefined) => {
  if (!schoolId) {
    console.warn('No school ID provided to getSchoolTransactions');
    return [];
  }

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      tags:transaction_tags (
        tag_id,
        school_tag (*)
      )
    `)
    .eq('school_id', schoolId);

  if (error) {
    console.error('Error fetching school transactions:', error);
    throw error;
  }

  // Transform the data to include the tag information
  const transactions = data ? data.map(transaction => {
    const tags = transaction.tags ? transaction.tags.map(tag => tag.school_tag) : [];
    return {
      ...transaction,
      tags: tags
    };
  }) : [];

  return transactions;
};

// Add the missing createTransaction function
export const createTransaction = async (transactionData: {
  school_id: string;
  type: string;
  amount: number;
  currency: string;
  transaction_date: string;
  description: string;
  notes?: string;
  contact_id?: string;
  category_id?: string;
  from_account_id?: string;
  to_account_id?: string;
  payment_method?: string;
  receipt_number?: string;
  receipt_url?: string;
  tax_amount?: number;
  tax_rate?: number;
  is_recurring?: boolean;
  recurring_frequency?: string;
  recurring_end_date?: string;
  tag_ids?: string[];
}) => {
  try {
    const { data, error } = await supabase.rpc('create_transaction', {
      p_school_id: transactionData.school_id,
      p_type: transactionData.type,
      p_amount: transactionData.amount,
      p_currency: transactionData.currency,
      p_transaction_date: transactionData.transaction_date,
      p_description: transactionData.description,
      p_notes: transactionData.notes || null,
      p_contact_id: transactionData.contact_id || null,
      p_category_id: transactionData.category_id || null,
      p_from_account_id: transactionData.from_account_id || null,
      p_to_account_id: transactionData.to_account_id || null,
      p_payment_method: transactionData.payment_method || null,
      p_receipt_number: transactionData.receipt_number || null,
      p_receipt_url: transactionData.receipt_url || null,
      p_tax_amount: transactionData.tax_amount || 0,
      p_tax_rate: transactionData.tax_rate || 0,
      p_is_recurring: transactionData.is_recurring || false,
      p_recurring_frequency: transactionData.recurring_frequency || null,
      p_recurring_end_date: transactionData.recurring_end_date || null,
      p_tag_ids: transactionData.tag_ids || null
    });

    if (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createTransaction:', error);
    throw error;
  }
};
