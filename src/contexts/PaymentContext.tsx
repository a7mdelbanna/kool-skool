
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUserInfo, getStudentsWithDetails, supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

export interface Session {
  id: string;
  date: Date;
  time: string;
  duration: string;
  status: "scheduled" | "completed" | "canceled" | "missed";
  notes?: string;
  sessionNumber?: number;
  totalSessions?: number;
  studentId: string;
  studentName: string;
  cost: number;
  paymentStatus: string;
}

interface PaymentContextType {
  sessions: Session[];
  loading: boolean;
  refreshSessions: () => Promise<void>;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export const PaymentProvider = ({ children }: { children: React.ReactNode }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllSessions = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching all lesson sessions...');

      // Get current user info
      const userInfo = await getCurrentUserInfo();
      if (!userInfo || userInfo.length === 0) {
        console.error('❌ No user info found');
        setSessions([]);
        return;
      }

      const currentUser = userInfo[0];
      console.log('👤 Current user:', currentUser);

      // Get all students to get their names and then fetch their sessions
      const students = await getStudentsWithDetails(currentUser.user_school_id);
      console.log('👥 Students found:', students.length);

      const allSessions: Session[] = [];

      // Fetch sessions for each student
      for (const student of students) {
        try {
          const { data: studentSessions, error } = await supabase.rpc('get_lesson_sessions', {
            p_student_id: student.id
          });

          if (error) {
            console.error(`Error fetching sessions for student ${student.id}:`, error);
            continue;
          }

          if (studentSessions) {
            const formattedSessions = studentSessions.map((session: any) => {
              const sessionDate = new Date(session.scheduled_date);
              
              return {
                id: session.id,
                date: sessionDate,
                time: format(sessionDate, 'HH:mm'),
                duration: `${session.duration_minutes || 60} min`,
                status: session.status === 'completed' ? 'completed' : 
                       session.status === 'cancelled' ? 'canceled' : 
                       session.status === 'missed' ? 'missed' : 'scheduled',
                notes: session.notes || `${student.course_name} session with ${student.first_name} ${student.last_name}`,
                sessionNumber: session.index_in_sub,
                totalSessions: undefined, // We'd need subscription info for this
                studentId: session.student_id,
                studentName: `${student.first_name} ${student.last_name}`,
                cost: Number(session.cost) || 0,
                paymentStatus: session.payment_status || 'pending'
              } as Session;
            });

            allSessions.push(...formattedSessions);
          }
        } catch (sessionError) {
          console.error(`Error fetching sessions for student ${student.id}:`, sessionError);
        }
      }

      console.log('✅ Sessions loaded:', allSessions.length);
      setSessions(allSessions.sort((a, b) => a.date.getTime() - b.date.getTime()));
    } catch (error) {
      console.error('❌ Error fetching sessions:', error);
      toast.error('Failed to load sessions');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshSessions = async () => {
    await fetchAllSessions();
  };

  useEffect(() => {
    fetchAllSessions();
  }, []);

  return (
    <PaymentContext.Provider value={{ sessions, loading, refreshSessions }}>
      {children}
    </PaymentContext.Provider>
  );
};

export const usePayments = () => {
  const context = useContext(PaymentContext);
  if (context === undefined) {
    throw new Error('usePayments must be used within a PaymentProvider');
  }
  return context;
};
