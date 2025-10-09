import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface CountdownTimerProps {
  onComplete: () => void;
  onCancel: () => void;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ onComplete, onCancel }) => {
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count > 0) {
      const timer = setTimeout(() => {
        setCount(count - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      onComplete();
    }
  }, [count, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <AnimatePresence mode="wait">
        <motion.div
          key={count}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="relative"
        >
          {count > 0 ? (
            <div className="relative">
              {/* Animated Circle Background */}
              <svg className="w-64 h-64" viewBox="0 0 256 256">
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-primary/20"
                />
                <motion.circle
                  cx="128"
                  cy="128"
                  r="120"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-primary"
                  strokeLinecap="round"
                  strokeDasharray={753.98}
                  strokeDashoffset={753.98}
                  animate={{ strokeDashoffset: 0 }}
                  transition={{ duration: 1, ease: 'linear' }}
                  style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                />
              </svg>

              {/* Countdown Number */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-7xl font-bold text-primary animate-pulse">
                  {count}
                </span>
              </div>

              {/* Cancel Button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute -top-4 -right-4"
                onClick={onCancel}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <motion.div
              initial={{ scale: 0, rotate: 0 }}
              animate={{ scale: 1, rotate: 360 }}
              transition={{ duration: 0.5, type: 'spring', stiffness: 200 }}
              className="w-32 h-32 rounded-full bg-green-500/20 flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
                className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center"
              >
                <svg
                  className="w-12 h-12 text-white"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Bottom text */}
      <div className="absolute bottom-32 text-center">
        <p className="text-muted-foreground">
          {count > 0 ? 'Moving to next action...' : 'Action completed!'}
        </p>
        {count > 0 && (
          <Button variant="ghost" className="mt-2" onClick={onCancel}>
            Cancel auto-advance
          </Button>
        )}
      </div>
    </div>
  );
};

export default CountdownTimer;