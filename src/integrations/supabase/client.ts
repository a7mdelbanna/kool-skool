import { createClient } from '@supabase/supabase-js';
import { Database } from './types';

const supabaseUrl = "https://clacmtyxfdtfgjkozmqf.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsYWNtdHl4ZmR0Zmdqa296bXFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4OTEzMzgsImV4cCI6MjA2NjQ2NzMzOH0.HKKmBmDpQdZ7-hcpj7wM8IJPFVD52T-IfThF9jpjdvY";

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export const user_login = async (email: string, password: string) => {
  const { data, error } = await supabase.rpc('user_login', {
    user_email: email,
    user_password: password
  });
  
  if (error) {
    console.error('Login error:', error);
    throw new Error(error.message);
  }
  
  return data;
};

export const verify_license_and_create_school = async (
  licenseKey: string,
  schoolName: string,
  adminFirstName: string,
  adminLastName: string,
  adminEmail: string,
  adminPassword: string
) => {
  const { data, error } = await supabase.rpc('verify_license_and_create_school', {
    license_key: licenseKey,
    school_name: schoolName,
    admin_first_name: adminFirstName,
    admin_last_name: adminLastName,
    admin_email: adminEmail,
    admin_password: adminPassword
  });
  
  if (error) {
    console.error('License verification error:', error);
    throw new Error(error.message);
  }
  
  return data;
};

export const getCurrentUserInfo = async () => {
  const { data, error } = await supabase.rpc('get_current_user_info');
  
  if (error) {
    console.error('Error getting current user info:', error);
    throw new Error(error.message);
  }
  
  return data;
};

export const getSchoolCourses = async (schoolId: string) => {
  const { data, error } = await supabase.rpc('get_school_courses', {
    p_school_id: schoolId
  });
  
  if (error) {
    console.error('Error getting school courses:', error);
    throw new Error(error.message);
  }
  
  return data;
};

export const createCourse = async (name: string, lessonType: string) => {
  const { data, error } = await supabase
    .from('courses')
    .insert([
      {
        name,
        lesson_type: lessonType,
        school_id: (await getCurrentUserInfo())[0]?.user_school_id
      }
    ])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating course:', error);
    throw new Error(error.message);
  }
  
  return data;
};

export const updateCourse = async (courseId: string, name: string, lessonType: string) => {
  const { error } = await supabase.rpc('update_course', {
    p_course_id: courseId,
    p_name: name,
    p_lesson_type: lessonType
  });
  
  if (error) {
    console.error('Error updating course:', error);
    throw new Error(error.message);
  }
};

export const deleteCourse = async (courseId: string) => {
  const { error } = await supabase.rpc('delete_course', {
    p_course_id: courseId
  });
  
  if (error) {
    console.error('Error deleting course:', error);
    throw new Error(error.message);
  }
};

export const getTeamMembers = async (schoolId: string) => {
  const { data, error } = await supabase.rpc('get_team_members', {
    p_school_id: schoolId
  });
  
  if (error) {
    console.error('Error getting team members:', error);
    throw new Error(error.message);
  }
  
  return data;
};

export const addTeamMember = async (
  firstName: string,
  lastName: string,
  email: string,
  role: string,
  password: string
) => {
  const { data, error } = await supabase.rpc('add_team_member', {
    member_first_name: firstName,
    member_last_name: lastName,
    member_email: email,
    member_role: role,
    member_password: password
  });
  
  if (error) {
    console.error('Error adding team member:', error);
    throw new Error(error.message);
  }
  
  return data;
};

export const createStudent = async (
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  teacherId: string,
  courseId: string,
  ageGroup: string,
  level: string,
  phone?: string
) => {
  const { data, error } = await supabase.rpc('create_student', {
    student_email: email,
    student_password: password,
    student_first_name: firstName,
    student_last_name: lastName,
    teacher_id: teacherId,
    course_id: courseId,
    age_group: ageGroup,
    level: level,
    phone: phone
  });
  
  if (error) {
    console.error('Error creating student:', error);
    throw new Error(error.message);
  }
  
  return data;
};

export const getStudentsWithDetails = async (schoolId: string) => {
  const { data, error } = await supabase.rpc('get_students_with_details', {
    p_school_id: schoolId
  });
  
  if (error) {
    console.error('Error getting students with details:', error);
    throw new Error(error.message);
  }
  
  return data;
};

export const getStudentSubscriptions = async (studentId: string) => {
  const { data, error } = await supabase.rpc('get_student_subscriptions', {
    p_student_id: studentId
  });
  
  if (error) {
    console.error('Error getting student subscriptions:', error);
    throw new Error(error.message);
  }
  
  return data;
};

export const addStudentSubscription = async (subscriptionData: {
  student_id: string;
  session_count: number;
  duration_months: number;
  start_date: string;
  schedule: any;
  price_mode: string;
  price_per_session: number | null;
  fixed_price: number | null;
  total_price: number;
  currency: string;
  notes: string;
  status: string;
  initial_payment_amount?: number;
  payment_method?: string;
  payment_notes?: string;
  lesson_duration_minutes?: number; // New parameter
}) => {
  console.log('🚀 addStudentSubscription called with data:', subscriptionData);
  
  // Get current user info
  const userInfo = await getCurrentUserInfo();
  if (!userInfo || userInfo.length === 0) {
    throw new Error('User not authenticated');
  }
  
  const currentUserId = userInfo[0]?.user_school_id; // This should be user_id, not school_id
  const currentSchoolId = userInfo[0]?.user_school_id;
  
  if (!currentUserId || !currentSchoolId) {
    throw new Error('User information incomplete');
  }
  
  console.log('🔑 Current user info:', { currentUserId, currentSchoolId });
  
  // Call the database function with enhanced parameters including lesson duration
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
    p_current_user_id: currentUserId,
    p_current_school_id: currentSchoolId,
    p_initial_payment_amount: subscriptionData.initial_payment_amount || 0,
    p_payment_method: subscriptionData.payment_method || 'Cash',
    p_payment_notes: subscriptionData.payment_notes || '',
    p_lesson_duration_minutes: subscriptionData.lesson_duration_minutes || 60 // Default to 60 minutes
  });
  
  if (error) {
    console.error('❌ Error adding student subscription:', error);
    throw new Error(error.message);
  }
  
  console.log('✅ Subscription added successfully:', data);
  return data;
};

export const deleteStudentSubscription = async (subscriptionId: string) => {
  console.log('🗑️ CLIENT: deleteStudentSubscription called with ID:', subscriptionId);
  
  const { data, error } = await supabase.rpc('delete_student_subscription', {
    p_subscription_id: subscriptionId
  });
  
  if (error) {
    console.error('❌ CLIENT: Error deleting subscription:', error);
    throw new Error(error.message);
  }
  
  console.log('✅ CLIENT: Subscription deletion response:', data);
  return data;
};

export const getStudentPayments = async (studentId: string) => {
  const { data, error } = await supabase.rpc('get_student_payments', {
    p_student_id: studentId
  });
  
  if (error) {
    console.error('Error getting student payments:', error);
    throw new Error(error.message);
  }
  
  return data;
};

export const getStudentLessonSessions = async (studentId: string) => {
  console.log('=== CLIENT: getStudentLessonSessions called ===');
  console.log('Student ID:', studentId);
  
  const { data, error } = await supabase.rpc('get_lesson_sessions', {
    p_student_id: studentId
  });
  
  if (error) {
    console.error('❌ CLIENT: Error getting lesson sessions:', error);
    throw new Error(error.message);
  }
  
  console.log('✅ CLIENT: Lesson sessions retrieved:', data);
  return data;
};

export const updateLessonSessionStatus = async (sessionId: string, newStatus: string) => {
  console.log(`Updating lesson session ${sessionId} status to: ${newStatus}`);
  
  const { data, error } = await supabase
    .from('lesson_sessions')
    .update({ status: newStatus })
    .eq('id', sessionId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating lesson session status:', error);
    throw new Error(error.message);
  }
  
  console.log('Lesson session status updated:', data);
  return data;
};

export const addStudentPayment = async (paymentData: {
  student_id: string;
  amount: number;
  currency: string;
  payment_date: string;
  payment_method: string;
  status: string;
  notes?: string;
}) => {
  console.log('Adding student payment:', paymentData);
  
  const { data, error } = await supabase
    .from('student_payments')
    .insert([paymentData])
    .select()
    .single();
  
  if (error) {
    console.error('Error adding student payment:', error);
    throw new Error(error.message);
  }
  
  console.log('Student payment added:', data);
  return data;
};

export const updateStudentPayment = async (paymentId: string, updates: {
  amount?: number;
  currency?: string;
  payment_date?: string;
  payment_method?: string;
  status?: string;
  notes?: string;
}) => {
  console.log('Updating student payment:', paymentId, updates);
  
  const { data, error } = await supabase
    .from('student_payments')
    .update(updates)
    .eq('id', paymentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating student payment:', error);
    throw new Error(error.message);
  }
  
  console.log('Student payment updated:', data);
  return data;
};

export const deleteStudentPayment = async (paymentId: string) => {
  console.log('Deleting student payment:', paymentId);
  
  const { error } = await supabase
    .from('student_payments')
    .delete()
    .eq('id', paymentId);
  
  if (error) {
    console.error('Error deleting student payment:', error);
    throw new Error(error.message);
  }
  
  console.log('Student payment deleted');
};
