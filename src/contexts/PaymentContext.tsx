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

// Add back missing interfaces for compatibility
export interface Payment {
  id: string;
  amount: number;
  date: Date;
  method: string;
  notes: string;
  status: "completed" | "pending" | "failed";
  accountId?: string;
  studentName?: string;
  contactId?: string;
}

export interface Expense {
  id: string;
  amount: number;
  date: Date;
  category: string;
  name: string;
  notes: string;
  recurring: boolean;
  frequency?: string;
  accountId?: string;
  contactId?: string;
}

export interface Account {
  id: string;
  name: string;
  currency: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  expenseNames: string[];
}

interface PaymentContextType {
  sessions: Session[];
  loading: boolean;
  refreshSessions: () => Promise<void>;
  // Add back missing properties for compatibility
  payments: Payment[];
  expenses: Expense[];
  accounts: Account[];
  expenseCategories: ExpenseCategory[];
  addPayment: (payment: Omit<Payment, 'id'>) => void;
  updatePayment: (id: string, payment: Partial<Payment>) => void;
  removePayment: (id: string) => void;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  removeExpense: (id: string) => void;
  updateSessionStatus: (id: string, status: Session['status']) => void;
  rescheduleSession: (id: string) => void;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export const PaymentProvider = ({ children }: { children: React.ReactNode }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Add back missing state for compatibility
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  
  // Mock data for compatibility
  const accounts: Account[] = [
    { id: '1', name: 'Main Account', currency: 'USD' },
    { id: '2', name: 'Savings Account', currency: 'USD' }
  ];
  
  const expenseCategories: ExpenseCategory[] = [
    {
      id: '1',
      name: 'Office Supplies',
      expenseNames: ['Stationery', 'Printer Paper', 'Pens', 'Notebooks']
    },
    {
      id: '2',
      name: 'Utilities',
      expenseNames: ['Electricity', 'Internet', 'Phone', 'Water']
    },
    {
      id: '3',
      name: 'Marketing',
      expenseNames: ['Social Media Ads', 'Print Materials', 'Website']
    }
  ];

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
                notes: session.notes || `Session with ${student.first_name} ${student.last_name}`,
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

  // Add back missing functions for compatibility
  const addPayment = (payment: Omit<Payment, 'id'>) => {
    const newPayment = { ...payment, id: Date.now().toString() };
    setPayments(prev => [...prev, newPayment]);
  };

  const updatePayment = (id: string, updates: Partial<Payment>) => {
    setPayments(prev => prev.map(payment => 
      payment.id === id ? { ...payment, ...updates } : payment
    ));
  };

  const removePayment = (id: string) => {
    setPayments(prev => prev.filter(payment => payment.id !== id));
  };

  const addExpense = (expense: Omit<Expense, 'id'>) => {
    const newExpense = { ...expense, id: Date.now().toString() };
    setExpenses(prev => [...prev, newExpense]);
  };

  const updateExpense = (id: string, updates: Partial<Expense>) => {
    setExpenses(prev => prev.map(expense => 
      expense.id === id ? { ...expense, ...updates } : expense
    ));
  };

  const removeExpense = (id: string) => {
    setExpenses(prev => prev.filter(expense => expense.id !== id));
  };

  const updateSessionStatus = (id: string, status: Session['status']) => {
    setSessions(prev => prev.map(session => 
      session.id === id ? { ...session, status } : session
    ));
  };

  const rescheduleSession = (id: string) => {
    // This would typically open a reschedule dialog or similar
    console.log('Rescheduling session:', id);
  };

  useEffect(() => {
    fetchAllSessions();
  }, []);

  return (
    <PaymentContext.Provider value={{ 
      sessions, 
      loading, 
      refreshSessions,
      payments,
      expenses,
      accounts,
      expenseCategories,
      addPayment,
      updatePayment,
      removePayment,
      addExpense,
      updateExpense,
      removeExpense,
      updateSessionStatus,
      rescheduleSession
    }}>
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
