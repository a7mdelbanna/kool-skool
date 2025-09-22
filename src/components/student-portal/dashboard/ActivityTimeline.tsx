import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BookOpen, 
  Trophy, 
  Target, 
  MessageSquare,
  FileText,
  Video,
  CheckCircle,
  Clock,
  Star,
  Zap,
  Award
} from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  type: 'lesson' | 'homework' | 'achievement' | 'practice' | 'message' | 'feedback';
  title: string;
  description: string;
  timestamp: Date;
  icon: any;
  color: string;
  points?: number;
}

interface ActivityTimelineProps {
  activities?: Activity[];
}

const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ activities }) => {
  // Default activities if none provided
  const defaultActivities: Activity[] = [
    {
      id: '1',
      type: 'lesson',
      title: 'Completed Lesson',
      description: 'Business English - Unit 5',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      icon: BookOpen,
      color: 'text-blue-500',
      points: 50
    },
    {
      id: '2',
      type: 'achievement',
      title: 'New Achievement Unlocked!',
      description: '7-Day Streak Master',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
      icon: Trophy,
      color: 'text-yellow-500',
      points: 100
    },
    {
      id: '3',
      type: 'homework',
      title: 'Homework Submitted',
      description: 'Essay on Global Communication',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      icon: FileText,
      color: 'text-green-500',
      points: 30
    },
    {
      id: '4',
      type: 'practice',
      title: 'Vocabulary Practice',
      description: 'Mastered 15 new words',
      timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000),
      icon: Target,
      color: 'text-purple-500',
      points: 45
    },
    {
      id: '5',
      type: 'feedback',
      title: 'Teacher Feedback',
      description: 'Great progress on pronunciation!',
      timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000),
      icon: Star,
      color: 'text-orange-500'
    },
    {
      id: '6',
      type: 'lesson',
      title: 'Joined Online Session',
      description: 'Speaking Practice with Ms. Johnson',
      timestamp: new Date(Date.now() - 96 * 60 * 60 * 1000),
      icon: Video,
      color: 'text-indigo-500',
      points: 60
    }
  ];

  const timelineActivities = activities || defaultActivities;

  const getActivityBadge = (type: string) => {
    switch (type) {
      case 'achievement':
        return <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20">Achievement</Badge>;
      case 'lesson':
        return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">Lesson</Badge>;
      case 'homework':
        return <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">Homework</Badge>;
      case 'practice':
        return <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">Practice</Badge>;
      case 'feedback':
        return <Badge className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20">Feedback</Badge>;
      default:
        return <Badge variant="outline">Activity</Badge>;
    }
  };

  return (
    <Card className="h-full shadow-lg bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-700/50 backdrop-blur-sm">
      <CardHeader className="p-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">Recent Activity</CardTitle>
          <Badge variant="outline" className="text-xs border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400">
            <Clock className="h-3 w-3 mr-1" />
            Last 7 days
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <ScrollArea className="h-[400px] pr-4">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500/20 via-purple-500/20 to-transparent dark:from-blue-400/20 dark:via-purple-400/20"></div>
            
            {/* Timeline items */}
            <div className="space-y-8">
              {timelineActivities.map((activity, index) => {
                const Icon = activity.icon;
                
                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative flex items-start space-x-4"
                  >
                    {/* Icon */}
                    <div className="relative z-10">
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        className={`p-2.5 rounded-full bg-white dark:bg-slate-800 border-2 ${
                          index === 0 ? 'border-blue-500 shadow-lg shadow-blue-500/20 dark:shadow-blue-400/20' : 'border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        <Icon className={`h-4 w-4 ${activity.color}`} />
                      </motion.div>
                      {index === 0 && (
                        <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping"></div>
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{activity.title}</p>
                            {getActivityBadge(activity.type)}
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400">{activity.description}</p>
                        </div>
                        
                        {activity.points && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: index * 0.1 + 0.2 }}
                            className="flex items-center space-x-1 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 dark:from-yellow-500/20 dark:to-amber-500/20 px-2 py-1 rounded-md"
                          >
                            <Zap className="h-3 w-3 text-yellow-500 dark:text-yellow-400" />
                            <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">
                              +{activity.points} XP
                            </span>
                          </motion.div>
                        )}
                      </div>
                      
                      <p className="text-xs text-slate-500 dark:text-slate-500">
                        {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ActivityTimeline;