
import React, { useState, useMemo } from 'react';
import { Calendar, DollarSign, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { databaseService } from '@/services/firebase/database.service';
import { format, addDays, addWeeks, addMonths, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

interface ExpectedPayment {
  student_id: string;
  student_name: string;
  next_payment_date: string;
  next_payment_amount: number;
  currency?: string;
}

interface ExpectedPaymentsSectionProps {
  schoolId: string;
}

const ExpectedPaymentsSection: React.FC<ExpectedPaymentsSectionProps> = ({ schoolId }) => {
  const [filterPeriod, setFilterPeriod] = useState<'day' | 'week' | 'month'>('week');

  // Fetch students with expected payments from Firebase
  const { data: expectedPayments = [], isLoading } = useQuery({
    queryKey: ['expected-payments', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      
      // Fetch students from Firebase
      const students = await databaseService.query('students', {
        where: [{ field: 'schoolId', operator: '==', value: schoolId }]
      });

      // Fetch users to get full names
      const userIds = students.map((s: any) => s.userId).filter(Boolean);
      const users = await Promise.all(
        userIds.map((userId: string) => databaseService.getById('users', userId))
      );

      // Filter students who have next payment information
      const studentsWithPayments = students
        .filter((student: any) => 
          student.nextPaymentDate && student.nextPaymentAmount
        )
        .map((student: any) => {
          const user = users.find((u: any) => u?.id === student.userId);
          const studentName = user ? 
            `${user.firstName || ''} ${user.lastName || ''}`.trim() : 
            'Unknown Student';
          
          return {
            student_id: student.id,
            student_name: studentName,
            next_payment_date: student.nextPaymentDate,
            next_payment_amount: student.nextPaymentAmount,
            currency: student.currency || 'RUB'
          };
        });

      console.log('📅 Expected payments data:', studentsWithPayments);
      return studentsWithPayments as ExpectedPayment[];
    },
    enabled: !!schoolId,
  });

  // Calculate date range based on selected filter
  const dateRange = useMemo(() => {
    const now = new Date();
    const start = startOfDay(now);
    let end: Date;

    switch (filterPeriod) {
      case 'day':
        end = endOfDay(now);
        break;
      case 'week':
        end = endOfDay(addWeeks(now, 1));
        break;
      case 'month':
        end = endOfDay(addMonths(now, 1));
        break;
      default:
        end = endOfDay(addWeeks(now, 1));
    }

    return { start, end };
  }, [filterPeriod]);

  // Filter payments based on selected period
  const filteredPayments = useMemo(() => {
    return expectedPayments.filter(payment => {
      const paymentDate = new Date(payment.next_payment_date);
      return isWithinInterval(paymentDate, dateRange);
    });
  }, [expectedPayments, dateRange]);

  // Calculate total expected amount
  const totalExpected = useMemo(() => {
    return filteredPayments.reduce((sum, payment) => sum + Number(payment.next_payment_amount), 0);
  }, [filteredPayments]);

  const getFilterLabel = () => {
    switch (filterPeriod) {
      case 'day': return 'Today';
      case 'week': return 'Next 7 Days';
      case 'month': return 'Next 30 Days';
      default: return 'Next 7 Days';
    }
  };

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Expected Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading expected payments...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Expected Payments
            </CardTitle>
            <CardDescription>
              Upcoming student payments based on subscription schedules
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterPeriod === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterPeriod('day')}
            >
              Today
            </Button>
            <Button
              variant={filterPeriod === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterPeriod('week')}
            >
              Week
            </Button>
            <Button
              variant={filterPeriod === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterPeriod('month')}
            >
              Month
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredPayments.length > 0 ? (
          <>
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    Total Expected ({getFilterLabel()})
                  </span>
                </div>
                <span className="text-2xl font-bold text-blue-600">
                  {filteredPayments.length > 0 && filteredPayments[0].currency === 'RUB' ? '₽' : 
                   filteredPayments.length > 0 && filteredPayments[0].currency === 'EUR' ? '€' : '$'}
                  {totalExpected.toFixed(2)}
                </span>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                {filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''} expected
              </p>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Expected Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Days Until</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments
                  .sort((a, b) => new Date(a.next_payment_date).getTime() - new Date(b.next_payment_date).getTime())
                  .map((payment) => {
                    const paymentDate = new Date(payment.next_payment_date);
                    const daysUntil = Math.ceil((paymentDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    
                    return (
                      <TableRow key={payment.student_id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                              <User className="h-4 w-4" />
                            </div>
                            <span className="font-medium">{payment.student_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{format(paymentDate, 'MMM dd, yyyy')}</span>
                            <span className="text-sm text-muted-foreground">
                              {format(paymentDate, 'EEEE')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-green-600">
                            {payment.currency === 'RUB' ? '₽' : payment.currency === 'EUR' ? '€' : '$'}
                            {Number(payment.next_payment_amount).toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={daysUntil <= 3 ? 'destructive' : daysUntil <= 7 ? 'default' : 'secondary'}
                          >
                            {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </>
        ) : (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg font-medium">
              No expected payments for {getFilterLabel().toLowerCase()}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Students with upcoming payments will appear here
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExpectedPaymentsSection;
