import React, { useContext, useEffect, useState, useMemo } from 'react';
import {
  Calendar,
  DollarSign,
  User,
  Clock,
  AlertCircle,
  TrendingUp,
  CalendarDays,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { UserContext } from '@/App';
import { dashboardService, ExpectedPaymentData } from '@/services/dashboard.service';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isTomorrow, differenceInDays, startOfDay } from 'date-fns';

type FilterPeriod = 'today' | 'week' | 'month' | 'all';

const ExpectedPaymentsWidget: React.FC = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('week');
  const [expectedPayments, setExpectedPayments] = useState<ExpectedPaymentData[]>([]);
  const [totalExpected, setTotalExpected] = useState(0);
  const [currency, setCurrency] = useState('₱');

  useEffect(() => {
    const fetchExpectedPayments = async () => {
      if (!user?.schoolId) return;

      setLoading(true);
      try {
        const data = await dashboardService.getExpectedPayments(user.schoolId, filterPeriod);
        setExpectedPayments(data.payments);
        setTotalExpected(data.total);
        setCurrency(data.currency);
      } catch (error) {
        console.error('Error fetching expected payments:', error);
        setExpectedPayments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchExpectedPayments();
  }, [user?.schoolId, filterPeriod]);

  // Group payments by urgency
  const groupedPayments = useMemo(() => {
    const overdue: ExpectedPaymentData[] = [];
    const today: ExpectedPaymentData[] = [];
    const upcoming: ExpectedPaymentData[] = [];

    expectedPayments.forEach(payment => {
      const paymentDate = new Date(payment.dueDate);
      const daysUntilDue = differenceInDays(startOfDay(paymentDate), startOfDay(new Date()));

      if (daysUntilDue < 0) {
        overdue.push(payment);
      } else if (daysUntilDue === 0) {
        today.push(payment);
      } else {
        upcoming.push(payment);
      }
    });

    return { overdue, today, upcoming };
  }, [expectedPayments]);

  const getPaymentDateLabel = (date: string) => {
    const paymentDate = new Date(date);
    if (isToday(paymentDate)) return 'Today';
    if (isTomorrow(paymentDate)) return 'Tomorrow';

    const daysUntilDue = differenceInDays(startOfDay(paymentDate), startOfDay(new Date()));
    if (daysUntilDue < 0) {
      return `${Math.abs(daysUntilDue)} days overdue`;
    } else if (daysUntilDue <= 7) {
      return `In ${daysUntilDue} days`;
    }
    return format(paymentDate, 'MMM d');
  };

  const getPaymentStatusColor = (date: string) => {
    const paymentDate = new Date(date);
    const daysUntilDue = differenceInDays(startOfDay(paymentDate), startOfDay(new Date()));

    if (daysUntilDue < 0) return 'text-red-500';
    if (daysUntilDue === 0) return 'text-orange-500';
    if (daysUntilDue <= 3) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getUrgencyBadge = (date: string) => {
    const paymentDate = new Date(date);
    const daysUntilDue = differenceInDays(startOfDay(paymentDate), startOfDay(new Date()));

    if (daysUntilDue < 0) {
      return <Badge variant="destructive" className="text-xs">Overdue</Badge>;
    }
    if (daysUntilDue === 0) {
      return <Badge className="bg-orange-500/10 text-orange-500 text-xs">Due Today</Badge>;
    }
    if (daysUntilDue <= 3) {
      return <Badge className="bg-yellow-500/10 text-yellow-500 text-xs">Due Soon</Badge>;
    }
    return null;
  };

  const renderPaymentGroup = (title: string, payments: ExpectedPaymentData[], icon: React.ElementType, color: string) => {
    if (payments.length === 0) return null;

    const Icon = icon;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase">
          <Icon className={cn("h-3 w-3", color)} />
          <span>{title}</span>
          <Badge variant="secondary" className="ml-auto text-xs">
            {payments.length}
          </Badge>
        </div>
        <div className="space-y-1">
          {payments.slice(0, 3).map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer"
              onClick={() => navigate(`/student/${payment.studentId}`)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn("p-1.5 rounded-lg bg-white/5", getPaymentStatusColor(payment.dueDate))}>
                  <User className="h-3 w-3" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">
                    {payment.studentName}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {getPaymentDateLabel(payment.dueDate)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">
                  {currency}{payment.amount.toLocaleString()}
                </span>
                {getUrgencyBadge(payment.dueDate)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className="glass-card glass-card-hover h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10">
              <CalendarDays className="h-5 w-5 text-blue-500" />
            </div>
            <CardTitle className="text-lg font-semibold">Expected Payments</CardTitle>
          </div>

          <Select value={filterPeriod} onValueChange={(value) => setFilterPeriod(value as FilterPeriod)}>
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            <div className="h-16 bg-white/5 rounded-lg animate-pulse" />
            <div className="h-32 bg-white/5 rounded-lg animate-pulse" />
          </div>
        ) : (
          <>
            {/* Total Expected Summary */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Total Expected</span>
                <div className="flex items-center gap-2">
                  {groupedPayments.overdue.length > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {groupedPayments.overdue.length} Overdue
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {currency}{totalExpected.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {expectedPayments.length} payment{expectedPayments.length !== 1 ? 's' : ''} expected
                  </p>
                </div>
                {expectedPayments.length > 0 && (
                  <div className="flex items-center gap-1 text-green-500">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs font-medium">
                      {Math.round((groupedPayments.today.length + groupedPayments.upcoming.length) / expectedPayments.length * 100)}% on time
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Groups */}
            <ScrollArea className="h-[280px] pr-3">
              <div className="space-y-4">
                {expectedPayments.length > 0 ? (
                  <>
                    {renderPaymentGroup('Overdue', groupedPayments.overdue, AlertCircle, 'text-red-500')}
                    {renderPaymentGroup('Due Today', groupedPayments.today, Clock, 'text-orange-500')}
                    {renderPaymentGroup('Upcoming', groupedPayments.upcoming, Calendar, 'text-green-500')}

                    {/* View All Button */}
                    {expectedPayments.length > 9 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-4"
                        onClick={() => navigate('/payments')}
                      >
                        View All Payments
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">No expected payments</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Payments will appear here when due
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ExpectedPaymentsWidget;