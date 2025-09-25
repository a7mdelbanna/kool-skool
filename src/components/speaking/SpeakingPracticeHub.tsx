import React, { useState, useEffect } from 'react';
import {
  Mic,
  BookOpen,
  Target,
  Trophy,
  Clock,
  Calendar,
  ChevronRight,
  Play,
  BarChart3,
  Award,
  Zap,
  TrendingUp,
  Users,
  Star,
  MessageSquare,
  Brain,
  Headphones,
  FileText,
  Filter,
  Search,
  Grid,
  List,
  Layers,
  ArrowUpRight,
  CheckCircle,
  AlertCircle,
  PauseCircle,
  Lock,
  Unlock,
  BookMarked,
  GraduationCap,
  Timer,
  Volume2,
  Bot,
  Globe
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { speakingPracticeService } from '@/services/firebase/speakingPractice.service';
import { studentDictionaryService } from '@/services/firebase/studentDictionary.service';
import StudentConversation from './StudentConversation';
import UnifiedDictionary from '../dictionary/UnifiedDictionary';
import type {
  SpeakingTopic,
  ConversationSession,
  StudentAssignment
} from '@/services/firebase/speakingPractice.service';
import type { DictionaryStats } from '@/services/firebase/studentDictionary.service';

interface SpeakingPracticeHubProps {
  studentId: string;
  studentName?: string;
  studentAvatar?: string;
}

interface TopicWithProgress extends SpeakingTopic {
  assignment?: StudentAssignment;
  completedSessions: number;
  totalSessions: number;
  averageScore: number;
  lastPracticed?: Date;
  isLocked?: boolean;
}

interface SessionWithDetails extends ConversationSession {
  topic?: SpeakingTopic;
}

export default function SpeakingPracticeHub({
  studentId,
  studentName = 'Student',
  studentAvatar
}: SpeakingPracticeHubProps) {
  // State
  const [assignedTopics, setAssignedTopics] = useState<TopicWithProgress[]>([]);
  const [recentSessions, setRecentSessions] = useState<SessionWithDetails[]>([]);
  const [dictionaryStats, setDictionaryStats] = useState<DictionaryStats | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<SpeakingTopic | null>(null);
  const [selectedSession, setSelectedSession] = useState<ConversationSession | null>(null);
  const [showConversation, setShowConversation] = useState(false);
  const [showDictionary, setShowDictionary] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState('overview');

  // Statistics
  const [stats, setStats] = useState({
    totalPracticeTime: 0,
    sessionsCompleted: 0,
    wordsLearned: 0,
    averageAccuracy: 0,
    currentStreak: 0,
    weeklyGoal: 5,
    weeklyProgress: 0
  });

  // Load data
  useEffect(() => {
    loadHubData();
  }, [studentId]);

  const loadHubData = async () => {
    setLoading(true);
    try {
      // Load assigned topics
      const assignments = await speakingPracticeService.getStudentAssignments(studentId);
      const topicsWithProgress = await Promise.all(
        assignments.map(async (assignment) => {
          const topic = await speakingPracticeService.getTopic(assignment.topic_id);
          const sessions = await speakingPracticeService.getSessionsByTopic(
            studentId,
            assignment.topic_id
          );

          const completedSessions = sessions.filter(s => s.status === 'completed');
          const scores = completedSessions
            .map(s => s.performance_metrics?.average_accuracy_score || 0)
            .filter(s => s > 0);

          const topicWithProgress: TopicWithProgress = {
            ...topic!,
            assignment,
            completedSessions: completedSessions.length,
            totalSessions: assignment.target_sessions || 5,
            averageScore: scores.length > 0
              ? scores.reduce((a, b) => a + b, 0) / scores.length
              : 0,
            lastPracticed: completedSessions.length > 0
              ? completedSessions[0].end_time
              : undefined,
            isLocked: assignment.unlock_after
              ? new Date() < new Date(assignment.unlock_after)
              : false
          };

          return topicWithProgress;
        })
      );

      setAssignedTopics(topicsWithProgress);

      // Load recent sessions
      const sessions = await speakingPracticeService.getStudentSessions(studentId, 10);
      const sessionsWithDetails = await Promise.all(
        sessions.map(async (session) => {
          const topic = await speakingPracticeService.getTopic(session.topic_id);
          return { ...session, topic };
        })
      );
      setRecentSessions(sessionsWithDetails);

      // Load dictionary stats
      const dictStats = await studentDictionaryService.getStats(studentId);
      setDictionaryStats(dictStats);

      // Calculate overall stats
      calculateStats(topicsWithProgress, sessions);
    } catch (error) {
      console.error('Error loading hub data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (
    topics: TopicWithProgress[],
    sessions: ConversationSession[]
  ) => {
    const completedSessions = sessions.filter(s => s.status === 'completed');
    const totalTime = completedSessions.reduce(
      (sum, s) => sum + (s.performance_metrics?.duration_seconds || 0),
      0
    );
    const scores = completedSessions
      .map(s => s.performance_metrics?.average_accuracy_score || 0)
      .filter(s => s > 0);

    // Calculate weekly progress
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekSessions = completedSessions.filter(
      s => s.end_time && s.end_time >= weekStart
    );

    // Calculate streak
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let checkDate = new Date(today);

    while (true) {
      const daysSessions = completedSessions.filter(s => {
        if (!s.end_time) return false;
        const sessionDate = new Date(s.end_time);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === checkDate.getTime();
      });

      if (daysSessions.length > 0) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    setStats({
      totalPracticeTime: Math.round(totalTime / 60), // Convert to minutes
      sessionsCompleted: completedSessions.length,
      wordsLearned: dictionaryStats?.total_words || 0,
      averageAccuracy: scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0,
      currentStreak: streak,
      weeklyGoal: 5,
      weeklyProgress: weekSessions.length
    });
  };

  const startPractice = (topic: SpeakingTopic) => {
    setSelectedTopic(topic);
    setSelectedSession(null);
    setShowConversation(true);
  };

  const resumeSession = (session: ConversationSession) => {
    setSelectedSession(session);
    setSelectedTopic(null);
    setShowConversation(true);
  };

  const getTopicIcon = (category?: string) => {
    switch (category) {
      case 'business': return <Target className="w-4 h-4" />;
      case 'travel': return <Globe className="w-4 h-4" />;
      case 'daily': return <MessageSquare className="w-4 h-4" />;
      case 'academic': return <GraduationCap className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-500 bg-green-50 border-green-200';
      case 'in_progress': return 'text-blue-500 bg-blue-50 border-blue-200';
      case 'abandoned': return 'text-gray-500 bg-gray-50 border-gray-200';
      default: return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <PauseCircle className="w-4 h-4" />;
      case 'abandoned': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const filteredTopics = assignedTopics.filter(topic => {
    if (searchQuery && !topic.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filterLevel !== 'all' && topic.english_level !== filterLevel) {
      return false;
    }
    if (filterStatus === 'completed' && topic.completedSessions < topic.totalSessions) {
      return false;
    }
    if (filterStatus === 'in_progress' &&
      (topic.completedSessions === 0 || topic.completedSessions >= topic.totalSessions)) {
      return false;
    }
    if (filterStatus === 'not_started' && topic.completedSessions > 0) {
      return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading your speaking practice hub...</p>
      </div>
    );
  }

  if (showConversation && (selectedTopic || selectedSession)) {
    return (
      <>
        <div className="mb-4">
          <Button
            variant="outline"
            onClick={() => {
              setShowConversation(false);
              setSelectedTopic(null);
              setSelectedSession(null);
              loadHubData();
            }}
          >
            ← Back to Hub
          </Button>
        </div>
        <StudentConversation
          studentId={studentId}
          topicId={selectedTopic?.id || selectedSession?.topic_id || ''}
          sessionId={selectedSession?.id}
          onComplete={() => {
            setShowConversation(false);
            setSelectedTopic(null);
            setSelectedSession(null);
            loadHubData();
          }}
        />
      </>
    );
  }

  if (showDictionary) {
    return (
      <>
        <div className="mb-4">
          <Button
            variant="outline"
            onClick={() => setShowDictionary(false)}
          >
            ← Back to Hub
          </Button>
        </div>
        <UnifiedDictionary studentId={studentId} />
      </>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={studentAvatar} />
            <AvatarFallback>{studentName[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">Speaking Practice Hub</h1>
            <p className="text-muted-foreground">Welcome back, {studentName}!</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1">
            <Zap className="w-4 h-4 mr-1 text-orange-500" />
            {stats.currentStreak} day streak
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            <Trophy className="w-4 h-4 mr-1 text-yellow-500" />
            Level {Math.floor(stats.sessionsCompleted / 10) + 1}
          </Badge>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-6 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Practice Time</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalPracticeTime}m</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Sessions</span>
            </div>
            <p className="text-2xl font-bold">{stats.sessionsCompleted}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BookMarked className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Words</span>
            </div>
            <p className="text-2xl font-bold">{stats.wordsLearned}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Accuracy</span>
            </div>
            <p className="text-2xl font-bold">{stats.averageAccuracy}%</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-muted-foreground">Weekly Goal</span>
              </div>
              <span className="text-sm font-medium">
                {stats.weeklyProgress} / {stats.weeklyGoal}
              </span>
            </div>
            <Progress
              value={(stats.weeklyProgress / stats.weeklyGoal) * 100}
              className="h-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="topics">Topics</TabsTrigger>
          <TabsTrigger value="sessions">Recent Sessions</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Jump right into practice</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {/* Continue Last Session */}
                {recentSessions.find(s => s.status === 'in_progress') && (
                  <Card className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => resumeSession(recentSessions.find(s => s.status === 'in_progress')!)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="font-medium">Continue Session</p>
                          <p className="text-sm text-muted-foreground">
                            {recentSessions.find(s => s.status === 'in_progress')?.topic_name}
                          </p>
                        </div>
                        <Play className="w-5 h-5 text-primary" />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recommended Topic */}
                {assignedTopics.filter(t => !t.isLocked && t.completedSessions < t.totalSessions)[0] && (
                  <Card className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => startPractice(
                      assignedTopics.filter(t => !t.isLocked && t.completedSessions < t.totalSessions)[0]
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="font-medium">Recommended</p>
                          <p className="text-sm text-muted-foreground">
                            {assignedTopics.filter(t => !t.isLocked && t.completedSessions < t.totalSessions)[0].name}
                          </p>
                        </div>
                        <Star className="w-5 h-5 text-yellow-500" />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* View Dictionary */}
                <Card className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setShowDictionary(true)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">My Dictionary</p>
                        <p className="text-sm text-muted-foreground">
                          {dictionaryStats?.total_words || 0} words learned
                        </p>
                      </div>
                      <BookMarked className="w-5 h-5 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Recent Topics */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Topics</CardTitle>
              <CardDescription>Your assigned speaking topics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {assignedTopics.slice(0, 5).map((topic) => (
                  <div
                    key={topic.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => startPractice(topic)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        topic.isLocked ? "bg-gray-100" : "bg-primary/10"
                      )}>
                        {topic.isLocked ? (
                          <Lock className="w-5 h-5 text-gray-400" />
                        ) : (
                          getTopicIcon(topic.category)
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{topic.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {topic.english_level || 'B1'}
                          </Badge>
                          {topic.ai_config?.enabled && (
                            <Badge variant="outline" className="text-xs">
                              <Bot className="w-3 h-3 mr-1" />
                              AI
                            </Badge>
                          )}
                          {topic.lastPracticed && (
                            <span className="text-xs text-muted-foreground">
                              Last: {new Date(topic.lastPracticed).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {topic.completedSessions}/{topic.totalSessions}
                        </p>
                        <Progress
                          value={(topic.completedSessions / topic.totalSessions) * 100}
                          className="w-20 h-2 mt-1"
                        />
                      </div>
                      {!topic.isLocked && (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Topics Tab */}
        <TabsContent value="topics" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-2 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search topics..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterLevel} onValueChange={setFilterLevel}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="A1">A1</SelectItem>
                    <SelectItem value="A2">A2</SelectItem>
                    <SelectItem value="B1">B1</SelectItem>
                    <SelectItem value="B2">B2</SelectItem>
                    <SelectItem value="C1">C1</SelectItem>
                    <SelectItem value="C2">C2</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-1">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Topics Grid/List */}
          <ScrollArea className="h-[600px]">
            {filteredTopics.length > 0 ? (
              viewMode === 'grid' ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredTopics.map((topic) => (
                    <Card
                      key={topic.id}
                      className={cn(
                        "cursor-pointer hover:shadow-md transition-shadow",
                        topic.isLocked && "opacity-60"
                      )}
                      onClick={() => !topic.isLocked && startPractice(topic)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {getTopicIcon(topic.category)}
                            <CardTitle className="text-base">{topic.name}</CardTitle>
                          </div>
                          {topic.isLocked && <Lock className="w-4 h-4" />}
                        </div>
                        <CardDescription className="line-clamp-2 mt-2">
                          {topic.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {/* Progress */}
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Progress</span>
                              <span className="font-medium">
                                {topic.completedSessions}/{topic.totalSessions} sessions
                              </span>
                            </div>
                            <Progress
                              value={(topic.completedSessions / topic.totalSessions) * 100}
                              className="h-2"
                            />
                          </div>

                          {/* Stats */}
                          {topic.averageScore > 0 && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Average Score</span>
                              <Badge variant="outline">{Math.round(topic.averageScore)}%</Badge>
                            </div>
                          )}

                          {/* Metadata */}
                          <div className="flex gap-2 flex-wrap">
                            <Badge>{topic.english_level || 'B1'}</Badge>
                            {topic.ai_config?.enabled && (
                              <Badge variant="secondary">
                                <Bot className="w-3 h-3 mr-1" />
                                AI Mode
                              </Badge>
                            )}
                            {topic.interests_tags?.map((tag, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                #{tag}
                              </Badge>
                            ))}
                          </div>

                          {/* Actions */}
                          {!topic.isLocked && (
                            <Button className="w-full" size="sm">
                              <Play className="w-4 h-4 mr-2" />
                              Start Practice
                            </Button>
                          )}
                          {topic.isLocked && topic.assignment?.unlock_after && (
                            <p className="text-xs text-center text-muted-foreground">
                              Unlocks {new Date(topic.assignment.unlock_after).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTopics.map((topic) => (
                    <Card
                      key={topic.id}
                      className={cn(
                        "cursor-pointer hover:shadow-md transition-shadow",
                        topic.isLocked && "opacity-60"
                      )}
                      onClick={() => !topic.isLocked && startPractice(topic)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-12 h-12 rounded-lg flex items-center justify-center",
                              topic.isLocked ? "bg-gray-100" : "bg-primary/10"
                            )}>
                              {topic.isLocked ? (
                                <Lock className="w-6 h-6 text-gray-400" />
                              ) : (
                                getTopicIcon(topic.category)
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{topic.name}</p>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {topic.description}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {topic.english_level || 'B1'}
                                </Badge>
                                {topic.ai_config?.enabled && (
                                  <Badge variant="outline" className="text-xs">
                                    <Bot className="w-3 h-3 mr-1" />
                                    AI
                                  </Badge>
                                )}
                                {topic.averageScore > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    {Math.round(topic.averageScore)}% avg
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm font-medium">
                                {topic.completedSessions}/{topic.totalSessions}
                              </p>
                              <Progress
                                value={(topic.completedSessions / topic.totalSessions) * 100}
                                className="w-24 h-2 mt-1"
                              />
                            </div>
                            {!topic.isLocked && (
                              <Button size="sm">
                                <Play className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )
            ) : (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">No topics found</p>
                <p className="text-sm text-muted-foreground">
                  {searchQuery || filterLevel !== 'all' || filterStatus !== 'all'
                    ? 'Try adjusting your filters'
                    : 'No topics have been assigned yet'}
                </p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* Recent Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Practice Sessions</CardTitle>
              <CardDescription>Your conversation history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentSessions.length > 0 ? (
                  recentSessions.map((session) => (
                    <div
                      key={session.id}
                      className="p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => session.status === 'in_progress' && resumeSession(session)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{session.topic_name}</p>
                            <Badge
                              variant="outline"
                              className={cn("text-xs", getStatusColor(session.status))}
                            >
                              {getStatusIcon(session.status)}
                              <span className="ml-1">{session.status}</span>
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(session.start_time).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {session.performance_metrics?.duration_seconds
                                ? `${Math.round(session.performance_metrics.duration_seconds / 60)}m`
                                : 'In progress'}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              {session.conversation_history.length} turns
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          {session.performance_metrics?.average_accuracy_score ? (
                            <div>
                              <p className="text-2xl font-bold">
                                {Math.round(session.performance_metrics.average_accuracy_score)}%
                              </p>
                              <p className="text-xs text-muted-foreground">Score</p>
                            </div>
                          ) : session.status === 'in_progress' ? (
                            <Button size="sm" variant="default">
                              Continue
                              <ArrowUpRight className="w-4 h-4 ml-1" />
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No practice sessions yet</p>
                    <Button className="mt-4" onClick={() => setActiveTab('topics')}>
                      Browse Topics
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Performance Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
                <CardDescription>Your improvement over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Speaking Fluency</span>
                      <span className="text-sm font-medium">75%</span>
                    </div>
                    <Progress value={75} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Grammar Accuracy</span>
                      <span className="text-sm font-medium">{stats.averageAccuracy}%</span>
                    </div>
                    <Progress value={stats.averageAccuracy} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Vocabulary Usage</span>
                      <span className="text-sm font-medium">68%</span>
                    </div>
                    <Progress value={68} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Pronunciation</span>
                      <span className="text-sm font-medium">82%</span>
                    </div>
                    <Progress value={82} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Achievements</CardTitle>
                <CardDescription>Your milestones and badges</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-medium">First Session Complete</p>
                      <p className="text-xs text-muted-foreground">Completed your first speaking session</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">3 Day Streak</p>
                      <p className="text-xs text-muted-foreground">Practiced 3 days in a row</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <BookMarked className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">50 Words Learned</p>
                      <p className="text-xs text-muted-foreground">Added 50 words to your dictionary</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Learning Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Learning Summary</CardTitle>
              <CardDescription>Your overall progress statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">
                    {Math.floor(stats.totalPracticeTime / 60)}h {stats.totalPracticeTime % 60}m
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Total Practice Time</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-500">
                    {stats.sessionsCompleted}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Sessions Completed</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-500">
                    {stats.wordsLearned}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Words Learned</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-orange-500">
                    {stats.currentStreak}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Day Streak</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}