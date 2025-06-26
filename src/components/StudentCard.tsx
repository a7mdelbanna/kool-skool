
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
  subscriptionProgress?: string;
  nextPaymentDate?: string;
  nextPaymentAmount?: number;
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
    <div className={`bg-white rounded-lg p-4 shadow-sm border ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-medium text-sm">
              {student.firstName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">
              {student.firstName} {student.lastName}
            </h3>
            <p className="text-sm text-gray-500">{student.email}</p>
          </div>
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
            {student.level}
          </span>
          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
            {student.lessonType}
          </span>
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
            {student.ageGroup}
          </span>
        </div>

        <div className="text-sm text-gray-900 font-medium">
          {student.courseName}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-blue-100 rounded flex items-center justify-center">
                <span className="text-blue-600 text-xs">📊</span>
              </div>
              <span>Progress</span>
              <span className="font-medium text-gray-900">
                {student.subscriptionProgress || '0/0'}
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-green-100 rounded flex items-center justify-center">
                <span className="text-green-600 text-xs">📅</span>
              </div>
              <span>Next</span>
              <span className="font-medium text-blue-600">
                {student.nextLesson || 'Not scheduled'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-yellow-100 rounded flex items-center justify-center">
              <span className="text-yellow-600 text-xs">💳</span>
            </div>
            <span className="text-xs text-gray-500">Payment</span>
            <span className={`text-xs font-medium px-2 py-1 rounded ${
              student.paymentStatus === 'paid' 
                ? 'bg-green-100 text-green-700' 
                : student.paymentStatus === 'pending'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {student.paymentStatus === 'paid' ? 'Paid' : 
               student.paymentStatus === 'pending' ? 'Pending' : 'Overdue'}
            </span>
          </div>
        </div>
      </div>

      {(onEdit || onDelete) && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
          {onEdit && (
            <button
              onClick={() => onEdit(student)}
              className="text-xs px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(student)}
              className="text-xs px-3 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentCard;
