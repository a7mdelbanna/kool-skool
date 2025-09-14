import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  Brain, 
  FileText, 
  MessageSquare,
  Calendar,
  BookOpen,
  Headphones,
  PenTool,
  Target,
  Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  bgGradient: string;
  action: () => void;
  badge?: string;
  disabled?: boolean;
}

interface QuickActionsProps {
  nextSession?: {
    time: string;
    teacher: string;
    zoomLink?: string;
  };
}

const QuickActions: React.FC<QuickActionsProps> = ({ nextSession }) => {
  const navigate = useNavigate();

  const actions: QuickAction[] = [
    {
      id: 'join-class',
      title: 'Join Next Class',
      description: nextSession ? `${nextSession.time} with ${nextSession.teacher}` : 'No upcoming sessions',
      icon: Video,
      color: 'text-white',
      bgGradient: 'from-blue-500 to-purple-600',
      action: () => {
        if (nextSession?.zoomLink) {
          window.open(nextSession.zoomLink, '_blank');
        }
      },
      badge: 'Live',
      disabled: !nextSession
    },
    {
      id: 'practice-vocab',
      title: 'Practice Vocabulary',
      description: '25 words to review',
      icon: Brain,
      color: 'text-white',
      bgGradient: 'from-purple-500 to-pink-600',
      action: () => navigate('/student-dashboard/practice/vocabulary'),
      badge: 'New'
    },
    {
      id: 'submit-homework',
      title: 'Submit Homework',
      description: '2 pending assignments',
      icon: FileText,
      color: 'text-white',
      bgGradient: 'from-green-500 to-emerald-600',
      action: () => navigate('/student-dashboard/homework'),
      badge: '2'
    },
    {
      id: 'speaking-practice',
      title: 'Speaking Practice',
      description: 'Daily conversation topic',
      icon: Headphones,
      color: 'text-white',
      bgGradient: 'from-orange-500 to-red-600',
      action: () => navigate('/student-dashboard/practice/speaking'),
      badge: 'Daily'
    },
    {
      id: 'schedule-session',
      title: 'Book Session',
      description: 'Schedule your next class',
      icon: Calendar,
      color: 'text-white',
      bgGradient: 'from-cyan-500 to-blue-600',
      action: () => navigate('/student-dashboard/schedule')
    },
    {
      id: 'view-materials',
      title: 'Course Materials',
      description: 'Access study resources',
      icon: BookOpen,
      color: 'text-white',
      bgGradient: 'from-indigo-500 to-purple-600',
      action: () => navigate('/student-dashboard/resources')
    }
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
          <Sparkles className="h-5 w-5 text-yellow-500" />
        </div>
      </CardHeader>
      <CardContent>
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {actions.map((action) => {
            const Icon = action.icon;
            
            return (
              <motion.div key={action.id} variants={item}>
                <Button
                  onClick={action.action}
                  disabled={action.disabled}
                  className="relative w-full h-auto p-0 overflow-hidden group hover:shadow-lg transition-all"
                  variant="ghost"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.bgGradient} opacity-90 group-hover:opacity-100 transition-opacity`} />
                  
                  <div className="relative p-4 w-full text-left space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                        <Icon className={`h-5 w-5 ${action.color}`} />
                      </div>
                      {action.badge && (
                        <Badge className="bg-white/20 text-white border-white/30 text-xs">
                          {action.badge}
                        </Badge>
                      )}
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-white text-sm">{action.title}</h3>
                      <p className="text-xs text-white/80 mt-1">{action.description}</p>
                    </div>
                  </div>
                  
                  {/* Hover Effect */}
                  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform" />
                </Button>
              </motion.div>
            );
          })}
        </motion.div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;