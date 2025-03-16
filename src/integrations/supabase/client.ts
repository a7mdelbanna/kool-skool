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
  const { data, error } = await supabase.rpc('create_student', {
    student_email: email,
    student_password: password,
    first_name: firstName,
    last_name: lastName,
    teacher_id: teacherId,
    course_id: courseId,
    age_group: ageGroup,
    level: level,
    phone: phone || null
  });

  return { 
    data: data as unknown as CreateStudentResponse, 
    error 
  };
}

// Get courses for a school
export async function getSchoolCourses(schoolId: string) {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('school_id', schoolId);

  // Convert string lesson_type to proper enum type
  const typedData = data?.map(course => ({
    ...course,
    lesson_type: course.lesson_type as 'Individual' | 'Group'
  }));

  return { data: typedData as Course[], error };
}

// Create a course
export async function createCourse(schoolId: string, name: string, lessonType: 'Individual' | 'Group') {
  console.log("Creating course with:", { schoolId, name, lessonType });
  
  try {
    const { data, error } = await supabase
      .from('courses')
      .insert([
        { school_id: schoolId, name, lesson_type: lessonType }
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating course:", error);
    }
    
    return { data: data as Course, error };
  } catch (error) {
    console.error("Exception creating course:", error);
    return { data: null, error: error as Error };
  }
}

// Get teachers for a school
export async function getSchoolTeachers(schoolId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name')
    .eq('school_id', schoolId)
    .eq('role', 'teacher');

  return { data, error };
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
