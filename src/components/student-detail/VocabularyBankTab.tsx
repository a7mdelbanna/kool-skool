import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  BookOpen, 
  Volume2, 
  Eye,
  EyeOff,
  Shuffle,
  GraduationCap,
  Star,
  TrendingUp,
  Calendar,
  Brain,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';

interface VocabularyBankTabProps {
  sessionDetails: any[];
  studentId: string;
  isLoading: boolean;
}

const VocabularyBankTab: React.FC<VocabularyBankTabProps> = ({
  sessionDetails,
  studentId,
  isLoading
}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState<string>('all');
  const [showTranslations, setShowTranslations] = useState(true);
  const [sortBy, setSortBy] = useState<'date' | 'alphabetical' | 'mastery'>('date');

  // Aggregate all vocabulary with session info
  const allVocabulary = useMemo(() => {
    const vocabMap = new Map();
    
    sessionDetails.forEach((detail: any) => {
      if (detail?.vocabulary && Array.isArray(detail.vocabulary)) {
        detail.vocabulary.forEach((word: any) => {
          const key = `${word.english}-${word.translation}`;
          if (!vocabMap.has(key)) {
            vocabMap.set(key, {
              ...word,
              sessions: [detail.session_id],
              firstSeen: detail.sessionDate || new Date(),
              masteryLevel: word.masteryLevel || 0,
              practiceCount: word.practiceCount || 0,
              lastPracticed: word.lastPracticed || null
            });
          } else {
            const existing = vocabMap.get(key);
            existing.sessions.push(detail.session_id);
          }
        });
      }
    });
    
    return Array.from(vocabMap.values());
  }, [sessionDetails]);

  // Filter and sort vocabulary
  const filteredVocabulary = useMemo(() => {
    let filtered = allVocabulary;
    
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(word => 
        word.english?.toLowerCase().includes(searchLower) ||
        word.translation?.toLowerCase().includes(searchLower)
      );
    }
    
    // Filter by session
    if (selectedSession !== 'all') {
      filtered = filtered.filter(word => 
        word.sessions.includes(selectedSession)
      );
    }
    
    // Sort
    switch (sortBy) {
      case 'alphabetical':
        filtered.sort((a, b) => a.english.localeCompare(b.english));
        break;
      case 'mastery':
        filtered.sort((a, b) => (b.masteryLevel || 0) - (a.masteryLevel || 0));
        break;
      case 'date':
      default:
        filtered.sort((a, b) => 
          new Date(b.firstSeen).getTime() - new Date(a.firstSeen).getTime()
        );
    }
    
    return filtered;
  }, [allVocabulary, searchTerm, selectedSession, sortBy]);

  // Get unique sessions for filter
  const uniqueSessions = useMemo(() => {
    const sessions = new Set<string>();
    sessionDetails.forEach((detail: any) => {
      if (detail?.session_id) {
        sessions.add(detail.session_id);
      }
    });
    return Array.from(sessions);
  }, [sessionDetails]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalWords = allVocabulary.length;
    const masteredWords = allVocabulary.filter(w => (w.masteryLevel || 0) >= 80).length;
    const practicedWords = allVocabulary.filter(w => w.practiceCount > 0).length;
    const avgMastery = totalWords > 0 
      ? Math.round(allVocabulary.reduce((sum, w) => sum + (w.masteryLevel || 0), 0) / totalWords)
      : 0;
    
    return {
      totalWords,
      masteredWords,
      practicedWords,
      avgMastery
    };
  }, [allVocabulary]);

  const getMasteryColor = (level: number) => {
    if (level >= 80) return 'text-green-500';
    if (level >= 60) return 'text-yellow-500';
    if (level >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getMasteryLabel = (level: number) => {
    if (level >= 80) return 'Mastered';
    if (level >= 60) return 'Good';
    if (level >= 40) return 'Learning';
    return 'New';
  };

  const handleStartPractice = (mode: 'flashcards' | 'matching' | 'typing' | 'all') => {
    // Navigate to practice mode with selected words
    const practiceMode = mode === 'all' ? 'mixed' : mode;
    const sessionParam = selectedSession !== 'all' ? `&session=${selectedSession}` : '';
    navigate(`/student/${studentId}/practice?mode=${practiceMode}${sessionParam}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="h-32 animate-pulse bg-gray-100" />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Words
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.totalWords}</span>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Mastered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.masteredWords}</span>
              <Star className="h-4 w-4 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Practiced
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.practicedWords}</span>
              <Brain className="h-4 w-4 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. Mastery
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.avgMastery}%</span>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Practice Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Practice
          </CardTitle>
          <CardDescription>
            Start a practice session with the filtered words
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button 
              onClick={() => handleStartPractice('flashcards')}
              className="gap-2"
              variant="outline"
            >
              <Shuffle className="h-4 w-4" />
              Flashcards
            </Button>
            <Button 
              onClick={() => handleStartPractice('matching')}
              className="gap-2"
              variant="outline"
            >
              <GraduationCap className="h-4 w-4" />
              Matching
            </Button>
            <Button 
              onClick={() => handleStartPractice('typing')}
              className="gap-2"
              variant="outline"
            >
              <Volume2 className="h-4 w-4" />
              Listen & Type
            </Button>
            <Button 
              onClick={() => handleStartPractice('all')}
              className="gap-2"
              variant="default"
            >
              <Zap className="h-4 w-4" />
              Mixed Practice
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Vocabulary List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Vocabulary Bank</CardTitle>
              <CardDescription>
                {filteredVocabulary.length} of {allVocabulary.length} words
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTranslations(!showTranslations)}
              className="gap-2"
            >
              {showTranslations ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              {showTranslations ? 'Hide' : 'Show'} Translations
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vocabulary..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">All Sessions</option>
              {uniqueSessions.map(sessionId => (
                <option key={sessionId} value={sessionId}>
                  Session {sessionId.slice(-6)}
                </option>
              ))}
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="date">By Date</option>
              <option value="alphabetical">Alphabetical</option>
              <option value="mastery">By Mastery</option>
            </select>
          </div>

          {/* Vocabulary Grid */}
          {filteredVocabulary.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredVocabulary.map((word: any, index: number) => (
                <Card key={`${word.english}-${index}`} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-lg">{word.english}</p>
                        {showTranslations && (
                          <p className="text-muted-foreground">{word.translation}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          // Play pronunciation
                          const utterance = new SpeechSynthesisUtterance(word.english);
                          utterance.lang = 'en-US';
                          speechSynthesis.speak(utterance);
                        }}
                      >
                        <Volume2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="secondary"
                          className={getMasteryColor(word.masteryLevel || 0)}
                        >
                          {getMasteryLabel(word.masteryLevel || 0)}
                        </Badge>
                        {word.practiceCount > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {word.practiceCount} practices
                          </span>
                        )}
                      </div>
                      
                      {word.sessions.length > 1 && (
                        <Badge variant="outline" className="text-xs">
                          {word.sessions.length} sessions
                        </Badge>
                      )}
                    </div>
                    
                    {word.lastPracticed && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Last practiced: {format(new Date(word.lastPracticed), 'MMM dd')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || selectedSession !== 'all' 
                  ? 'No words found matching your filters' 
                  : 'No vocabulary added yet'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VocabularyBankTab;