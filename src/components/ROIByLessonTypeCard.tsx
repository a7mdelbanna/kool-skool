
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { DollarSign, ArrowUp, ArrowDown } from 'lucide-react';

interface LessonTypeROI {
  name: string;
  roi: number;
}

interface ROIByLessonTypeCardProps {
  data: LessonTypeROI[];
  className?: string;
}

const ROIByLessonTypeCard: React.FC<ROIByLessonTypeCardProps> = ({ data, className }) => {
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  const toggleSort = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  };
  
  const sortedData = [...data].sort((a, b) => {
    return sortOrder === "asc" ? a.roi - b.roi : b.roi - a.roi;
  });
  
  // Calculate average ROI
  const averageROI = Math.round(data.reduce((sum, item) => sum + item.roi, 0) / data.length);
  
  // Get ROI performance indicator
  const getRoiPerformance = (roi: number) => {
    const diff = roi - averageROI;
    const percentage = Math.round((diff / averageROI) * 100);

    if (Math.abs(percentage) < 5) return { label: "Average", class: "bg-blue-500/10 text-blue-500 border-blue-500/30" };
    if (percentage >= 5) return { label: `${percentage}% above avg`, class: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30", icon: <ArrowUp className="h-3 w-3" /> };
    return { label: `${Math.abs(percentage)}% below avg`, class: "bg-red-500/10 text-red-500 border-red-500/30", icon: <ArrowDown className="h-3 w-3" /> };
  };
  
  return (
    <Card className={`glass-card glass-card-hover ${className || ''}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-foreground">Student ROI by Category</CardTitle>
          <p className="text-sm text-muted-foreground">Return on investment by lesson type</p>
        </div>
        <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/30 flex gap-1">
          <DollarSign className="h-4 w-4" />
          Avg: ${averageROI}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-border/50 overflow-hidden">
        <Table>
          <TableHeader className="bg-background/50 backdrop-blur-sm">
            <TableRow>
              <TableHead>Lesson Type</TableHead>
              <TableHead 
                className="text-right cursor-pointer" 
                onClick={toggleSort}
              >
                ROI {sortOrder === "asc" ? "↑" : "↓"}
              </TableHead>
              <TableHead className="text-right">Performance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((item, index) => {
              const performance = getRoiPerformance(item.roi);
              
              return (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right font-mono font-medium text-foreground">${item.roi}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className={`${performance.class} flex gap-1 ml-auto`}>
                      {performance.icon}
                      {performance.label}
                    </Badge>
                  </TableCell>
                </TableRow>
              )}
            )}
          </TableBody>
        </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ROIByLessonTypeCard;
