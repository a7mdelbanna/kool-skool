import React from 'react';
import { Calendar, CheckSquare, DollarSign, Eye, Edit, Trash2, CreditCard } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export type Student = {
  id: string;
  firstName: string;
  lastName: string;
  image?: string;
  email: string;
  phone?: string;
  lessonType: 'individual' | 'group';
  ageGroup: 'kid' | 'adult';
  courseName: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'fluent';
  lessonsCompleted: number;
  nextLesson?: string;
  paymentStatus: 'paid' | 'pending' | 'overdue';
  nextPaymentDate?: string;
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
  onView?: (student: Student) => void;
  onEdit?: (student: Student) => void;
  onDelete?: (student: Student) => void;
}

const StudentCard = ({ student, className, onView, onEdit, onDelete }: StudentCardProps) => {
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
    <Card 
      className={cn(
        "overflow-hidden transition-all duration-300 hover:shadow-md cursor-pointer", 
        className
      )}
      onClick={() => onEdit?.(student)}
    >
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
            <AvatarImage src={student.image} alt={`${student.firstName} ${student.lastName}`} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {`${student.firstName[0]}${student.lastName[0]}`}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <h3 className="font-semibold text-base truncate">{`${student.firstName} ${student.lastName}`}</h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={(e) => e.stopPropagation()} // Prevent card click when clicking the menu
                  >
                    <span className="sr-only">Open menu</span>
                    <svg width="15" height="3" viewBox="0 0 15 3" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1.5 1.5C1.5 1.89782 1.65804 2.27936 1.93934 2.56066C2.22064 2.84196 2.60218 3 3 3C3.39782 3 3.77936 2.84196 4.06066 2.56066C4.34196 2.27936 4.5 1.89782 4.5 1.5C4.5 1.10218 4.34196 0.720644 4.06066 0.43934C3.77936 0.158035 3.39782 0 3 0C2.60218 0 2.22064 0.158035 1.93934 0.43934C1.65804 0.720644 1.5 1.10218 1.5 1.5ZM6 1.5C6 1.89782 6.15804 2.27936 6.43934 2.56066C6.72064 2.84196 7.10218 3 7.5 3C7.89782 3 8.27936 2.84196 8.56066 2.56066C8.84196 2.27936 9 1.89782 9 1.5C9 1.10218 8.84196 0.720644 8.56066 0.43934C8.27936 0.158035 7.89782 0 7.5 0C7.10218 0 6.72064 0.158035 6.43934 0.43934C6.15804 0.720644 6 1.10218 6 1.5ZM10.5 1.5C10.5 1.89782 10.658 2.27936 10.9393 2.56066C11.2206 2.84196 11.6022 3 12 3C12.3978 3 12.7794 2.84196 13.0607 2.56066C13.342 2.27936 13.5 1.89782 13.5 1.5C13.5 1.10218 13.342 0.720644 13.0607 0.43934C12.7794 0.158035 12.3978 0 12 0C11.6022 0 11.2206 0.158035 10.9393 0.43934C10.658 0.720644 10.5 1.10218 10.5 1.5Z" fill="currentColor"/>
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem className="cursor-pointer" onClick={() => onEdit?.(student)}>
                    <Edit className="mr-2 h-4 w-4" />
                    <span>Edit</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={() => onDelete?.(student)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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
        
        <div className="grid grid-cols-4 gap-2 mt-4">
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
          
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            <div className="text-xs">
              <p className="text-muted-foreground">Next Payment</p>
              <p className="font-medium">{student.nextPaymentDate || 'Not scheduled'}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StudentCard;
