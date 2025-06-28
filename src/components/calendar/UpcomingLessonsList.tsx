
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';

interface LessonSession {
  id: string;
  scheduled_date: string;
  duration_minutes: number;
  cost: number;
  status: string;
  student_id: string;
  subscription_id: string;
  students: {
    users: {
      first_name: string;
      last_name: string;
    };
  };
  subscriptions: {
    session_count: number;
    sessions_completed: number;
    end_date: string | null;
  };
}

const UpcomingLessonsList = () => {
  const getSchoolId = () => {
    const userData = localStorage.getItem('user');
    if (!userData) return null;
    const user = JSON.parse(userData);
    return user.schoolId;
  };

  const schoolId = getSchoolId();

  const { data: upcomingLessons = [], isLoading } = useQuery({
    queryKey: ['upcoming-lessons', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      const startDate = new Date();
      const endDate = endOfWeek(addDays(new Date(), 7));

      const { data, error } = await supabase
        .from('lesson_sessions')
        .select(`
          id,
          scheduled_date,
          duration_minutes,
          cost,
          status,
          student_id,
          subscription_id,
          students!inner(
            id,
            school_id,
            users!inner(
              first_name,
              last_name
            )
          ),
          subscriptions!inner(
            session_count,
            sessions_completed,
            end_date
          )
        `)
        .eq('students.school_id', schoolId)
        .eq('status', 'scheduled')
        .gte('scheduled_date', startDate.toISOString())
        .lte('scheduled_date', endDate.toISOString())
        .order('scheduled_date', { ascending: true })
        .limit(5);

      if (error) {
        console.error('Error fetching upcoming lessons:', error);
        throw error;
      }

      return data as LessonSession[];
    },
    enabled: !!schoolId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Lessons
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            Loading lessons...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (upcomingLessons.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Lessons
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No upcoming lessons scheduled for this week</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Upcoming Lessons ({upcomingLessons.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {upcomingLessons.map((lesson) => {
          const sessionProgress = lesson.subscriptions.sessions_completed || 0;
          const totalSessions = lesson.subscriptions.session_count;
          const progressPercentage = totalSessions > 0 ? (sessionProgress / totalSessions) * 100 : 0;

          return (
            <div key={lesson.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium">
                    {lesson.students.users.first_name} {lesson.students.users.last_name}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {format(new Date(lesson.scheduled_date), 'MMM dd, yyyy HH:mm')} • {lesson.duration_minutes} min
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    Progress: {sessionProgress}/{totalSessions} sessions ({progressPercentage.toFixed(0)}%)
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">${lesson.cost}</div>
                <Badge variant="outline" className="text-xs">
                  {lesson.status}
                </Badge>
              </div>
            </div>
          );
        })}
        <div className="pt-2">
          <Button variant="outline" className="w-full">
            View All Lessons
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default UpcomingLessonsList;
