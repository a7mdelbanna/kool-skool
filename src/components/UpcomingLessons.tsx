
import React from 'react';
import { 
  CalendarDays, 
  Clock, 
  User,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export type Lesson = {
  id: string;
  studentName: string;
  studentImage?: string;
  subject: string;
  date: string;
  time: string;
  duration: string;
  status: 'upcoming' | 'completed' | 'cancelled';
};

interface UpcomingLessonsProps {
  lessons: Lesson[];
  className?: string;
}

const LessonItem = ({ lesson }: { lesson: Lesson }) => {
  const getStatusColor = (status: Lesson['status']) => {
    switch (status) {
      case 'upcoming':
        return 'text-primary';
      case 'completed':
        return 'text-green-500';
      case 'cancelled':
        return 'text-red-500';
      default:
        return '';
    }
  };

  const getStatusIcon = (status: Lesson['status']) => {
    switch (status) {
      case 'upcoming':
        return <CalendarDays className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent/50 transition-colors">
      <Avatar className="h-10 w-10">
        <AvatarImage src={lesson.studentImage} alt={lesson.studentName} />
        <AvatarFallback className="bg-primary/10 text-primary">
          {lesson.studentName.split(' ').map(n => n[0]).join('')}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate">{lesson.studentName}</h4>
        <p className="text-xs text-muted-foreground truncate">{lesson.subject}</p>
      </div>
      
      <div className="flex flex-col items-end">
        <div className="flex items-center gap-1 text-xs font-medium">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span>{lesson.time}</span>
        </div>
        <div className={cn(
          "flex items-center gap-1 text-xs mt-1",
          getStatusColor(lesson.status)
        )}>
          {getStatusIcon(lesson.status)}
          <span className="capitalize">{lesson.status}</span>
        </div>
      </div>
    </div>
  );
};

const UpcomingLessons = ({ lessons = [], className }: UpcomingLessonsProps) => {
  const todayLessons = lessons?.filter(l => l.date === 'Today') || [];
  const tomorrowLessons = lessons?.filter(l => l.date === 'Tomorrow') || [];
  
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <span>Upcoming Lessons</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="px-6 pb-6 pt-0">
        {todayLessons.length > 0 && (
          <>
            <h3 className="text-sm font-medium mb-2">Today</h3>
            <div className="space-y-1">
              {todayLessons.map(lesson => (
                <LessonItem key={lesson.id} lesson={lesson} />
              ))}
            </div>
          </>
        )}
        
        {tomorrowLessons.length > 0 && (
          <>
            <Separator className="my-4" />
            <h3 className="text-sm font-medium mb-2">Tomorrow</h3>
            <div className="space-y-1">
              {tomorrowLessons.map(lesson => (
                <LessonItem key={lesson.id} lesson={lesson} />
              ))}
            </div>
          </>
        )}
        
        <div className="mt-6">
          <Button className="w-full gap-2">
            <CalendarDays className="h-4 w-4" />
            <span>View All Lessons</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default UpcomingLessons;
