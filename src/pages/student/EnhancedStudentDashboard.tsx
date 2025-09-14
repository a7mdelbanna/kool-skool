import React, { useContext, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { UserContext } from '@/App';
import StatsCards from '@/components/student-portal/dashboard/StatsCards';
import ActivityTimeline from '@/components/student-portal/dashboard/ActivityTimeline';
import QuickActions from '@/components/student-portal/dashboard/QuickActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar,
  Clock,
  Video,
  Star,
  TrendingUp,
  Award,
  Target,
  BookOpen,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { databaseService } from '@/services/firebase/database.service';
import { format } from 'date-fns';
import SessionTimeDisplay from '@/components/SessionTimeDisplay';

interface DashboardStats {
  streak: number;
  xp: number;
  completedLessons: number;
  upcomingSessions: number;
  attendanceRate: number;
  vocabularyMastered: number;
  speakingMinutes: number;
  homeworkCompleted: number;
}

const EnhancedStudentDashboard: React.FC = () => {
  const { user } = useContext(UserContext);
  const { studentData, stats: contextStats } = useOutletContext<any>();
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    streak: contextStats?.streak || 7,
    xp: contextStats?.xp || 750,
    completedLessons: contextStats?.completedLessons || 24,
    upcomingSessions: 3,
    attendanceRate: 92.5,
    vocabularyMastered: 156,
    speakingMinutes: 240,
    homeworkCompleted: 18
  });
  const [nextSession, setNextSession] = useState<any>(null);
  const [motivationalQuote, setMotivationalQuote] = useState({
    text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    author: "Winston Churchill"
  });

  useEffect(() => {
    loadDashboardData();
    checkAchievements();
  }, [studentData]);

  const loadDashboardData = async () => {
    try {
      if (studentData?.id) {
        // Load sessions
        const sessions = await databaseService.getAll('lesson_sessions');
        const studentSessions = sessions?.filter((s: any) => 
          s.student_id === studentData.id && s.status === 'scheduled'
        ) || [];
        
        // Sort by date and get next session
        const sortedSessions = studentSessions.sort((a: any, b: any) => 
          new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
        );
        
        if (sortedSessions.length > 0) {
          setNextSession(sortedSessions[0]);
        }
        
        // Update stats with real data
        setDashboardStats(prev => ({
          ...prev,
          upcomingSessions: sortedSessions.length
        }));
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAchievements = () => {
    // Check for streak milestone
    if (dashboardStats.streak === 7) {
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }, 500);
    }
  };

  const motivationalQuotes = [
    { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
    { text: "Learning is a treasure that will follow its owner everywhere.", author: "Chinese Proverb" },
    { text: "Education is the passport to the future.", author: "Malcolm X" },
    { text: "The beautiful thing about learning is that nobody can take it away from you.", author: "B.B. King" }
  ];

  // Rotate quote daily
  useEffect(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const quoteIndex = dayOfYear % motivationalQuotes.length;
    setMotivationalQuote(motivationalQuotes[quoteIndex]);
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-8 text-white"
      >
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 max-w-3xl">
          <h1 className="text-4xl font-bold mb-4">
            Welcome back, {studentData?.first_name}! 🚀
          </h1>
          <p className="text-lg mb-6 opacity-90">
            "{motivationalQuote.text}"
          </p>
          <p className="text-sm opacity-75">— {motivationalQuote.author}</p>
          
          {/* Achievement Banner */}
          {dashboardStats.streak >= 7 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
              className="mt-6 inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full"
            >
              <Award className="h-5 w-5 text-yellow-300" />
              <span className="font-semibold">7 Day Streak Champion!</span>
              <Sparkles className="h-5 w-5 text-yellow-300" />
            </motion.div>
          )}
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
        <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
      </motion.div>

      {/* Stats Cards */}
      <StatsCards stats={dashboardStats} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Quick Actions & Next Session */}
        <div className="lg:col-span-2 space-y-6">
          {/* Next Session Card */}
          {nextSession && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Next Session</CardTitle>
                    <Badge className="bg-blue-500 text-white">
                      <Clock className="h-3 w-3 mr-1" />
                      Upcoming
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <SessionTimeDisplay date={nextSession.scheduled_date} />
                      </div>
                      <div className="flex items-center space-x-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{nextSession.course?.name || 'General Course'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Video className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">with {nextSession.teacher?.firstName || 'Your Teacher'}</span>
                      </div>
                    </div>
                    <Button 
                      size="lg"
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    >
                      Join Session
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
          
          {/* Quick Actions */}
          <QuickActions nextSession={nextSession ? {
            time: format(new Date(nextSession.scheduled_date), 'h:mm a'),
            teacher: nextSession.teacher?.firstName || 'Teacher',
            zoomLink: nextSession.teacher?.zoomLink
          } : undefined} />
        </div>

        {/* Right Column - Activity Timeline */}
        <div>
          <ActivityTimeline />
        </div>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Weekly Progress</CardTitle>
            <Button variant="outline" size="sm">
              View Details
              <TrendingUp className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: 'Vocabulary', value: 75, color: 'from-purple-500 to-pink-500' },
              { label: 'Grammar', value: 82, color: 'from-blue-500 to-cyan-500' },
              { label: 'Speaking', value: 68, color: 'from-orange-500 to-red-500' },
              { label: 'Writing', value: 90, color: 'from-green-500 to-emerald-500' }
            ].map((skill) => (
              <div key={skill.label} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{skill.label}</span>
                  <span className="text-muted-foreground">{skill.value}%</span>
                </div>
                <Progress value={skill.value} className="h-3">
                  <div 
                    className={`h-full bg-gradient-to-r ${skill.color} rounded-full transition-all`}
                    style={{ width: `${skill.value}%` }}
                  />
                </Progress>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedStudentDashboard;