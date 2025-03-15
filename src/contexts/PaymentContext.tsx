
import React, { createContext, useState, useContext, ReactNode } from 'react';

export interface Payment {
  id: string;
  amount: number;
  date: Date;
  method: string;
  notes: string;
  status: "completed" | "pending" | "failed";
  relatedSubscriptionId?: string;
}

interface PaymentContextType {
  payments: Payment[];
  addPayment: (payment: Omit<Payment, 'id'>) => void;
  removePayment: (id: string) => void;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export const PaymentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [payments, setPayments] = useState<Payment[]>([]);

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

  return (
    <PaymentContext.Provider value={{ payments, addPayment, removePayment }}>
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
