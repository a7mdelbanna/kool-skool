import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://clacmtyxfdtfgjkozmqf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsYWNtdHl4ZmR0Zmdqa296bXFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4OTEzMzgsImV4cCI6MjA2NjQ2NzMzOH0.HKKmBmDpQdZ7-hcpj7wM8IJPFVD52T-IfThF9jpjdvY';

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface Course {
  id: string;
  name: string;
  lesson_type: string;
  school_id: string;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  student_id: string;
  session_count: number;
  duration_months: number;
  start_date: string;
  end_date: string;
  total_price: number;
  currency: string;
  price_per_session?: number;
  fixed_price?: number;
  price_mode?: string;
  schedule: any;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface LessonSession {
  id: string;
  subscription_id: string;
  student_id: string;
  scheduled_date: string;
  session_date: string;
  status: string;
  notes?: string;
  duration_minutes?: number;
  index_in_sub?: number;
  cost?: number;
  payment_status?: string;
  created_at: string;
  updated_at: string;
}

export interface RpcResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface CreateStudentResponse {
  success: boolean;
  student_id?: string;
  message?: string;
}

export interface CreateStudentParams {
  student_email: string;
  student_password: string;
  first_name: string;
  last_name: string;
  teacher_id: string;
  course_id: string;
  age_group: string;
  level: string;
  phone?: string;
  birthday?: string;
  whatsapp?: string;
  telegram?: string;
  instagram?: string;
}

export interface StudentRecord {
  // Core student data
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  birthday?: string;
  whatsapp?: string;
  telegram?: string;
  instagram?: string;
  
  // Educational data
  course_name: string;
  lesson_type: 'individual' | 'group';
  age_group: string;
  level: string;
  
  // Teacher data
  teacher_first_name?: string;
  teacher_last_name?: string;
  
  // Payment and session data
  payment_status: 'paid' | 'pending' | 'overdue';
  teacher_id: string;
  lessons_count: number;
  next_session_date: string | null;
  next_payment_date: string | null;
  next_payment_amount: number | null;
  subscription_progress: string;
}

export interface SchoolSetupResponse {
  success: boolean;
  message?: string;
  user_id?: string;
  school_id?: string;
}

export interface TeamMemberResponse {
  success: boolean;
  data?: any[];
  message?: string;
}

export const createStudent = async (params: CreateStudentParams): Promise<CreateStudentResponse> => {
  try {
    console.log('createStudent called with params:', params);
    
    // Get current user from localStorage
    const userData = localStorage.getItem('user');
    if (!userData) {
      throw new Error('No user session found');
    }
    
    const user = JSON.parse(userData);
    console.log('User data for student creation:', user);
    
    if (!user.id || !user.schoolId) {
      throw new Error('Invalid user session');
    }
    
    // Call the Supabase function to create student
    const { data, error } = await supabase.rpc('create_student_with_account', {
      p_admin_user_id: user.id,
      p_school_id: user.schoolId,
      p_student_email: params.student_email,
      p_student_password: params.student_password,
      p_first_name: params.first_name,
      p_last_name: params.last_name,
      p_teacher_id: params.teacher_id,
      p_course_id: params.course_id,
      p_age_group: params.age_group,
      p_level: params.level,
      p_phone: params.phone || null,
      p_birthday: params.birthday || null,
      p_whatsapp: params.whatsapp || null,
      p_telegram: params.telegram || null,
      p_instagram: params.instagram || null
    });
    
    if (error) {
      console.error('Supabase RPC error:', error);
      throw new Error(error.message);
    }
    
    console.log('Student creation response:', data);
    
    return {
      success: true,
      student_id: data?.student_id,
      message: 'Student created successfully'
    };
    
  } catch (error) {
    console.error('Error in createStudent:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create student'
    };
  }
};

export const getStudentsWithDetails = async (schoolId: string): Promise<StudentRecord[]> => {
  try {
    console.log('Fetching students for school:', schoolId);
    
    if (!schoolId) {
      console.warn('No school ID provided');
      return [];
    }
    
    const { data, error } = await supabase.rpc('get_students_with_details', {
      p_school_id: schoolId
    });
    
    if (error) {
      console.error('Error fetching students:', error);
      throw error;
    }
    
    console.log('Students fetched successfully:', data?.length || 0, 'records');
    return data || [];
    
  } catch (error) {
    console.error('Error in getStudentsWithDetails:', error);
    throw error;
  }
};

export const getSchoolCourses = async (schoolId: string): Promise<Course[]> => {
  try {
    console.log('Fetching courses for school:', schoolId);
    
    if (!schoolId) {
      console.warn('No school ID provided for courses');
      return [];
    }
    
    const { data, error } = await supabase.rpc('get_school_courses', {
      p_school_id: schoolId
    });
    
    if (error) {
      console.error('Error fetching courses:', error);
      throw error;
    }
    
    console.log('Courses fetched successfully:', data?.length || 0, 'records');
    return data || [];
    
  } catch (error) {
    console.error('Error in getSchoolCourses:', error);
    throw error;
  }
};

export const createCourse = async (courseName: string, lessonType: string): Promise<Course | null> => {
  try {
    console.log('Creating course:', { courseName, lessonType });
    
    // Get current user from localStorage
    const userData = localStorage.getItem('user');
    if (!userData) {
      throw new Error('No user session found');
    }
    
    const user = JSON.parse(userData);
    
    if (!user.id || !user.schoolId) {
      throw new Error('Invalid user session');
    }
    
    // Insert the course directly into the courses table
    const { data, error } = await supabase
      .from('courses')
      .insert({
        name: courseName,
        lesson_type: lessonType,
        school_id: user.schoolId
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating course:', error);
      throw error;
    }
    
    console.log('Course created successfully:', data);
    return data;
    
  } catch (error) {
    console.error('Error in createCourse:', error);
    throw error;
  }
};

export const updateCourse = async (courseId: string, courseName: string, lessonType: string): Promise<Course | null> => {
  try {
    console.log('Updating course:', { courseId, courseName, lessonType });
    
    const { data, error } = await supabase
      .from('courses')
      .update({
        name: courseName,
        lesson_type: lessonType,
        updated_at: new Date().toISOString()
      })
      .eq('id', courseId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating course:', error);
      throw error;
    }
    
    console.log('Course updated successfully:', data);
    return data;
    
  } catch (error) {
    console.error('Error in updateCourse:', error);
    throw error;
  }
};

export const deleteCourse = async (courseId: string): Promise<void> => {
  try {
    console.log('Deleting course:', courseId);
    
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId);
    
    if (error) {
      console.error('Error deleting course:', error);
      throw error;
    }
    
    console.log('Course deleted successfully');
    
  } catch (error) {
    console.error('Error in deleteCourse:', error);
    throw error;
  }
};

export const getSchoolTeachers = async (schoolId: string) => {
  try {
    console.log('Fetching teachers for school:', schoolId);
    
    if (!schoolId) {
      console.warn('No school ID provided for teachers');
      return [];
    }
    
    const { data, error } = await supabase.rpc('get_school_teachers', {
      p_school_id: schoolId
    });
    
    if (error) {
      console.error('Error fetching teachers:', error);
      throw error;
    }
    
    console.log('Teachers fetched successfully:', data?.length || 0, 'records');
    return data || [];
    
  } catch (error) {
    console.error('Error in getSchoolTeachers:', error);
    throw error;
  }
};

export const getTeamMembers = async (schoolId: string): Promise<TeamMemberResponse> => {
  try {
    console.log('Fetching team members for school:', schoolId);
    
    const { data, error } = await supabase.rpc('get_team_members', {
      p_school_id: schoolId
    });
    
    if (error) {
      console.error('Error fetching team members:', error);
      throw error;
    }
    
    return {
      success: true,
      data: data || []
    };
    
  } catch (error) {
    console.error('Error in getTeamMembers:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch team members'
    };
  }
};

export const getCurrentUserInfo = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (error) throw error;
    return [data];
  } catch (error) {
    console.error('Error getting current user info:', error);
    return null;
  }
};

export const getSchoolTags = async (schoolId: string) => {
  try {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_active', true);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching school tags:', error);
    return [];
  }
};

export const createTransaction = async (transactionData: any) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .insert(transactionData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating transaction:', error);
    throw error;
  }
};

export const getSchoolContactTypes = async (schoolId: string) => {
  try {
    const { data, error } = await supabase
      .from('contact_types')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_active', true);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching contact types:', error);
    return [];
  }
};

export const createContactType = async (schoolId: string, name: string, color: string) => {
  try {
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
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating contact type:', error);
    throw error;
  }
};

export const updateContactType = async (id: string, name: string, color: string) => {
  try {
    const { data, error } = await supabase
      .from('contact_types')
      .update({ name, color, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating contact type:', error);
    throw error;
  }
};

export const deleteContactType = async (id: string) => {
  try {
    const { error } = await supabase
      .from('contact_types')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting contact type:', error);
    throw error;
  }
};

export const getSchoolTransactions = async (schoolId: string) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('school_id', schoolId)
      .order('transaction_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
};

export const handleSessionAction = async (sessionId: string, action: string, notes?: string) => {
  try {
    const { data, error } = await supabase.rpc('handle_session_action', {
      p_session_id: sessionId,
      p_action: action,
      p_notes: notes
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error handling session action:', error);
    throw error;
  }
};

export const getStudentLessonSessions = async (studentId: string) => {
  try {
    const { data, error } = await supabase
      .from('lesson_sessions')
      .select('*')
      .eq('student_id', studentId)
      .order('scheduled_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching student lesson sessions:', error);
    return [];
  }
};

export const getStudentSubscriptions = async (studentId: string) => {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching student subscriptions:', error);
    return [];
  }
};

export const deleteStudentSubscriptionEnhanced = async (subscriptionId: string): Promise<RpcResponse> => {
  try {
    const { data, error } = await supabase.rpc('delete_student_subscription_enhanced', {
      p_subscription_id: subscriptionId
    });
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error deleting subscription:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};
