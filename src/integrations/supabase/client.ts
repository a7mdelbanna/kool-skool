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

// New interfaces for missing types
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

// Function to get students with details using the proper SQL function
export const getStudentsWithDetails = async (schoolId: string | undefined) => {
  if (!schoolId) {
    console.warn('No school ID provided to getStudentsWithDetails');
    return [];
  }

  console.log('Fetching students with details for school:', schoolId);

  const { data, error } = await supabase.rpc('get_students_with_details', {
    p_school_id: schoolId
  });

  if (error) {
    console.error('Error fetching students with details:', error);
    throw error;
  }

  console.log('Students data received from RPC:', data);
  return data || [];
};

// Function to create a new student
export const createStudent = async (studentData: {
  student_email: string;
  student_password: string;
  first_name: string;
  last_name: string;
  teacher_id: string;
  course_id: string;
  age_group: string;
  level: string;
  phone?: string;
}): Promise<CreateStudentResponse> => {
  try {
    const userData = localStorage.getItem('user');
    const user = userData ? JSON.parse(userData) : null;
    
    if (!user || !user.id) {
      return {
        success: false,
        message: 'User not authenticated'
      };
    }

    const { data, error } = await supabase.rpc('create_student', {
      student_email: studentData.student_email,
      student_password: studentData.student_password,
      student_first_name: studentData.first_name,
      student_last_name: studentData.last_name,
      teacher_id: studentData.teacher_id,
      course_id: studentData.course_id,
      age_group: studentData.age_group,
      level: studentData.level,
      phone: studentData.phone,
      current_user_id: user.id
    });

    if (error) {
      console.error('Error creating student:', error);
      return {
        success: false,
        message: error.message
      };
    }

    return data;
  } catch (error: any) {
    console.error('Error in createStudent:', error);
    return {
      success: false,
      message: error.message
    };
  }
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

// Function to get school courses using RPC
export const getSchoolCourses = async (schoolId: string): Promise<Course[]> => {
  const { data, error } = await supabase.rpc('get_school_courses', {
    p_school_id: schoolId
  });

  if (error) {
    console.error('Error fetching school courses:', error);
    throw error;
  }

  return data || [];
};

// Function to get school teachers using the same approach as team members
export const getSchoolTeachers = async (schoolId: string) => {
  console.log('=== getSchoolTeachers FUNCTION START ===');
  console.log('Input schoolId:', schoolId);
  console.log('Type of schoolId:', typeof schoolId);
  
  if (!schoolId) {
    console.warn('No schoolId provided to getSchoolTeachers');
    return [];
  }

  try {
    // Use the same approach as get_team_members but filter for teachers only
    console.log('=== USING TEAM MEMBERS APPROACH ===');
    console.log('Calling get_team_members RPC and filtering for teachers');
    
    const { data, error } = await supabase.rpc('get_team_members', {
      p_school_id: schoolId
    });

    console.log('=== TEAM MEMBERS RPC RESULT ===');
    console.log('Error:', error);
    console.log('Data:', data);
    console.log('Data type:', typeof data);
    console.log('Is array?:', Array.isArray(data));

    if (error) {
      console.error('Supabase error in getSchoolTeachers (team members approach):', error);
      throw error;
    }

    console.log('Raw team members response:', data);
    console.log('Number of team members found:', data?.length || 0);
    
    if (data && data.length > 0) {
      // Filter for teachers only
      const teachers = data.filter(member => member.role === 'teacher');
      console.log('Teachers found after filtering:', teachers);
      console.log('Number of teachers found:', teachers.length);
      
      if (teachers.length > 0) {
        teachers.forEach((teacher, index) => {
          console.log(`Teacher ${index + 1}:`, {
            id: teacher.id,
            first_name: teacher.first_name,
            last_name: teacher.last_name,
            email: teacher.email,
            role: teacher.role
          });
        });
        
        // Add display_name field for easier rendering
        const teachersWithDisplayName = teachers.map(teacher => ({
          ...teacher,
          display_name: `${teacher.first_name} ${teacher.last_name}`
        }));
        
        console.log('Teachers with display_name:', teachersWithDisplayName);
        console.log('Returning teachers count:', teachersWithDisplayName.length);
        return teachersWithDisplayName;
      } else {
        console.warn('No teachers found in team members for school:', schoolId);
        console.log('All team members roles:', data.map(m => ({ id: m.id, role: m.role, name: `${m.first_name} ${m.last_name}` })));
        return [];
      }
    } else {
      console.warn('No team members found for school:', schoolId);
      return [];
    }
  } catch (error) {
    console.error('Exception in getSchoolTeachers:', error);
    throw error;
  } finally {
    console.log('=== getSchoolTeachers FUNCTION END ===');
  }
};

// Function to update a course
export const updateCourse = async (courseId: string, name: string, lessonType: string) => {
  const { data, error } = await supabase.rpc('update_course', {
    p_course_id: courseId,
    p_name: name,
    p_lesson_type: lessonType
  });

  if (error) {
    console.error('Error updating course:', error);
    throw error;
  }

  return data;
};

// Function to delete a course
export const deleteCourse = async (courseId: string) => {
  const { data, error } = await supabase
    .from('courses')
    .delete()
    .eq('id', courseId);

  if (error) {
    console.error('Error deleting course:', error);
    throw error;
  }

  return data;
};

// Function to create a new course
export const createCourse = async (name: string, type: 'individual' | 'group') => {
  const userData = localStorage.getItem('user');
  const user = userData ? JSON.parse(userData) : null;

  if (!user || !user.schoolId) {
    console.error('User not authenticated or school ID not found.');
    throw new Error('Authentication required to create a course.');
  }

  console.log('Creating course with data:', {
    course_name: name,
    lesson_type: type,
    school_id: user.schoolId
  });

  // Use the edge function approach for consistency
  const { data, error } = await supabase.functions.invoke('create_course', {
    body: {
      course_name: name,
      lesson_type: type,
      school_id: user.schoolId
    },
    headers: {
      'x-user-id': user.id,
      'x-school-id': user.schoolId,
      'x-user-role': user.role
    }
  });

  if (error) {
    console.error('Error creating course via edge function:', error);
    throw new Error(error.message || 'Failed to create course');
  }

  console.log('Course created successfully via edge function:', data);
  return data;
};

// Function to get payments for a specific student
export const getStudentPayments = async (studentId: string) => {
  const { data, error } = await supabase.rpc('get_student_payments', {
    p_student_id: studentId
  });

  if (error) {
    console.error('Error fetching payments:', error);
    throw error;
  }

  return data || [];
};

// Function to add a student payment
export const addStudentPayment = async (paymentData: {
  student_id: string;
  amount: number;
  currency: string;
  payment_date: string;
  payment_method: string;
  status: string;
  notes: string;
}) => {
  const { data, error } = await supabase
    .from('student_payments')
    .insert([paymentData])
    .select()
    .single();

  if (error) {
    console.error('Error adding payment:', error);
    throw error;
  }

  return data;
};

// Function to delete a student payment
export const deleteStudentPayment = async (paymentId: string) => {
  const userData = localStorage.getItem('user');
  const user = userData ? JSON.parse(userData) : null;

  if (!user || !user.id || !user.schoolId) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase.rpc('delete_student_payment', {
    p_payment_id: paymentId,
    p_current_user_id: user.id,
    p_current_school_id: user.schoolId
  });

  if (error) {
    console.error('Error deleting payment:', error);
    throw error;
  }

  return data;
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
  const userData = localStorage.getItem('user');
  const user = userData ? JSON.parse(userData) : null;

  if (!user) {
    console.warn('No user signed in.');
    return null;
  }

  const { data, error } = await supabase.rpc('get_current_user_info');

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

  const { data, error } = await supabase.rpc('get_school_tags', {
    p_school_id: schoolId
  });

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

// Function to get school contact types
export const getSchoolContactTypes = async (schoolId: string): Promise<ContactType[]> => {
  const { data, error } = await supabase
    .from('contact_types')
    .select('*')
    .eq('school_id', schoolId)
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching contact types:', error);
    throw error;
  }

  return data || [];
};

// Function to create a contact type
export const createContactType = async (schoolId: string, name: string, color: string) => {
  const { data, error } = await supabase
    .from('contact_types')
    .insert([{ school_id: schoolId, name, color }])
    .select()
    .single();

  if (error) {
    console.error('Error creating contact type:', error);
    throw error;
  }

  return data;
};

// Function to update a contact type
export const updateContactType = async (id: string, name: string, color: string) => {
  const { data, error } = await supabase
    .from('contact_types')
    .update({ name, color, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating contact type:', error);
    throw error;
  }

  return data;
};

// Function to delete a contact type
export const deleteContactType = async (id: string) => {
  const { data, error } = await supabase
    .from('contact_types')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting contact type:', error);
    throw error;
  }

  return data;
};

// Function to get student lesson sessions
export const getStudentLessonSessions = async (studentId: string): Promise<LessonSession[]> => {
  const { data, error } = await supabase.rpc('get_lesson_sessions', {
    p_student_id: studentId
  });

  if (error) {
    console.error('Error fetching lesson sessions:', error);
    throw error;
  }

  return data || [];
};

// Function to handle session actions
export const handleSessionAction = async (sessionId: string, action: string, newDatetime?: string) => {
  const { data, error } = await supabase.rpc('handle_session_action', {
    p_session_id: sessionId,
    p_action: action,
    p_new_datetime: newDatetime
  });

  if (error) {
    console.error('Error handling session action:', error);
    throw error;
  }

  return data;
};

// Function to get student subscriptions
export const getStudentSubscriptions = async (studentId: string): Promise<Subscription[]> => {
  const { data, error } = await supabase.rpc('get_student_subscriptions', {
    p_student_id: studentId
  });

  if (error) {
    console.error('Error fetching subscriptions:', error);
    throw error;
  }

  return data || [];
};

// Function to add student subscription
export const addStudentSubscription = async (subscriptionData: any) => {
  const userData = localStorage.getItem('user');
  const user = userData ? JSON.parse(userData) : null;

  if (!user || !user.id || !user.schoolId) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase.rpc('add_student_subscription', {
    p_student_id: subscriptionData.student_id,
    p_session_count: subscriptionData.session_count,
    p_duration_months: subscriptionData.duration_months,
    p_start_date: subscriptionData.start_date,
    p_schedule: subscriptionData.schedule,
    p_price_mode: subscriptionData.price_mode,
    p_price_per_session: subscriptionData.price_per_session,
    p_fixed_price: subscriptionData.fixed_price,
    p_total_price: subscriptionData.total_price,
    p_currency: subscriptionData.currency,
    p_notes: subscriptionData.notes,
    p_status: subscriptionData.status,
    p_current_user_id: user.id,
    p_current_school_id: user.schoolId,
    p_initial_payment_amount: subscriptionData.initial_payment_amount || 0,
    p_payment_method: subscriptionData.payment_method || 'Cash',
    p_payment_notes: subscriptionData.payment_notes || ''
  });

  if (error) {
    console.error('Error adding subscription:', error);
    throw error;
  }

  return data;
};

// Function to delete student subscription
export const deleteStudentSubscription = async (subscriptionId: string) => {
  const { data, error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('id', subscriptionId);

  if (error) {
    console.error('Error deleting subscription:', error);
    throw error;
  }

  return data;
};

// Function to get team members
export const getTeamMembers = async (schoolId: string) => {
  const { data, error } = await supabase.rpc('get_team_members', {
    p_school_id: schoolId
  });

  if (error) {
    console.error('Error fetching team members:', error);
    throw error;
  }

  return data || [];
};

// Function to get school transactions
export const getSchoolTransactions = async (schoolId: string | undefined) => {
  if (!schoolId) {
    console.warn('No school ID provided to getSchoolTransactions');
    return [];
  }

  const { data, error } = await supabase.rpc('get_school_transactions', {
    p_school_id: schoolId
  });

  if (error) {
    console.error('Error fetching school transactions:', error);
    throw error;
  }

  return data || [];
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
