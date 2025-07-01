
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Mail, 
  Phone, 
  BookOpen, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Edit,
  Trash2,
  MessageCircle,
  Send,
  Instagram
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  lessonType: 'individual' | 'group';
  ageGroup: 'adult' | 'kid';
  courseName: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'fluent';
  phone?: string;
  birthday?: string;
  whatsapp?: string;
  telegram?: string;
  instagram?: string;
  paymentStatus: 'paid' | 'pending' | 'overdue';
  teacherId?: string;
  lessonsCompleted: number;
  nextLesson: string;
  nextPaymentDate?: string;
  nextPaymentAmount?: number;
  subscriptionProgress?: string;
}

interface StudentCardProps {
  student: Student;
  className?: string;
  onEdit?: (student: Student) => void;
  onDelete?: (student: Student) => void;
}

const StudentCard: React.FC<StudentCardProps> = ({ 
  student, 
  className,
  onEdit,
  onDelete
}) => {
  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-3 w-3" />;
      case 'pending':
        return <Clock className="h-3 w-3" />;
      case 'overdue':
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-blue-100 text-blue-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-green-100 text-green-800';
      case 'fluent':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatProgress = (progress?: string) => {
    if (!progress) return '0/0';
    return progress;
  };

  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <User className="h-5 w-5 text-gray-600" />
            {student.firstName} {student.lastName}
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(student)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete?.(student)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge 
            variant="secondary" 
            className={getPaymentStatusColor(student.paymentStatus)}
          >
            {getPaymentStatusIcon(student.paymentStatus)}
            <span className="ml-1 capitalize">{student.paymentStatus}</span>
          </Badge>
          <Badge variant="outline" className={getLevelColor(student.level)}>
            {student.level}
          </Badge>
          <Badge variant="outline" className="capitalize">
            {student.lessonType}
          </Badge>
          <Badge variant="outline" className="capitalize">
            {student.ageGroup}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-gray-500" />
            <span className="truncate">{student.email}</span>
          </div>
          
          {student.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-500" />
              <span>{student.phone}</span>
            </div>
          )}
          
          {student.whatsapp && (
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-green-500" />
              <span>{student.whatsapp}</span>
            </div>
          )}
          
          {student.telegram && (
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-blue-500" />
              <span>{student.telegram}</span>
            </div>
          )}
          
          {student.instagram && (
            <div className="flex items-center gap-2">
              <Instagram className="h-4 w-4 text-pink-500" />
              <span>{student.instagram}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-gray-500" />
            <span>{student.courseName}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span>Next: {student.nextLesson}</span>
          </div>
          
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-xs text-gray-600">
              Progress: {formatProgress(student.subscriptionProgress)}
            </span>
            <span className="text-xs text-gray-600">
              Completed: {student.lessonsCompleted} lessons
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StudentCard;
