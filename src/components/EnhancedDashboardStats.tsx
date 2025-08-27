
import React, { useContext, useEffect, useState } from 'react';
import { 
  Users, 
  Calendar, 
  DollarSign, 
  Clock,
  TrendingUp,
  ArrowRight,
  CreditCard
} from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { dashboardService, DashboardMetrics } from '@/services/dashboard.service';
import { UserContext } from '@/App';
import { useNavigate } from 'react-router-dom';

type StatCardProps = {
  title: string;
  value: string;
  icon: React.ReactNode;
  description?: string;
  trend?: number;
  className?: string;
  linkText?: string;
  onClick?: () => void;
}

const StatCard = ({ 
  title, 
  value, 
  icon, 
  description, 
  trend, 
  className,
  linkText,
  onClick
}: StatCardProps) => {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-6 pb-2">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <h3 className="text-2xl font-bold">{value}</h3>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
            {trend !== undefined && (
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className={cn(
                  "h-3 w-3",
                  trend > 0 ? "text-green-500" : "text-red-500",
                  trend === 0 && "text-muted-foreground"
                )} />
                <span className={cn(
                  "text-xs font-medium",
                  trend > 0 ? "text-green-500" : "text-red-500",
                  trend === 0 && "text-muted-foreground"
                )}>
                  {trend > 0 ? "+" : ""}{trend}% from last month
                </span>
              </div>
            )}
          </div>
          <div className="rounded-full p-2 bg-primary/10">
            {icon}
          </div>
        </div>
      </CardContent>
      {linkText && (
        <CardFooter className="p-4 pt-0">
          <Button 
            variant="link" 
            className="p-0 h-auto flex items-center gap-1 text-primary"
            onClick={onClick}
          >
            {linkText}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

const EnhancedDashboardStats = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    studentCount: 0,
    newStudentsThisMonth: 0,
    weeklyLessonCount: 0,
    lessonCompletionRate: 0,
    avgLessonPrice: 0,
    avgStudentLoad: 0,
    revenueChange: 0,
    expensesChange: 0,
    profitChange: 0,
    studentChange: 0,
    lessonChange: 0,
    currency: 'USD'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      if (user?.schoolId) {
        setLoading(true);
        try {
          const data = await dashboardService.getDashboardMetrics(user.schoolId);
          setMetrics(data);
        } catch (error) {
          console.error('Error fetching dashboard metrics:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchMetrics();
  }, [user?.schoolId]);

  const formatCurrency = (amount: number) => {
    const symbol = metrics.currency === 'RUB' ? '₽' : 
                   metrics.currency === 'EUR' ? '€' : '$';
    return `${symbol}${amount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 element-transition">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="glass animate-pulse">
            <CardContent className="p-6">
              <div className="h-20"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 element-transition">
      <StatCard
        title="Total Revenue"
        value={formatCurrency(metrics.totalRevenue)}
        icon={<DollarSign className="h-5 w-5 text-primary" />}
        trend={metrics.revenueChange}
        className="glass glass-hover"
        linkText="View details"
        onClick={() => navigate('/finances')}
      />
      <StatCard
        title="Total Expenses"
        value={formatCurrency(metrics.totalExpenses)}
        icon={<CreditCard className="h-5 w-5 text-primary" />}
        trend={metrics.expensesChange}
        className="glass glass-hover"
        linkText="View details"
        onClick={() => navigate('/finances')}
      />
      <StatCard
        title="Net Profit"
        value={formatCurrency(metrics.netProfit)}
        icon={<DollarSign className="h-5 w-5 text-primary" />}
        trend={metrics.profitChange}
        className="glass glass-hover"
        linkText="View breakdown"
        onClick={() => navigate('/finances')}
      />
      <StatCard
        title="Students"
        value={metrics.studentCount.toString()}
        icon={<Users className="h-5 w-5 text-primary" />}
        description={`${metrics.newStudentsThisMonth} new this month`}
        trend={metrics.studentChange}
        className="glass glass-hover"
        linkText="View students"
        onClick={() => navigate('/students')}
      />
      <StatCard
        title="Weekly Lessons"
        value={metrics.weeklyLessonCount.toString()}
        icon={<Calendar className="h-5 w-5 text-primary" />}
        trend={metrics.lessonChange}
        className="glass glass-hover"
        linkText="View schedule"
        onClick={() => navigate('/calendar')}
      />
      <StatCard
        title="Lesson Completion"
        value={`${metrics.lessonCompletionRate}%`}
        icon={<Clock className="h-5 w-5 text-primary" />}
        description="Rate this month"
        trend={2}
        className="glass glass-hover"
        linkText="View details"
        onClick={() => navigate('/attendance')}
      />
      <StatCard
        title="Avg. Lesson Price"
        value={formatCurrency(metrics.avgLessonPrice)}
        icon={<DollarSign className="h-5 w-5 text-primary" />}
        trend={0}
        className="glass glass-hover"
      />
      <StatCard
        title="Avg. Student Load"
        value={`${metrics.avgStudentLoad}h/week`}
        icon={<Clock className="h-5 w-5 text-primary" />}
        description="Per tutor"
        trend={8}
        className="glass glass-hover"
      />
    </div>
  );
};

export default EnhancedDashboardStats;
