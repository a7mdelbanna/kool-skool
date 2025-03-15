
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, subDays } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Filter, UserPlus, UserMinus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface StudentMetricsData {
  date: string;
  newStudents: number;
  lostStudents: number;
}

export const generateStudentMetricsData = (days = 30): StudentMetricsData[] => {
  return Array.from({ length: days }).map((_, i) => {
    const date = subDays(new Date(), days - i - 1);
    return {
      date: format(date, 'MMM dd'),
      newStudents: Math.floor(Math.random() * 4) + 1,
      lostStudents: Math.floor(Math.random() * 2.5),
    };
  });
};

interface StudentAcquisitionChartProps {
  data?: StudentMetricsData[];
  className?: string;
}

const dateRangeOptions = [
  { value: "week", label: "Last 7 days" },
  { value: "2weeks", label: "Last 14 days" },
  { value: "month", label: "Last 30 days" },
  { value: "3months", label: "Last 90 days" }
];

const StudentAcquisitionChart: React.FC<StudentAcquisitionChartProps> = ({ 
  data = generateStudentMetricsData(14), // Show 2 weeks by default
  className 
}) => {
  const [dateRange, setDateRange] = useState<string>("2weeks");
  const [sortBy, setSortBy] = useState<string>("date");
  
  // Calculate totals
  const totalNewStudents = data.reduce((sum, item) => sum + item.newStudents, 0);
  const totalLostStudents = data.reduce((sum, item) => sum + item.lostStudents, 0);
  const netStudentGrowth = totalNewStudents - totalLostStudents;
  const retentionRate = data.length > 0 
    ? Math.round((1 - (totalLostStudents / (totalNewStudents + totalLostStudents))) * 100) 
    : 0;
    
  // Handle date range changes
  const handleDateRangeChange = (value: string) => {
    setDateRange(value);
    // In a real implementation, this would fetch new data or filter existing data
  };
  
  // Sort data based on selected criteria
  const getSortedData = () => {
    return [...data].sort((a, b) => {
      switch (sortBy) {
        case "newStudents":
          return b.newStudents - a.newStudents;
        case "lostStudents":
          return b.lostStudents - a.lostStudents;
        case "date":
        default:
          // Already sorted by date in the original data
          return 0;
      }
    });
  };
  
  const sortedData = getSortedData();
  
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Student Acquisition & Attrition</CardTitle>
          <p className="text-sm text-muted-foreground">New vs lost students over time</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={handleDateRangeChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Time period" />
            </SelectTrigger>
            <SelectContent>
              {dateRangeOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">New Students</span>
              </div>
              <Badge variant="secondary">{totalNewStudents}</Badge>
            </div>
            <div className="text-2xl font-bold">{totalNewStudents}</div>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <UserMinus className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium">Lost Students</span>
              </div>
              <Badge variant="secondary">{totalLostStudents}</Badge>
            </div>
            <div className="text-2xl font-bold">{totalLostStudents}</div>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Net Growth</span>
              </div>
              <Badge 
                variant="outline" 
                className={netStudentGrowth >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
              >
                {netStudentGrowth >= 0 ? "+" : ""}{netStudentGrowth}
              </Badge>
            </div>
            <div className="text-2xl font-bold">{netStudentGrowth}</div>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Retention Rate</span>
              </div>
              <Badge 
                variant="outline" 
                className={retentionRate >= 75 ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}
              >
                {retentionRate}%
              </Badge>
            </div>
            <div className="text-2xl font-bold">{retentionRate}%</div>
          </div>
        </div>
        
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px] cursor-pointer" onClick={() => setSortBy("date")}>
                  Date {sortBy === "date" && "↓"}
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => setSortBy("newStudents")}>
                  New Students {sortBy === "newStudents" && "↓"}
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => setSortBy("lostStudents")}>
                  Lost Students {sortBy === "lostStudents" && "↓"}
                </TableHead>
                <TableHead className="text-right">Net Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.date}</TableCell>
                  <TableCell>{item.newStudents}</TableCell>
                  <TableCell>{item.lostStudents}</TableCell>
                  <TableCell className="text-right">
                    <span className={item.newStudents - item.lostStudents >= 0 ? "text-green-600" : "text-red-600"}>
                      {item.newStudents - item.lostStudents >= 0 ? "+" : ""}
                      {item.newStudents - item.lostStudents}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default StudentAcquisitionChart;
