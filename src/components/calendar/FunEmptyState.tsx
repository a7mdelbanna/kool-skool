
import React from 'react';
import { Calendar, Coffee, BookOpen } from 'lucide-react';

interface FunEmptyStateProps {
  viewMode?: 'day' | 'week' | 'month';
}

const FunEmptyState: React.FC<FunEmptyStateProps> = ({ viewMode = 'week' }) => {
  const getEmptyMessage = () => {
    switch (viewMode) {
      case 'day':
        return {
          title: "No sessions today",
          subtitle: "Time for a coffee break! ☕",
          icon: <Coffee className="h-12 w-12 text-muted-foreground/50" />
        };
      case 'week':
        return {
          title: "No sessions this week",
          subtitle: "Perfect time to plan ahead! 📅",
          icon: <Calendar className="h-12 w-12 text-muted-foreground/50" />
        };
      case 'month':
        return {
          title: "No sessions this month",
          subtitle: "Ready to schedule some learning? 📚",
          icon: <BookOpen className="h-12 w-12 text-muted-foreground/50" />
        };
      default:
        return {
          title: "No sessions found",
          subtitle: "Time to get started! 🚀",
          icon: <Calendar className="h-12 w-12 text-muted-foreground/50" />
        };
    }
  };

  const message = getEmptyMessage();

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="flex flex-col items-center space-y-4 text-center">
        {message.icon}
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-muted-foreground">
            {message.title}
          </h3>
          <p className="text-sm text-muted-foreground/80">
            {message.subtitle}
          </p>
        </div>
      </div>
    </div>
  );
};

export default FunEmptyState;
