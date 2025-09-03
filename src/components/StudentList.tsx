import React from 'react';
import { Student } from './StudentCard';
import { Button } from './ui/button';
import { MoreVertical, Mail, Phone, User, BookOpen, Calendar, DollarSign } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

interface StudentListProps {
  students: Student[];
  onView?: (student: Student) => void;
  onEdit?: (student: Student) => void;
  onDelete?: (student: Student) => void;
}

const StudentList: React.FC<StudentListProps> = ({ students, onView, onEdit, onDelete }) => {
  const getPaymentStatusColor = (status: Student['paymentStatus']) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return '';
    }
  };

  const getLevelColor = (level: string) => {
    const colors: { [key: string]: string } = {
      'A1': 'bg-green-100 text-green-700',
      'A2': 'bg-blue-100 text-blue-700',
      'B1': 'bg-purple-100 text-purple-700',
      'B2': 'bg-pink-100 text-pink-700',
      'C1': 'bg-orange-100 text-orange-700',
      'C2': 'bg-red-100 text-red-700',
      'Beginner': 'bg-green-100 text-green-700',
      'Elementary': 'bg-blue-100 text-blue-700',
      'Intermediate': 'bg-purple-100 text-purple-700',
      'Upper-Intermediate': 'bg-pink-100 text-pink-700',
      'Advanced': 'bg-orange-100 text-orange-700',
      'Proficient': 'bg-red-100 text-red-700'
    };
    return colors[level] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left p-4 font-medium text-gray-700">Student</th>
            <th className="text-left p-4 font-medium text-gray-700 hidden sm:table-cell">Contact</th>
            <th className="text-left p-4 font-medium text-gray-700 hidden md:table-cell">Course</th>
            <th className="text-left p-4 font-medium text-gray-700 hidden lg:table-cell">Level</th>
            <th className="text-left p-4 font-medium text-gray-700">Payment</th>
            <th className="text-left p-4 font-medium text-gray-700 hidden xl:table-cell">Progress</th>
            <th className="text-left p-4 font-medium text-gray-700 hidden xl:table-cell">Next Lesson</th>
            <th className="text-right p-4 font-medium text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => {
            const initials = `${student.firstName?.[0] || ''}${student.lastName?.[0] || ''}`.toUpperCase();
            
            return (
              <tr 
                key={student.id} 
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onView?.(student)}
              >
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={student.image} alt={`${student.firstName} ${student.lastName}`} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-gray-900">
                        {student.firstName} {student.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {student.lessonType} • {student.ageGroup}
                      </div>
                    </div>
                  </div>
                </td>
                
                <td className="p-4 hidden sm:table-cell">
                  <div className="space-y-1">
                    {student.email && (
                      <div className="text-sm text-gray-600 flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {student.email}
                      </div>
                    )}
                    {student.phone && (
                      <div className="text-sm text-gray-600 flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {(() => {
                          const phoneStr = student.phone.toString();
                          const countryCode = student.countryCode || '';
                          
                          // Check if phone already includes the country code
                          if (countryCode && phoneStr.startsWith(countryCode.replace('+', ''))) {
                            // Phone already has country code, don't add it again
                            return countryCode.startsWith('+') ? phoneStr : `+${phoneStr}`;
                          } else if (phoneStr.startsWith('+')) {
                            // Phone already has + sign
                            return phoneStr;
                          } else {
                            // Add country code to phone
                            return `${countryCode}${phoneStr}`;
                          }
                        })()}
                      </div>
                    )}
                  </div>
                </td>
                
                <td className="p-4 hidden md:table-cell">
                  <div className="text-sm">
                    {student.courseName || (
                      <span className="text-gray-400">No course assigned</span>
                    )}
                  </div>
                </td>
                
                <td className="p-4 hidden lg:table-cell">
                  {student.level && (
                    <Badge className={`${getLevelColor(student.level)} border`}>
                      {student.level}
                    </Badge>
                  )}
                </td>
                
                <td className="p-4">
                  <Badge className={`${getPaymentStatusColor(student.paymentStatus)} border capitalize`}>
                    {student.paymentStatus}
                  </Badge>
                </td>
                
                <td className="p-4 hidden xl:table-cell">
                  <div className="text-sm text-gray-600">
                    {student.subscriptionProgress || '0/0'}
                  </div>
                </td>
                
                <td className="p-4 hidden xl:table-cell">
                  <div className="text-sm text-gray-600">
                    {student.nextLesson || 'Not scheduled'}
                  </div>
                </td>
                
                <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView?.(student)}>
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit?.(student)}>
                        Edit Student
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onDelete?.(student)}
                        className="text-red-600 focus:text-red-600"
                      >
                        Delete Student
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {students.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No students found
        </div>
      )}
    </div>
  );
};

export default StudentList;