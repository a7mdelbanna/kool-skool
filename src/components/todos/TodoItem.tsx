import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Calendar, CheckCircle, Circle, Clock, User, ChevronRight, AlertCircle, BookOpen, Target } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Todo } from '@/services/firebase/todos.service';
import { FirebaseStudent, studentsService } from '@/services/firebase/students.service';

interface TodoItemProps {
  todo: Todo;
  students: FirebaseStudent[];
  onStatusChange: (todo: Todo, status: string) => void;
  isOverdue: (todo: Todo) => boolean;
}

const TodoItem: React.FC<TodoItemProps> = ({ 
  todo, 
  students, 
  onStatusChange,
  isOverdue
}) => {
  const [student, setStudent] = useState<FirebaseStudent | null>(null);
  const [loadingStudent, setLoadingStudent] = useState(false);

  useEffect(() => {
    const loadStudent = async () => {
      // First try to find in the provided students array
      const foundStudent = students.find(s => 
        s.id === todo.student_id || 
        s.studentId === todo.student_id
      );
      
      if (foundStudent) {
        setStudent(foundStudent);
        return;
      }
      
      // If not found and we have a student_id, fetch individually
      if (todo.student_id && !loadingStudent) {
        setLoadingStudent(true);
        try {
          console.log('Fetching student individually:', todo.student_id);
          const fetchedStudent = await studentsService.getById(todo.student_id);
          if (fetchedStudent) {
            console.log('Found student:', fetchedStudent);
            setStudent(fetchedStudent);
          } else {
            console.log('No student found for ID:', todo.student_id);
          }
        } catch (error) {
          console.error('Error fetching student:', todo.student_id, error);
        } finally {
          setLoadingStudent(false);
        }
      }
    };
    
    loadStudent();
  }, [todo.student_id, students]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-500" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'homework':
        return '📚';
      case 'practice':
        return '🎯';
      case 'review':
        return '📝';
      case 'project':
        return '🚀';
      case 'assessment':
        return '📊';
      default:
        return '📋';
    }
  };

  const studentName = student 
    ? `${student.firstName} ${student.lastName}`.trim() || 'Unknown Student'
    : loadingStudent ? 'Loading...' : 'Unknown';

  return (
    <Card 
      className={`p-4 ${isOverdue(todo) ? 'border-red-200 bg-red-50' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <button
            onClick={() => onStatusChange(
              todo, 
              todo.status === 'completed' ? 'pending' : 'completed'
            )}
            className="mt-1"
          >
            {getStatusIcon(todo.status)}
          </button>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{getCategoryIcon(todo.category)}</span>
              <h4 className={`font-medium ${
                todo.status === 'completed' ? 'line-through text-muted-foreground' : ''
              }`}>
                {todo.title}
              </h4>
              <Badge variant={getPriorityColor(todo.priority)}>
                {todo.priority}
              </Badge>
              {isOverdue(todo) && (
                <Badge variant="destructive">Overdue</Badge>
              )}
            </div>
            
            {todo.description && (
              <p className="text-sm text-muted-foreground mb-2">
                {todo.description}
              </p>
            )}
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {studentName}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Due: {format(new Date(todo.due_date), 'MMM dd, yyyy')}
              </span>
              {todo.completed_at && (
                <span className="text-green-600">
                  Completed: {format(new Date(todo.completed_at), 'MMM dd, yyyy')}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (todo.session_id) {
              window.location.href = `/session/${todo.session_id}`;
            }
          }}
          disabled={!todo.session_id}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};

export default TodoItem;