import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionProgressBarProps {
  current: number;
  total: number;
  completed: number;
  className?: string;
}

const ActionProgressBar: React.FC<ActionProgressBarProps> = ({
  current,
  total,
  completed,
  className
}) => {
  const percentage = (completed / total) * 100;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Progress Text */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium">Action {current} of {total}</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">
            {completed} completed, {total - completed} remaining
          </span>
        </div>
        <span className="font-semibold text-primary">{Math.round(percentage)}%</span>
      </div>

      {/* Visual Progress Bar */}
      <div className="relative">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary via-primary to-primary/80"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{
              backgroundSize: '200% 100%',
              animation: 'shimmer 2s linear infinite'
            }}
          />
        </div>

        {/* Step Indicators */}
        <div className="absolute -top-1 left-0 right-0 flex justify-between px-2">
          {Array.from({ length: Math.min(total, 10) }, (_, i) => {
            const stepNumber = i + 1;
            const isCompleted = stepNumber <= completed;
            const isCurrent = stepNumber === current;
            const stepPercentage = (stepNumber / total) * 100;

            return (
              <motion.div
                key={i}
                className="absolute -translate-x-1/2"
                style={{ left: `${stepPercentage}%` }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1 }}
              >
                {isCompleted ? (
                  <motion.div
                    initial={{ scale: 0, rotate: 0 }}
                    animate={{ scale: 1, rotate: 360 }}
                    transition={{ duration: 0.3 }}
                  >
                    <CheckCircle
                      className={cn(
                        "h-4 w-4",
                        isCurrent ? "text-primary" : "text-green-500"
                      )}
                    />
                  </motion.div>
                ) : (
                  <Circle
                    className={cn(
                      "h-4 w-4",
                      isCurrent
                        ? "text-primary fill-primary/20"
                        : "text-muted-foreground fill-background"
                    )}
                  />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Action Labels (for small number of actions) */}
      {total <= 5 && (
        <div className="flex justify-between text-xs text-muted-foreground">
          {Array.from({ length: total }, (_, i) => {
            const stepNumber = i + 1;
            const isCompleted = stepNumber <= completed;
            const isCurrent = stepNumber === current;

            return (
              <div
                key={i}
                className={cn(
                  "text-center transition-all duration-200",
                  isCurrent && "text-primary font-medium scale-110",
                  isCompleted && !isCurrent && "text-green-500"
                )}
              >
                Action {stepNumber}
              </div>
            );
          })}
        </div>
      )}

      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  );
};

export default ActionProgressBar;