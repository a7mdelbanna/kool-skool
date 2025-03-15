
import React from 'react';
import { Calendar, CheckSquare, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type Student = {
  id: string;
  name: string;
  image?: string;
  email: string;
  lessonType: 'individual' | 'group';
  ageGroup: 'kid' | 'adult';
  courseName: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'fluent';
  lessonsCompleted: number;
  nextLesson?: string;
  paymentStatus: 'paid' | 'pending' | 'overdue';
  facebook?: string;
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  telegram?: string;
  whatsapp?: string;
  notes?: string;
};

interface StudentCardProps {
  student: Student;
  className?: string;
}

const StudentCard = ({ student, className }: StudentCardProps) => {
  const getPaymentStatusColor = (status: Student['paymentStatus']) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return '';
    }
  };

  const getLevelColor = (level: Student['level']) => {
    switch (level) {
      case 'beginner':
        return 'bg-blue-100 text-blue-800';
      case 'intermediate':
        return 'bg-purple-100 text-purple-800';
      case 'advanced':
        return 'bg-orange-100 text-orange-800';
      case 'fluent':
        return 'bg-green-100 text-green-800';
      default:
        return '';
    }
  };

  return (
    <Card className={cn("overflow-hidden transition-all duration-300 hover:shadow-md", className)}>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
            <AvatarImage src={student.image} alt={student.name} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {student.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate">{student.name}</h3>
            <p className="text-sm text-muted-foreground truncate">{student.email}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className={cn("text-xs", getLevelColor(student.level))}>
                {student.level}
              </Badge>
              <Badge variant="outline" className="text-xs bg-secondary">
                {student.lessonType}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {student.ageGroup}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="mt-3">
          <p className="text-sm font-medium">{student.courseName}</p>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-primary" />
            <div className="text-xs">
              <p className="text-muted-foreground">Lessons</p>
              <p className="font-medium">{student.lessonsCompleted}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <div className="text-xs">
              <p className="text-muted-foreground">Next</p>
              <p className="font-medium">{student.nextLesson || 'Not scheduled'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <div className="text-xs">
              <p className="text-muted-foreground">Payment</p>
              <p className={cn(
                "font-medium px-1.5 py-0.5 rounded-full text-xs capitalize",
                getPaymentStatusColor(student.paymentStatus)
              )}>
                {student.paymentStatus}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StudentCard;
