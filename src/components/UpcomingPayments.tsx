
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, CreditCard, DollarSign, AlertCircle } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

export type Payment = {
  id: string;
  studentName: string;
  amount: number;
  dueDate: Date;
  subject: string;
  status: 'pending' | 'overdue';
};

interface UpcomingPaymentsProps {
  payments: Payment[];
  className?: string;
}

const UpcomingPayments = ({ payments, className }: UpcomingPaymentsProps) => {
  const sortedPayments = [...payments].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  
  const getTimeLeft = (date: Date) => {
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `${diffDays} days left`;
  };
  
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-medium">
          <DollarSign className="h-5 w-5 text-primary" />
          Upcoming Payments
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2">
        <div className="space-y-2">
          {sortedPayments.length === 0 ? (
            <div className="flex h-20 items-center justify-center text-sm text-muted-foreground">
              No upcoming payments
            </div>
          ) : (
            sortedPayments.map((payment) => (
              <div 
                key={payment.id}
                className="flex items-center justify-between rounded-lg p-2 hover:bg-accent/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full",
                    payment.status === 'overdue' 
                      ? "bg-red-100 text-red-500" 
                      : "bg-primary/10 text-primary"
                  )}>
                    {payment.status === 'overdue' ? 
                      <AlertCircle className="h-4 w-4" /> : 
                      <CreditCard className="h-4 w-4" />
                    }
                  </div>
                  <div>
                    <div className="font-medium line-clamp-1">{payment.studentName}</div>
                    <div className="text-xs text-muted-foreground">{payment.subject}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">${payment.amount.toFixed(2)}</div>
                  <div className="flex flex-col items-end text-xs">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {format(payment.dueDate, 'MMM d, yyyy')}
                      </span>
                    </div>
                    <span className={cn(
                      payment.status === 'overdue' ? "text-red-500 font-medium" : "text-muted-foreground"
                    )}>
                      {getTimeLeft(payment.dueDate)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UpcomingPayments;
