
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

// Helper function to get students with joined data
export async function getStudentsWithDetails(schoolId: string) {
  const { data, error } = await supabase
    .from('students')
    .select(`
      *,
      users!inner(first_name, last_name, email),
      courses!inner(name)
    `)
    .eq('school_id', schoolId);

  if (error) {
    console.error('Error fetching students:', error);
    return { data: null, error };
  }

  // Transform the data to match our StudentRecord interface
  const transformedData = data.map(student => ({
    id: student.id,
    school_id: student.school_id,
    user_id: student.user_id,
    teacher_id: student.teacher_id,
    course_id: student.course_id,
    age_group: student.age_group,
    level: student.level,
    phone: student.phone,
    created_at: student.created_at,
    // Joined data
    first_name: student.users.first_name,
    last_name: student.users.last_name,
    email: student.users.email,
    course_name: student.courses.name
  })) as StudentRecord[];

  return { data: transformedData, error: null };
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

  return { data, error };
}

// Get courses for a school
export async function getSchoolCourses(schoolId: string) {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('school_id', schoolId);

  return { data, error };
}

// Create a course
export async function createCourse(schoolId: string, name: string, lessonType: 'Individual' | 'Group') {
  const { data, error } = await supabase
    .from('courses')
    .insert([
      { school_id: schoolId, name, lesson_type: lessonType }
    ])
    .select()
    .single();

  return { data, error };
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

  return { data, error };
}
