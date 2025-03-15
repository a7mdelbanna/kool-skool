import React from 'react';
import { MoreVertical, BookOpen, Calendar, CreditCard } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface Student {
  id: string;
  name: string;
  email: string;
  subject: string;
  lessonsCompleted: number;
  nextLesson: string;
  paymentStatus: 'paid' | 'pending' | 'overdue';
  phone?: string;
  facebook?: string;
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  notes?: string;
  photoUrl?: string;
}

interface StudentCardProps {
  student: Student;
  className?: string;
}

const StudentCard: React.FC<StudentCardProps> = ({ student, className }) => {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={student.photoUrl} alt={student.name} />
              <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold">{student.name}</h2>
              <p className="text-sm text-muted-foreground">{student.subject}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View Profile</DropdownMenuItem>
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuItem>Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span>{student.lessonsCompleted} Lessons</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Next: {student.nextLesson}</span>
          </div>
        </div>

        <div className="mt-4">
          {student.paymentStatus === 'paid' && (
            <Badge variant="outline" className="gap-2">
              <CheckCircle className="h-3 w-3 text-green-500" />
              Paid
            </Badge>
          )}
          {student.paymentStatus === 'pending' && (
            <Badge variant="outline" className="gap-2">
              <span className="h-2 w-2 rounded-full bg-yellow-500" />
              Pending
            </Badge>
          )}
          {student.paymentStatus === 'overdue' && (
            <Badge variant="outline" className="gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Overdue
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StudentCard;
