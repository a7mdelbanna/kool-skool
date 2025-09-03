import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Clock, 
  BookOpen, 
  CheckCircle, 
  AlertCircle,
  Calendar,
  Target,
  Award
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface OverviewTabProps {
  student: any;
  sessions: any[];
  sessionDetails: any[];
  todos: any[];
  stats: any;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ 
  student, 
  sessions, 
  sessionDetails, 
  todos,
  stats 
}) => {
  // Get recent activity
  const recentSessions = sessions.slice(0, 5);
  const pendingTodos = todos.filter((t: any) => t.status === 'pending').slice(0, 5);
  const recentWords = sessionDetails
    .flatMap((d: any) => d.vocabulary || [])
    .slice(0, 10);

  // Calculate progress metrics
  const completionRate = stats.totalTodos > 0 
    ? Math.round((stats.completedTodos / stats.totalTodos) * 100) 
    : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Activity & Progress */}
      <div className="lg:col-span-2 space-y-6">
        {/* Learning Progress Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Learning Progress
            </CardTitle>
            <CardDescription>Overall performance and achievements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Homework Completion</span>
                <span className="font-medium">{completionRate}%</span>
              </div>
              <Progress value={completionRate} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Vocabulary Mastery</span>
                <span className="font-medium">0%</span>
              </div>
              <Progress value={0} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Session Attendance</span>
                <span className="font-medium">100%</span>
              </div>
              <Progress value={100} className="h-2" />
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <Award className="h-8 w-8 mx-auto text-yellow-500 mb-1" />
                <p className="text-xs text-muted-foreground">Achievements</p>
                <p className="font-bold">0</p>
              </div>
              <div className="text-center">
                <Target className="h-8 w-8 mx-auto text-blue-500 mb-1" />
                <p className="text-xs text-muted-foreground">Goals Met</p>
                <p className="font-bold">0</p>
              </div>
              <div className="text-center">
                <Clock className="h-8 w-8 mx-auto text-green-500 mb-1" />
                <p className="text-xs text-muted-foreground">Study Hours</p>
                <p className="font-bold">0</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Sessions
            </CardTitle>
            <CardDescription>Latest learning sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {recentSessions.length > 0 ? (
              <div className="space-y-3">
                {recentSessions.map((session: any, index: number) => (
                  <div key={session.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{session.topic || 'Session'}</p>
                      <p className="text-sm text-muted-foreground">
                        {session.date ? format(new Date(session.date), 'MMM dd, yyyy') : 'Date TBD'}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {session.status || 'scheduled'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No sessions yet</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Vocabulary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Recent Vocabulary
            </CardTitle>
            <CardDescription>Latest words added</CardDescription>
          </CardHeader>
          <CardContent>
            {recentWords.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {recentWords.map((word: any, index: number) => (
                  <div key={word.id || index} className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium">{word.english}</p>
                    <p className="text-sm text-muted-foreground">{word.translation}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No vocabulary yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Pending Items */}
      <div className="space-y-6">
        {/* Pending TODOs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Pending TODOs
            </CardTitle>
            <CardDescription>Tasks to complete</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingTodos.length > 0 ? (
              <div className="space-y-3">
                {pendingTodos.map((todo: any) => (
                  <div key={todo.id} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-sm">{todo.title}</p>
                      <Badge className={getPriorityColor(todo.priority)} variant="secondary">
                        {todo.priority}
                      </Badge>
                    </div>
                    {todo.description && (
                      <p className="text-xs text-muted-foreground mb-2">{todo.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <Badge className={getStatusColor(todo.status)} variant="secondary">
                        {todo.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Due: {todo.due_date ? format(new Date(todo.due_date), 'MMM dd') : 'Not set'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No pending tasks</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Sessions</span>
              <span className="font-bold">{stats.totalSessions}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Words Learned</span>
              <span className="font-bold">{stats.totalWords}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Current Streak</span>
              <span className="font-bold">{stats.currentStreak} days</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Todos Completed</span>
              <span className="font-bold">{stats.completedTodos}/{stats.totalTodos}</span>
            </div>
          </CardContent>
        </Card>

        {/* Next Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Recommended Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Review vocabulary from last session</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Complete pending homework</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Practice flashcards for 10 minutes</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OverviewTab;