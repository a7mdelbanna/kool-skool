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

// Explicitly define CreateStudentResponse interface with student_id
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

export interface CreateCourseRequest {
  name: string;
  lesson_type: string;
}

export interface CreateCourseResponse {
  success: boolean;
  course?: {
    id: string;
    school_id: string;
    name: string;
    lesson_type: string;
  };
  message?: string;
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

// Create the supabase client with simplified configuration
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  global: {
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
    }
  }
});

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

// Create a student - Use Edge Function instead of direct client operations
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
): Promise<{ data: CreateStudentResponse | null, error: Error | null }> {
  try {
    // Get user data from localStorage to set admin info
    const userDataStr = localStorage.getItem('user');
    if (!userDataStr) {
      console.error("No user data found in localStorage");
      return { 
        data: { success: false, message: "Authentication required. Please log in again." }, 
        error: null 
      };
    }
    
    const userData = JSON.parse(userDataStr);
    
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
    
    // Use the Edge Function to create the student
    const { data, error } = await supabase.functions.invoke<CreateStudentResponse>('create_student', {
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
      console.error("Error calling create_student function:", error);
      return {
        data: { success: false, message: error.message },
        error: error
      };
    }
    
    if (!data) {
      console.error("No data returned from create_student function");
      return {
        data: { success: false, message: "No data returned from server" },
        error: new Error("No data returned from server")
      };
    }
    
    console.log("Student created successfully:", data);
    
    return {
      data: data,
      error: null
    };
    
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
export const createCourse = async (
  courseName: string,
  lessonType: string
): Promise<{ data: CreateCourseResponse | null; error: Error | null }> => {
  try {
    const userData = getUserData();
    if (!userData || !userData.id || !userData.schoolId || userData.role !== 'admin') {
      return {
        data: null,
        error: new Error('Only school admins can create courses')
      };
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create_course`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'x-user-id': userData.id,
          'x-school-id': userData.schoolId,
          'x-user-role': userData.role
        },
        body: JSON.stringify({
          name: courseName,
          lesson_type: lessonType
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        data: null,
        error: new Error(result.message || 'Failed to create course')
      };
    }

    return { data: result, error: null };
  } catch (error) {
    console.error('Error creating course:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error creating course')
    };
  }
};

// Helper function to get user data from localStorage
function getUserData() {
  try {
    const user = localStorage.getItem('user');
    if (!user) return null;
    return JSON.parse(user);
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
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
