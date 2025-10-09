import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Sparkles
} from 'lucide-react';
import { StudentAction } from '@/pages/ActionsHub';
import { format } from 'date-fns';
import CountdownTimer from './CountdownTimer';
import ActionProgressBar from './ActionProgressBar';
import { toast } from 'sonner';
import { handleSessionAction, supabase } from '@/integrations/supabase/client';
import confetti from 'canvas-confetti';

interface ActionFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentAction;
  onComplete: (studentId: string) => void;
  onRefresh: () => void;
}

const ActionFlowModal: React.FC<ActionFlowModalProps> = ({
  isOpen,
  onClose,
  student,
  onComplete,
  onRefresh
}) => {
  const [currentActionIndex, setCurrentActionIndex] = useState(0);
  const [showCountdown, setShowCountdown] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  // Combine all actions into a single array for processing
  const allActions = [
    ...student.actions.sessions.map((s: any) => ({ ...s, type: 'session' })),
    ...student.actions.subscriptions.map((s: any) => ({ ...s, type: 'subscription' }))
  ];

  const currentAction = allActions[currentActionIndex];
  const isLastAction = currentActionIndex === allActions.length - 1;

  useEffect(() => {
    // Reset when modal opens
    if (isOpen) {
      setCurrentActionIndex(0);
      setCompletedActions(new Set());
      setShowCountdown(false);
    }
  }, [isOpen]);

  const handleSessionAction = async (action: 'attended' | 'cancelled' | 'moved' | 'rescheduled') => {
    if (!currentAction || currentAction.type !== 'session') return;

    setIsProcessing(true);
    try {
      let result: any;

      if (action === 'attended') {
        result = await supabase
          .from('lesson_sessions')
          .update({ status: 'completed' })
          .eq('id', currentAction.id);
      } else if (action === 'cancelled') {
        result = await supabase
          .from('lesson_sessions')
          .update({ status: 'cancelled' })
          .eq('id', currentAction.id);
      } else if (action === 'moved') {
        // Handle move action - this would create a new session
        result = await supabase
          .from('lesson_sessions')
          .update({ status: 'rescheduled' })
          .eq('id', currentAction.id);
      }

      if (result?.error) throw result.error;

      toast.success(`Session marked as ${action}`);

      // Mark as completed
      const newCompleted = new Set(completedActions);
      newCompleted.add(currentAction.id);
      setCompletedActions(newCompleted);

      // Auto-advance or complete
      if (isLastAction) {
        handleAllComplete();
      } else if (autoAdvance) {
        setShowCountdown(true);
      }

      onRefresh();
    } catch (error) {
      console.error('Error handling session action:', error);
      toast.error('Failed to update session');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubscriptionRenewal = async () => {
    if (!currentAction || currentAction.type !== 'subscription') return;

    setIsProcessing(true);
    try {
      // Mark subscription as renewed
      await supabase
        .from('subscriptions')
        .update({ is_renewed: true })
        .eq('id', currentAction.id);

      toast.success('Subscription marked for renewal');

      // Mark as completed
      const newCompleted = new Set(completedActions);
      newCompleted.add(currentAction.id);
      setCompletedActions(newCompleted);

      // Auto-advance or complete
      if (isLastAction) {
        handleAllComplete();
      } else if (autoAdvance) {
        setShowCountdown(true);
      }

      onRefresh();
    } catch (error) {
      console.error('Error handling subscription renewal:', error);
      toast.error('Failed to update subscription');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCountdownComplete = () => {
    setShowCountdown(false);
    if (currentActionIndex < allActions.length - 1) {
      setCurrentActionIndex(currentActionIndex + 1);
    } else {
      handleAllComplete();
    }
  };

  const handleAllComplete = () => {
    // Trigger celebration
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    toast.success('All actions completed for ' + student.studentName + '!', {
      icon: <Sparkles className="h-5 w-5 text-yellow-500" />
    });

    onComplete(student.studentId);
    onClose();
  };

  const handleNext = () => {
    if (currentActionIndex < allActions.length - 1) {
      setCurrentActionIndex(currentActionIndex + 1);
    } else {
      handleAllComplete();
    }
  };

  const handlePrevious = () => {
    if (currentActionIndex > 0) {
      setCurrentActionIndex(currentActionIndex - 1);
    }
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="max-w-full h-screen p-0 overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
            {/* Header */}
            <div className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 border-2 border-primary/20">
                    <AvatarImage src={student.profileImage} alt={student.studentName} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(student.studentName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-2xl font-bold">{student.studentName}</h2>
                    <p className="text-muted-foreground">{student.courseName}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Progress Bar */}
              <ActionProgressBar
                current={currentActionIndex + 1}
                total={allActions.length}
                completed={completedActions.size}
                className="mt-4"
              />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              {/* Countdown Overlay */}
              {showCountdown && (
                <CountdownTimer
                  onComplete={handleCountdownComplete}
                  onCancel={() => setShowCountdown(false)}
                />
              )}

              {/* Current Action */}
              {currentAction && (
                <motion.div
                  key={currentActionIndex}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                  className="max-w-4xl mx-auto"
                >
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

                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <BookOpen className="h-4 w-4" />
                              <span className="text-sm">Course</span>
                            </div>
                            <p className="font-medium">{currentAction.courseName}</p>
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

                        <div className="space-y-4">
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

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <CreditCard className="h-4 w-4" />
                                <span className="text-sm">Price</span>
                              </div>
                              <p className="font-medium text-lg">
                                {currentAction.currency} {currentAction.totalPrice?.toFixed(2)}
                              </p>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <User className="h-4 w-4" />
                                <span className="text-sm">Teacher</span>
                              </div>
                              <p className="font-medium">{currentAction.teacher_name}</p>
                            </div>
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
                              onClick={handleNext}
                              disabled={isProcessing}
                            >
                              Skip for Now
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 z-50 backdrop-blur-xl bg-background/80 border-t p-6">
              <div className="max-w-4xl mx-auto flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentActionIndex === 0 || isProcessing}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Previous
                </Button>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="auto-advance"
                      checked={autoAdvance}
                      onChange={(e) => setAutoAdvance(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="auto-advance" className="text-sm">
                      Auto-advance after action
                    </label>
                  </div>
                </div>

                <Button
                  onClick={handleNext}
                  disabled={isProcessing}
                  className="gap-2"
                  variant={isLastAction ? "default" : "outline"}
                >
                  {isLastAction ? 'Complete All' : 'Next'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
};

export default ActionFlowModal;