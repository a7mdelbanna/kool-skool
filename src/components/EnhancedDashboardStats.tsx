
import React from 'react';
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
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 element-transition">
      <StatCard
        title="Total Revenue"
        value="$8,945"
        icon={<DollarSign className="h-5 w-5 text-primary" />}
        trend={15}
        className="glass glass-hover"
        linkText="View details"
      />
      <StatCard
        title="Total Expenses"
        value="$3,240"
        icon={<CreditCard className="h-5 w-5 text-primary" />}
        trend={-5}
        className="glass glass-hover"
        linkText="View details"
      />
      <StatCard
        title="Net Profit"
        value="$5,705"
        icon={<DollarSign className="h-5 w-5 text-primary" />}
        trend={22}
        className="glass glass-hover"
        linkText="View breakdown"
      />
      <StatCard
        title="Students"
        value="24"
        icon={<Users className="h-5 w-5 text-primary" />}
        description="5 new this month"
        trend={12}
        className="glass glass-hover"
        linkText="View students"
      />
      <StatCard
        title="Weekly Lessons"
        value="36"
        icon={<Calendar className="h-5 w-5 text-primary" />}
        trend={5}
        className="glass glass-hover"
        linkText="View schedule"
      />
      <StatCard
        title="Lesson Completion"
        value="94%"
        icon={<Clock className="h-5 w-5 text-primary" />}
        description="Rate this month"
        trend={2}
        className="glass glass-hover"
        linkText="View details"
      />
      <StatCard
        title="Avg. Lesson Price"
        value="$45"
        icon={<DollarSign className="h-5 w-5 text-primary" />}
        trend={0}
        className="glass glass-hover"
      />
      <StatCard
        title="Avg. Student Load"
        value="6h/week"
        icon={<Clock className="h-5 w-5 text-primary" />}
        description="Per tutor"
        trend={8}
        className="glass glass-hover"
      />
    </div>
  );
};

export default EnhancedDashboardStats;
