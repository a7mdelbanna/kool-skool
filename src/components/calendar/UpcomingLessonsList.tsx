
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, BookOpen } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserInfo } from '@/integrations/supabase/client';

interface LessonSession {
  id: string;
  scheduled_date: string;
  duration_minutes: number;
  status: string;
  cost: number;
  notes?: string;
  student: {
    id: string;
    user_id: string;
    users: {
      first_name: string;
      last_name: string;
    };
  };
  subscription: {
    id: string;
    session_count: number;
    sessions_completed: number;
    end_date?: string;
  };
}

const UpcomingLessonsList = () => {
  // Fetch user info
  const { data: userInfo } = useQuery({
    queryKey: ['current-user-info'],
    queryFn: getCurrentUserInfo,
  });

  // Fetch upcoming lessons
  const { data: upcomingLessons = [], isLoading } = useQuery({
    queryKey: ['upcoming-lessons', userInfo?.[0]?.user_school_id],
    queryFn: async () => {
      if (!userInfo?.[0]?.user_school_id) return [];
      
      const nextWeek = addDays(new Date(), 7);
      
      const { data, error } = await supabase
        .from('lesson_sessions')
        .select(`
          id,
          scheduled_date,
          duration_minutes,
          status,
          cost,
          notes,
          student:students(
            id,
            user_id,
            users(first_name, last_name)
          ),
          subscription:subscriptions(
            id,
            session_count,
            sessions_completed,
            end_date
          )
        `)
        .eq('students.school_id', userInfo[0].user_school_id)
        .gte('scheduled_date', new Date().toISOString())
        .lte('scheduled_date', nextWeek.toISOString())
        .eq('status', 'scheduled')
        .order('scheduled_date', { ascending: true })
        .limit(5);

      if (error) throw error;
      return data as LessonSession[];
    },
    enabled: !!userInfo?.[0]?.user_school_id,
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
          <p className="text-muted-foreground">Loading upcoming lessons...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Upcoming Lessons
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {upcomingLessons.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No upcoming lessons scheduled
          </p>
        ) : (
          upcomingLessons.map((lesson) => (
            <div
              key={lesson.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">
                    {lesson.student?.users?.first_name} {lesson.student?.users?.last_name}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {format(new Date(lesson.scheduled_date), 'MMM dd, h:mm a')}
                    <span>• {lesson.duration_minutes} min</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium">${lesson.cost}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {lesson.subscription?.sessions_completed || 0}/{lesson.subscription?.session_count || 0} sessions
                  </Badge>
                  {lesson.subscription?.end_date && (
                    <Badge variant="secondary" className="text-xs">
                      Ends {format(new Date(lesson.subscription.end_date), 'MMM dd')}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        {upcomingLessons.length > 0 && (
          <Button variant="outline" className="w-full">
            <BookOpen className="h-4 w-4 mr-2" />
            View All Lessons
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default UpcomingLessonsList;
