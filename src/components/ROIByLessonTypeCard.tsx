
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface LessonTypeROI {
  name: string;
  roi: number;
}

interface ROIByLessonTypeCardProps {
  data: LessonTypeROI[];
  className?: string;
}

const ROIByLessonTypeCard: React.FC<ROIByLessonTypeCardProps> = ({ data, className }) => {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Student ROI by Category</CardTitle>
        <p className="text-sm text-muted-foreground">Return on investment by lesson type</p>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ChartContainer
            config={{
              roi: { theme: { light: "#0088FE", dark: "#0088FE" } },
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={data}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" />
                <ChartTooltip 
                  content={<ChartTooltipContent />} 
                  formatter={(value) => [`$${value}`, 'ROI']} 
                />
                <Bar dataKey="roi" name="ROI" fill="#0088FE" barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default ROIByLessonTypeCard;
