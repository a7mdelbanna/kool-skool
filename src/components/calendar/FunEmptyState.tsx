
import React, { useEffect, useState } from 'react';
import { PartyPopper, Coffee, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface FunEmptyStateProps {
  viewMode?: 'day' | 'week' | 'month';
}

const FunEmptyState: React.FC<FunEmptyStateProps> = ({ viewMode = 'week' }) => {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    setShowConfetti(true);
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const getEmptyMessage = () => {
    switch (viewMode) {
      case 'day':
        return 'No lessons today!';
      case 'month':
        return 'No lessons this month!';
      default:
        return 'No lessons this week!';
    }
  };

  return (
    <div className="relative">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd'][Math.floor(Math.random() * 6)]
                }}
              />
            </div>
          ))}
        </div>
      )}

      <Card className="border-2 border-dashed border-primary/20 bg-white">
        <CardContent className="p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <PartyPopper className="h-16 w-16 text-primary animate-bounce" />
              <Sparkles className="h-6 w-6 text-amber-500 absolute -top-2 -right-2 animate-pulse" />
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-primary mb-2 animate-pulse">
            🎉 HOORAY, {getEmptyMessage().toUpperCase()} 🎉
          </h2>
          
          <p className="text-lg text-muted-foreground mb-4">
            Time to take a break and enjoy your free time!
          </p>
          
          <div className="flex items-center justify-center gap-2 text-orange-600">
            <Coffee className="h-5 w-5" />
            <span className="font-medium">Go get a drink! ☕</span>
            <Coffee className="h-5 w-5" />
          </div>
          
          <div className="mt-6 text-sm text-muted-foreground">
            <p>• Relax and recharge 🔋</p>
            <p>• Maybe plan your next lesson 📚</p>
            <p>• Or just enjoy the moment! ✨</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FunEmptyState;
