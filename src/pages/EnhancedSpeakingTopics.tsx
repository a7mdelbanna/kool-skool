import React, { useState, useContext, useEffect } from 'react';
import { UserContext } from '@/App';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  BookOpen,
  MessageSquare,
  Users,
  BarChart3,
  Settings,
  Brain,
  Mic,
  FileText,
  Award,
  Clock,
  Loader2
} from 'lucide-react';
import EnhancedTopicBuilder from '@/components/speaking/EnhancedTopicBuilder';
import SpeakingPracticeHub from '@/components/speaking/SpeakingPracticeHub';
import TeacherFeedbackPanel from '@/components/speaking/TeacherFeedbackPanel';
import UnifiedDictionary from '@/components/dictionary/UnifiedDictionary';
import SpeakingTopics from './SpeakingTopics'; // Original component for reference
import { speakingPracticeService } from '@/services/firebase/speakingPractice.service';
import { studentDictionaryService } from '@/services/firebase/studentDictionary.service';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface Stats {
  activeTopics: number;
  enrolledStudents: number;
  sessionsToday: number;
  aiUsagePercent: number;
}

interface RecentSession {
  id: string;
  studentName: string;
  topicName: string;
  status: string;
  startTime: Date;
}

export default function EnhancedSpeakingTopics() {
  const { user } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState('overview');
  const [showTopicBuilder, setShowTopicBuilder] = useState(false);
  const [selectedSessionForFeedback, setSelectedSessionForFeedback] = useState<string | null>(null);
  const [selectedStudentForHub, setSelectedStudentForHub] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    activeTopics: 0,
    enrolledStudents: 0,
    sessionsToday: 0,
    aiUsagePercent: 0
  });
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [allSessions, setAllSessions] = useState<any[]>([]);

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
  const isStudent = user?.role === 'student';

  // Load stats and recent data
  useEffect(() => {
    if (!isStudent) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get all topics
      const topicsQuery = query(
        collection(db, 'speaking_topics'),
        where('created_by', '==', user.id)
      );
      const topicsSnapshot = await getDocs(topicsQuery);
      const activeTopicsCount = topicsSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.status === 'published';
      }).length;

      // Get all assignments to count enrolled students
      const assignmentsQuery = query(
        collection(db, 'speaking_assignments')
      );
      const assignmentsSnapshot = await getDocs(assignmentsQuery);
      const uniqueStudents = new Set(assignmentsSnapshot.docs.map(doc => doc.data().student_id));

      // Get today's sessions
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const sessionsQuery = query(
        collection(db, 'conversation_sessions'),
        where('start_time', '>=', Timestamp.fromDate(today)),
        where('start_time', '<', Timestamp.fromDate(tomorrow))
      );
      const sessionsSnapshot = await getDocs(sessionsQuery);

      // Get recent sessions for activity feed
      const recentSessionsQuery = query(
        collection(db, 'conversation_sessions')
      );
      const recentSnapshot = await getDocs(recentSessionsQuery);

      // Sort client-side
      const sortedRecentDocs = recentSnapshot.docs.sort((a, b) => {
        const aTime = a.data().start_time?.toMillis() || 0;
        const bTime = b.data().start_time?.toMillis() || 0;
        return bTime - aTime;
      }).slice(0, 5);

      const recentSessionsData: RecentSession[] = await Promise.all(
        sortedRecentDocs.map(async (doc) => {
          const data = doc.data();

          // Get student name
          let studentName = 'Unknown Student';
          try {
            const studentDoc = await getDocs(query(
              collection(db, 'users'),
              limit(1)
            ));
            // For now, use a simple approach - in production you'd fetch by ID directly
            if (data.student_id) {
              studentName = `Student ${data.student_id.slice(-4)}`; // Use last 4 chars of ID
            }
          } catch (err) {
            console.error('Error fetching student:', err);
          }

          return {
            id: doc.id,
            studentName,
            topicName: data.topic_name || 'Unknown Topic',
            status: data.status || 'in_progress',
            startTime: data.start_time?.toDate() || new Date()
          };
        })
      );

      // Calculate AI usage percentage
      const aiSessions = sessionsSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.conversation_history?.some((turn: any) => turn.is_ai);
      }).length;
      const aiUsagePercent = sessionsSnapshot.size > 0
        ? Math.round((aiSessions / sessionsSnapshot.size) * 100)
        : 0;

      // Get all sessions for sessions tab
      const allSessionsQuery = query(
        collection(db, 'conversation_sessions')
      );
      const allSessionsSnapshot = await getDocs(allSessionsQuery);

      // Sort client-side and limit
      const sortedAllDocs = allSessionsSnapshot.docs.sort((a, b) => {
        const aTime = a.data().start_time?.toMillis() || 0;
        const bTime = b.data().start_time?.toMillis() || 0;
        return bTime - aTime;
      }).slice(0, 20);
      const allSessionsData = await Promise.all(
        sortedAllDocs.map(async (doc) => {
          const data = doc.data();

          // Get student info
          let studentInfo = { name: 'Unknown Student', id: data.student_id };
          try {
            // For now, use a simple approach - in production you'd fetch by ID directly
            if (data.student_id) {
              studentInfo = {
                name: `Student ${data.student_id.slice(-4)}`, // Use last 4 chars of ID
                id: data.student_id
              };
            }
          } catch (err) {
            console.error('Error fetching student:', err);
          }

          return {
            id: doc.id,
            ...data,
            studentInfo,
            startTime: data.start_time?.toDate() || new Date(),
            endTime: data.end_time?.toDate()
          };
        })
      );

      setStats({
        activeTopics: activeTopicsCount,
        enrolledStudents: uniqueStudents.size,
        sessionsToday: sessionsSnapshot.size,
        aiUsagePercent
      });
      setRecentSessions(recentSessionsData);
      setAllSessions(allSessionsData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // For students, show their practice hub directly
  if (isStudent) {
    return <SpeakingPracticeHub studentId={user.id} studentName={user.firstName} />;
  }

  // For teachers/admins, show the management interface
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Enhanced Speaking Practice</h1>
        <p className="text-muted-foreground">
          AI-powered speaking practice with comprehensive feedback and vocabulary tracking
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                {loading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <p className="text-2xl font-bold">{stats.activeTopics}</p>
                )}
                <p className="text-xs text-muted-foreground">Active Topics</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                {loading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <p className="text-2xl font-bold">{stats.enrolledStudents}</p>
                )}
                <p className="text-xs text-muted-foreground">Students Enrolled</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                {loading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <p className="text-2xl font-bold">{stats.sessionsToday}</p>
                )}
                <p className="text-xs text-muted-foreground">Sessions Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Brain className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                {loading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <p className="text-2xl font-bold">{stats.aiUsagePercent}%</p>
                )}
                <p className="text-xs text-muted-foreground">AI Usage</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="topics">Topics</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="dictionary">Dictionary</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Manage your speaking practice module</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => setShowTopicBuilder(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Topic
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => setActiveTab('sessions')}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Review Sessions
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => setActiveTab('dictionary')}
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Manage Dictionary
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => setActiveTab('analytics')}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Analytics
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest speaking practice sessions</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : recentSessions.length > 0 ? (
                  <div className="space-y-3">
                    {recentSessions.slice(0, 3).map((session) => (
                      <div key={session.id} className="flex items-center justify-between p-2 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Mic className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {session.studentName} - {session.topicName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {getTimeAgo(session.startTime)}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            session.status === 'completed' ? 'text-green-600 border-green-600' :
                            session.status === 'in_progress' ? 'text-blue-600 border-blue-600' :
                            'text-gray-600 border-gray-600'
                          }`}
                        >
                          {session.status === 'in_progress' ? 'In Progress' :
                           session.status === 'completed' ? 'Completed' :
                           session.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No recent sessions</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Features Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Module Features</CardTitle>
              <CardDescription>What makes our speaking practice special</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-primary" />
                    <h3 className="font-medium">AI-Powered Conversations</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    GPT-4 powered conversations with natural language understanding and generation
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Mic className="w-5 h-5 text-primary" />
                    <h3 className="font-medium">Voice Recognition</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Whisper API for accurate transcription and pronunciation assessment
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary" />
                    <h3 className="font-medium">Comprehensive Feedback</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Detailed feedback on grammar, vocabulary, fluency, and pronunciation
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Topics Tab - Show original component */}
        <TabsContent value="topics">
          {showTopicBuilder ? (
            <div>
              <Button 
                variant="outline" 
                className="mb-4"
                onClick={() => setShowTopicBuilder(false)}
              >
                ← Back to Topics
              </Button>
              <EnhancedTopicBuilder
                teacherId={user?.id || ''}
                onSuccess={() => {
                  setShowTopicBuilder(false);
                  // Refresh topics list
                }}
              />
            </div>
          ) : (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <h2 className="text-xl font-semibold">Speaking Topics Management</h2>
                <Button onClick={() => setShowTopicBuilder(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Enhanced Topic
                </Button>
              </div>
              <SpeakingTopics />
            </div>
          )}
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions">
          {selectedSessionForFeedback ? (
            <div>
              <Button 
                variant="outline" 
                className="mb-4"
                onClick={() => setSelectedSessionForFeedback(null)}
              >
                ← Back to Sessions
              </Button>
              <TeacherFeedbackPanel
                sessionId={selectedSessionForFeedback}
                studentId={allSessions.find(s => s.id === selectedSessionForFeedback)?.studentInfo.id || ''}
                teacherId={user?.id || ''}
                onComplete={() => {
                  setSelectedSessionForFeedback(null);
                  loadDashboardData(); // Refresh data
                }}
              />
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Recent Sessions</CardTitle>
                <CardDescription>Review and provide feedback on student sessions</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : allSessions.length > 0 ? (
                  <div className="space-y-3">
                    {allSessions.map((session) => (
                      <div
                        key={session.id}
                        className="p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedSessionForFeedback(session.id);
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <p className="font-medium">{session.studentInfo.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {session.topic_name || 'Unknown Topic'}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {new Date(session.startTime).toLocaleString()}
                              {session.endTime && (
                                <span className="ml-2">
                                  • Duration: {Math.round((session.endTime - session.startTime) / 60000)} min
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                session.status === 'completed' ? 'text-green-600 border-green-600' :
                                session.status === 'in_progress' ? 'text-blue-600 border-blue-600' :
                                'text-gray-600 border-gray-600'
                              }`}
                            >
                              {session.status}
                            </Badge>
                            {session.teacher_feedback && (
                              <Badge className="text-xs bg-green-100 text-green-700">
                                Reviewed
                              </Badge>
                            )}
                          </div>
                        </div>
                        {session.performance_metrics && (
                          <div className="mt-3 flex items-center gap-4 text-xs">
                            <span>Turns: {session.conversation_history?.length || 0}</span>
                            {session.performance_metrics.average_accuracy_score && (
                              <span>Accuracy: {Math.round(session.performance_metrics.average_accuracy_score)}%</span>
                            )}
                            {session.performance_metrics.vocabulary_learned?.length > 0 && (
                              <span>Words: {session.performance_metrics.vocabulary_learned.length}</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No sessions yet</p>
                    <p className="text-sm mt-2">Students' speaking practice sessions will be listed for review</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Dictionary Tab */}
        <TabsContent value="dictionary">
          <Card>
            <CardHeader>
              <CardTitle>Student Dictionaries</CardTitle>
              <CardDescription>View unified vocabulary from all sources</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Select a student to view their dictionary:
                </p>
                {/* You would need to add a student selector here */}
                <UnifiedDictionary 
                  studentId={user?.id || ''} 
                  isTeacher={true}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Analytics Dashboard</CardTitle>
              <CardDescription>Speaking practice performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Analytics dashboard coming soon</p>
                <p className="text-sm mt-2">Track student progress and engagement metrics</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper function to get relative time
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + ' years ago';

  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + ' months ago';

  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' days ago';

  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' hours ago';

  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' minutes ago';

  return Math.floor(seconds) + ' seconds ago';
}