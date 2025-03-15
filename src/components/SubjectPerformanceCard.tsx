
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Subject {
  id: string;
  name: string;
  retentionRate: number;
}

interface SubjectPerformanceCardProps {
  subjects: Subject[];
  className?: string;
}

const SubjectPerformanceCard: React.FC<SubjectPerformanceCardProps> = ({ subjects, className }) => {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Top Performing Subjects</CardTitle>
        <p className="text-sm text-muted-foreground">Subjects with highest student retention</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {subjects.map((subject) => (
            <div key={subject.id} className="flex items-center">
              <div className="w-[40%]">
                <div className="text-sm font-medium">{subject.name}</div>
              </div>
              <div className="w-[60%] space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Retention Rate</span>
                  <span>{subject.retentionRate}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div 
                    className="h-full bg-blue-500" 
                    style={{ width: `${subject.retentionRate}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SubjectPerformanceCard;
