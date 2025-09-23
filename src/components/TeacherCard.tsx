import React from 'react';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Users,
  BookOpen,
  Edit,
  Trash2,
  MoreVertical,
  CheckCircle,
  Clock
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Teacher } from '@/services/firebase/teachers.service';
import { cn } from '@/lib/utils';

interface TeacherCardProps {
  teacher: Teacher & {
    studentCount?: number;
    activeSubscriptions?: number;
    completedLessons?: number;
  };
  onEdit: (teacher: Teacher) => void;
  onDelete: (teacherId: string) => void;
  onView: (teacherId: string) => void;
}

const TeacherCard: React.FC<TeacherCardProps> = ({
  teacher,
  onEdit,
  onDelete,
  onView
}) => {
  const initials = `${teacher.firstName?.[0] || ''}${teacher.lastName?.[0] || ''}`.toUpperCase();

  return (
    <Card className={cn(
      "group relative transition-all duration-200 hover:shadow-lg",
      !teacher.isActive && "opacity-60"
    )}>
      <CardContent className="p-6">
        {/* Header with Avatar and Actions */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-gray-200">
              <AvatarImage src={teacher.profilePicture} alt={`${teacher.firstName} ${teacher.lastName}`} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-gray-900">
                {teacher.firstName} {teacher.lastName}
              </h3>
              {teacher.subjects && teacher.subjects.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {teacher.subjects.slice(0, 2).join(', ')}
                  {teacher.subjects.length > 2 && ` +${teacher.subjects.length - 2}`}
                </p>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(teacher.id)}>
                <User className="mr-2 h-4 w-4" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(teacher)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(teacher.id)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {teacher.isActive ? 'Deactivate' : 'Activate'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Status Badge */}
        <div className="mb-4">
          <Badge
            variant={teacher.isActive ? "success" : "secondary"}
            className={cn(
              "font-medium",
              teacher.isActive
                ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            )}
          >
            {teacher.isActive ? (
              <>
                <CheckCircle className="w-3 h-3 mr-1" />
                Active
              </>
            ) : (
              <>
                <Clock className="w-3 h-3 mr-1" />
                Inactive
              </>
            )}
          </Badge>
        </div>

        {/* Contact Information */}
        <div className="space-y-2 mb-4">
          {teacher.email && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="h-3 w-3" />
              <span className="truncate">{teacher.email}</span>
            </div>
          )}
          {teacher.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="h-3 w-3" />
              <span>{teacher.countryCode || '+1'} {teacher.phone}</span>
            </div>
          )}
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-100">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Users className="h-3 w-3 text-gray-400" />
              <span className="text-sm font-semibold text-gray-900">
                {teacher.studentCount || 0}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Students</p>
          </div>
          <div className="text-center border-x border-gray-100">
            <div className="flex items-center justify-center gap-1">
              <Calendar className="h-3 w-3 text-gray-400" />
              <span className="text-sm font-semibold text-gray-900">
                {teacher.activeSubscriptions || 0}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Active</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <BookOpen className="h-3 w-3 text-gray-400" />
              <span className="text-sm font-semibold text-gray-900">
                {teacher.completedLessons || 0}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Lessons</p>
          </div>
        </div>

        {/* Qualifications/Languages (if available) */}
        {(teacher.languages && teacher.languages.length > 0) && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex flex-wrap gap-1">
              {teacher.languages.map((lang, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {lang}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TeacherCard;