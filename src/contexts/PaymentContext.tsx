
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { addDays, subDays } from 'date-fns';

export interface Payment {
  id: string;
  amount: number;
  date: Date;
  method: string;
  notes: string;
  status: "completed" | "pending" | "failed";
  relatedSubscriptionId?: string;
  currency?: string;
}

export interface Session {
  id: string;
  date: Date;
  time: string;
  duration: string;
  status: "scheduled" | "completed" | "canceled" | "missed";
  paymentStatus: "paid" | "unpaid";
  cost: number;
  notes?: string;
  subscriptionId?: string;
}

interface PaymentContextType {
  payments: Payment[];
  addPayment: (payment: Omit<Payment, 'id'>) => void;
  removePayment: (id: string) => void;
  sessions: Session[];
  addSessions: (sessions: Omit<Session, 'id'>[]) => void;
  removeSessionsBySubscriptionId: (subscriptionId: string) => void;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

// Generate mock sessions for demonstration
const generateMockSessions = (): Session[] => {
  const today = new Date();
  const subjects = [
    'Mathematics', 'Science', 'English', 'Physics', 
    'Chemistry', 'Biology', 'History', 'Geography', 
    'Literature', 'Computer Science'
  ];
  
  const statuses: Session['status'][] = ['scheduled', 'completed', 'canceled', 'missed'];
  const paymentStatuses: Session['paymentStatus'][] = ['paid', 'unpaid'];
  const durations = ['30 min', '45 min', '60 min', '90 min'];
  
  // Generate 20 random sessions across 7 days before and 14 days after today
  return Array.from({ length: 20 }, (_, i) => {
    const randomDayOffset = Math.floor(Math.random() * 21) - 7; // -7 to +14 days
    const date = randomDayOffset >= 0 
      ? addDays(today, randomDayOffset) 
      : subDays(today, Math.abs(randomDayOffset));
    
    // Set hours between 8 AM and 7 PM
    date.setHours(8 + Math.floor(Math.random() * 12), 0, 0, 0);
    
    const subject = subjects[Math.floor(Math.random() * subjects.length)];
    const duration = durations[Math.floor(Math.random() * durations.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const paymentStatus = paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];
    
    return {
      id: `session-${i + 1}`,
      date,
      time: `${date.getHours()}:00`,
      duration,
      status,
      paymentStatus,
      cost: 25 + Math.floor(Math.random() * 50), // $25 to $75
      notes: `${subject} lesson with Student ${i % 5 + 1}`,
      subscriptionId: `sub-${Math.floor(i / 4) + 1}`
    };
  });
};

export const PaymentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);

  // Initialize with mock data on first render
  useEffect(() => {
    if (sessions.length === 0) {
      setSessions(generateMockSessions());
    }
  }, [sessions.length]);

  const addPayment = (payment: Omit<Payment, 'id'>) => {
    const newPayment: Payment = {
      ...payment,
      id: Date.now().toString(),
    };
    setPayments(prevPayments => [...prevPayments, newPayment]);
  };

  const removePayment = (id: string) => {
    setPayments(prevPayments => prevPayments.filter(payment => payment.id !== id));
  };

  const addSessions = (newSessions: Omit<Session, 'id'>[]) => {
    const sessionsWithIds = newSessions.map(session => ({
      ...session,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }));
    setSessions(prevSessions => [...prevSessions, ...sessionsWithIds]);
  };

  const removeSessionsBySubscriptionId = (subscriptionId: string) => {
    setSessions(prevSessions => 
      prevSessions.filter(session => session.subscriptionId !== subscriptionId)
    );
  };

  return (
    <PaymentContext.Provider value={{ 
      payments, 
      addPayment, 
      removePayment,
      sessions,
      addSessions,
      removeSessionsBySubscriptionId
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
