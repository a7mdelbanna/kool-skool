
import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  User,
  BookOpen,
  Plus 
} from 'lucide-react';
import { format, addDays, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Sample data for demonstration
const lessons = [
  {
    id: '1',
    studentName: 'Alex Johnson',
    studentImage: '',
    subject: 'Mathematics',
    date: new Date(2024, 5, 17, 14, 0), // June 17, 2024, 2 PM
    duration: 60, // minutes
  },
  {
    id: '2',
    studentName: 'Sophia Chen',
    studentImage: '',
    subject: 'Science',
    date: new Date(2024, 5, 18, 15, 0), // June 18, 2024, 3 PM
    duration: 60,
  },
  {
    id: '3',
    studentName: 'Michael Davis',
    studentImage: '',
    subject: 'English',
    date: new Date(2024, 5, 19, 16, 0), // June 19, 2024, 4 PM
    duration: 90,
  },
  {
    id: '4',
    studentName: 'Emma Wilson',
    studentImage: '',
    subject: 'Physics',
    date: new Date(2024, 5, 17, 16, 0), // June 17, 2024, 4 PM
    duration: 60,
  },
  {
    id: '5',
    studentName: 'Noah Martinez',
    studentImage: '',
    subject: 'Chemistry',
    date: new Date(2024, 5, 20, 13, 0), // June 20, 2024, 1 PM
    duration: 60,
  },
  {
    id: '6',
    studentName: 'Olivia Brown',
    studentImage: '',
    subject: 'Biology',
    date: new Date(2024, 5, 21, 10, 0), // June 21, 2024, 10 AM
    duration: 60,
  },
];

// Constants
const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const Calendar = () => {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(today);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(today, { weekStartsOn: 0 }));

  const goToPreviousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const goToToday = () => {
    setCurrentDate(today);
    setCurrentWeekStart(startOfWeek(today, { weekStartsOn: 0 }));
  };

  // Generate array of days for the current week
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  // Get lessons for a specific day and hour
  const getLessonsForTimeSlot = (day: Date, hour: number) => {
    return lessons.filter(lesson => {
      const lessonDate = lesson.date;
      return (
        lessonDate.getDate() === day.getDate() &&
        lessonDate.getMonth() === day.getMonth() &&
        lessonDate.getFullYear() === day.getFullYear() &&
        lessonDate.getHours() === hour
      );
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground mt-1">Manage your lessons and schedule</p>
        </div>

        <div className="flex gap-2">
          <Button onClick={goToToday} variant="outline" className="gap-2">
            <CalendarIcon className="h-4 w-4" />
            <span>Today</span>
          </Button>
          <Button onClick={goToPreviousWeek} variant="outline" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button onClick={goToNextWeek} variant="outline" size="icon">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            <span>New Lesson</span>
          </Button>
        </div>
      </div>

      <div className="text-center">
        <h3 className="text-lg font-medium">
          {format(weekDays[0], 'MMMM yyyy')}
        </h3>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Week day headers */}
          <div className="grid grid-cols-8 gap-2">
            <div className="p-2 text-center border-b"></div>
            {weekDays.map((day, index) => (
              <div 
                key={index} 
                className={cn(
                  "p-2 text-center font-medium border-b",
                  format(day, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd') ? 
                    "bg-primary text-primary-foreground rounded-t-lg" : 
                    ""
                )}
              >
                <div>{DAYS[day.getDay()].substring(0, 3)}</div>
                <div className="text-lg">{format(day, 'd')}</div>
              </div>
            ))}
          </div>

          {/* Time grid */}
          <div className="grid grid-cols-8 gap-2">
            {HOURS.map((hour) => (
              <React.Fragment key={hour}>
                {/* Time column */}
                <div className="p-2 text-center text-muted-foreground text-sm border-r">
                  {hour % 12 === 0 ? 12 : hour % 12} {hour < 12 ? 'AM' : 'PM'}
                </div>

                {/* Day columns */}
                {weekDays.map((day, dayIndex) => {
                  const lessonsInTimeSlot = getLessonsForTimeSlot(day, hour);
                  
                  return (
                    <div 
                      key={dayIndex} 
                      className="p-2 border border-dashed min-h-[80px] relative"
                    >
                      {lessonsInTimeSlot.map((lesson) => (
                        <Card key={lesson.id} className="glass glass-hover cursor-pointer">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={lesson.studentImage} alt={lesson.studentName} />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {lesson.studentName.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <h5 className="text-sm font-medium truncate">
                                  {lesson.studentName}
                                </h5>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{lesson.duration} min</span>
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {lesson.subject}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
