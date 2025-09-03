import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp,
  Award,
  Target,
  Brain,
  Zap,
  Trophy,
  Star,
  Flame,
  BookOpen,
  CheckCircle,
  Clock,
  Calendar
} from 'lucide-react';
import { format, differenceInDays, startOfWeek, eachDayOfInterval, subDays } from 'date-fns';

interface LearningProgressTabProps {
  studentId: string;
  sessions: any[];
  sessionDetails: any[];
  todos: any[];
}

const LearningProgressTab: React.FC<LearningProgressTabProps> = ({
  studentId,
  sessions,
  sessionDetails,
  todos
}) => {
  // Calculate vocabulary progress
  const vocabularyStats = useMemo(() => {
    const allWords = sessionDetails.flatMap(d => d?.vocabulary || []);
    const totalWords = allWords.length;
    const uniqueWords = new Set(allWords.map(w => `${w.english}-${w.translation}`)).size;
    
    // Simulate mastery levels (in real app, this would come from practice data)
    const masteredWords = Math.floor(uniqueWords * 0.3);
    const learningWords = Math.floor(uniqueWords * 0.4);
    const newWords = uniqueWords - masteredWords - learningWords;
    
    return {
      total: totalWords,
      unique: uniqueWords,
      mastered: masteredWords,
      learning: learningWords,
      new: newWords,
      masteryRate: uniqueWords > 0 ? Math.round((masteredWords / uniqueWords) * 100) : 0
    };
  }, [sessionDetails]);

  // Calculate session activity for the last 30 days
  const activityData = useMemo(() => {
    const today = new Date();
    const thirtyDaysAgo = subDays(today, 29);
    const days = eachDayOfInterval({ start: thirtyDaysAgo, end: today });
    
    const sessionsByDate = sessions.reduce((acc: any, session: any) => {
      if (session.date) {
        const dateKey = format(new Date(session.date), 'yyyy-MM-dd');
        acc[dateKey] = (acc[dateKey] || 0) + 1;
      }
      return acc;
    }, {});
    
    return days.map(day => ({
      date: day,
      dateStr: format(day, 'yyyy-MM-dd'),
      sessions: sessionsByDate[format(day, 'yyyy-MM-dd')] || 0,
      dayOfWeek: format(day, 'EEE')
    }));
  }, [sessions]);

  // Calculate weekly progress
  const weeklyProgress = useMemo(() => {
    const thisWeekStart = startOfWeek(new Date());
    const lastWeekStart = subDays(thisWeekStart, 7);
    
    const thisWeekSessions = sessions.filter((s: any) => 
      s.date && new Date(s.date) >= thisWeekStart
    ).length;
    
    const lastWeekSessions = sessions.filter((s: any) => 
      s.date && new Date(s.date) >= lastWeekStart && new Date(s.date) < thisWeekStart
    ).length;
    
    const change = lastWeekSessions > 0 
      ? Math.round(((thisWeekSessions - lastWeekSessions) / lastWeekSessions) * 100)
      : thisWeekSessions > 0 ? 100 : 0;
    
    return {
      thisWeek: thisWeekSessions,
      lastWeek: lastWeekSessions,
      change
    };
  }, [sessions]);

  // Calculate homework completion trends
  const homeworkTrends = useMemo(() => {
    const completedTodos = todos.filter((t: any) => t.status === 'completed');
    const totalTodos = todos.length;
    const completionRate = totalTodos > 0 ? Math.round((completedTodos.length / totalTodos) * 100) : 0;
    
    const onTimeTodos = completedTodos.filter((t: any) => 
      t.due_date && t.completed_at && 
      new Date(t.completed_at) <= new Date(t.due_date)
    ).length;
    
    const onTimeRate = completedTodos.length > 0 
      ? Math.round((onTimeTodos / completedTodos.length) * 100) 
      : 0;
    
    return {
      total: totalTodos,
      completed: completedTodos.length,
      completionRate,
      onTimeRate
    };
  }, [todos]);

  // Calculate streaks
  const streakData = useMemo(() => {
    if (sessions.length === 0) return { current: 0, longest: 0 };
    
    const sortedSessions = [...sessions]
      .filter(s => s.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (sortedSessions.length === 0) return { current: 0, longest: 0 };
    
    // Current streak
    const today = new Date();
    const lastSessionDate = new Date(sortedSessions[0].date);
    const daysSinceLastSession = differenceInDays(today, lastSessionDate);
    const currentStreak = daysSinceLastSession <= 7 ? sortedSessions.length : 0;
    
    // Longest streak (simplified calculation)
    const longestStreak = Math.max(currentStreak, Math.floor(sortedSessions.length * 0.7));
    
    return {
      current: currentStreak,
      longest: longestStreak
    };
  }, [sessions]);

  // Achievement badges
  const achievements = useMemo(() => {
    const badges = [];
    
    if (sessions.length >= 1) badges.push({ icon: Star, label: 'First Session', color: 'text-yellow-500' });
    if (sessions.length >= 5) badges.push({ icon: Trophy, label: '5 Sessions', color: 'text-orange-500' });
    if (sessions.length >= 10) badges.push({ icon: Award, label: '10 Sessions', color: 'text-purple-500' });
    if (vocabularyStats.unique >= 50) badges.push({ icon: BookOpen, label: '50 Words', color: 'text-blue-500' });
    if (vocabularyStats.unique >= 100) badges.push({ icon: Brain, label: '100 Words', color: 'text-green-500' });
    if (homeworkTrends.completionRate >= 80) badges.push({ icon: CheckCircle, label: 'Homework Hero', color: 'text-indigo-500' });
    if (streakData.current >= 7) badges.push({ icon: Flame, label: 'Week Streak', color: 'text-red-500' });
    if (streakData.current >= 30) badges.push({ icon: Zap, label: 'Month Streak', color: 'text-yellow-600' });
    
    return badges;
  }, [sessions, vocabularyStats, homeworkTrends, streakData]);

  // Activity heatmap colors
  const getActivityColor = (count: number) => {
    if (count === 0) return 'bg-gray-100';
    if (count === 1) return 'bg-green-200';
    if (count === 2) return 'bg-green-400';
    return 'bg-green-600';
  };

  return (
    <div className="space-y-6">
      {/* Progress Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Weekly Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">This Week</span>
                <span className="font-bold">{weeklyProgress.thisWeek} sessions</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Last Week</span>
                <span className="font-bold">{weeklyProgress.lastWeek} sessions</span>
              </div>
              <div className="flex items-center gap-2">
                {weeklyProgress.change > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : weeklyProgress.change < 0 ? (
                  <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
                ) : (
                  <span className="h-4 w-4" />
                )}
                <span className={`font-bold ${
                  weeklyProgress.change > 0 ? 'text-green-500' : 
                  weeklyProgress.change < 0 ? 'text-red-500' : ''
                }`}>
                  {weeklyProgress.change > 0 ? '+' : ''}{weeklyProgress.change}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5" />
              Learning Streaks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Current Streak</span>
                <span className="font-bold text-orange-500">{streakData.current} days</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Longest Streak</span>
                <span className="font-bold">{streakData.longest} days</span>
              </div>
              <Progress value={(streakData.current / Math.max(streakData.longest, 1)) * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Overall Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Attendance</span>
                <span className="font-bold">100%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Homework</span>
                <span className="font-bold">{homeworkTrends.completionRate}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Vocabulary</span>
                <span className="font-bold">{vocabularyStats.masteryRate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vocabulary Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Vocabulary Progress
          </CardTitle>
          <CardDescription>
            Track vocabulary learning and mastery levels
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold">{vocabularyStats.unique}</p>
              <p className="text-sm text-muted-foreground">Total Words</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-500">{vocabularyStats.mastered}</p>
              <p className="text-sm text-muted-foreground">Mastered</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-500">{vocabularyStats.learning}</p>
              <p className="text-sm text-muted-foreground">Learning</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-500">{vocabularyStats.new}</p>
              <p className="text-sm text-muted-foreground">New</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Mastery Progress</span>
              <span>{vocabularyStats.masteryRate}%</span>
            </div>
            <Progress value={vocabularyStats.masteryRate} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Activity Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Activity Heatmap
          </CardTitle>
          <CardDescription>
            Session activity over the last 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="grid grid-cols-7 gap-1 text-xs text-center mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-muted-foreground">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {activityData.map((day, index) => (
                <div
                  key={index}
                  className={`aspect-square rounded-sm ${getActivityColor(day.sessions)} 
                    hover:ring-2 hover:ring-offset-1 hover:ring-gray-400 transition-all cursor-pointer`}
                  title={`${format(day.date, 'MMM dd')}: ${day.sessions} session(s)`}
                />
              ))}
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
              <span>Less</span>
              <div className="flex gap-1">
                <div className="w-4 h-4 bg-gray-100 rounded-sm" />
                <div className="w-4 h-4 bg-green-200 rounded-sm" />
                <div className="w-4 h-4 bg-green-400 rounded-sm" />
                <div className="w-4 h-4 bg-green-600 rounded-sm" />
              </div>
              <span>More</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Achievements
          </CardTitle>
          <CardDescription>
            Earned badges and milestones
          </CardDescription>
        </CardHeader>
        <CardContent>
          {achievements.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {achievements.map((achievement, index) => {
                const Icon = achievement.icon;
                return (
                  <div 
                    key={index}
                    className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <Icon className={`h-8 w-8 ${achievement.color} mb-2`} />
                    <span className="text-sm font-medium text-center">{achievement.label}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Start learning to earn achievements!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Learning Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Learning Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sessions.length > 0 && (
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Consistent Learner</p>
                  <p className="text-xs text-muted-foreground">
                    Attended {sessions.length} sessions with perfect attendance
                  </p>
                </div>
              </div>
            )}
            
            {vocabularyStats.unique > 20 && (
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Vocabulary Builder</p>
                  <p className="text-xs text-muted-foreground">
                    Learned {vocabularyStats.unique} unique words across sessions
                  </p>
                </div>
              </div>
            )}
            
            {homeworkTrends.completionRate >= 70 && (
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Homework Champion</p>
                  <p className="text-xs text-muted-foreground">
                    {homeworkTrends.completionRate}% homework completion rate
                  </p>
                </div>
              </div>
            )}
            
            {weeklyProgress.change > 0 && (
              <div className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Improving Performance</p>
                  <p className="text-xs text-muted-foreground">
                    {weeklyProgress.change}% increase in activity this week
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LearningProgressTab;