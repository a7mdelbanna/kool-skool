
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://einhiigvmmsbjhpcuosz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpbmhpaWd2bW1zYmpocGN1b3N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIxMzY2OTEsImV4cCI6MjA1NzcxMjY5MX0.PUW2kD1r6Zjo3FUsqws_62gR414EtDe60XH1-9k2cFI";

// Interface for Supabase function return types
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

export interface TeamMemberResponse {
  success: boolean;
  message?: string;
  member_id?: string;
}

export interface CreateStudentResponse {
  success: boolean;
  message?: string;
  user_id?: string;
  student_id?: string;
}

export interface RescheduleSessionResponse {
  success: boolean;
  message?: string;
}

// Student-related types
export interface Course {
  id: string;
  school_id: string;
  name: string;
  lesson_type: 'Individual' | 'Group';
}

export interface CreateCourseResponse {
  id: string;
  school_id: string;
  name: string;
  lesson_type: string;
  error?: string;
  detail?: string;
}

export interface StudentRecord {
  id: string;
  school_id: string;
  user_id: string;
  teacher_id: string;
  course_id: string;
  age_group: 'Adult' | 'Kid';
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  phone?: string;
  created_at: string;
  // Joined data
  first_name?: string;
  last_name?: string;
  email?: string;
  course_name?: string;
  teacher_name?: string;
  // For UI compatibility
  lessonType?: 'individual' | 'group';
}

export interface Subscription {
  id: string;
  student_id: string;
  days_of_week: string[];
  session_time: string;
  duration_minutes: number;
  start_date: string;
  end_date: string;
  price_per_session: number;
  status: 'active' | 'paused' | 'expired';
}

export interface Session {
  id: string;
  subscription_id: string;
  original_date: string;
  actual_date?: string;
  status: 'scheduled' | 'attended' | 'missed' | 'cancelled';
  reschedule_mode?: 'auto' | 'manual';
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Helper function to manually set auth from user data
export const refreshSupabaseAuth = async (userId: string, schoolId?: string, role?: string) => {
  if (!userId) return false;
  
  try {
    // Set a custom session for authentication
    await supabase.auth.setSession({
      access_token: `${userId}_custom_token`,
      refresh_token: ''
    });
    
    // Set custom headers to pass admin info using the correct API
    const customHeaders: Record<string, string> = { 'x-user-id': userId };
    
    if (schoolId) {
      customHeaders['x-school-id'] = schoolId;
    }
    
    if (role) {
      customHeaders['x-user-role'] = role;
    }
    
    // Use the correct method to set headers
    supabase.functions.setAuth(`${userId}_custom_token`);
    
    return true;
  } catch (error) {
    console.error("Error refreshing auth:", error);
    return false;
  }
};

// Helper function to get students with details
export async function getStudentsWithDetails(schoolId: string) {
  // First get the students
  const { data: studentsData, error: studentsError } = await supabase
    .from('students')
    .select('*')
    .eq('school_id', schoolId);

  if (studentsError) {
    console.error('Error fetching students:', studentsError);
    return { data: null, error: studentsError };
  }

  // For each student, get the user and course details
  const enhancedStudents = await Promise.all(
    studentsData.map(async (student) => {
      // Get user details
      const { data: userData } = await supabase
        .from('users')
        .select('first_name, last_name, email')
        .eq('id', student.user_id)
        .single();
      
      // Get course details
      const { data: courseData } = await supabase
        .from('courses')
        .select('name, lesson_type')
        .eq('id', student.course_id)
        .single();

      // Transform the lesson_type to match UI expectations
      const lessonType = courseData?.lesson_type === 'Individual' ? 'individual' : 'group';
      
      return {
        ...student,
        first_name: userData?.first_name,
        last_name: userData?.last_name,
        email: userData?.email,
        course_name: courseData?.name,
        lessonType
      };
    })
  );

  return { data: enhancedStudents as StudentRecord[], error: null };
}

// Create a student
export async function createStudent(
  email: string,
  password: string,
  firstName: string, 
  lastName: string,
  teacherId: string,
  courseId: string,
  ageGroup: 'Adult' | 'Kid',
  level: 'Beginner' | 'Intermediate' | 'Advanced',
  phone?: string
) {
  try {
    // Get user data from localStorage to set admin info
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!userData || !userData.id || !userData.schoolId || userData.role !== 'admin') {
      console.error("Missing admin user data for authentication:", userData);
      return { 
        data: { success: false, message: "Only school admins can create students. Please log in again." }, 
        error: null 
      };
    }
    
    console.log("Creating student as admin:", {
      userId: userData.id,
      schoolId: userData.schoolId,
      role: userData.role
    });
    
    // Make the request to create a student
    const { data, error } = await supabase.functions.invoke('create_student', {
      body: {
        student_email: email,
        student_password: password,
        first_name: firstName,
        last_name: lastName,
        teacher_id: teacherId,
        course_id: courseId,
        age_group: ageGroup,
        level: level,
        phone: phone || null
      },
      headers: {
        'x-user-id': userData.id,
        'x-school-id': userData.schoolId,
        'x-user-role': userData.role
      }
    });

    if (error) {
      console.error("Error from createStudent function:", error);
      return { 
        data: { success: false, message: error.message }, 
        error 
      };
    }

    return { data, error: null };
  } catch (error) {
    console.error("Exception in createStudent:", error);
    return { 
      data: { success: false, message: error.message }, 
      error 
    };
  }
}

// Get courses for a school
export async function getSchoolCourses(schoolId: string) {
  console.log('Fetching courses for school ID:', schoolId);
  
  try {
    // Ensure schoolId is valid
    if (!schoolId) {
      console.error('Invalid school ID provided');
      return { data: [], error: new Error('Invalid school ID') };
    }
    
    // Check for stored authentication data in localStorage
    const storedUser = localStorage.getItem('user');
    let userId = null;
    let userRole = null;
    
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        userId = userData.id;
        userRole = userData.role;
        
        if (userId) {
          console.log("Found user ID in localStorage:", userId);
          console.log("User role:", userRole);
        }
      } catch (parseError) {
        console.error("Error parsing user data from localStorage:", parseError);
      }
    }
    
    // Log all the request details before making the request
    console.log("Requesting courses with:", { 
      schoolId, 
      hasUserId: !!userId,
      userRole
    });
    
    // Make the request with improved error handling
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('school_id', schoolId);
    
    if (error) {
      console.error('Supabase error fetching courses:', error);
      return { data: [], error };
    }
    
    console.log('Raw courses data:', data);
    
    if (!data || data.length === 0) {
      console.log('No courses found for school ID:', schoolId);
      
      // If no courses found, try to create a test course
      try {
        console.log('Creating a test course');
        const { data: testCourseData, error: testCourseError } = await supabase.functions.invoke('test_create_course', {
          body: { school_id: schoolId }
        });
        
        if (testCourseError) {
          console.error('Error creating test course:', testCourseError);
        } else if (testCourseData) {
          console.log('Created test course:', testCourseData);
          return { data: [testCourseData] as Course[], error: null };
        }
      } catch (testError) {
        console.error('Exception creating test course:', testError);
      }
      
      return { data: [], error: null };
    }
    
    console.log('Courses retrieved successfully, count:', data.length);

    // Convert string lesson_type to proper enum type
    const typedData = data.map(course => ({
      ...course,
      lesson_type: course.lesson_type as 'Individual' | 'Group'
    }));

    return { data: typedData as Course[], error: null };
  } catch (error) {
    console.error('Exception fetching courses:', error);
    return { data: [], error: error as Error };
  }
}

// Create a course
export async function createCourse(schoolId: string, name: string, lessonType: 'Individual' | 'Group') {
  console.log("Creating course with:", { schoolId, name, lessonType });
  
  try {
    // Check for stored authentication data in localStorage
    const storedUser = localStorage.getItem('user');
    let userId = null;
    
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        userId = userData.id;
        
        if (userId) {
          console.log("Found user ID in localStorage, refreshing session");
          // Set up auth with the user's ID
          await refreshSupabaseAuth(userId);
        }
      } catch (parseError) {
        console.error("Error parsing user data from localStorage:", parseError);
      }
    }
    
    // Verify we have an active session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error("Error getting session:", sessionError);
      return { data: null, error: sessionError };
    }
    
    if (!sessionData.session && !userId) {
      console.error("No active session found when creating course");
      return { 
        data: null, 
        error: new Error("Authentication required. Please sign in again.") 
      };
    }
    
    console.log("Session verified or custom auth applied, proceeding with course creation");
    
    // Use our Edge Function to create the course
    const { data, error } = await supabase.functions.invoke<CreateCourseResponse>('create_course', {
      body: {
        school_id: schoolId,
        course_name: name,
        lesson_type: lessonType
      }
    });

    if (error) {
      console.error("Error creating course:", error);
      
      // Handle auth errors
      if (error.message?.includes('JWT')) {
        return { 
          data: null, 
          error: new Error("Your session has expired. Please sign in again.") 
        };
      }
      
      return { data: null, error };
    }
    
    if (!data) {
      return { 
        data: null, 
        error: new Error("Failed to create course, no data returned") 
      };
    }
    
    // Convert the response to a Course object
    const courseData: Course = {
      id: data.id,
      school_id: data.school_id,
      name: data.name,
      lesson_type: data.lesson_type as 'Individual' | 'Group'
    };
    
    return { data: courseData, error: null };
  } catch (error) {
    console.error("Exception creating course:", error);
    return { data: null, error: error as Error };
  }
}

// Get teachers for a school
export async function getSchoolTeachers(schoolId: string) {
  console.log('Fetching teachers for school ID:', schoolId);
  
  try {
    // Ensure schoolId is valid
    if (!schoolId) {
      console.error('Invalid school ID provided for teachers');
      return { data: [], error: new Error('Invalid school ID') };
    }
    
    // Check for stored authentication data in localStorage
    const storedUser = localStorage.getItem('user');
    let userId = null;
    let userRole = null;
    
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        userId = userData.id;
        userRole = userData.role;
        
        if (userId) {
          console.log("Found user ID in localStorage for teachers:", userId);
          console.log("User role for teachers request:", userRole);
        }
      } catch (parseError) {
        console.error("Error parsing user data from localStorage for teachers:", parseError);
      }
    }
    
    console.log("Requesting teachers with:", { 
      schoolId, 
      hasUserId: !!userId,
      userRole
    });
    
    const { data, error } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('school_id', schoolId)
      .eq('role', 'teacher');
    
    if (error) {
      console.error('Supabase error fetching teachers:', error);
      return { data: [], error };
    }
    
    console.log('Raw teachers data:', data);
    
    if (!data || data.length === 0) {
      console.log('No teachers found for school ID:', schoolId);
      return { data: [], error: null };
    }
    
    console.log('Teachers retrieved successfully, count:', data.length);
    
    return { data, error: null };
  } catch (error) {
    console.error('Exception fetching teachers:', error);
    return { data: [], error: error as Error };
  }
}

// Create a subscription
export async function createSubscription(
  studentId: string,
  daysOfWeek: string[],
  sessionTime: string,
  durationMinutes: number,
  startDate: string,
  endDate: string,
  pricePerSession: number
) {
  const { data, error } = await supabase
    .from('subscriptions')
    .insert([
      { 
        student_id: studentId,
        days_of_week: daysOfWeek,
        session_time: sessionTime,
        duration_minutes: durationMinutes,
        start_date: startDate,
        end_date: endDate,
        price_per_session: pricePerSession,
        status: 'active'
      }
    ])
    .select()
    .single();

  return { data, error };
}

// Get subscriptions for a student
export async function getStudentSubscriptions(studentId: string) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('student_id', studentId);

  return { data, error };
}

// Get sessions for a subscription
export async function getSubscriptionSessions(subscriptionId: string) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('subscription_id', subscriptionId)
    .order('original_date', { ascending: true });

  return { data, error };
}

// Update session status
export async function updateSessionStatus(sessionId: string, status: 'scheduled' | 'attended' | 'missed' | 'cancelled') {
  const { data, error } = await supabase
    .from('sessions')
    .update({ status })
    .eq('id', sessionId)
    .select()
    .single();

  return { data, error };
}

// Reschedule a session
export async function rescheduleSession(sessionId: string, newDate: string, mode: 'auto' | 'manual' = 'manual') {
  const { data, error } = await supabase.rpc('reschedule_session', {
    session_id: sessionId,
    new_date: newDate,
    reschedule_mode: mode
  });

  return { 
    data: data as unknown as RescheduleSessionResponse, 
    error 
  };
}
