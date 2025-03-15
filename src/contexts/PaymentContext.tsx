
import React, { createContext, useState, useContext, ReactNode } from 'react';

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

export const PaymentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);

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
