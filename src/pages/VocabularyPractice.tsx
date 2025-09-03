import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Trophy,
  Zap,
  Star,
  Volume2,
  Eye,
  EyeOff,
  ChevronRight,
  CheckCircle,
  XCircle,
  Shuffle,
  Brain,
  Target,
  Flame
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { databaseService } from '@/services/firebase/database.service';
import { sessionDetailsService } from '@/services/firebase/sessionDetails.service';
import { vocabularyProgressService } from '@/services/firebase/vocabularyProgress.service';
import FlashcardMode from '@/components/practice/FlashcardMode';
import MatchingMode from '@/components/practice/MatchingMode';
import TypingMode from '@/components/practice/TypingMode';

type PracticeMode = 'flashcards' | 'matching' | 'typing' | 'mixed';

interface PracticeStats {
  correct: number;
  incorrect: number;
  streak: number;
  bestStreak: number;
  xpEarned: number;
  startTime: Date;
  responseTime: number[];
}

const VocabularyPractice = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Practice settings from URL params
  const mode = (searchParams.get('mode') as PracticeMode) || 'flashcards';
  const sessionFilter = searchParams.get('session');
  
  // Practice state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPracticing, setIsPracticing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [practiceWords, setPracticeWords] = useState<any[]>([]);
  const [stats, setStats] = useState<PracticeStats>({
    correct: 0,
    incorrect: 0,
    streak: 0,
    bestStreak: 0,
    xpEarned: 0,
    startTime: new Date(),
    responseTime: []
  });
  
  // Fetch student data
  const { data: student } = useQuery({
    queryKey: ['student-practice', studentId],
    queryFn: async () => {
      if (!studentId) throw new Error('No student ID');
      return await databaseService.getById('students', studentId);
    },
    enabled: !!studentId
  });
  
  // Fetch all session details for vocabulary
  const { data: sessionDetails = [], isLoading } = useQuery({
    queryKey: ['student-vocabulary', studentId, sessionFilter],
    queryFn: async () => {
      if (!studentId) return [];
      
      let sessions;
      if (sessionFilter) {
        // Get specific session
        sessions = await databaseService.query('sessions', {
          where: [
            { field: 'student_id', operator: '==', value: studentId },
            { field: 'id', operator: '==', value: sessionFilter }
          ]
        });
      } else {
        // Get all sessions
        sessions = await databaseService.query('sessions', {
          where: [{ field: 'student_id', operator: '==', value: studentId }]
        });
      }
      
      if (!sessions || sessions.length === 0) return [];
      
      const details = await Promise.all(
        sessions.map(async (session: any) => {
          const detail = await sessionDetailsService.getBySessionId(session.id);
          return detail;
        })
      );
      
      return details.filter(d => d !== null);
    },
    enabled: !!studentId
  });
  
  // Get vocabulary progress
  const { data: progressData = [] } = useQuery({
    queryKey: ['vocabulary-progress', studentId],
    queryFn: async () => {
      if (!studentId) return [];
      return await vocabularyProgressService.getStudentProgress(studentId);
    },
    enabled: !!studentId
  });
  
  // Prepare vocabulary for practice
  useEffect(() => {
    const allWords: any[] = [];
    
    sessionDetails.forEach((detail: any) => {
      if (detail?.vocabulary && Array.isArray(detail.vocabulary)) {
        detail.vocabulary.forEach((word: any) => {
          // Find progress for this word
          const wordProgress = progressData.find(
            p => p.english === word.english && p.translation === word.translation
          );
          
          allWords.push({
            ...word,
            session_id: detail.session_id,
            mastery_level: wordProgress?.mastery_level || 0,
            practice_count: wordProgress?.practice_count || 0,
            last_practiced: wordProgress?.last_practiced,
            word_id: `${word.english}-${word.translation}`
          });
        });
      }
    });
    
    // Shuffle words for practice
    const shuffled = [...allWords].sort(() => Math.random() - 0.5);
    setPracticeWords(shuffled);
  }, [sessionDetails, progressData]);
  
  // Handle answer submission
  const handleAnswer = useCallback(async (correct: boolean, responseTime: number) => {
    const currentWord = practiceWords[currentIndex];
    
    // Update stats
    const newStreak = correct ? stats.streak + 1 : 0;
    const newBestStreak = Math.max(stats.bestStreak, newStreak);
    const xpGained = correct ? 10 + (newStreak * 2) : 2; // Bonus XP for streaks
    
    setStats(prev => ({
      ...prev,
      correct: correct ? prev.correct + 1 : prev.correct,
      incorrect: correct ? prev.incorrect : prev.incorrect + 1,
      streak: newStreak,
      bestStreak: newBestStreak,
      xpEarned: prev.xpEarned + xpGained,
      responseTime: [...prev.responseTime, responseTime]
    }));
    
    // Update progress in database
    await vocabularyProgressService.updateWordProgress(
      studentId!,
      {
        english: currentWord.english,
        translation: currentWord.translation,
        session_id: currentWord.session_id
      },
      {
        correct,
        responseTime,
        practiceType: mode === 'mixed' ? 'flashcard' : mode
      }
    );
    
    // Show feedback
    if (correct && newStreak > 0 && newStreak % 5 === 0) {
      // Celebrate streaks
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
    
    // Move to next word or finish
    if (currentIndex < practiceWords.length - 1) {
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 1000);
    } else {
      // Practice complete
      finishPractice();
    }
  }, [currentIndex, practiceWords, stats, studentId, mode]);
  
  // Finish practice session
  const finishPractice = useCallback(async () => {
    setIsPracticing(false);
    setShowResults(true);
    
    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - stats.startTime.getTime()) / 1000);
    const accuracy = stats.correct / (stats.correct + stats.incorrect) * 100;
    
    // Save practice session
    await vocabularyProgressService.createPracticeSession({
      student_id: studentId!,
      session_type: mode,
      total_words: practiceWords.length,
      correct_answers: stats.correct,
      incorrect_answers: stats.incorrect,
      accuracy_rate: accuracy,
      start_time: stats.startTime,
      end_time: endTime,
      duration_seconds: duration,
      xp_earned: stats.xpEarned,
      achievements_unlocked: [], // Will be filled by achievement check
      combo_best: stats.bestStreak,
      word_ids: practiceWords.map(w => w.word_id),
      session_ids: sessionFilter ? [sessionFilter] : undefined
    });
    
    // Check for achievements
    const totalWords = progressData.length;
    const masteredWords = progressData.filter(p => p.mastery_level >= 80).length;
    
    const achievements = await vocabularyProgressService.checkAchievements(studentId!, {
      totalWords,
      masteredWords,
      streak: stats.bestStreak,
      accuracy: Math.round(accuracy),
      totalSessions: 1 // This session
    });
    
    if (achievements.length > 0) {
      // Show achievement notification
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.3 }
      });
    }
  }, [stats, practiceWords, studentId, mode, sessionFilter, progressData]);
  
  // Start practice
  const startPractice = () => {
    if (practiceWords.length === 0) return;
    
    setIsPracticing(true);
    setShowResults(false);
    setCurrentIndex(0);
    setStats({
      correct: 0,
      incorrect: 0,
      streak: 0,
      bestStreak: 0,
      xpEarned: 0,
      startTime: new Date(),
      responseTime: []
    });
  };
  
  // Reset practice
  const resetPractice = () => {
    startPractice();
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-muted-foreground mb-4">Student not found</p>
        <Button onClick={() => navigate('/students')}>Back to Students</Button>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-green-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(`/student/${studentId}`)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Vocabulary Practice</h1>
                <p className="text-muted-foreground">
                  {student.first_name} {student.last_name} • {practiceWords.length} words
                </p>
              </div>
            </div>
            
            {isPracticing && (
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="gap-1">
                  <Flame className="h-3 w-3" />
                  {stats.streak} streak
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <Zap className="h-3 w-3" />
                  {stats.xpEarned} XP
                </Badge>
                <Progress 
                  value={(currentIndex / practiceWords.length) * 100} 
                  className="w-32 h-2"
                />
                <span className="text-sm text-muted-foreground">
                  {currentIndex + 1} / {practiceWords.length}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {!isPracticing && !showResults && (
          // Practice Setup
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Ready to Practice?
                </CardTitle>
                <CardDescription>
                  Choose your practice mode and start learning
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Mode Selection */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card 
                    className={`cursor-pointer transition-all ${
                      mode === 'flashcards' ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => navigate(`?mode=flashcards${sessionFilter ? `&session=${sessionFilter}` : ''}`)}
                  >
                    <CardContent className="p-4 text-center">
                      <Shuffle className="h-8 w-8 mx-auto mb-2" />
                      <p className="font-medium">Flashcards</p>
                    </CardContent>
                  </Card>
                  
                  <Card 
                    className={`cursor-pointer transition-all ${
                      mode === 'matching' ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => navigate(`?mode=matching${sessionFilter ? `&session=${sessionFilter}` : ''}`)}
                  >
                    <CardContent className="p-4 text-center">
                      <Target className="h-8 w-8 mx-auto mb-2" />
                      <p className="font-medium">Matching</p>
                    </CardContent>
                  </Card>
                  
                  <Card 
                    className={`cursor-pointer transition-all ${
                      mode === 'typing' ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => navigate(`?mode=typing${sessionFilter ? `&session=${sessionFilter}` : ''}`)}
                  >
                    <CardContent className="p-4 text-center">
                      <Volume2 className="h-8 w-8 mx-auto mb-2" />
                      <p className="font-medium">Listen & Type</p>
                    </CardContent>
                  </Card>
                  
                  <Card 
                    className={`cursor-pointer transition-all ${
                      mode === 'mixed' ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => navigate(`?mode=mixed${sessionFilter ? `&session=${sessionFilter}` : ''}`)}
                  >
                    <CardContent className="p-4 text-center">
                      <Zap className="h-8 w-8 mx-auto mb-2" />
                      <p className="font-medium">Mixed</p>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Word Preview */}
                <div>
                  <h3 className="font-medium mb-3">Words to Practice ({practiceWords.length})</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                    {practiceWords.slice(0, 12).map((word, index) => (
                      <div 
                        key={index}
                        className="p-2 bg-gray-50 rounded-lg text-sm"
                      >
                        <p className="font-medium">{word.english}</p>
                        <p className="text-muted-foreground text-xs">{word.translation}</p>
                        {word.mastery_level > 0 && (
                          <Progress value={word.mastery_level} className="h-1 mt-1" />
                        )}
                      </div>
                    ))}
                    {practiceWords.length > 12 && (
                      <div className="p-2 bg-gray-50 rounded-lg text-sm flex items-center justify-center text-muted-foreground">
                        +{practiceWords.length - 12} more
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Start Button */}
                <div className="flex justify-center">
                  <Button 
                    size="lg" 
                    onClick={startPractice}
                    disabled={practiceWords.length === 0}
                    className="gap-2"
                  >
                    <Play className="h-5 w-5" />
                    Start Practice
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {isPracticing && (
          // Practice Mode Component
          <div className="max-w-4xl mx-auto">
            <AnimatePresence mode="wait">
              {mode === 'flashcards' && (
                <FlashcardMode
                  word={practiceWords[currentIndex]}
                  onAnswer={handleAnswer}
                  stats={stats}
                />
              )}
              {mode === 'matching' && (
                <MatchingMode
                  words={practiceWords.slice(currentIndex, Math.min(currentIndex + 6, practiceWords.length))}
                  onComplete={(results) => {
                    results.forEach(r => handleAnswer(r.correct, r.responseTime));
                  }}
                />
              )}
              {mode === 'typing' && (
                <TypingMode
                  word={practiceWords[currentIndex]}
                  onAnswer={handleAnswer}
                />
              )}
              {mode === 'mixed' && (
                // Rotate between modes
                currentIndex % 3 === 0 ? (
                  <FlashcardMode
                    word={practiceWords[currentIndex]}
                    onAnswer={handleAnswer}
                    stats={stats}
                  />
                ) : currentIndex % 3 === 1 ? (
                  <TypingMode
                    word={practiceWords[currentIndex]}
                    onAnswer={handleAnswer}
                  />
                ) : (
                  <MatchingMode
                    words={practiceWords.slice(currentIndex, Math.min(currentIndex + 6, practiceWords.length))}
                    onComplete={(results) => {
                      results.forEach(r => handleAnswer(r.correct, r.responseTime));
                    }}
                  />
                )
              )}
            </AnimatePresence>
          </div>
        )}
        
        {showResults && (
          // Results Screen
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-center text-3xl">
                    Practice Complete! 🎉
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Score */}
                  <div className="text-center">
                    <div className="text-6xl font-bold mb-2">
                      {Math.round((stats.correct / (stats.correct + stats.incorrect)) * 100)}%
                    </div>
                    <p className="text-muted-foreground">Accuracy</p>
                  </div>
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold">{stats.correct}</p>
                        <p className="text-sm text-muted-foreground">Correct</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4 text-center">
                        <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold">{stats.incorrect}</p>
                        <p className="text-sm text-muted-foreground">Incorrect</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Flame className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold">{stats.bestStreak}</p>
                        <p className="text-sm text-muted-foreground">Best Streak</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Zap className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold">{stats.xpEarned}</p>
                        <p className="text-sm text-muted-foreground">XP Earned</p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex justify-center gap-4">
                    <Button variant="outline" onClick={resetPractice}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Practice Again
                    </Button>
                    <Button onClick={() => navigate(`/student/${studentId}`)}>
                      View Progress
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VocabularyPractice;