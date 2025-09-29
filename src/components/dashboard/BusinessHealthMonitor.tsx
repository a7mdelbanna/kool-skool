import React, { useContext, useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Clock,
  Target,
  Activity,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { UserContext } from '@/App';
import { dashboardService } from '@/services/dashboard.service';
import { databaseService } from '@/services/firebase/database.service';
import { useNavigate } from 'react-router-dom';

interface MetricCard {
  id: string;
  title: string;
  value: string | number;
  subValue?: string;
  change?: number;
  changeLabel?: string;
  progress?: number;
  progressLabel?: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  trend?: 'up' | 'down' | 'neutral';
  onClick?: () => void;
}

const BusinessHealthMonitor: React.FC = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    if (user?.schoolId) {
      fetchBusinessMetrics();
      // Refresh every 5 minutes
      const interval = setInterval(fetchBusinessMetrics, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user?.schoolId]);

  const fetchBusinessMetrics = async () => {
    if (!user?.schoolId) return;

    setLoading(true);
    try {
      // Get dashboard metrics
      const dashMetrics = await dashboardService.getDashboardMetrics(user.schoolId);

      // Get additional metrics
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());

      // Calculate occupancy rate
      const sessions = await databaseService.query('sessions', {
        where: [
          { field: 'schoolId', operator: '==', value: user.schoolId },
          { field: 'status', operator: '==', value: 'scheduled' }
        ]
      });

      const totalSlots = 40 * 5; // Assuming 40 hours per week, 5 teachers
      const bookedSlots = sessions?.filter((s: any) => {
        const sessionDate = new Date(s.scheduled_date);
        return sessionDate >= startOfWeek && sessionDate < new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
      }).length || 0;
      const occupancyRate = Math.round((bookedSlots / totalSlots) * 100);

      // Calculate teacher utilization
      const teachers = await databaseService.query('users', {
        where: [
          { field: 'schoolId', operator: '==', value: user.schoolId },
          { field: 'role', operator: '==', value: 'teacher' }
        ]
      });
      const teacherCount = teachers?.length || 1;
      const avgHoursPerTeacher = dashMetrics.avgStudentLoad;
      const maxHoursPerTeacher = 40;
      const utilizationRate = Math.round((avgHoursPerTeacher / maxHoursPerTeacher) * 100);

      // Calculate cash flow (expected vs received)
      const payments = await databaseService.query('payments', {
        where: [{ field: 'school_id', operator: '==', value: user.schoolId }]
      });

      let expectedPayments = 0;
      let receivedPayments = 0;
      payments?.forEach((payment: any) => {
        const paymentDate = new Date(payment.payment_date || payment.date);
        if (paymentDate >= startOfMonth && paymentDate <= now) {
          expectedPayments += payment.amount || 0;
          if (payment.status === 'completed' || payment.status === 'paid') {
            receivedPayments += payment.amount || 0;
          }
        }
      });

      const collectionRate = expectedPayments > 0
        ? Math.round((receivedPayments / expectedPayments) * 100)
        : 100;

      // Calculate profit margin
      const profitMargin = dashMetrics.totalRevenue > 0
        ? Math.round(((dashMetrics.totalRevenue - dashMetrics.totalExpenses) / dashMetrics.totalRevenue) * 100)
        : 0;

      // Format currency
      const formatCurrency = (amount: number) => {
        const symbol = dashMetrics.currency === 'RUB' ? '₽' :
                       dashMetrics.currency === 'EUR' ? '€' : '$';
        return `${symbol}${amount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
      };

      // Calculate MRR (Monthly Recurring Revenue)
      const subscriptions = await databaseService.query('subscriptions', {
        where: [
          { field: 'schoolId', operator: '==', value: user.schoolId },
          { field: 'status', operator: '==', value: 'active' }
        ]
      });

      let mrr = 0;
      subscriptions?.forEach((sub: any) => {
        if (sub.price_mode === 'perSession' && sub.price_per_session > 0) {
          // Estimate 4 sessions per month
          mrr += (sub.price_per_session * 4);
        } else if (sub.total_price > 0 && sub.session_count > 0) {
          // Calculate monthly rate
          mrr += (sub.total_price / sub.session_count) * 4;
        }
      });

      const metricsData: MetricCard[] = [
        {
          id: 'revenue',
          title: 'Live Revenue',
          value: formatCurrency(dashMetrics.totalRevenue),
          subValue: 'This month',
          change: dashMetrics.revenueChange,
          changeLabel: 'vs last month',
          icon: DollarSign,
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          trend: dashMetrics.revenueChange > 0 ? 'up' : dashMetrics.revenueChange < 0 ? 'down' : 'neutral',
          onClick: () => navigate('/finances')
        },
        {
          id: 'occupancy',
          title: 'Occupancy Rate',
          value: `${occupancyRate}%`,
          subValue: `${bookedSlots}/${totalSlots} slots`,
          progress: occupancyRate,
          progressLabel: 'Weekly capacity',
          icon: Clock,
          color: occupancyRate >= 70 ? 'text-green-500' : occupancyRate >= 50 ? 'text-yellow-500' : 'text-red-500',
          bgColor: occupancyRate >= 70 ? 'bg-green-500/10' : occupancyRate >= 50 ? 'bg-yellow-500/10' : 'bg-red-500/10',
          trend: occupancyRate >= 70 ? 'up' : 'down',
          onClick: () => navigate('/calendar')
        },
        {
          id: 'utilization',
          title: 'Teacher Utilization',
          value: `${utilizationRate}%`,
          subValue: `${avgHoursPerTeacher}h/week avg`,
          progress: utilizationRate,
          progressLabel: 'Capacity used',
          icon: Users,
          color: utilizationRate >= 60 ? 'text-blue-500' : 'text-orange-500',
          bgColor: utilizationRate >= 60 ? 'bg-blue-500/10' : 'bg-orange-500/10',
          trend: utilizationRate >= 60 ? 'up' : 'down',
          onClick: () => navigate('/team-access')
        },
        {
          id: 'cashflow',
          title: 'Collection Rate',
          value: `${collectionRate}%`,
          subValue: `${formatCurrency(receivedPayments)} collected`,
          progress: collectionRate,
          progressLabel: `of ${formatCurrency(expectedPayments)} expected`,
          icon: Activity,
          color: collectionRate >= 90 ? 'text-green-500' : collectionRate >= 70 ? 'text-yellow-500' : 'text-red-500',
          bgColor: collectionRate >= 90 ? 'bg-green-500/10' : collectionRate >= 70 ? 'bg-yellow-500/10' : 'bg-red-500/10',
          trend: collectionRate >= 90 ? 'up' : 'down',
          onClick: () => navigate('/payments')
        },
        {
          id: 'profit-margin',
          title: 'Profit Margin',
          value: `${profitMargin}%`,
          subValue: formatCurrency(dashMetrics.netProfit),
          change: dashMetrics.profitChange,
          changeLabel: 'vs last month',
          progress: profitMargin,
          progressLabel: 'Net profit',
          icon: Target,
          color: profitMargin >= 30 ? 'text-green-500' : profitMargin >= 15 ? 'text-yellow-500' : 'text-red-500',
          bgColor: profitMargin >= 30 ? 'bg-green-500/10' : profitMargin >= 15 ? 'bg-yellow-500/10' : 'bg-red-500/10',
          trend: dashMetrics.profitChange > 0 ? 'up' : dashMetrics.profitChange < 0 ? 'down' : 'neutral',
          onClick: () => navigate('/finances')
        },
        {
          id: 'mrr',
          title: 'Monthly Recurring',
          value: formatCurrency(mrr),
          subValue: 'Estimated MRR',
          icon: BarChart3,
          color: 'text-purple-500',
          bgColor: 'bg-purple-500/10',
          trend: 'up',
          onClick: () => navigate('/finances')
        }
      ];

      setMetrics(metricsData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching business metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend?: 'up' | 'down' | 'neutral') => {
    if (trend === 'up') return <ArrowUp className="h-3 w-3" />;
    if (trend === 'down') return <ArrowDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  const getTrendColor = (trend?: 'up' | 'down' | 'neutral') => {
    if (trend === 'up') return 'text-green-500';
    if (trend === 'down') return 'text-red-500';
    return 'text-muted-foreground';
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="glass-card backdrop-blur-xl border-white/10">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="h-4 bg-white/5 rounded animate-pulse" />
                <div className="h-8 bg-white/5 rounded animate-pulse" />
                <div className="h-3 bg-white/5 rounded w-2/3 animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Business Health Monitor</h3>
        <span className="text-xs text-muted-foreground">
          Updated: {lastUpdated.toLocaleTimeString()}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <TooltipProvider>
          {metrics.map((metric) => (
            <Tooltip key={metric.id}>
              <TooltipTrigger asChild>
                <Card
                  className={cn(
                    "glass-card backdrop-blur-xl border-white/10 cursor-pointer",
                    "hover:scale-[1.02] hover:shadow-xl transition-all duration-200",
                    "group"
                  )}
                  onClick={metric.onClick}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className={cn("p-1.5 rounded-lg", metric.bgColor)}>
                        <metric.icon className={cn("h-4 w-4", metric.color)} />
                      </div>
                      {metric.trend && (
                        <div className={cn("flex items-center gap-0.5", getTrendColor(metric.trend))}>
                          {getTrendIcon(metric.trend)}
                          {metric.change !== undefined && (
                            <span className="text-xs font-medium">
                              {metric.change > 0 ? '+' : ''}{metric.change}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        {metric.title}
                      </p>
                      <p className="text-lg font-bold text-foreground leading-tight">
                        {metric.value}
                      </p>
                      {metric.subValue && (
                        <p className="text-xs text-muted-foreground">
                          {metric.subValue}
                        </p>
                      )}
                    </div>

                    {metric.progress !== undefined && (
                      <div className="mt-3">
                        <Progress
                          value={metric.progress}
                          className="h-1.5"
                        />
                        {metric.progressLabel && (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {metric.progressLabel}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p className="font-semibold">{metric.title}</p>
                  {metric.changeLabel && (
                    <p className="text-xs">
                      {metric.change !== undefined && `${metric.change > 0 ? '+' : ''}${metric.change}% `}
                      {metric.changeLabel}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">Click to view details</p>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>
    </div>
  );
};

export default BusinessHealthMonitor;