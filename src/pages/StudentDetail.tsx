import React, { useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  User, 
  BookOpen, 
  Brain, 
  CheckSquare, 
  TrendingUp,
  Calendar,
  Target,
  Trophy,
  Zap,
  Mic
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { UserContext } from '@/App';
import { databaseService } from '@/services/firebase/database.service';
import { sessionDetailsService } from '@/services/firebase/sessionDetails.service';
import { todosService } from '@/services/firebase/todos.service';
import StudentHeader from '@/components/student-detail/StudentHeader';
import OverviewTab from '@/components/student-detail/OverviewTab';
import SessionsContentTab from '@/components/student-detail/SessionsContentTab';
import VocabularyBankTab from '@/components/student-detail/VocabularyBankTab';
import TodosHomeworkTab from '@/components/student-detail/TodosHomeworkTab';
import LearningProgressTab from '@/components/student-detail/LearningProgressTab';

const StudentDetail = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch student data
  const { data: student, isLoading: studentLoading } = useQuery({
    queryKey: ['student-detail', studentId],
    queryFn: async () => {
      if (!studentId) throw new Error('No student ID');
      return await databaseService.getById('students', studentId);
    },
    enabled: !!studentId
  });

  // Fetch all sessions for this student
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['student-sessions', studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const allSessions = await databaseService.query('sessions', {
        where: [{ field: 'student_id', operator: '==', value: studentId }],
        orderBy: { field: 'date', direction: 'desc' }
      });
      return allSessions || [];
    },
    enabled: !!studentId
  });

  // Fetch all session details (vocabulary, notes) for this student
  const { data: sessionDetails = [], isLoading: detailsLoading } = useQuery({
    queryKey: ['student-session-details', studentId],
    queryFn: async () => {
      if (!studentId || sessions.length === 0) return [];
      
      const details = await Promise.all(
        sessions.map(async (session: any) => {
          const detail = await sessionDetailsService.getBySessionId(session.id);
          return { ...detail, sessionDate: session.date };
        })
      );
      return details.filter(d => d !== null);
    },
    enabled: !!studentId && sessions.length > 0
  });

  // Fetch all todos for this student
  const { data: todos = [], isLoading: todosLoading } = useQuery({
    queryKey: ['student-todos', studentId],
    queryFn: async () => {
      if (!studentId) return [];
      return await todosService.getByFilters({
        student_ids: [studentId]
      });
    },
    enabled: !!studentId
  });

  // Calculate statistics
  const stats = {
    totalSessions: sessions.length,
    totalWords: sessionDetails.reduce((acc: number, detail: any) => 
      acc + (detail?.vocabulary?.length || 0), 0),
    completedTodos: todos.filter((t: any) => t.status === 'completed').length,
    totalTodos: todos.length,
    currentStreak: calculateStreak(sessions),
    masteryRate: calculateMasteryRate()
  };

  function calculateStreak(sessions: any[]): number {
    // Simple streak calculation - can be enhanced
    if (sessions.length === 0) return 0;
    
    const today = new Date();
    const lastSession = new Date(sessions[0]?.date);
    const daysDiff = Math.floor((today.getTime() - lastSession.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysDiff <= 7 ? sessions.length : 0;
  }

  function calculateMasteryRate(): number {
    // Placeholder - will be calculated from vocabulary progress
    return 0;
  }

  const handleStartPractice = () => {
    navigate(`/student/${studentId}/practice?mode=mixed`);
  };

  const handleSpeakingPractice = () => {
    navigate(`/student/${studentId}/speaking`);
  };

  if (studentLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-muted-foreground">Student not found</p>
        <Button onClick={() => navigate('/students')} className="mt-4">
          Back to Students
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/students')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Student Detail</h1>
            <p className="text-muted-foreground">
              Comprehensive view of student progress and learning
            </p>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSpeakingPractice}
            className="gap-2"
          >
            <Mic className="h-4 w-4" />
            Speaking Practice
          </Button>
          <Button
            variant="default"
            onClick={handleStartPractice}
            className="gap-2"
          >
            <Zap className="h-4 w-4" />
            Vocabulary Practice
          </Button>
        </div>
      </div>

      {/* Student Header */}
      <StudentHeader student={student} stats={stats} />

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.totalSessions}</span>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Words Learned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.totalWords}</span>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.currentStreak} days</span>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Homework Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">
                {stats.completedTodos}/{stats.totalTodos}
              </span>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="overview" className="gap-2">
            <User className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="sessions" className="gap-2">
            <Calendar className="h-4 w-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="vocabulary" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Vocabulary
          </TabsTrigger>
          <TabsTrigger value="todos" className="gap-2">
            <CheckSquare className="h-4 w-4" />
            TODOs
          </TabsTrigger>
          <TabsTrigger value="progress" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Progress
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <OverviewTab 
            student={student}
            sessions={sessions}
            sessionDetails={sessionDetails}
            todos={todos}
            stats={stats}
          />
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <SessionsContentTab
            sessions={sessions}
            sessionDetails={sessionDetails}
            todos={todos}
            isLoading={sessionsLoading || detailsLoading}
          />
        </TabsContent>

        <TabsContent value="vocabulary" className="space-y-4">
          <VocabularyBankTab
            sessionDetails={sessionDetails}
            studentId={studentId!}
            isLoading={detailsLoading}
          />
        </TabsContent>

        <TabsContent value="todos" className="space-y-4">
          <TodosHomeworkTab
            todos={todos}
            sessions={sessions}
            isLoading={todosLoading}
          />
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <LearningProgressTab
            studentId={studentId!}
            sessions={sessions}
            sessionDetails={sessionDetails}
            todos={todos}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StudentDetail;