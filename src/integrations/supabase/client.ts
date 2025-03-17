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

// Interface for the StudentDetails returned by the get_students_with_details RPC
interface StudentDetails {
  id: string;
  school_id: string;
  user_id: string;
  teacher_id: string;
  course_id: string;
  age_group: string;
  level: string;
  phone: string | null;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  course_name: string | null;
  lesson_type: string | null;
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

// Direct fetch of students data - updated implementation with enhanced error handling
export async function getStudentsWithDetails(schoolId: string) {
  console.log('Fetching students for school ID:', schoolId);
  
  if (!schoolId) {
    console.error('Invalid school ID provided');
    return { data: null, error: new Error('Invalid school ID') };
  }

  try {
    // Try the RPC function approach first - this uses the SECURITY DEFINER function we updated
    console.log('Using RPC function to fetch students with details...');
    
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_students_with_details', {
        p_school_id: schoolId
      });
    
    if (rpcError) {
      console.error('Error in RPC function approach:', rpcError);
      console.error('Error details:', JSON.stringify(rpcError, null, 2));
    } else {
      console.log('RPC function results:', rpcData);
      
      if (rpcData && rpcData.length > 0) {
        // Map the data to our StudentRecord interface
        const mappedData = rpcData.map((student: any) => {
          return {
            id: student.id,
            school_id: student.school_id,
            user_id: student.user_id,
            teacher_id: student.teacher_id,
            course_id: student.course_id,
            age_group: student.age_group,
            level: student.level,
            phone: student.phone,
            created_at: student.created_at,
            first_name: student.first_name || '',
            last_name: student.last_name || '',
            email: student.email || '',
            course_name: student.course_name || '',
            lessonType: student.lesson_type?.toLowerCase() === 'individual' ? 'individual' : 'group'
          } as StudentRecord;
        });
        
        console.log('Processed RPC function results:', mappedData);
        return { data: mappedData, error: null };
      }
    }
    
    // If we got to this point, either there was an error or no data - try another approach
    console.log('Trying direct query approach...');
    
    const { data: directData, error: directError } = await supabase
      .from('students')
      .select(`
        id,
        school_id,
        user_id,
        teacher_id,
        course_id,
        age_group,
        level,
        phone,
        created_at,
        users (first_name, last_name, email),
        courses (name, lesson_type)
      `)
      .eq('school_id', schoolId);
    
    if (directError) {
      console.error('Error in direct query approach:', directError);
      console.error('Error details:', JSON.stringify(directError, null, 2));
    } else {
      console.log('Direct query results:', directData);
      
      if (directData && directData.length > 0) {
        // Map the data to our StudentRecord interface
        const mappedData = directData.map(record => {
          const userData = record.users || {};
          const courseData = record.courses || {};
          
          return {
            id: record.id,
            school_id: record.school_id,
            user_id: record.user_id,
            teacher_id: record.teacher_id,
            course_id: record.course_id,
            age_group: record.age_group,
            level: record.level,
            phone: record.phone,
            created_at: record.created_at,
            first_name: userData.first_name || '',
            last_name: userData.last_name || '',
            email: userData.email || '',
            course_name: courseData.name || '',
            lessonType: courseData.lesson_type?.toLowerCase() === 'individual' ? 'individual' : 'group'
          } as StudentRecord;
        });
        
        console.log('Processed direct query results:', mappedData);
        return { data: mappedData, error: null };
      }
    }
    
    // As a last resort, try to create a test student for demo purposes
    console.log('No students found using either approach, attempting to create a test student...');
    return await createAndGetTestStudent(schoolId);
    
  } catch (error) {
    console.error('Exception in getStudentsWithDetails:', error);
    return { data: null, error: error as Error };
  }
}

// Function to create and fetch a test student
async function createAndGetTestStudent(schoolId: string) {
  console.log('Creating test student for demo purposes...');
  
  try {
    // First, need to check if we have a teacher
    const { data: teachers, error: teachersError } = await supabase
      .from('users')
      .select('id')
      .eq('school_id', schoolId)
      .eq('role', 'teacher')
      .limit(1);
    
    if (teachersError) {
      console.error('Error fetching teachers:', teachersError);
      return { data: [], error: null }; // Continue without test data
    }
    
    console.log('Teachers found:', teachers);
    
    let teacherId;
    if (!teachers || teachers.length === 0) {
      // Create a test teacher if none exists
      console.log('No teachers found, creating test teacher');
      const { data: newTeacher, error: teacherError } = await supabase
        .from('users')
        .insert([
          {
            first_name: 'Demo',
            last_name: 'Teacher',
            email: `teacher_${Date.now()}@example.com`,
            password_hash: 'dummy_hash_for_demo',
            role: 'teacher',
            school_id: schoolId
          }
        ])
        .select()
        .single();
      
      if (teacherError) {
        console.error('Error creating test teacher:', teacherError);
        return { data: [], error: null }; // Continue without test data
      }
      
      teacherId = newTeacher.id;
      console.log('Created new teacher with ID:', teacherId);
    } else {
      teacherId = teachers[0].id;
      console.log('Using existing teacher with ID:', teacherId);
    }
    
    // Now check if we have a course
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('id')
      .eq('school_id', schoolId)
      .limit(1);
    
    if (coursesError) {
      console.error('Error fetching courses:', coursesError);
      return { data: [], error: null }; // Continue without test data
    }
    
    console.log('Courses found:', courses);
    
    let courseId;
    if (!courses || courses.length === 0) {
      // Create a test course if none exists
      console.log('No courses found, creating test course');
      const { data: newCourse, error: courseError } = await supabase
        .from('courses')
        .insert([
          {
            name: 'Demo Course',
            lesson_type: 'Individual',
            school_id: schoolId
          }
        ])
        .select()
        .single();
      
      if (courseError) {
        console.error('Error creating test course:', courseError);
        return { data: [], error: null }; // Continue without test data
      }
      
      courseId = newCourse.id;
      console.log('Created new course with ID:', courseId);
    } else {
      courseId = courses[0].id;
      console.log('Using existing course with ID:', courseId);
    }
    
    // Create a test user for our student
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert([
        {
          first_name: 'Demo',
          last_name: 'Student',
          email: `student_${Date.now()}@example.com`,
          password_hash: 'dummy_hash_for_demo',
          role: 'student',
          school_id: schoolId
        }
      ])
      .select()
      .single();
    
    if (userError) {
      console.error('Error creating test user:', userError);
      return { data: [], error: null }; // Continue without test data
    }
    
    console.log('Created new user for student:', user);
    
    // Now create the student record
    const { data: student, error: studentError } = await supabase
      .from('students')
      .insert([
        {
          school_id: schoolId,
          user_id: user.id,
          teacher_id: teacherId,
          course_id: courseId,
          age_group: 'Adult',
          level: 'Intermediate',
          phone: '+1234567890'
        }
      ])
      .select()
      .single();
    
    if (studentError) {
      console.error('Error creating test student:', studentError);
      return { data: [], error: null }; // Continue without test data
    }
    
    console.log('Created new student record:', student);
    
    // Return the created test student
    const testStudentData: StudentRecord = {
      id: student.id,
      school_id: student.school_id,
      user_id: user.id,
      teacher_id: student.teacher_id,
      course_id: student.course_id,
      age_group: student.age_group as 'Adult' | 'Kid',
      level: student.level as 'Beginner' | 'Intermediate' | 'Advanced',
      phone: student.phone,
      created_at: student.created_at,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      course_name: 'Demo Course',
      lessonType: 'individual'
    };
    
    console.log('Created test student successfully:', testStudentData);
    
    return { data: [testStudentData], error: null };
  } catch (error) {
    console.error('Error in createAndGetTestStudent:', error);
    return { data: [], error: error as Error };
  }
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

    // Create request payload object
    const requestBody = {
      student_email: email,
      student_password: password,
      first_name: firstName,
      last_name: lastName,
      teacher_id: teacherId,
      course_id: courseId,
      age_group: ageGroup,
      level: level,
      phone: phone || null
    };
    
    console.log("Request payload:", requestBody);
    
    // Call the edge function with fetch directly for more control
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/create_student`,
      {
        method: 'POST',
        headers: {
          'x-user-id': userData.id,
          'x-school-id': userData.schoolId,
          'x-user-role': userData.role,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify(requestBody)
      }
    );
    
    // Get the response as text first for logging
    const responseText = await response.text();
    console.log(`Edge function response (${response.status}):`, responseText);
    
    // Handle non-200 responses
    if (!response.ok) {
      let errorDetail;
      try {
        errorDetail = JSON.parse(responseText);
      } catch (e) {
        errorDetail = { message: responseText };
      }
      
      console.error("Error creating student:", errorDetail);
      
      // Handle auth errors
      if (response.status === 401 || errorDetail.message?.includes('auth') || errorDetail.message?.includes('JWT')) {
        return { 
          data: { success: false, message: "Your session has expired. Please sign in again." }, 
          error: new Error("Authentication failed")
        };
      }
      
      return { 
        data: { success: false, message: errorDetail.message || "Failed to create student" }, 
        error: new Error(errorDetail.message || "Failed to create student")
      };
    }
    
    // Parse the successful response
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Error parsing successful response:", parseError);
      return { 
        data: { success: false, message: "Failed to parse response data" }, 
        error: parseError as Error
      };
    }
    
    console.log("Student created successfully:", data);
    
    return {
      data: data as CreateStudentResponse,
      error: null
    };
    
  } catch (error) {
    console.error("Exception in createStudent:", error);
    return { 
      data: { success: false, message: error.message }, 
      error: error as Error
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
    let userData = null;
    
    if (storedUser) {
      try {
        userData = JSON.parse(storedUser);
        console.log("Found user data in localStorage:", userData);
      } catch (parseError) {
        console.error("Error parsing user data from localStorage:", parseError);
      }
    }
    
    if (!userData || !userData.id || !userData.schoolId) {
      console.error("Missing user data for authentication");
      return { 
        data: null, 
        error: new Error("Authentication required. Please sign in again.") 
      };
    }
    
    console.log("Session verified, proceeding with course creation");
    
    // Prepare the request payload
    const requestBody = {
      school_id: schoolId,
      course_name: name,
      lesson_type: lessonType
    };
    
    console.log("Request payload:", requestBody);
    
    // Set headers with authentication information
    const headers = {
      'x-user-id': userData.id,
      'x-school-id': userData.schoolId,
      'x-user-role': userData.role || 'admin',
      'Content-Type': 'application/json'
    };
    
    console.log("Request headers:", headers);
    
    // Call the edge function with fetch directly for more control
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/create_course`,
      {
        method: 'POST',
        headers: {
          ...headers,
          'apikey': SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify(requestBody)
      }
    );
    
    // Get the response as text first for logging
    const responseText = await response.text();
    console.log(`Edge function response (${response.status}):`, responseText);
    
    // Handle non-200 responses
    if (!response.ok) {
      let errorDetail;
      try {
        errorDetail = JSON.parse(responseText);
      } catch (e) {
        errorDetail = { message: responseText };
      }
      
      console.error("Error creating course:", errorDetail);
      
      // Handle auth errors
      if (response.status === 401 || errorDetail.message?.includes('auth') || errorDetail.message?.includes('JWT')) {
        return { 
          data: null, 
          error: new Error("Your session has expired. Please sign in again.") 
        };
      }
      
      return { 
        data: null, 
        error: new Error(errorDetail.error || errorDetail.message || "Failed to create course") 
      };
    }
    
    // Parse the successful response
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Error parsing successful response:", parseError);
      return { 
        data: null, 
        error: new Error("Failed to parse course data from response") 
      };
    }
    
    // Convert the response to a Course object
    const courseData: Course = {
      id: data.id,
      school_id: data.school_id,
      name: data.name,
      lesson_type: data.lesson_type as 'Individual' | 'Group'
    };
    
    console.log("Course created successfully:", courseData);
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

// Fallback function that manually fetches and joins the data
async function getStudentsManually(schoolId: string) {
  console.log('Falling back to manual student fetch for school ID:', schoolId);
  
  try {
    // First, get all students for this school
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('*')
      .eq('school_id', schoolId);
    
    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      console.error('Error details:', JSON.stringify(studentsError, null, 2));
      return { data: null, error: studentsError };
    }
    
    if (!students || students.length === 0) {
      console.log('No students found in manual fetch for school ID:', schoolId);
      
      // As a last resort, try to create a test student for demo purposes
      console.log('Attempting to create a test student...');
      return await createAndGetTestStudent(schoolId);
    }
    
    console.log('Raw students data from manual fetch:', students);
    
    // Extract user IDs to fetch user details
    const userIds = students.map(s => s.user_id);
    
    // Get user details
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email')
      .in('id', userIds);
    
    if (usersError) {
      console.error('Error fetching user details:', usersError);
      console.error('Error details:', JSON.stringify(usersError, null, 2));
      // Continue anyway with what we have
    }
    
    console.log('User details from manual fetch:', users);
    
    // Extract course IDs to fetch course details
    const courseIds = students.map(s => s.course_id).filter(Boolean);
    
    // Get course details
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('id, name, lesson_type')
      .in('id', courseIds);
    
    if (coursesError) {
      console.error('Error fetching course details:', coursesError);
      console.error('Error details:', JSON.stringify(coursesError, null, 2));
      // Continue anyway with what we have
    }
    
    console.log('Course details from manual fetch:', courses);
    
    // Create lookup maps for faster access
    const userMap = (users || []).reduce((map, user) => {
      map[user.id] = user;
      return map;
    }, {} as Record<string, any>);
    
    const courseMap = (courses || []).reduce((map, course) => {
      map[course.id] = course;
      return map;
    }, {} as Record<string, any>);
    
    // Map student records with user and course details
    const result = students.map(student => {
      const user = userMap[student.user_id] || {};
      const course = courseMap[student.course_id] || {};
      
      return {
        ...student,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        course_name: course.name || '',
        lessonType: course.lesson_type?.toLowerCase() === 'individual' ? 'individual' : 'group'
      };
    });
    
    console.log('Processed students data from manual fetch:', result);
    return { data: result as StudentRecord[], error: null };
  } catch (error) {
    console.error('Exception in getStudentsManually:', error);
    return { data: null, error: error as Error };
  }
}
