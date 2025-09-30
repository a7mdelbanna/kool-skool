
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
      <Card className="glass-card glass-card-hover">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-sm text-emerald-500 mb-1">
            <div className="p-1.5 bg-emerald-500/10 rounded">
              <UserPlus className="h-4 w-4 text-emerald-500" />
            </div>
            <span>New Students</span>
          </div>
          <div className="text-3xl font-bold text-foreground">{newStudents}</div>
          <div className="text-xs text-muted-foreground mt-1">
            This {period}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card glass-card-hover">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-sm text-red-500 mb-1">
            <div className="p-1.5 bg-red-500/10 rounded">
              <UserMinus className="h-4 w-4 text-red-500" />
            </div>
            <span>Lost Students</span>
          </div>
          <div className="text-3xl font-bold text-foreground">{lostStudents}</div>
          <div className="text-xs text-muted-foreground mt-1">
            This {period}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card glass-card-hover">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-sm text-emerald-500 mb-1">
            <div className="p-1.5 bg-emerald-500/10 rounded">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <span>New Student Income</span>
          </div>
          <div className="text-3xl font-bold text-foreground">${newStudentIncome.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-1">
            This {period}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card glass-card-hover">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-sm text-red-500 mb-1">
            <div className="p-1.5 bg-red-500/10 rounded">
              <TrendingDown className="h-4 w-4 text-red-500" />
            </div>
            <span>Lost ROI</span>
          </div>
          <div className="text-3xl font-bold text-foreground">${lostROI.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-1">
            This {period}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentsOverviewCards;
