
import { createClient } from '@supabase/supabase-js';
import { Database } from './types';

const supabaseUrl = "https://clacmtyxfdtfgjkozmqf.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsYWNtdHl4ZmR0Zmdqa296bXFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4OTEzMzgsImV4cCI6MjA2NjQ2NzMzOH0.HKKmBmDpQdZ7-hcpj7wM8IJPFVD52T-IfThF9jpjdvY";

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Export types
export interface Course {
  id: string;
  school_id: string;
  name: string;
  lesson_type: string;
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

export interface StudentRecord {
  id: string;
  school_id: string;
  user_id: string;
  teacher_id: string;
  course_id: string;
  age_group: string;
  level: string;
  phone: string;
  created_at: string;
  first_name: string;
  last_name: string;
  email: string;
  course_name: string;
  lesson_type: string;
  teacher_first_name: string;
  teacher_last_name: string;
  teacher_email: string;
  payment_status: string;
  lessons_count: number;
  next_session_date: string | null;
  next_payment_date: string | null;
  next_payment_amount: number | null;
  subscription_progress: string;
}

// Updated interface to match the new function signature
export interface CurrentUserInfo {
  user_id: string;
  user_school_id: string;
  user_role: string;
}

// Helper function to get current user from localStorage
const getCurrentUserFromStorage = () => {
  try {
    // First try 'user' key (which is what the login process uses)
    let userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      return {
        user_id: user.id,
        user_school_id: user.schoolId,
        user_role: user.role
      };
    }
    
    // Fallback to 'userData' key for backward compatibility
    userData = localStorage.getItem('userData');
    if (userData) {
      const user = JSON.parse(userData);
      return {
        user_id: user.id,
        user_school_id: user.schoolId,
        user_role: user.role
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing user data from localStorage:', error);
    return null;
  }
};

export const user_login = async (email: string, password: string): Promise<UserLoginResponse> => {
  const { data, error } = await supabase.rpc('user_login', {
    user_email: email,
    user_password: password
  });
  
  if (error) {
    console.error('Login error:', error);
    throw new Error(error.message);
  }
  
  return data as unknown as UserLoginResponse;
};

export const verify_license_and_create_school = async (
  licenseKey: string,
  schoolName: string,
  adminFirstName: string,
  adminLastName: string,
  adminEmail: string,
  adminPassword: string
): Promise<SchoolSetupResponse> => {
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
  
  return data as unknown as SchoolSetupResponse;
};

export const getCurrentUserInfo = async (): Promise<CurrentUserInfo[]> => {
  // Get user info from localStorage instead of database
  const userInfo = getCurrentUserFromStorage();
  
  if (!userInfo) {
    console.error('No user info found in localStorage');
    return [];
  }
  
  return [userInfo as CurrentUserInfo];
};

export const getSchoolCourses = async (schoolId: string): Promise<Course[]> => {
  const { data, error } = await supabase.rpc('get_school_courses', {
    p_school_id: schoolId
  });
  
  if (error) {
    console.error('Error getting school courses:', error);
    throw new Error(error.message);
  }
  
  return data as Course[];
};

export const getSchoolTeachers = async (schoolId: string) => {
  const { data, error } = await supabase.rpc('get_team_members', {
    p_school_id: schoolId
  });
  
  if (error) {
    console.error('Error getting school teachers:', error);
    throw new Error(error.message);
  }
  
  // Filter to only return teachers and format for display
  const teachers = data?.filter(member => member.role === 'teacher').map(teacher => ({
    id: teacher.id,
    first_name: teacher.first_name,
    last_name: teacher.last_name,
    display_name: `${teacher.first_name} ${teacher.last_name}`,
    email: teacher.email
  }));
  
  return teachers || [];
};

export const createCourse = async (name: string, lessonType: string): Promise<Course> => {
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
  
  return data as Course;
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
): Promise<TeamMemberResponse> => {
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
  
  return data as unknown as TeamMemberResponse;
};

export interface CreateStudentData {
  student_email: string;
  student_password: string;
  first_name: string;
  last_name: string;
  teacher_id: string;
  course_id: string;
  age_group: string;
  level: string;
  phone?: string;
  date_of_birth?: string;
  telegram?: string;
  whatsapp?: string;
  instagram?: string;
  viber?: string;
  facebook?: string;
  skype?: string;
  zoom?: string;
}

export const createStudent = async (data: CreateStudentData): Promise<CreateStudentResponse> => {
  console.log('createStudent called with data:', data);
  
  try {
    // Get user data from localStorage for authentication
    const userDataStr = localStorage.getItem('user');
    if (!userDataStr) {
      throw new Error('User not authenticated - no user data found');
    }
    
    const userData = JSON.parse(userDataStr);
    console.log('Current user data:', userData);
    
    if (!userData.id || !userData.schoolId || userData.role !== 'admin') {
      throw new Error('Only school admins can create students');
    }
    
    console.log('Calling create_student_with_profile RPC function with current_user_id:', userData.id);
    
    // Call the RPC function with current_user_id as the first parameter
    const { data: result, error } = await supabase.rpc('create_student_with_profile', {
      current_user_id: userData.id,
      student_email: data.student_email,
      student_password: data.student_password,
      student_first_name: data.first_name,
      student_last_name: data.last_name,
      teacher_id: data.teacher_id,
      course_id: data.course_id,
      age_group: data.age_group,
      level: data.level,
      phone: data.phone || null,
      date_of_birth: data.date_of_birth || null,
      telegram: data.telegram || null,
      whatsapp: data.whatsapp || null,
      instagram: data.instagram || null,
      viber: data.viber || null,
      facebook: data.facebook || null,
      skype: data.skype || null,
      zoom: data.zoom || null
    });
    
    console.log('RPC function response:', { result, error });
    
    if (error) {
      console.error('Supabase RPC error:', error);
      throw new Error(`Database error: ${error.message}`);
    }
    
    if (!result) {
      console.error('No result returned from RPC function');
      throw new Error('No response from database function');
    }
    
    console.log('Student creation result:', result);
    
    // Type guard to ensure result has the expected structure and cast to unknown first
    if (typeof result === 'object' && result !== null && 'success' in result) {
      return result as unknown as CreateStudentResponse;
    } else {
      throw new Error('Invalid response format from database function');
    }
    
  } catch (error) {
    console.error('Error in createStudent:', error);
    throw error;
  }
};

export const getStudentsWithDetails = async (schoolId: string): Promise<StudentRecord[]> => {
  const { data, error } = await supabase.rpc('get_students_with_details', {
    p_school_id: schoolId
  });
  
  if (error) {
    console.error('Error getting students with details:', error);
    throw new Error(error.message);
  }
  
  return data as StudentRecord[];
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
  lesson_duration_minutes?: number;
}) => {
  console.log('🚀 addStudentSubscription called with data:', subscriptionData);
  
  // Get current user info from localStorage instead of database
  const userInfo = getCurrentUserFromStorage();
  console.log('🔑 User info from localStorage:', userInfo);
  
  if (!userInfo) {
    console.error('❌ No user info found in localStorage');
    throw new Error('User not authenticated - please log in again');
  }
  
  const currentUserId = userInfo.user_id;
  const currentSchoolId = userInfo.user_school_id;
  
  if (!currentUserId || !currentSchoolId) {
    console.error('❌ User information incomplete:', { currentUserId, currentSchoolId });
    throw new Error('User information incomplete');
  }
  
  console.log('🔑 Using user info:', { currentUserId, currentSchoolId });
  
  // Call the database function with the enhanced parameters
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
    p_payment_notes: subscriptionData.payment_notes || ''
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

export const handleSessionAction = async (sessionId: string, action: string, newDatetime?: string) => {
  console.log(`🎯 CLIENT: handleSessionAction called - Session: ${sessionId}, Action: ${action}, New DateTime: ${newDatetime}`);
  
  const { data, error } = await supabase.rpc('handle_session_action', {
    p_session_id: sessionId,
    p_action: action,
    p_new_datetime: newDatetime || null
  });
  
  if (error) {
    console.error('❌ CLIENT: Error handling session action:', error);
    throw new Error(error.message);
  }
  
  console.log('✅ CLIENT: Session action completed:', data);
  return data;
};

export const updateLessonSessionStatus = async (sessionId: string, newStatus: string) => {
  console.log(`📝 CLIENT: Updating lesson session ${sessionId} status to: ${newStatus}`);
  
  // Map status to appropriate action
  let action: string;
  switch (newStatus) {
    case 'completed':
      action = 'attended';
      break;
    case 'cancelled':
      action = 'cancelled';
      break;
    case 'scheduled':
      action = 'rescheduled';
      break;
    default:
      throw new Error(`Unsupported status: ${newStatus}`);
  }
  
  return await handleSessionAction(sessionId, action);
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
  console.log('🗑️ CLIENT: deleteStudentPayment called with ID:', paymentId);
  
  const { data, error } = await supabase
    .from('student_payments')
    .delete()
    .eq('id', paymentId)
    .select()
    .single();
  
  if (error) {
    console.error('❌ CLIENT: Error deleting payment:', error);
    throw new Error(error.message);
  }
  
  console.log('✅ CLIENT: Payment deleted successfully:', data);
  return data;
};
