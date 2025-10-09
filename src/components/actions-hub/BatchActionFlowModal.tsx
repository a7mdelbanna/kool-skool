import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Calendar,
  Clock,
  User,
  BookOpen,
  Check,
  XCircle,
  MoveRight,
  CalendarClock,
  CreditCard,
  RefreshCw,
  Sparkles,
  Users,
  SkipForward,
  Pause,
  Play
} from 'lucide-react';
import { StudentAction } from '@/pages/ActionsHub';
import { format } from 'date-fns';
import CountdownTimer from './CountdownTimer';
import { toast } from 'sonner';
import { handleSessionAction as supabaseHandleSessionAction, supabase } from '@/integrations/supabase/client';
import confetti from 'canvas-confetti';
import { cn } from '@/lib/utils';

interface BatchActionFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: StudentAction[];
  onComplete: (completedStudentIds: string[]) => void;
  onRefresh: () => void;
}

const BatchActionFlowModal: React.FC<BatchActionFlowModalProps> = ({
  isOpen,
  onClose,
  students,
  onComplete,
  onRefresh
}) => {
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [currentActionIndex, setCurrentActionIndex] = useState(0);
  const [showStudentTransition, setShowStudentTransition] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [completedStudents, setCompletedStudents] = useState<Set<string>>(new Set());
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  const currentStudent = students[currentStudentIndex];

  // Combine and sort actions for current student (sessions first, then subscriptions)
  const currentStudentActions = currentStudent ? [
    ...currentStudent.actions.sessions.map((s: any) => ({ ...s, type: 'session' })),
    ...currentStudent.actions.subscriptions.map((s: any) => ({ ...s, type: 'subscription' }))
  ] : [];

  const currentAction = currentStudentActions[currentActionIndex];
  const isLastStudent = currentStudentIndex === students.length - 1;
  const isLastAction = currentActionIndex === currentStudentActions.length - 1;

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStudentIndex(0);
      setCurrentActionIndex(0);
      setCompletedStudents(new Set());
      setCompletedActions(new Set());
      setShowStudentTransition(false);
      setIsPaused(false);
    }
  }, [isOpen]);

  const handleSessionAction = async (action: 'attended' | 'cancelled' | 'moved' | 'rescheduled') => {
    if (!currentAction || currentAction.type !== 'session') return;

    setIsProcessing(true);
    try {
      // Use the same approach as SessionsTab - call the handleSessionAction from Supabase
      const actionMap = {
        'attended': 'attended',
        'cancelled': 'cancelled',
        'moved': 'moved',
        'rescheduled': 'rescheduled'
      };

      const rawResult = await supabaseHandleSessionAction(currentAction.id, actionMap[action]);
      const result = rawResult as any;

      if (result.success) {
        toast.success(result.message || `Session ${action} successfully`);

        // Mark action as completed
        const newCompleted = new Set(completedActions);
        newCompleted.add(currentAction.id);
        setCompletedActions(newCompleted);

        // Progress to next action or student
        handleNextAction();
      } else {
        throw new Error(result.message || 'Session action failed');
      }

      // Add a small delay before refreshing to ensure database is updated
      setTimeout(() => {
        onRefresh();
      }, 1000);
    } catch (error) {
      console.error('Error handling session action:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update session');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubscriptionRenewal = async () => {
    if (!currentAction || currentAction.type !== 'subscription') return;

    setIsProcessing(true);
    try {
      // Get user data from localStorage (same as SubscriptionCard)
      const userData = localStorage.getItem('user');
      if (!userData) {
        throw new Error('User authentication data not found');
      }

      const user = JSON.parse(userData);
      if (!user.id || !user.schoolId) {
        throw new Error('Missing user ID or school ID');
      }

      console.log('🔄 Renewing subscription:', {
        subscriptionId: currentAction.id,
        userId: user.id,
        schoolId: user.schoolId
      });

      // Use the same RPC call as SubscriptionCard
      const { data, error } = await supabase.rpc('renew_subscription', {
        p_subscription_id: currentAction.id,
        p_current_user_id: user.id,
        p_current_school_id: user.schoolId
      });

      if (error) {
        console.error('❌ RPC Error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      // Handle the response
      let response: any;
      if (typeof data === 'string') {
        try {
          response = JSON.parse(data);
        } catch (parseError) {
          throw new Error('Invalid response format from server');
        }
      } else if (typeof data === 'object' && data !== null) {
        response = data;
      } else {
        throw new Error('Unexpected response format from server');
      }

      if (response.success) {
        toast.success(response.message || 'Subscription renewed successfully!');

        // Mark action as completed
        const newCompleted = new Set(completedActions);
        newCompleted.add(currentAction.id);
        setCompletedActions(newCompleted);

        // Progress to next action or student
        handleNextAction();
      } else {
        throw new Error(response.message || 'Failed to renew subscription');
      }

      // Add a small delay before refreshing to ensure database is updated
      setTimeout(() => {
        onRefresh();
      }, 1000);
    } catch (error) {
      console.error('Error handling subscription renewal:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to renew subscription');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNextAction = () => {
    if (!autoAdvance || isPaused) return;

    if (isLastAction) {
      // Mark current student as completed
      const newCompletedStudents = new Set(completedStudents);
      newCompletedStudents.add(currentStudent.studentId);
      setCompletedStudents(newCompletedStudents);

      if (isLastStudent) {
        // All done!
        handleAllComplete();
      } else {
        // Move to next student with transition
        setShowStudentTransition(true);
      }
    } else {
      // Move to next action for same student
      setCurrentActionIndex(currentActionIndex + 1);
    }
  };

  const handleStudentTransitionComplete = () => {
    setShowStudentTransition(false);
    setCurrentStudentIndex(currentStudentIndex + 1);
    setCurrentActionIndex(0); // Reset to first action for new student
  };

  const handleAllComplete = () => {
    // Trigger celebration
    confetti({
      particleCount: 200,
      spread: 100,
      origin: { y: 0.6 }
    });

    toast.success(`Completed all actions for ${completedStudents.size + 1} students!`, {
      icon: <Sparkles className="h-5 w-5 text-yellow-500" />
    });

    // Add the last student to completed set
    const finalCompleted = new Set(completedStudents);
    finalCompleted.add(currentStudent.studentId);

    onComplete(Array.from(finalCompleted));
    onClose();
  };

  const handleSkipStudent = () => {
    if (isLastStudent) {
      handleAllComplete();
    } else {
      setCurrentStudentIndex(currentStudentIndex + 1);
      setCurrentActionIndex(0);
    }
  };

  const handlePreviousStudent = () => {
    if (currentStudentIndex > 0) {
      setCurrentStudentIndex(currentStudentIndex - 1);
      setCurrentActionIndex(0);
    }
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Calculate overall progress
  const totalStudents = students.length;
  const totalActions = students.reduce((acc, s) => acc + s.totalActions, 0);
  const completedActionsCount = completedActions.size;
  const overallProgress = totalActions > 0 ? (completedActionsCount / totalActions) * 100 : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="max-w-full h-screen p-0 overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
            {/* Header */}
            <div className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      Batch Actions Mode
                      <Badge variant="secondary" className="text-lg px-3 py-1">
                        Student {currentStudentIndex + 1} of {totalStudents}
                      </Badge>
                    </h2>
                    <p className="text-muted-foreground">
                      Processing all pending actions automatically
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={isPaused ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsPaused(!isPaused)}
                  >
                    {isPaused ? (
                      <>
                        <Play className="h-4 w-4 mr-1" />
                        Resume
                      </>
                    ) : (
                      <>
                        <Pause className="h-4 w-4 mr-1" />
                        Pause
                      </>
                    )}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={onClose}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Overall Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Overall Progress</span>
                  <span className="font-medium">
                    {completedActionsCount} of {totalActions} actions completed
                  </span>
                </div>
                <Progress value={overallProgress} className="h-2" />
              </div>

              {/* Student Progress Indicators */}
              <div className="flex items-center gap-2 mt-4 overflow-x-auto">
                {students.map((student, idx) => (
                  <div
                    key={student.studentId}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all",
                      idx < currentStudentIndex && "bg-green-500/10 border-green-500/30",
                      idx === currentStudentIndex && "bg-primary/10 border-primary animate-pulse",
                      idx > currentStudentIndex && "bg-muted/30 border-muted"
                    )}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={student.profileImage} />
                      <AvatarFallback className="text-xs">
                        {getInitials(student.studentName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium whitespace-nowrap">
                      {student.studentName.split(' ')[0]}
                    </span>
                    {idx < currentStudentIndex && (
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              {/* Student Transition Countdown */}
              {showStudentTransition && (
                <CountdownTimer
                  onComplete={handleStudentTransitionComplete}
                  onCancel={() => setShowStudentTransition(false)}
                />
              )}

              {/* Current Student Card */}
              {currentStudent && !showStudentTransition && (
                <motion.div
                  key={currentStudent.studentId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="max-w-4xl mx-auto space-y-6"
                >
                  {/* Student Info Card */}
                  <Card className="p-6 bg-primary/5 border-primary/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16 border-2 border-primary/20">
                          <AvatarImage src={currentStudent.profileImage} />
                          <AvatarFallback className="bg-primary/10 text-primary text-lg">
                            {getInitials(currentStudent.studentName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="text-xl font-bold">{currentStudent.studentName}</h3>
                          <p className="text-muted-foreground">{currentStudent.courseName}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <Badge variant="outline" className="gap-1">
                              <Calendar className="h-3 w-3" />
                              {currentStudent.actions.sessions.length} Sessions
                            </Badge>
                            <Badge variant="outline" className="gap-1">
                              <CreditCard className="h-3 w-3" />
                              {currentStudent.actions.subscriptions.length} Renewals
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Action</p>
                        <p className="text-2xl font-bold">
                          {currentActionIndex + 1}/{currentStudentActions.length}
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* Current Action Card */}
                  {currentAction && (
                    <Card className="p-8">
                      {currentAction.type === 'session' ? (
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <Badge className="gap-1">
                              <Calendar className="h-3 w-3" />
                              Session Action Required
                            </Badge>
                            <Badge variant="outline" className="text-red-500 border-red-500/30">
                              {currentAction.daysOverdue} days overdue
                            </Badge>
                          </div>

                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Calendar className="h-4 w-4" />
                                  <span className="text-sm">Date</span>
                                </div>
                                <p className="font-medium text-lg">
                                  {format(new Date(currentAction.date), 'EEEE, MMMM d, yyyy')}
                                </p>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Clock className="h-4 w-4" />
                                  <span className="text-sm">Time</span>
                                </div>
                                <p className="font-medium text-lg">{currentAction.time}</p>
                              </div>
                            </div>
                          </div>

                          <div className="pt-6 border-t">
                            <h3 className="text-lg font-semibold mb-4">Choose Action</h3>
                            <div className="grid grid-cols-2 gap-3">
                              <Button
                                size="lg"
                                className="gap-2"
                                variant="default"
                                onClick={() => handleSessionAction('attended')}
                                disabled={isProcessing}
                              >
                                <Check className="h-5 w-5" />
                                Mark Attended
                              </Button>
                              <Button
                                size="lg"
                                className="gap-2"
                                variant="outline"
                                onClick={() => handleSessionAction('cancelled')}
                                disabled={isProcessing}
                              >
                                <XCircle className="h-5 w-5" />
                                Cancel Session
                              </Button>
                              <Button
                                size="lg"
                                className="gap-2"
                                variant="outline"
                                onClick={() => handleSessionAction('moved')}
                                disabled={isProcessing}
                              >
                                <MoveRight className="h-5 w-5" />
                                Move to Next
                              </Button>
                              <Button
                                size="lg"
                                className="gap-2"
                                variant="outline"
                                onClick={() => handleSessionAction('rescheduled')}
                                disabled={isProcessing}
                              >
                                <CalendarClock className="h-5 w-5" />
                                Reschedule
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <Badge className="gap-1">
                              <CreditCard className="h-3 w-3" />
                              Subscription Renewal Required
                            </Badge>
                            <Badge
                              variant="outline"
                              className={
                                currentAction.status === 'expired'
                                  ? 'text-red-500 border-red-500/30'
                                  : 'text-orange-500 border-orange-500/30'
                              }
                            >
                              {currentAction.status === 'expired' ? 'Expired' : 'Expiring Soon'}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span className="text-sm">End Date</span>
                              </div>
                              <p className="font-medium text-lg">
                                {format(new Date(currentAction.calculated_end_date || currentAction.end_date), 'MMMM d, yyyy')}
                              </p>
                              {currentAction.subscription_number && (
                                <Badge variant="secondary" className="mt-1">
                                  Subscription #{currentAction.subscription_number}
                                </Badge>
                              )}
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <RefreshCw className="h-4 w-4" />
                                <span className="text-sm">Sessions</span>
                              </div>
                              <p className="font-medium text-lg">
                                {currentAction.sessions_completed}/{currentAction.session_count} completed
                              </p>
                            </div>
                          </div>

                          <div className="pt-6 border-t">
                            <h3 className="text-lg font-semibold mb-4">Renewal Action</h3>
                            <div className="grid grid-cols-2 gap-3">
                              <Button
                                size="lg"
                                className="gap-2"
                                variant="default"
                                onClick={handleSubscriptionRenewal}
                                disabled={isProcessing}
                              >
                                <RefreshCw className="h-5 w-5" />
                                Renew Subscription
                              </Button>
                              <Button
                                size="lg"
                                className="gap-2"
                                variant="outline"
                                onClick={handleNextAction}
                                disabled={isProcessing}
                              >
                                Skip for Now
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </Card>
                  )}
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 z-50 backdrop-blur-xl bg-background/80 border-t p-6">
              <div className="max-w-4xl mx-auto flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={handlePreviousStudent}
                  disabled={currentStudentIndex === 0 || isProcessing}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Previous Student
                </Button>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="batch-auto-advance"
                      checked={autoAdvance}
                      onChange={(e) => setAutoAdvance(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="batch-auto-advance" className="text-sm">
                      Auto-advance to next
                    </label>
                  </div>
                </div>

                <Button
                  onClick={handleSkipStudent}
                  disabled={isProcessing}
                  className="gap-2"
                  variant="outline"
                >
                  Skip Student
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
};

export default BatchActionFlowModal;