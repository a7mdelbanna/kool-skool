
import React from 'react';

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  lessonType: 'individual' | 'group';
  ageGroup: 'adult' | 'kid';
  courseName: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'fluent';
  paymentStatus: string;
  teacherId?: string;
  lessonsCompleted?: number;
  nextLesson?: string;
  phone?: string;
  dateOfBirth?: string;
  nextPaymentDate?: string;
  nextPaymentAmount?: number;
  subscriptionProgress?: string;
  // Separate social media fields
  telegram?: string;
  whatsapp?: string;
  instagram?: string;
  viber?: string;
  facebook?: string;
  skype?: string;
  zoom?: string;
}

interface StudentCardProps {
  student: Student;
  className?: string;
  onEdit?: (student: Student) => void;
  onDelete?: (student: Student) => void;
}

const StudentCard: React.FC<StudentCardProps> = ({ student, className = '', onEdit, onDelete }) => {
  return (
    <div className={`p-4 border rounded-lg ${className}`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold text-lg">
            {student.firstName} {student.lastName}
          </h3>
          <p className="text-sm text-muted-foreground">{student.email}</p>
        </div>
        <div className="flex gap-2">
          {onEdit && (
            <button
              onClick={() => onEdit(student)}
              className="text-sm px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(student)}
              className="text-sm px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              Delete
            </button>
          )}
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Course:</span>
          <span className="text-sm font-medium">{student.courseName}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Level:</span>
          <span className="text-sm font-medium capitalize">{student.level}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Type:</span>
          <span className="text-sm font-medium capitalize">{student.lessonType}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Age Group:</span>
          <span className="text-sm font-medium capitalize">{student.ageGroup}</span>
        </div>
        
        {student.lessonsCompleted !== undefined && (
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Lessons Completed:</span>
            <span className="text-sm font-medium">{student.lessonsCompleted}</span>
          </div>
        )}
        
        {student.nextLesson && (
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Next Lesson:</span>
            <span className="text-sm font-medium">{student.nextLesson}</span>
          </div>
        )}
        
        {student.subscriptionProgress && (
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Progress:</span>
            <span className="text-sm font-medium">{student.subscriptionProgress}</span>
          </div>
        )}
        
        <div className="flex justify-between items-center pt-2 border-t">
          <span className="text-sm text-muted-foreground">Payment Status:</span>
          <span className={`text-sm font-medium px-2 py-1 rounded-full ${
            student.paymentStatus === 'paid' 
              ? 'bg-green-100 text-green-700' 
              : student.paymentStatus === 'pending'
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-red-100 text-red-700'
          }`}>
            {student.paymentStatus}
          </span>
        </div>
      </div>
    </div>
  );
};

export default StudentCard;
