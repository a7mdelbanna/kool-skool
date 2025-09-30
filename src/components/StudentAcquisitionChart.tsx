
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

// Note: Mock data generator removed - data now comes from parent component with real data

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
  data = [], // Data should be provided by parent component
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
    <Card className={`glass-card glass-card-hover ${className || ''}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Student Acquisition & Attrition</CardTitle>
          <p className="text-sm text-muted-foreground">New vs lost students over time</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={handleDateRangeChange}>
            <SelectTrigger className="w-[140px] bg-background/50 backdrop-blur-sm border-border/50">
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
          <div className="glass-card p-4 rounded-lg border-emerald-500/20 bg-emerald-500/5">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-500/10 rounded">
                  <UserPlus className="h-4 w-4 text-emerald-500" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">New Students</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground">{totalNewStudents}</div>
          </div>

          <div className="glass-card p-4 rounded-lg border-red-500/20 bg-red-500/5">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-red-500/10 rounded">
                  <UserMinus className="h-4 w-4 text-red-500" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Lost Students</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground">{totalLostStudents}</div>
          </div>

          <div className={`glass-card p-4 rounded-lg ${netStudentGrowth >= 0 ? 'border-blue-500/20 bg-blue-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 ${netStudentGrowth >= 0 ? 'bg-blue-500/10' : 'bg-red-500/10'} rounded`}>
                  <Filter className={`h-4 w-4 ${netStudentGrowth >= 0 ? 'text-blue-500' : 'text-red-500'}`} />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Net Growth</span>
              </div>
              <Badge
                variant="outline"
                className={netStudentGrowth >= 0 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" : "bg-red-500/10 text-red-500 border-red-500/30"}
              >
                {netStudentGrowth >= 0 ? "+" : ""}{netStudentGrowth}
              </Badge>
            </div>
            <div className="text-2xl font-bold text-foreground">{netStudentGrowth}</div>
          </div>

          <div className="glass-card p-4 rounded-lg border-purple-500/20 bg-purple-500/5">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-500/10 rounded">
                  <Filter className="h-4 w-4 text-purple-500" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Retention Rate</span>
              </div>
              <Badge
                variant="outline"
                className={retentionRate >= 75 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" : "bg-amber-500/10 text-amber-500 border-amber-500/30"}
              >
                {retentionRate}%
              </Badge>
            </div>
            <div className="text-2xl font-bold text-foreground">{retentionRate}%</div>
          </div>
        </div>
        
        <div className="rounded-md border border-border/50 overflow-hidden">
          <Table>
            <TableHeader className="bg-background/50 backdrop-blur-sm">
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
                    <span className={item.newStudents - item.lostStudents >= 0 ? "text-emerald-500 font-medium" : "text-red-500 font-medium"}>
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
