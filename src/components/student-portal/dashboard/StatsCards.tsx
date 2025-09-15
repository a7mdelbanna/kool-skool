import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUp, 
  Calendar, 
  Target, 
  Clock,
  Award,
  BookOpen,
  Zap,
  Flame
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import CountUp from 'react-countup';

interface StatsCardsProps {
  stats: {
    streak: number;
    xp: number;
    completedLessons: number;
    upcomingSessions: number;
    attendanceRate: number;
    vocabularyMastered: number;
    speakingMinutes: number;
    homeworkCompleted: number;
  };
}

const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  const cards = [
    {
      title: 'Learning Streak',
      value: stats.streak,
      suffix: 'days',
      icon: Flame,
      color: 'from-orange-500 to-red-500',
      bgColor: 'from-orange-500/10 to-red-500/10',
      description: 'Keep it going! 🔥',
      trend: '+2 from last week'
    },
    {
      title: 'Total XP',
      value: stats.xp,
      suffix: 'XP',
      icon: Zap,
      color: 'from-yellow-500 to-amber-500',
      bgColor: 'from-yellow-500/10 to-amber-500/10',
      description: 'Level 5 Progress',
      progress: 75
    },
    {
      title: 'Lessons Completed',
      value: stats.completedLessons,
      suffix: 'lessons',
      icon: BookOpen,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'from-blue-500/10 to-cyan-500/10',
      description: 'Great progress!',
      trend: '+5 this month'
    },
    {
      title: 'Attendance Rate',
      value: stats.attendanceRate,
      suffix: '%',
      icon: Target,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'from-green-500/10 to-emerald-500/10',
      description: 'Excellent attendance!',
      progress: stats.attendanceRate
    },
    {
      title: 'Vocabulary Mastered',
      value: stats.vocabularyMastered,
      suffix: 'words',
      icon: Award,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'from-purple-500/10 to-pink-500/10',
      description: 'Vocabulary champion!',
      trend: '+12 this week'
    },
    {
      title: 'Speaking Practice',
      value: stats.speakingMinutes,
      suffix: 'mins',
      icon: Clock,
      color: 'from-indigo-500 to-blue-500',
      bgColor: 'from-indigo-500/10 to-blue-500/10',
      description: 'Keep talking!',
      trend: '+30 mins this week'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        
        return (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
            className="relative"
          >
            <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all dark:bg-slate-900/50 dark:border dark:border-slate-800">
              {/* Gradient Background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${card.bgColor} opacity-50 dark:opacity-30`} />
              
              <CardHeader className="relative pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {card.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg bg-gradient-to-r ${card.color}`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="relative space-y-2">
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl font-bold">
                    <CountUp
                      start={0}
                      end={card.value}
                      duration={1.5}
                      separator=","
                      decimals={card.suffix === '%' ? 1 : 0}
                    />
                  </span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">{card.suffix}</span>
                </div>
                
                {card.progress !== undefined && (
                  <Progress value={card.progress} className="h-2 bg-slate-200 dark:bg-slate-700">
                    <div 
                      className={`h-full bg-gradient-to-r ${card.color} rounded-full transition-all`}
                      style={{ width: `${card.progress}%` }}
                    />
                  </Progress>
                )}
                
                <p className="text-xs text-slate-600 dark:text-slate-400">{card.description}</p>
                
                {card.trend && (
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-green-500 font-medium">{card.trend}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
};

export default StatsCards;