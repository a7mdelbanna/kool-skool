
import React from 'react';
import { 
  Users, 
  Calendar, 
  DollarSign, 
  Clock,
  TrendingUp 
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type StatCardProps = {
  title: string;
  value: string;
  icon: React.ReactNode;
  description?: string;
  trend?: number;
  className?: string;
}

const StatCard = ({ title, value, icon, description, trend, className }: StatCardProps) => {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-6">
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
    </Card>
  );
};

const DashboardStats = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 element-transition">
      <StatCard
        title="Students"
        value="24"
        icon={<Users className="h-5 w-5 text-primary" />}
        trend={12}
        className="glass glass-hover"
      />
      <StatCard
        title="Weekly Lessons"
        value="36"
        icon={<Calendar className="h-5 w-5 text-primary" />}
        trend={5}
        className="glass glass-hover"
      />
      <StatCard
        title="Monthly Revenue"
        value="$3,840"
        icon={<DollarSign className="h-5 w-5 text-primary" />}
        trend={8}
        className="glass glass-hover"
      />
      <StatCard
        title="Total Hours"
        value="126"
        icon={<Clock className="h-5 w-5 text-primary" />}
        description="This month"
        trend={0}
        className="glass glass-hover"
      />
    </div>
  );
};

export default DashboardStats;
