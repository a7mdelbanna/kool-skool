import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseKey);

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
