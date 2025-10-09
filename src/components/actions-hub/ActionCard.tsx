import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Calendar,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { StudentAction } from '@/pages/ActionsHub';
import { format } from 'date-fns';

interface ActionCardProps {
  student: StudentAction;
  onClick: () => void;
  isCompleted: boolean;
}

const ActionCard: React.FC<ActionCardProps> = ({ student, onClick, isCompleted }) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'upcoming':
        return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      default:
        return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
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
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: isCompleted ? 1 : 1.02 }}
      whileTap={{ scale: isCompleted ? 1 : 0.98 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          "relative cursor-pointer transition-all duration-200 overflow-hidden",
          "hover:shadow-lg hover:border-primary/20",
          isCompleted && "opacity-60 bg-muted/30 border-green-500/20",
          !isCompleted && student.priority === 'urgent' && "border-red-500/30 bg-red-50/5"
        )}
        onClick={onClick}
      >
        {/* Completion Overlay */}
        {isCompleted && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/80 backdrop-blur-sm">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-green-600">Completed</p>
            </div>
          </div>
        )}

        {/* Priority Indicator */}
        {!isCompleted && student.priority === 'urgent' && (
          <div className="absolute top-2 right-2 z-10">
            <Badge className={cn("animate-pulse", getPriorityColor(student.priority))}>
              <AlertCircle className="h-3 w-3 mr-1" />
              Urgent
            </Badge>
          </div>
        )}

        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-primary/10">
              <AvatarImage src={student.profileImage} alt={student.studentName} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(student.studentName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate">
                {student.studentName}
              </h3>
              {student.courseName && (
                <p className="text-xs text-muted-foreground truncate">
                  {student.courseName}
                </p>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Action Summary */}
          <div className="space-y-2">
            {student.actions.sessions.length > 0 && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-blue-500/5 border border-blue-500/10">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-blue-500/10">
                    <Calendar className="h-3.5 w-3.5 text-blue-500" />
                  </div>
                  <span className="text-sm font-medium">
                    {student.actions.sessions.length} Session{student.actions.sessions.length > 1 ? 's' : ''}
                  </span>
                </div>
                {student.actions.sessions[0] && (
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(student.actions.sessions[0].date), 'MMM d')}
                  </span>
                )}
              </div>
            )}

            {student.actions.subscriptions.length > 0 && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-purple-500/5 border border-purple-500/10">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-purple-500/10">
                    <CreditCard className="h-3.5 w-3.5 text-purple-500" />
                  </div>
                  <span className="text-sm font-medium">
                    {student.actions.subscriptions.length} Renewal{student.actions.subscriptions.length > 1 ? 's' : ''}
                  </span>
                </div>
                {student.actions.subscriptions[0] && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      student.actions.subscriptions[0].status === 'expired'
                        ? "text-red-500 border-red-500/30"
                        : "text-orange-500 border-orange-500/30"
                    )}
                  >
                    {student.actions.subscriptions[0].status}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Progress Indicator */}
          {student.totalActions > 0 && !isCompleted && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">
                  {student.completedActions}/{student.totalActions} actions
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500"
                  style={{
                    width: `${(student.completedActions / student.totalActions) * 100}%`
                  }}
                />
              </div>
            </div>
          )}

          {/* Action Button */}
          {!isCompleted && (
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-xs text-muted-foreground">
                {student.priority === 'urgent' ? 'Needs immediate action' : 'Click to review'}
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ActionCard;