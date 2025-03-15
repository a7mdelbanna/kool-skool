
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { addDays, subDays, addWeeks, getDay } from 'date-fns';

export interface Payment {
  id: string;
  amount: number;
  date: Date;
  method: string;
  notes: string;
  status: "completed" | "pending" | "failed";
  relatedSubscriptionId?: string;
  currency?: string;
  accountId?: string;
  studentName?: string;
  type: "payment";
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
  currency?: string;
  type: "expense";
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
  recurring: boolean;
  frequency?: string;
}

export interface Session {
  id: string;
  date: Date | string; // Allow both Date and string for flexibility
  time: string;
  duration: string;
  status: "scheduled" | "completed" | "canceled" | "missed";
  paymentStatus: "paid" | "unpaid";
  cost: number;
  notes?: string;
  subscriptionId?: string;
  sessionNumber?: number;
  totalSessions?: number;
}

interface PaymentContextType {
  payments: Payment[];
  addPayment: (payment: Omit<Payment, 'id' | 'type'>) => void;
  updatePayment: (id: string, payment: Partial<Omit<Payment, 'id' | 'type'>>) => void;
  removePayment: (id: string) => void;
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id' | 'type'>) => void;
  updateExpense: (id: string, expense: Partial<Omit<Expense, 'id' | 'type'>>) => void;
  removeExpense: (id: string) => void;
  accounts: Account[];
  addAccount: (account: Omit<Account, 'id'>) => void;
  updateAccount: (id: string, account: Partial<Omit<Account, 'id'>>) => void;
  removeAccount: (id: string) => void;
  expenseCategories: ExpenseCategory[];
  addExpenseCategory: (category: Omit<ExpenseCategory, 'id'>) => void;
  updateExpenseCategory: (id: string, category: Partial<Omit<ExpenseCategory, 'id'>>) => void;
  removeExpenseCategory: (id: string) => void;
  sessions: Session[];
  addSessions: (sessions: Omit<Session, 'id'>[]) => void;
  removeSessionsBySubscriptionId: (subscriptionId: string) => void;
  updateSessionStatus: (sessionId: string, status: Session['status']) => void;
  rescheduleSession: (sessionId: string) => void;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

// Generate mock data for demonstration
const generateMockData = () => {
  // Generate mock sessions
  const mockSessions = generateMockSessions();
  
  // Generate mock payments
  const mockPayments: Payment[] = [
    {
      id: '1',
      amount: 120,
      date: new Date(2024, 5, 10), // June 10, 2024
      status: 'completed',
      method: 'Credit Card',
      notes: 'Payment for 4 lessons (1 month) for Alex Johnson',
      type: 'payment',
      studentName: 'Alex Johnson'
    },
    {
      id: '2',
      amount: 90,
      date: new Date(2024, 5, 8), // June 8, 2024
      status: 'completed',
      method: 'Bank Transfer',
      notes: 'Payment for 3 lessons (1 month) for Sophia Chen',
      type: 'payment',
      studentName: 'Sophia Chen'
    },
    {
      id: '3',
      amount: 150,
      date: new Date(2024, 5, 15), // June 15, 2024
      status: 'pending',
      method: 'PayPal',
      notes: 'Payment for 5 lessons (1 month) for Michael Davis',
      type: 'payment',
      studentName: 'Michael Davis'
    },
    {
      id: '4',
      amount: 60,
      date: new Date(2024, 5, 5), // June 5, 2024
      status: 'completed',
      method: 'Cash',
      notes: 'Payment for 2 lessons (1 month) for Emma Wilson',
      type: 'payment',
      studentName: 'Emma Wilson'
    },
    {
      id: '5',
      amount: 180,
      date: new Date(2024, 5, 20), // June 20, 2024
      status: 'failed',
      method: 'Credit Card',
      notes: 'Payment for 6 lessons (1 month) for Noah Martinez',
      type: 'payment',
      studentName: 'Noah Martinez'
    },
    {
      id: '6',
      amount: 90,
      date: new Date(2024, 5, 12), // June 12, 2024
      status: 'completed',
      method: 'Bank Transfer',
      notes: 'Payment for 3 lessons (1 month) for Olivia Brown',
      type: 'payment',
      studentName: 'Olivia Brown'
    },
    {
      id: '7',
      amount: 120,
      date: new Date(2024, 5, 18), // June 18, 2024
      status: 'pending',
      method: 'PayPal',
      notes: 'Payment for 4 lessons (1 month) for William Taylor',
      type: 'payment',
      studentName: 'William Taylor'
    },
    {
      id: '8',
      amount: 150,
      date: new Date(2024, 4, 30), // May 30, 2024
      status: 'failed',
      method: 'Credit Card',
      notes: 'Payment for 5 lessons (1 month) for Ava Anderson',
      type: 'payment',
      studentName: 'Ava Anderson'
    },
  ];
  
  // Generate mock expenses
  const mockExpenses: Expense[] = [
    {
      id: 'exp-1',
      amount: 200,
      date: new Date(2024, 5, 5),
      category: 'Rent',
      name: 'Office Rent',
      notes: 'Monthly office rent',
      recurring: true,
      frequency: 'monthly',
      type: 'expense'
    },
    {
      id: 'exp-2',
      amount: 50,
      date: new Date(2024, 5, 10),
      category: 'Utilities',
      name: 'Internet',
      notes: 'Monthly internet bill',
      recurring: true,
      frequency: 'monthly',
      type: 'expense'
    },
    {
      id: 'exp-3',
      amount: 30,
      date: new Date(2024, 5, 12),
      category: 'Supplies',
      name: 'Office Supplies',
      notes: 'Pens, papers, etc.',
      recurring: false,
      type: 'expense'
    },
    {
      id: 'exp-4',
      amount: 120,
      date: new Date(2024, 5, 15),
      category: 'Utilities',
      name: 'Electricity',
      notes: 'Monthly electricity bill',
      recurring: true,
      frequency: 'monthly',
      type: 'expense'
    }
  ];
  
  // Generate mock accounts
  const mockAccounts: Account[] = [
    {
      id: 'acc-1',
      name: 'PayPal',
      currency: 'USD'
    },
    {
      id: 'acc-2',
      name: 'Tinkoff',
      currency: 'RUB'
    },
    {
      id: 'acc-3',
      name: 'Cash',
      currency: 'USD'
    }
  ];
  
  // Generate mock expense categories
  const mockExpenseCategories: ExpenseCategory[] = [
    {
      id: 'cat-1',
      name: 'Rent',
      expenseNames: ['Office Rent', 'Classroom Rent'],
      recurring: true,
      frequency: 'monthly'
    },
    {
      id: 'cat-2',
      name: 'Utilities',
      expenseNames: ['Electricity', 'Internet', 'Water', 'Phone'],
      recurring: true,
      frequency: 'monthly'
    },
    {
      id: 'cat-3',
      name: 'Supplies',
      expenseNames: ['Office Supplies', 'Teaching Materials', 'Books'],
      recurring: false
    },
    {
      id: 'cat-4',
      name: 'Marketing',
      expenseNames: ['Advertising', 'Social Media', 'Printing'],
      recurring: false
    }
  ];
  
  return {
    sessions: mockSessions,
    payments: mockPayments,
    expenses: mockExpenses,
    accounts: mockAccounts, 
    expenseCategories: mockExpenseCategories
  };
};

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
  
  // Create subscriptions with total sessions count
  const subscriptions = Array.from({ length: 5 }, (_, i) => ({
    id: `sub-${i + 1}`,
    totalSessions: 8 + Math.floor(Math.random() * 8) // 8-16 sessions per subscription
  }));
  
  // Generate 20 random sessions across 7 days before and 14 days after today
  const generatedSessions = Array.from({ length: 20 }, (_, i) => {
    const randomDayOffset = Math.floor(Math.random() * 21) - 7; // -7 to +14 days
    const date = randomDayOffset >= 0 
      ? addDays(today, randomDayOffset) 
      : subDays(today, Math.abs(randomDayOffset));
    
    // Set hours between 8 AM and 7 PM
    date.setHours(8 + Math.floor(Math.random() * 12), 0, 0, 0);
    
    return {
      id: `session-${i + 1}`,
      date, // Store as Date object
      time: `${date.getHours()}:00`,
      duration: durations[Math.floor(Math.random() * durations.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      paymentStatus: paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)],
      cost: 25 + Math.floor(Math.random() * 50), // $25 to $75
      notes: `${subjects[Math.floor(Math.random() * subjects.length)]} lesson with Student ${i % 5 + 1}`,
      subscriptionId: subscriptions[Math.floor(i / 4)].id,
      sessionNumber: (i % subscriptions[Math.floor(i / 4)].totalSessions) + 1,
      totalSessions: subscriptions[Math.floor(i / 4)].totalSessions
    };
  });
  
  return generatedSessions;
};

export const PaymentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);

  // Initialize with mock data on first render
  useEffect(() => {
    console.log("PaymentProvider initializing");
    if (sessions.length === 0) {
      const mockData = generateMockData();
      console.log("Generated mock sessions:", mockData.sessions.length);
      setSessions(mockData.sessions);
      setPayments(mockData.payments);
      setExpenses(mockData.expenses);
      setAccounts(mockData.accounts);
      setExpenseCategories(mockData.expenseCategories);
    }
  }, [sessions.length]);

  // Payment methods
  const addPayment = (payment: Omit<Payment, 'id' | 'type'>) => {
    const newPayment: Payment = {
      ...payment,
      id: `payment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'payment'
    };
    setPayments(prevPayments => [...prevPayments, newPayment]);
  };

  const updatePayment = (id: string, paymentUpdate: Partial<Omit<Payment, 'id' | 'type'>>) => {
    setPayments(prevPayments => 
      prevPayments.map(payment => 
        payment.id === id ? { ...payment, ...paymentUpdate } : payment
      )
    );
  };

  const removePayment = (id: string) => {
    setPayments(prevPayments => prevPayments.filter(payment => payment.id !== id));
  };

  // Expense methods
  const addExpense = (expense: Omit<Expense, 'id' | 'type'>) => {
    const newExpense: Expense = {
      ...expense,
      id: `expense-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'expense'
    };
    setExpenses(prevExpenses => [...prevExpenses, newExpense]);
  };

  const updateExpense = (id: string, expenseUpdate: Partial<Omit<Expense, 'id' | 'type'>>) => {
    setExpenses(prevExpenses => 
      prevExpenses.map(expense => 
        expense.id === id ? { ...expense, ...expenseUpdate } : expense
      )
    );
  };

  const removeExpense = (id: string) => {
    setExpenses(prevExpenses => prevExpenses.filter(expense => expense.id !== id));
  };

  // Account methods
  const addAccount = (account: Omit<Account, 'id'>) => {
    const newAccount: Account = {
      ...account,
      id: `account-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    setAccounts(prevAccounts => [...prevAccounts, newAccount]);
  };

  const updateAccount = (id: string, accountUpdate: Partial<Omit<Account, 'id'>>) => {
    setAccounts(prevAccounts => 
      prevAccounts.map(account => 
        account.id === id ? { ...account, ...accountUpdate } : account
      )
    );
  };

  const removeAccount = (id: string) => {
    setAccounts(prevAccounts => prevAccounts.filter(account => account.id !== id));
  };

  // Expense category methods
  const addExpenseCategory = (category: Omit<ExpenseCategory, 'id'>) => {
    const newCategory: ExpenseCategory = {
      ...category,
      id: `category-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    setExpenseCategories(prevCategories => [...prevCategories, newCategory]);
  };

  const updateExpenseCategory = (id: string, categoryUpdate: Partial<Omit<ExpenseCategory, 'id'>>) => {
    setExpenseCategories(prevCategories => 
      prevCategories.map(category => 
        category.id === id ? { ...category, ...categoryUpdate } : category
      )
    );
  };

  const removeExpenseCategory = (id: string) => {
    setExpenseCategories(prevCategories => prevCategories.filter(category => category.id !== id));
  };

  // Session methods
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

  // Method to update session status (for cancel and complete actions)
  const updateSessionStatus = (sessionId: string, status: Session['status']) => {
    setSessions(prevSessions => 
      prevSessions.map(session => 
        session.id === sessionId ? { ...session, status } : session
      )
    );
  };

  // Method to reschedule a session to the next available date
  const rescheduleSession = (sessionId: string) => {
    setSessions(prevSessions => {
      const sessionToReschedule = prevSessions.find(s => s.id === sessionId);
      
      if (!sessionToReschedule || !sessionToReschedule.subscriptionId) {
        return prevSessions;
      }
      
      // Find all sessions from the same subscription
      const subscriptionSessions = prevSessions
        .filter(s => s.subscriptionId === sessionToReschedule.subscriptionId)
        .filter(s => s.status === "scheduled" || s.id === sessionId);
      
      // Find the last scheduled session date
      const lastSessionDate = new Date(
        Math.max(...subscriptionSessions.map(s => new Date(s.date).getTime()))
      );
      
      // Determine the day of week for the original session
      const originalDate = new Date(sessionToReschedule.date);
      const dayOfWeek = getDay(originalDate);
      
      // Find next occurrence of that day after the last session
      let newDate = addWeeks(lastSessionDate, 1);
      while (getDay(newDate) !== dayOfWeek) {
        newDate = addDays(newDate, 1);
      }
      
      // Set the same time as original
      newDate.setHours(originalDate.getHours(), originalDate.getMinutes());
      
      // Create updated session with correct status type
      return prevSessions.map(session => {
        if (session.id === sessionId) {
          return {
            ...session,
            date: newDate,
            time: `${newDate.getHours()}:00`,
            status: "scheduled" as const
          };
        }
        return session;
      });
    });
  };

  // Create the context value
  const contextValue = {
    payments,
    addPayment,
    updatePayment,
    removePayment,
    expenses,
    addExpense,
    updateExpense, 
    removeExpense,
    accounts,
    addAccount,
    updateAccount,
    removeAccount,
    expenseCategories,
    addExpenseCategory,
    updateExpenseCategory,
    removeExpenseCategory,
    sessions,
    addSessions,
    removeSessionsBySubscriptionId,
    updateSessionStatus,
    rescheduleSession
  };

  console.log("PaymentProvider rendering with sessions:", sessions.length);

  return (
    <PaymentContext.Provider value={contextValue}>
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
