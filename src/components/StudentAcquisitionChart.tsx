
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { format, subDays } from 'date-fns';

interface StudentMetricsData {
  date: string;
  newStudents: number;
  lostStudents: number;
}

const generateStudentMetricsData = (days = 30): StudentMetricsData[] => {
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

const StudentAcquisitionChart: React.FC<StudentAcquisitionChartProps> = ({ 
  data = generateStudentMetricsData(14), // Show 2 weeks by default
  className 
}) => {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Student Acquisition & Attrition</CardTitle>
        <p className="text-sm text-muted-foreground">New vs lost students over time</p>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ChartContainer
            config={{
              newStudents: { theme: { light: "#0088FE", dark: "#0088FE" } },
              lostStudents: { theme: { light: "#FF8042", dark: "#FF8042" } },
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={data}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="newStudents" name="New Students" fill="#0088FE" />
                <Bar dataKey="lostStudents" name="Lost Students" fill="#FF8042" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default StudentAcquisitionChart;
