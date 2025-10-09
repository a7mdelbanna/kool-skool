import { useQuery } from '@tanstack/react-query';
import { databaseService } from '@/services/firebase/database.service';
import { getStudentLessonSessions } from '@/integrations/supabase/client';
import { format, isPast } from 'date-fns';

interface ActionableSession {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  profileImage?: string;
  courseName: string;
  date: Date;
  time: string;
  status: string;
  daysOverdue: number;
}

export const useActionableSessions = (schoolId?: string) => {
  return useQuery({
    queryKey: ['actionable-sessions', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      const now = new Date();
      const sessions: ActionableSession[] = [];

      try {
        // Step 1: Get all students from Firebase
        const students = await databaseService.query('students', {
          where: [{ field: 'schoolId', operator: '==', value: schoolId }]
        });

        if (!students || students.length === 0) {
          return [];
        }

        // Step 2: Fetch sessions from Supabase for each student
        const studentIds = students.map((s: any) => s.id);
        const allSessionsData = await Promise.all(
          studentIds.map(async (studentId) => {
            try {
              const studentSessions = await getStudentLessonSessions(studentId);
              return { studentId, sessions: studentSessions || [] };
            } catch (error) {
              console.error(`Failed to fetch sessions for student ${studentId}:`, error);
              return { studentId, sessions: [] };
            }
          })
        );

        // Step 3: Filter for past sessions with status='scheduled' (no action taken)
        allSessionsData.forEach(({ studentId, sessions: studentSessions }) => {
          const student = students.find((s: any) => s.id === studentId);
          if (!student) return;

          const studentName = `${student.firstName || student.first_name || ''} ${student.lastName || student.last_name || ''}`.trim();
          const courseName = student.courseName || student.course_name || 'Unknown Course';
          const studentEmail = student.email;
          const profileImage = student.image || student.profileImage;

          studentSessions.forEach((session: any) => {
            // Only include past sessions with status='scheduled'
            if (session.status !== 'scheduled') return;

            let sessionDate: Date;
            let sessionTime: string;

            if (session.scheduled_datetime) {
              sessionDate = new Date(session.scheduled_datetime);
              sessionTime = format(sessionDate, 'HH:mm');
            } else if (session.scheduled_date && session.scheduled_time) {
              const dateStr = session.scheduled_date;
              const timeStr = session.scheduled_time;
              const [year, month, day] = dateStr.split('-').map(Number);
              const [hours, minutes] = timeStr.split(':').map(Number);
              sessionDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
              sessionTime = timeStr;
            } else {
              return; // Skip if no valid date/time
            }

            // Only include past sessions (before now)
            if (sessionDate < now) {
              const daysOverdue = Math.floor((now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));

              sessions.push({
                id: session.id,
                studentId: studentId,
                studentName,
                studentEmail,
                profileImage,
                courseName,
                date: sessionDate,
                time: sessionTime,
                status: session.status,
                daysOverdue
              });
            }
          });
        });

        // Sort by date (oldest first - most urgent)
        sessions.sort((a, b) => a.date.getTime() - b.date.getTime());

        console.log('📅 Found actionable sessions:', sessions.length);
        return sessions;
      } catch (error) {
        console.error('Error fetching actionable sessions:', error);
        throw error;
      }
    },
    enabled: !!schoolId,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};