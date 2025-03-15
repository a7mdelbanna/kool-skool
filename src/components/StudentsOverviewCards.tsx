
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { UserPlus, UserMinus, TrendingUp, TrendingDown } from 'lucide-react';

interface StudentsOverviewCardsProps {
  newStudents: number;
  lostStudents: number;
  newStudentIncome: number;
  lostROI: number;
  period?: string;
  className?: string;
}

const StudentsOverviewCards: React.FC<StudentsOverviewCardsProps> = ({
  newStudents,
  lostStudents,
  newStudentIncome,
  lostROI,
  period = "month",
  className
}) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      <Card className="bg-white border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-sm text-emerald-600 mb-1">
            <UserPlus className="h-4 w-4" />
            <span>New Students</span>
          </div>
          <div className="text-3xl font-bold">{newStudents}</div>
          <div className="text-xs text-muted-foreground mt-1">
            This {period}
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-white border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-sm text-red-600 mb-1">
            <UserMinus className="h-4 w-4" />
            <span>Lost Students</span>
          </div>
          <div className="text-3xl font-bold">{lostStudents}</div>
          <div className="text-xs text-muted-foreground mt-1">
            This {period}
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-white border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-sm text-emerald-600 mb-1">
            <TrendingUp className="h-4 w-4" />
            <span>New Student Income</span>
          </div>
          <div className="text-3xl font-bold">${newStudentIncome.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-1">
            This {period}
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-white border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-sm text-red-600 mb-1">
            <TrendingDown className="h-4 w-4" />
            <span>Lost ROI</span>
          </div>
          <div className="text-3xl font-bold">${lostROI.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-1">
            This {period}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentsOverviewCards;
