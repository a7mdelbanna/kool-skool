
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { UserPlus, ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';
import { format, subMonths } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { cn } from '@/lib/utils';

type TimeRange = 'weekly' | 'monthly' | 'quarterly';

// Sample data for demonstration
const generateData = (range: TimeRange) => {
  const data = [];
  const now = new Date();
  
  const periods = range === 'weekly' ? 12 : range === 'monthly' ? 6 : 4;
  
  for (let i = periods - 1; i >= 0; i--) {
    const date = new Date();
    let label = '';
    
    if (range === 'weekly') {
      date.setDate(date.getDate() - i * 7);
      label = `Week ${periods - i}`;
    } else if (range === 'monthly') {
      date.setMonth(date.getMonth() - i);
      label = format(date, 'MMM');
    } else { // quarterly
      date.setMonth(date.getMonth() - i * 3);
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      label = `Q${quarter}`;
    }
    
    // Generate random student count with an upward trend
    const students = Math.floor(Math.random() * 5) + 1 + (periods - i);
    
    data.push({
      period: label,
      students,
    });
  }
  
  return data;
};

// Calculate growth percentage
const calculateGrowth = (data: any[]) => {
  if (data.length < 2) return 0;
  
  const currentValue = data[data.length - 1].students;
  const previousValue = data[data.length - 2].students;
  
  return previousValue !== 0 
    ? Math.round(((currentValue - previousValue) / previousValue) * 100) 
    : 100;
};

const NewStudentsStats = ({ className }: { className?: string }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('monthly');
  const [chartData, setChartData] = useState(() => generateData(timeRange));
  const growthPercentage = calculateGrowth(chartData);
  
  const totalNewStudents = chartData.reduce((sum, item) => sum + item.students, 0);
  
  const handleRangeChange = (range: TimeRange) => {
    setTimeRange(range);
    setChartData(generateData(range));
  };
  
  const chartConfig = {
    students: {
      label: "New Students",
      theme: { light: "#0ea5e9", dark: "#38bdf8" }
    }
  };
  
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          New Student Enrollments
        </CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-8 gap-1">
              <span className="capitalize">{timeRange}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleRangeChange('weekly')}>
              Weekly
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleRangeChange('monthly')}>
              Monthly
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleRangeChange('quarterly')}>
              Quarterly
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <Separator />
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-sm text-muted-foreground">Total New Students</p>
            <h3 className="text-3xl font-bold">{totalNewStudents}</h3>
          </div>
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full",
            growthPercentage > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          )}>
            {growthPercentage > 0 ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">
              {growthPercentage > 0 ? "+" : ""}{growthPercentage}%
            </span>
          </div>
        </div>
        
        <div className="h-[200px] w-full">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="period" 
                tickLine={false} 
                axisLine={false}
              />
              <YAxis 
                tickLine={false} 
                axisLine={false}
                allowDecimals={false}
              />
              <ChartTooltip 
                content={<ChartTooltipContent />} 
              />
              <Bar 
                dataKey="students" 
                fill="var(--color-students)" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default NewStudentsStats;
