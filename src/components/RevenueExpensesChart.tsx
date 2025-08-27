
import React, { useState, useEffect, useContext } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  ChartLegend,
  ChartLegendContent
} from '@/components/ui/chart';
import {
  Area,
  Bar,
  ComposedChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { cn } from '@/lib/utils';
import { dashboardService, ChartData } from '@/services/dashboard.service';
import { UserContext } from '@/App';

type TimeRange = 'daily' | 'weekly' | 'monthly';

const RevenueExpensesChart = ({ className }: { className?: string }) => {
  const { user } = useContext(UserContext);
  const [timeRange, setTimeRange] = useState<TimeRange>('weekly');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    const fetchChartData = async () => {
      if (user?.schoolId) {
        setLoading(true);
        try {
          console.log('🔍 [RevenueComponent] Fetching data for user:', user, 'timeRange:', timeRange);
          const data = await dashboardService.getRevenueExpensesChartData(user.schoolId, timeRange);
          console.log('🔍 [RevenueComponent] Received chart data:', data);
          setChartData(data);
          
          // Get currency from first transaction or default
          const currencies = await dashboardService.getDashboardMetrics(user.schoolId);
          console.log('🔍 [RevenueComponent] Currency info:', currencies.currency);
          setCurrency(currencies.currency || 'USD');
        } catch (error) {
          console.error('Error fetching chart data:', error);
          setChartData([]);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchChartData();
  }, [user?.schoolId, timeRange]);
  
  const handleRangeChange = (range: TimeRange) => {
    setTimeRange(range);
  };
  
  const chartConfig = {
    revenue: {
      label: "Revenue",
      theme: { light: "#9b87f5", dark: "#a78bfa" }
    },
    expenses: {
      label: "Expenses",
      theme: { light: "#f43f5e", dark: "#fb7185" }
    },
    profit: {
      label: "Net Profit",
      theme: { light: "#10b981", dark: "#34d399" }
    }
  };
  
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">Revenue & Expenses</CardTitle>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-8 gap-1">
                <CalendarIcon className="h-3.5 w-3.5 opacity-70" />
                <span>{date ? format(date, 'MMM yyyy') : 'Select date'}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-8 gap-1">
                <span className="capitalize">{timeRange}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleRangeChange('daily')}>
                Daily
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleRangeChange('weekly')}>
                Weekly
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleRangeChange('monthly')}>
                Monthly
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="p-0">
        <div className="h-[300px] w-full py-4">
          {loading ? (
            <div className="h-full w-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
              <p>No data available for this period</p>
            </div>
          ) : (
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="date" 
                tickLine={false}
                axisLine={false}
                padding={{ left: 10, right: 10 }}
              />
              <YAxis 
                yAxisId="left"
                orientation="left"
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => {
                  const symbol = currency === 'RUB' ? '₽' : currency === 'EUR' ? '€' : '$';
                  return `${symbol}${value}`;
                }}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => {
                  const symbol = currency === 'RUB' ? '₽' : currency === 'EUR' ? '€' : '$';
                  return `${symbol}${value}`;
                }}
              />
              <ChartTooltip 
                content={<ChartTooltipContent formatter={(value: number) => {
                  const symbol = currency === 'RUB' ? '₽' : currency === 'EUR' ? '€' : '$';
                  return `${symbol}${value}`;
                }} />} 
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="var(--color-revenue)" 
                fillOpacity={1} 
                fill="url(#colorRevenue)" 
                yAxisId="left"
              />
              <Bar 
                dataKey="expenses" 
                fill="var(--color-expenses)" 
                yAxisId="right" 
                radius={[4, 4, 0, 0]}
                barSize={20}
              />
              <ChartLegend 
                content={<ChartLegendContent />} 
                verticalAlign="top" 
                height={36}
              />
            </ComposedChart>
          </ChartContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RevenueExpensesChart;
