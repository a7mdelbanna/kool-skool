import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  User, 
  BookOpen,
  FileText,
  Paperclip,
  CheckSquare,
  Save
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

import SessionOverview from '@/components/session-details/SessionOverview';
import SessionTodos from '@/components/session-details/SessionTodos';
import SessionVocabulary from '@/components/session-details/SessionVocabulary';
import SessionAttachments from '@/components/session-details/SessionAttachments';

import { sessionDetailsService, SessionDetails } from '@/services/firebase/sessionDetails.service';
import { todosService } from '@/services/firebase/todos.service';
import { studentsService } from '@/services/firebase/students.service';
import { supabase } from '@/integrations/supabase/client';

interface SessionInfo {
  id: string;
  scheduled_date: string;
  duration_minutes: number;
  status: string;
  student_id: string;
  subscription_id: string;
  student_name?: string;
  course_name?: string;
  level?: string;
  teacher_id?: string;
  teacher_name?: string;
}

const SessionDetailsPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [sessionDetails, setSessionDetails] = useState<SessionDetails | null>(null);
  const [isNewDetails, setIsNewDetails] = useState(false);
  
  const [todos, setTodos] = useState<any[]>([]);
  const [todoStats, setTodoStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    overdue: 0
  });

  useEffect(() => {
    if (sessionId) {
      loadSessionData();
    }
  }, [sessionId]);

  const loadSessionData = async () => {
    try {
      setLoading(true);
      
      // Load session info from Supabase
      const { data: sessionData, error: sessionError } = await supabase
        .from('lesson_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      
      if (sessionError) {
        console.error('Error loading session:', sessionError);
        toast.error('Failed to load session information');
        return;
      }
      
      // Load student data from Firebase
      let studentName = 'Unknown';
      let courseName = '';
      let level = '';
      let teacherId = '';
      let teacherName = '';
      
      if (sessionData.student_id) {
        const studentData = await studentsService.getById(sessionData.student_id);
        if (studentData) {
          studentName = `${studentData.firstName} ${studentData.lastName}`;
          courseName = studentData.courseName || '';
          level = studentData.level || '';
          teacherId = studentData.teacherId || '';
          
          // Get teacher name if available
          if (studentData.teacherId) {
            const { data: teacherData } = await supabase
              .from('users')
              .select('first_name, last_name')
              .eq('id', studentData.teacherId)
              .single();
            
            if (teacherData) {
              teacherName = `${teacherData.first_name} ${teacherData.last_name}`;
            }
          }
        }
      }
      
      // Format session info
      const sessionInfoData: SessionInfo = {
        id: sessionData.id,
        scheduled_date: sessionData.scheduled_date,
        duration_minutes: sessionData.duration_minutes,
        status: sessionData.status,
        student_id: sessionData.student_id,
        subscription_id: sessionData.subscription_id,
        student_name: studentName,
        course_name: courseName,
        level: level,
        teacher_id: teacherId,
        teacher_name: teacherName
      };
      
      setSessionInfo(sessionInfoData);
      
      // Load session details from Firebase
      const details = await sessionDetailsService.getBySessionId(sessionId!);
      if (details) {
        setSessionDetails(details);
        setIsNewDetails(false);
      } else {
        // Create empty details structure
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        setSessionDetails({
          session_id: sessionId!,
          teacher_id: userData.id || '',
          student_id: sessionInfoData.student_id,
          topic: '',
          notes: '',
          vocabulary: [],
          attachments: []
        });
        setIsNewDetails(true);
      }
      
      // Load TODOs for this session
      const sessionTodos = await todosService.getBySessionId(sessionId!);
      setTodos(sessionTodos);
      
      // Calculate TODO stats
      const now = new Date();
      const stats = {
        total: sessionTodos.length,
        completed: sessionTodos.filter(t => t.status === 'completed').length,
        pending: sessionTodos.filter(t => t.status === 'pending').length,
        overdue: sessionTodos.filter(t => 
          t.status !== 'completed' && new Date(t.due_date) < now
        ).length
      };
      setTodoStats(stats);
      
    } catch (error) {
      console.error('Error loading session data:', error);
      toast.error('Failed to load session details');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDetails = async () => {
    if (!sessionDetails) return;
    
    try {
      setSaving(true);
      
      if (isNewDetails) {
        // Create new details
        const detailsId = await sessionDetailsService.create(sessionDetails);
        setSessionDetails({ ...sessionDetails, id: detailsId });
        setIsNewDetails(false);
        toast.success('Session details created successfully');
      } else if (sessionDetails.id) {
        // Update existing details
        const { id, ...updates } = sessionDetails;
        await sessionDetailsService.update(id, updates);
        toast.success('Session details updated successfully');
      }
    } catch (error) {
      console.error('Error saving session details:', error);
      toast.error('Failed to save session details');
    } finally {
      setSaving(false);
    }
  };

  const updateSessionDetails = (updates: Partial<SessionDetails>) => {
    setSessionDetails(prev => prev ? { ...prev, ...updates } : null);
  };

  const handleTodoAdded = (newTodo: any) => {
    setTodos(prev => [...prev, newTodo]);
    setTodoStats(prev => ({
      ...prev,
      total: prev.total + 1,
      pending: prev.pending + 1
    }));
  };

  const handleTodoUpdated = (updatedTodo: any) => {
    setTodos(prev => prev.map(t => 
      t.id === updatedTodo.id ? updatedTodo : t
    ));
    // Recalculate stats
    loadSessionData();
  };

  const handleTodoDeleted = (todoId: string) => {
    setTodos(prev => prev.filter(t => t.id !== todoId));
    // Recalculate stats
    loadSessionData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!sessionInfo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-semibold mb-4">Session not found</h2>
        <Button onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Session Details</h1>
          </div>
          <Button
            onClick={handleSaveDetails}
            disabled={saving || !sessionDetails}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        {/* Session Info Card */}
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Student</p>
                <p className="font-medium">{sessionInfo.student_name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Course</p>
                <div className="font-medium flex items-center gap-2">
                  <span>{sessionInfo.course_name}</span>
                  {sessionInfo.level && (
                    <Badge variant="outline">
                      {sessionInfo.level}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium">
                  {format(new Date(sessionInfo.scheduled_date), 'PPP')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="font-medium">{sessionInfo.duration_minutes} minutes</p>
              </div>
            </div>
          </div>

          {/* TODO Stats */}
          {todoStats.total > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="font-medium">{todoStats.completed}</span>
                    <span className="text-muted-foreground">/{todoStats.total} completed</span>
                  </span>
                </div>
                {todoStats.pending > 0 && (
                  <Badge variant="secondary">
                    {todoStats.pending} pending
                  </Badge>
                )}
                {todoStats.overdue > 0 && (
                  <Badge variant="destructive">
                    {todoStats.overdue} overdue
                  </Badge>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <FileText className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="todos">
            <CheckSquare className="h-4 w-4 mr-2" />
            TODOs
            {todoStats.total > 0 && (
              <Badge variant="secondary" className="ml-2">
                {todoStats.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="vocabulary">
            <BookOpen className="h-4 w-4 mr-2" />
            Vocabulary
          </TabsTrigger>
          <TabsTrigger value="attachments">
            <Paperclip className="h-4 w-4 mr-2" />
            Attachments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <SessionOverview
            details={sessionDetails}
            onUpdate={updateSessionDetails}
          />
        </TabsContent>

        <TabsContent value="todos">
          <SessionTodos
            sessionId={sessionId!}
            studentId={sessionInfo.student_id}
            teacherId={sessionInfo.teacher_id || ''}
            todos={todos}
            onTodoAdded={handleTodoAdded}
            onTodoUpdated={handleTodoUpdated}
            onTodoDeleted={handleTodoDeleted}
          />
        </TabsContent>

        <TabsContent value="vocabulary">
          <SessionVocabulary
            detailsId={sessionDetails?.id}
            vocabulary={sessionDetails?.vocabulary || []}
            onVocabularyUpdate={(vocabulary) => updateSessionDetails({ vocabulary })}
          />
        </TabsContent>

        <TabsContent value="attachments">
          <SessionAttachments
            sessionId={sessionId!}
            detailsId={sessionDetails?.id}
            attachments={sessionDetails?.attachments || []}
            onAttachmentsUpdate={(attachments) => updateSessionDetails({ attachments })}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SessionDetailsPage;