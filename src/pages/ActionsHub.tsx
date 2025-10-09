import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '@/App';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell,
  Clock,
  RefreshCw,
  Search,
  CheckCircle,
  AlertCircle,
  Calendar,
  CreditCard,
  ArrowRight,
  Filter,
  X,
  User,
  Zap,
  PlayCircle,
  Rocket
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useActionableSessions } from '@/hooks/useActionableSessions';
import { useExpiredSubscriptions } from '@/hooks/useExpiredSubscriptions';
import ActionCard from '@/components/actions-hub/ActionCard';
import ActionFlowModal from '@/components/actions-hub/ActionFlowModal';
import BatchActionFlowModal from '@/components/actions-hub/BatchActionFlowModal';
import { toast } from 'sonner';

export interface StudentAction {
  studentId: string;
  studentName: string;
  studentEmail?: string;
  profileImage?: string;
  courseName?: string;
  actions: {
    sessions: any[];
    subscriptions: any[];
  };
  priority: 'urgent' | 'upcoming' | 'normal';
  completedAt?: Date;
  totalActions: number;
  completedActions: number;
}

const ActionsHub: React.FC = () => {
  const { user } = useContext(UserContext);
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<StudentAction | null>(null);
  const [isFlowModalOpen, setIsFlowModalOpen] = useState(false);
  const [isBatchFlowModalOpen, setIsBatchFlowModalOpen] = useState(false);
  const [completedStudents, setCompletedStudents] = useState<Set<string>>(new Set());
  const [filterPriority, setFilterPriority] = useState<string>('all');

  // Load completed students from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('actionsHub_completedStudents');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Only keep completions from today
      const today = new Date().toDateString();
      const todaysCompletions = Object.entries(parsed)
        .filter(([_, date]: [string, any]) => new Date(date).toDateString() === today)
        .map(([id]: [string, any]) => id);
      setCompletedStudents(new Set(todaysCompletions));
    }
  }, []);

  // Fetch data using custom hooks
  const {
    data: sessionsData,
    isLoading: sessionsLoading,
    refetch: refetchSessions
  } = useActionableSessions(user?.schoolId);

  const {
    data: subscriptionsData,
    isLoading: subscriptionsLoading,
    refetch: refetchSubscriptions
  } = useExpiredSubscriptions(user?.schoolId);

  // Combine and process data
  const studentActions: StudentAction[] = React.useMemo(() => {
    const actionsMap = new Map<string, StudentAction>();

    // Process sessions
    sessionsData?.forEach((session: any) => {
      if (!actionsMap.has(session.studentId)) {
        actionsMap.set(session.studentId, {
          studentId: session.studentId,
          studentName: session.studentName,
          studentEmail: session.studentEmail,
          profileImage: session.profileImage,
          courseName: session.courseName,
          actions: { sessions: [], subscriptions: [] },
          priority: 'urgent', // Past sessions are urgent
          totalActions: 0,
          completedActions: 0
        });
      }
      const student = actionsMap.get(session.studentId)!;
      student.actions.sessions.push(session);
      student.totalActions++;
    });

    // Process subscriptions
    subscriptionsData?.forEach((subscription: any) => {
      if (!actionsMap.has(subscription.student_id)) {
        actionsMap.set(subscription.student_id, {
          studentId: subscription.student_id,
          studentName: subscription.student_name,
          studentEmail: subscription.student_email,
          profileImage: subscription.profileImage,
          courseName: subscription.courseName,
          actions: { sessions: [], subscriptions: [] },
          priority: subscription.status === 'expired' ? 'urgent' : 'upcoming',
          totalActions: 0,
          completedActions: 0
        });
      }
      const student = actionsMap.get(subscription.student_id)!;
      student.actions.subscriptions.push(subscription);
      student.totalActions++;

      // Update priority if needed
      if (subscription.status === 'expired' && student.priority !== 'urgent') {
        student.priority = 'urgent';
      }
    });

    // Check if students are completed
    return Array.from(actionsMap.values()).map(student => ({
      ...student,
      completedAt: completedStudents.has(student.studentId) ? new Date() : undefined
    }));
  }, [sessionsData, subscriptionsData, completedStudents]);

  // Filter students based on search and filters
  const filteredStudents = React.useMemo(() => {
    let filtered = [...studentActions];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentEmail?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Tab filter
    if (selectedTab === 'sessions') {
      filtered = filtered.filter(s => s.actions.sessions.length > 0);
    } else if (selectedTab === 'subscriptions') {
      filtered = filtered.filter(s => s.actions.subscriptions.length > 0);
    } else if (selectedTab === 'completed') {
      filtered = filtered.filter(s => s.completedAt);
    } else if (selectedTab === 'pending') {
      filtered = filtered.filter(s => !s.completedAt);
    }

    // Priority filter
    if (filterPriority !== 'all') {
      filtered = filtered.filter(s => s.priority === filterPriority);
    }

    // Sort by priority and completion
    filtered.sort((a, b) => {
      // Completed items go to the end
      if (a.completedAt && !b.completedAt) return 1;
      if (!a.completedAt && b.completedAt) return -1;

      // Sort by priority
      const priorityOrder = { urgent: 0, upcoming: 1, normal: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    return filtered;
  }, [studentActions, searchTerm, selectedTab, filterPriority]);

  const handleStudentClick = (student: StudentAction) => {
    if (!student.completedAt) {
      setSelectedStudent(student);
      setIsFlowModalOpen(true);
    }
  };

  const handleActionComplete = (studentId: string) => {
    const newCompleted = new Set(completedStudents);
    newCompleted.add(studentId);
    setCompletedStudents(newCompleted);

    // Save to localStorage with date
    const saved = JSON.parse(localStorage.getItem('actionsHub_completedStudents') || '{}');
    saved[studentId] = new Date().toISOString();
    localStorage.setItem('actionsHub_completedStudents', JSON.stringify(saved));

    toast.success('All actions completed for this student!');

    // Close modal and refresh data
    setIsFlowModalOpen(false);
    setSelectedStudent(null);
    refetchSessions();
    refetchSubscriptions();
  };

  const handleRefresh = async () => {
    // Invalidate the queries to force fresh data from server
    await queryClient.invalidateQueries({ queryKey: ['actionable-sessions'] });
    await queryClient.invalidateQueries({ queryKey: ['expired-subscriptions'] });
    await Promise.all([refetchSessions(), refetchSubscriptions()]);
    toast.success('Data refreshed');
  };

  const handleClearCompleted = () => {
    setCompletedStudents(new Set());
    localStorage.removeItem('actionsHub_completedStudents');
    toast.success('Cleared all completed students');
  };

  const handleStartAllActions = () => {
    // Filter for only pending students with actions
    const pendingStudents = studentActions.filter(s => !s.completedAt && s.totalActions > 0);

    if (pendingStudents.length === 0) {
      toast.info('No pending actions to process');
      return;
    }

    setIsBatchFlowModalOpen(true);
  };

  const handleBatchComplete = (completedStudentIds: string[]) => {
    // Mark all students as completed
    const newCompleted = new Set(completedStudents);
    completedStudentIds.forEach(id => newCompleted.add(id));
    setCompletedStudents(newCompleted);

    // Save to localStorage
    const saved = JSON.parse(localStorage.getItem('actionsHub_completedStudents') || '{}');
    const date = new Date().toISOString();
    completedStudentIds.forEach(id => {
      saved[id] = date;
    });
    localStorage.setItem('actionsHub_completedStudents', JSON.stringify(saved));

    setIsBatchFlowModalOpen(false);
    refetchSessions();
    refetchSubscriptions();

    toast.success(`Completed actions for ${completedStudentIds.length} students!`);
  };

  const stats = {
    total: studentActions.length,
    pending: studentActions.filter(s => !s.completedAt).length,
    completed: studentActions.filter(s => s.completedAt).length,
    urgent: studentActions.filter(s => s.priority === 'urgent' && !s.completedAt).length,
    totalSessions: studentActions.reduce((acc, s) => acc + s.actions.sessions.length, 0),
    totalSubscriptions: studentActions.reduce((acc, s) => acc + s.actions.subscriptions.length, 0)
  };

  const isLoading = sessionsLoading || subscriptionsLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  Actions Hub
                  {stats.urgent > 0 && (
                    <Badge variant="destructive" className="animate-pulse">
                      {stats.urgent} Urgent
                    </Badge>
                  )}
                </h1>
                <p className="text-muted-foreground">
                  Manage all pending actions in one place
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {stats.pending > 0 && (
                <Button
                  size="sm"
                  onClick={handleStartAllActions}
                  className="gap-2"
                  variant="default"
                >
                  <Rocket className="h-4 w-4" />
                  Start All Actions
                  <Badge variant="secondary" className="ml-1">
                    {stats.pending}
                  </Badge>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              {stats.completed > 0 && (
                <Button variant="ghost" size="sm" onClick={handleClearCompleted}>
                  Clear Completed
                </Button>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <Card className="p-3 bg-primary/5 border-primary/20">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </Card>

            <Card className="p-3 bg-green-500/10 border-green-500/20">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.completed}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
            </Card>

            <Card className="p-3 bg-red-500/10 border-red-500/20">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.urgent}</p>
                  <p className="text-xs text-muted-foreground">Urgent</p>
                </div>
              </div>
            </Card>

            <Card className="p-3 bg-blue-500/10 border-blue-500/20">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalSessions}</p>
                  <p className="text-xs text-muted-foreground">Sessions</p>
                </div>
              </div>
            </Card>

            <Card className="p-3 bg-purple-500/10 border-purple-500/20">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalSubscriptions}</p>
                  <p className="text-xs text-muted-foreground">Renewals</p>
                </div>
              </div>
            </Card>

            <Card className="p-3 bg-orange-500/10 border-orange-500/20">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Students</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="p-6 pt-4">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant={filterPriority === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterPriority('all')}
            >
              All
            </Button>
            <Button
              variant={filterPriority === 'urgent' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterPriority('urgent')}
              className="gap-1"
            >
              <AlertCircle className="h-3 w-3" />
              Urgent
            </Button>
            <Button
              variant={filterPriority === 'upcoming' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterPriority('upcoming')}
              className="gap-1"
            >
              <Clock className="h-3 w-3" />
              Upcoming
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="all" className="gap-1">
              All
              <Badge variant="secondary" className="ml-1">
                {stats.total}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="pending" className="gap-1">
              Pending
              <Badge variant="secondary" className="ml-1">
                {stats.pending}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="sessions" className="gap-1">
              Sessions
              <Badge variant="secondary" className="ml-1">
                {stats.totalSessions}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="gap-1">
              Renewals
              <Badge variant="secondary" className="ml-1">
                {stats.totalSubscriptions}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-1">
              Completed
              <Badge variant="secondary" className="ml-1">
                {stats.completed}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={selectedTab} className="mt-0">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <Card key={i} className="p-6 animate-pulse">
                    <div className="h-20 bg-muted rounded" />
                  </Card>
                ))}
              </div>
            ) : filteredStudents.length === 0 ? (
              <Card className="p-12 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                <p className="text-muted-foreground">
                  {selectedTab === 'completed'
                    ? 'No completed actions today'
                    : 'No actions require your attention right now'}
                </p>
              </Card>
            ) : (
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                layout
              >
                <AnimatePresence mode="popLayout">
                  {filteredStudents.map((student) => (
                    <ActionCard
                      key={student.studentId}
                      student={student}
                      onClick={() => handleStudentClick(student)}
                      isCompleted={!!student.completedAt}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Action Flow Modal */}
      {selectedStudent && (
        <ActionFlowModal
          isOpen={isFlowModalOpen}
          onClose={() => {
            setIsFlowModalOpen(false);
            setSelectedStudent(null);
          }}
          student={selectedStudent}
          onComplete={handleActionComplete}
          onRefresh={async () => {
            // Invalidate the queries to force fresh data from server
            await queryClient.invalidateQueries({ queryKey: ['actionable-sessions'] });
            await queryClient.invalidateQueries({ queryKey: ['expired-subscriptions'] });
            refetchSessions();
            refetchSubscriptions();
          }}
        />
      )}

      {/* Batch Action Flow Modal */}
      <BatchActionFlowModal
        isOpen={isBatchFlowModalOpen}
        onClose={() => setIsBatchFlowModalOpen(false)}
        students={studentActions.filter(s => !s.completedAt && s.totalActions > 0)}
        onComplete={handleBatchComplete}
        onRefresh={async () => {
          // Invalidate the queries to force fresh data from server
          await queryClient.invalidateQueries({ queryKey: ['actionable-sessions'] });
          await queryClient.invalidateQueries({ queryKey: ['expired-subscriptions'] });
          refetchSessions();
          refetchSubscriptions();
        }}
      />
    </div>
  );
};

export default ActionsHub;