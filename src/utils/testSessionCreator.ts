import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

/**
 * Test utility to manually create sessions for debugging
 * This helps verify that sessions can be created and retrieved
 */
export async function createTestSession(
  studentId: string,
  subscriptionId: string,
  schoolId: string
) {
  try {
    console.log('=== CREATING TEST SESSION ===');
    console.log('Student ID:', studentId);
    console.log('Subscription ID:', subscriptionId);
    console.log('School ID:', schoolId);
    
    const sessionId = doc(collection(db, 'lesson_sessions')).id;
    const sessionDate = new Date();
    sessionDate.setDate(sessionDate.getDate() + 7); // Set for next week
    
    const testSession = {
      id: sessionId,
      student_id: studentId,
      subscription_id: subscriptionId,
      school_id: schoolId,
      teacher_id: 'test-teacher',
      course_id: 'test-course',
      scheduled_date: sessionDate.toISOString(),
      duration_minutes: 60,
      status: 'scheduled',
      session_number: 1,
      total_sessions: 10,
      cancellation_deadline: new Date(sessionDate.getTime() - 48 * 60 * 60 * 1000).toISOString(),
      notes: 'Test session created for debugging',
      materials: '',
      homework: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('Test session object:', testSession);
    
    await setDoc(doc(db, 'lesson_sessions', sessionId), testSession);
    
    console.log('✅ Test session created successfully with ID:', sessionId);
    return sessionId;
  } catch (error) {
    console.error('❌ Error creating test session:', error);
    throw error;
  }
}

// Export to window for easy testing in console
if (typeof window !== 'undefined') {
  (window as any).createTestSession = createTestSession;
}