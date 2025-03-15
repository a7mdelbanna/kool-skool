
import React, { useState } from 'react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { usePayments } from '@/contexts/PaymentContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from '@/components/ui/chart';
import {
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  ArrowUp,
  ArrowDown,
  Wallet,
  Users,
  GraduationCap,
  Calendar,
  DollarSign,
  Clock,
  Filter,
  Download,
  BarChart2,
  TrendingUp,
  TrendingDown,
  UserMinus,
  UserPlus,
  Briefcase,
  CircleDollarSign
} from 'lucide-react';
import { format, subDays, subMonths, subWeeks, subYears } from 'date-fns';
import StudentAcquisitionChart, { StudentMetricsData, generateStudentMetricsData } from '@/components/StudentAcquisitionChart';
import StudentsOverviewCards from '@/components/StudentsOverviewCards';
import SubjectPerformanceCard from '@/components/SubjectPerformanceCard';
import ROIByLessonTypeCard from '@/components/ROIByLessonTypeCard';

// Mock data for teachers
const teachers = [
  { id: "1", name: "Alex Johnson", specialty: "Mathematics", hourlyRate: 35 },
  { id: "2", name: "Maria Garcia", specialty: "Science", hourlyRate: 40 },
  { id: "3", name: "James Wilson", specialty: "English", hourlyRate: 30 },
  { id: "4", name: "Sarah Chen", specialty: "Physics", hourlyRate: 45 },
  { id: "5", name: "David Kim", specialty: "Chemistry", hourlyRate: 42 }
];

// Mock data for groups
const groups = [
  { id: "1", name: "Advanced Mathematics" },
  { id: "2", name: "Beginner English" },
  { id: "3", name: "Intermediate Science" },
  { id: "4", name: "Speaking Club" }
];

// Mock data for subjects
const subjects = [
  { id: "1", name: "Mathematics", retentionRate: 90 },
  { id: "2", name: "English", retentionRate: 85 },
  { id: "3", name: "Science", retentionRate: 80 },
  { id: "4", name: "Physics", retentionRate: 75 },
  { id: "5", name: "Chemistry", retentionRate: 70 }
];

// Mock data for lesson categories
const lessonCategories = [
  { id: "1", name: "Individual" },
  { id: "2", name: "Group" },
  { id: "3", name: "Speaking Club" },
  { id: "4", name: "Workshop" }
];

// Chart colors
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

// Define types for our data objects
interface TeacherIncomeData {
  date: string;
  income: number;
  lessons: number;
  hours: number;
}

interface ExpensesData {
  date: string;
  expenses: number;
  income: number;
}

interface CashFlowData {
  date: string;
  income: number;
  expenses: number;
  profit: number;
}

interface LessonStatusData {
  name: string;
  value: number;
}

interface BalanceCurrencyData {
  name: string;
  value: number;
}

type DateRangeFilter = "day" | "week" | "month" | "year";

const StatesReports = () => {
  const { payments, expenses, sessions } = usePayments();
  
  // State for filters
  const [teacherFilter, setTeacherFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>("month");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState("USD");
  
  // Generate mock data for teacher income
  const generateTeacherIncomeData = (days = 30): TeacherIncomeData[] => {
    return Array.from({ length: days }).map((_, i) => {
      const date = subDays(new Date(), days - i - 1);
      return {
        date: format(date, 'MMM dd'),
        income: Math.floor(Math.random() * 500) + 100,
        lessons: Math.floor(Math.random() * 8) + 1,
        hours: Math.floor(Math.random() * 6) + 2
      };
    });
  };
  
  // Generate mock data for expenses
  const generateExpensesData = (days = 30): ExpensesData[] => {
    return Array.from({ length: days }).map((_, i) => {
      const date = subDays(new Date(), days - i - 1);
      return {
        date: format(date, 'MMM dd'),
        expenses: Math.floor(Math.random() * 300) + 50,
        income: Math.floor(Math.random() * 600) + 200,
      };
    });
  };
  
  // Generate mock data for cash flow
  const generateCashFlowData = (days = 30): CashFlowData[] => {
    return Array.from({ length: days }).map((_, i) => {
      const date = subDays(new Date(), days - i - 1);
      const income = Math.floor(Math.random() * 800) + 400;
      const expenses = Math.floor(Math.random() * 500) + 200;
      return {
        date: format(date, 'MMM dd'),
        income,
        expenses,
        profit: income - expenses
      };
    });
  };
  
  // Generate mock data for lesson status distribution
  const generateLessonStatusData = (): LessonStatusData[] => {
    return [
      { name: 'Attended', value: 65 },
      { name: 'Cancelled', value: 15 },
      { name: 'Missed', value: 10 },
      { name: 'Rescheduled', value: 10 }
    ];
  };
  
  // Generate balance by currency data
  const generateBalanceByCurrencyData = (): BalanceCurrencyData[] => {
    return [
      { name: 'USD', value: 5800 },
      { name: 'EUR', value: 3200 },
      { name: 'GBP', value: 2400 },
      { name: 'CAD', value: 1900 }
    ];
  };
  
  // Generate ROI data by lesson type
  const generateROIData = () => {
    return lessonCategories.map(cat => ({
      name: cat.name,
      roi: 200 + Math.floor(Math.random() * 300)
    }));
  };
  
  // Get appropriate data based on date range with proper typing
  const getTeacherIncomeData = (range: DateRangeFilter): TeacherIncomeData[] => {
    switch (range) {
      case 'day': return generateTeacherIncomeData(1);
      case 'week': return generateTeacherIncomeData(7);
      case 'month': return generateTeacherIncomeData(30);
      case 'year': return generateTeacherIncomeData(365).filter((_, i) => i % 30 === 0);
      default: return generateTeacherIncomeData();
    }
  };
  
  const getExpensesData = (range: DateRangeFilter): ExpensesData[] => {
    switch (range) {
      case 'day': return generateExpensesData(1);
      case 'week': return generateExpensesData(7);
      case 'month': return generateExpensesData(30);
      case 'year': return generateExpensesData(365).filter((_, i) => i % 30 === 0);
      default: return generateExpensesData();
    }
  };
  
  const getStudentMetricsData = (range: DateRangeFilter): StudentMetricsData[] => {
    switch (range) {
      case 'day': return generateStudentMetricsData(1);
      case 'week': return generateStudentMetricsData(7);
      case 'month': return generateStudentMetricsData(30);
      case 'year': return generateStudentMetricsData(365).filter((_, i) => i % 30 === 0);
      default: return generateStudentMetricsData();
    }
  };
  
  const getCashFlowData = (range: DateRangeFilter): CashFlowData[] => {
    switch (range) {
      case 'day': return generateCashFlowData(1);
      case 'week': return generateCashFlowData(7);
      case 'month': return generateCashFlowData(30);
      case 'year': return generateCashFlowData(365).filter((_, i) => i % 30 === 0);
      default: return generateCashFlowData();
    }
  };
  
  // Get data with correct typing
  const teacherIncomeData = getTeacherIncomeData(dateRangeFilter);
  const expensesData = getExpensesData(dateRangeFilter);
  const studentMetricsData = getStudentMetricsData(dateRangeFilter);
  const cashFlowData = getCashFlowData(dateRangeFilter);
  
  // Calculate totals with proper typing
  const totalTeacherIncome = teacherIncomeData.reduce((sum, item) => sum + item.income, 0);
  const totalTeacherHours = teacherIncomeData.reduce((sum, item) => sum + item.hours, 0);
  const totalTeacherLessons = teacherIncomeData.reduce((sum, item) => sum + item.lessons, 0);
  
  const totalExpenses = expensesData.reduce((sum, item) => sum + item.expenses, 0);
  const totalIncome = expensesData.reduce((sum, item) => sum + item.income, 0);
  
  const totalNewStudents = studentMetricsData.reduce((sum, item) => sum + item.newStudents, 0);
  const totalLostStudents = studentMetricsData.reduce((sum, item) => sum + item.lostStudents, 0);
  
  const netCashFlow = cashFlowData.reduce((sum, item) => sum + item.profit, 0);
  
  // Calculate upcoming data (next period)
  const upcomingExpenses = Math.floor(Math.random() * 3000) + 1000;
  const upcomingIncome = Math.floor(Math.random() * 5000) + 2000;
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">States & Reports</h1>
          <p className="text-muted-foreground mt-1">View comprehensive analytics and detailed reports</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            <span>Export Reports</span>
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                <span>Date Range</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Select Date Range</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={() => setDateRangeFilter("day")}>
                  Day
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setDateRangeFilter("week")}>
                  Week
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setDateRangeFilter("month")}>
                  Month
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setDateRangeFilter("year")}>
                  Year
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <Tabs defaultValue="teacher">
        <TabsList className="mb-4">
          <TabsTrigger value="teacher" className="gap-2">
            <GraduationCap className="h-4 w-4" />
            <span>Teacher</span>
          </TabsTrigger>
          <TabsTrigger value="finances" className="gap-2">
            <DollarSign className="h-4 w-4" />
            <span>Finances</span>
          </TabsTrigger>
          <TabsTrigger value="students" className="gap-2">
            <Users className="h-4 w-4" />
            <span>Students</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Teacher Tab */}
        <TabsContent value="teacher" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass glass-hover">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Income</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalTeacherIncome}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Per {dateRangeFilter}
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass glass-hover">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalTeacherHours}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Teaching hours
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass glass-hover">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Lessons</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalTeacherLessons}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Lessons conducted
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass glass-hover">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${Math.round(totalTeacherIncome / totalTeacherHours)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Per hour
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Teacher Income</CardTitle>
                  <div className="flex gap-2">
                    <Select value={teacherFilter} onValueChange={setTeacherFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select Teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Teachers</SelectItem>
                        {teachers.map(teacher => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <CardDescription>
                  Income generated by teacher over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ChartContainer
                    config={{
                      income: { theme: { light: "#0088FE", dark: "#0088FE" } },
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={teacherIncomeData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area 
                          type="monotone" 
                          dataKey="income" 
                          name="Income" 
                          stroke="#0088FE" 
                          fill="#0088FE" 
                          fillOpacity={0.2} 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Lesson Status Distribution</CardTitle>
                <CardDescription>
                  Breakdown of lesson statuses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ChartContainer
                    config={{
                      Attended: { theme: { light: "#00C49F", dark: "#00C49F" } },
                      Cancelled: { theme: { light: "#FFBB28", dark: "#FFBB28" } },
                      Missed: { theme: { light: "#FF8042", dark: "#FF8042" } },
                      Rescheduled: { theme: { light: "#8884d8", dark: "#8884d8" } },
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={generateLessonStatusData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {generateLessonStatusData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Advanced Filters</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Lesson Category</label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {lessonCategories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Group</label>
                    <Select value={groupFilter} onValueChange={setGroupFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Groups</SelectItem>
                        {groups.map(group => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Subject</label>
                    <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Subject" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Subjects</SelectItem>
                        {subjects.map(subject => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Lesson Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="scheduled">Attended</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="missed">Missed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="md:col-span-2 flex items-end">
                    <Button className="gap-2">
                      <Filter className="h-4 w-4" />
                      <span>Apply Filters</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Finances Tab */}
        <TabsContent value="finances" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass glass-hover">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-sm font-medium text-muted-foreground gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Income
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalIncome}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  This {dateRangeFilter}
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass glass-hover">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-sm font-medium text-muted-foreground gap-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalExpenses}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  This {dateRangeFilter}
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass glass-hover">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-sm font-medium text-muted-foreground gap-2">
                  <CircleDollarSign className="h-4 w-4 text-blue-500" />
                  Net Cash Flow
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${netCashFlow}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  This {dateRangeFilter}
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass glass-hover">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-sm font-medium text-muted-foreground gap-2">
                  <Wallet className="h-4 w-4 text-purple-500" />
                  Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalIncome - totalExpenses}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  All accounts ({currencyFilter})
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Cash Flow</CardTitle>
                <CardDescription>
                  Income vs Expenses over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ChartContainer
                    config={{
                      income: { theme: { light: "#0088FE", dark: "#0088FE" } },
                      expenses: { theme: { light: "#FF8042", dark: "#FF8042" } },
                      profit: { theme: { light: "#00C49F", dark: "#00C49F" } },
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cashFlowData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area 
                          type="monotone" 
                          dataKey="income" 
                          name="Income" 
                          stackId="1"
                          stroke="#0088FE" 
                          fill="#0088FE" 
                          fillOpacity={0.2} 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="expenses" 
                          name="Expenses" 
                          stackId="2"
                          stroke="#FF8042" 
                          fill="#FF8042" 
                          fillOpacity={0.2} 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="profit" 
                          name="Profit" 
                          stroke="#00C49F" 
                          fill="#00C49F" 
                          fillOpacity={0.2} 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Balance by Currency</CardTitle>
                <CardDescription>
                  Distribution across currencies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ChartContainer
                    config={{
                      USD: { theme: { light: "#0088FE", dark: "#0088FE" } },
                      EUR: { theme: { light: "#00C49F", dark: "#00C49F" } },
                      GBP: { theme: { light: "#FFBB28", dark: "#FFBB28" } },
                      CAD: { theme: { light: "#FF8042", dark: "#FF8042" } },
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={generateBalanceByCurrencyData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value, percent }) => `${name}: $${value} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {generateBalanceByCurrencyData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Expenses</CardTitle>
                <CardDescription>
                  Expected expenses for next {dateRangeFilter}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold">${upcomingExpenses}</div>
                    <Badge variant="outline" className="bg-red-100 text-red-800 gap-1">
                      <ArrowUp className="h-3 w-3" />
                      <span>+5% from previous {dateRangeFilter}</span>
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Rent</span>
                      <span className="font-medium">$1,200</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Salaries</span>
                      <span className="font-medium">$3,500</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Utilities</span>
                      <span className="font-medium">$450</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Marketing</span>
                      <span className="font-medium">$800</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Other</span>
                      <span className="font-medium">$350</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Expected Income</CardTitle>
                <CardDescription>
                  Projected income for next {dateRangeFilter}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold">${upcomingIncome}</div>
                    <Badge variant="outline" className="bg-green-100 text-green-800 gap-1">
                      <ArrowUp className="h-3 w-3" />
                      <span>+8% from previous {dateRangeFilter}</span>
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Individual Lessons</span>
                      <span className="font-medium">$3,200</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Group Classes</span>
                      <span className="font-medium">$1,800</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Speaking Clubs</span>
                      <span className="font-medium">$950</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Workshop Fees</span>
                      <span className="font-medium">$700</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Other</span>
                      <span className="font-medium">$300</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Students Tab */}
        <TabsContent value="students" className="space-y-6">
          <StudentsOverviewCards
            newStudents={totalNewStudents}
            lostStudents={totalLostStudents}
            newStudentIncome={totalNewStudents * 300}
            lostROI={totalLostStudents * 250}
            period={dateRangeFilter}
          />
          
          <StudentAcquisitionChart
            data={studentMetricsData}
          />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SubjectPerformanceCard 
              subjects={subjects}
            />
            
            <ROIByLessonTypeCard
              data={generateROIData()}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StatesReports;
