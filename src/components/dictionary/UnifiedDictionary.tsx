import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  BookOpen,
  Brain,
  MessageSquare,
  Plus,
  Edit3,
  Trash2,
  Volume2,
  RefreshCw,
  Download,
  Upload,
  Star,
  CheckCircle,
  Clock,
  TrendingUp,
  BarChart3,
  Calendar,
  Hash,
  Globe,
  Layers,
  Target,
  Award,
  Zap,
  ChevronRight,
  ChevronDown,
  BookMarked,
  GraduationCap
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { studentDictionaryService } from '@/services/firebase/studentDictionary.service';
import { elevenLabsService } from '@/services/ai/elevenlabs.service';
import type { DictionaryEntry, DictionaryStats } from '@/services/firebase/studentDictionary.service';

interface UnifiedDictionaryProps {
  studentId: string;
  isTeacher?: boolean;
  onPractice?: (words: DictionaryEntry[]) => void;
}

interface GroupedWords {
  [key: string]: DictionaryEntry[];
}

export default function UnifiedDictionary({
  studentId,
  isTeacher = false,
  onPractice
}: UnifiedDictionaryProps) {
  // State
  const [words, setWords] = useState<DictionaryEntry[]>([]);
  const [filteredWords, setFilteredWords] = useState<DictionaryEntry[]>([]);
  const [stats, setStats] = useState<DictionaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedMastery, setSelectedMastery] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'mastery' | 'alphabetical'>('date');
  const [viewMode, setViewMode] = useState<'list' | 'cards' | 'grouped'>('list');
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingWord, setEditingWord] = useState<DictionaryEntry | null>(null);
  const [newWord, setNewWord] = useState({
    english: '',
    translation: '',
    definition: '',
    example: '',
    tags: '',
    difficulty_level: 'intermediate' as const
  });

  // Load dictionary data
  useEffect(() => {
    loadDictionary();
  }, [studentId]);

  // Apply filters
  useEffect(() => {
    applyFilters();
  }, [words, searchQuery, selectedSource, selectedLevel, selectedMastery, sortBy]);

  const loadDictionary = async () => {
    setLoading(true);
    try {
      const [dictionaryData, statsData] = await Promise.all([
        studentDictionaryService.getStudentDictionary(studentId),
        studentDictionaryService.getStats(studentId)
      ]);
      setWords(dictionaryData.words);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading dictionary:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...words];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(word =>
        word.english.toLowerCase().includes(query) ||
        word.translation.toLowerCase().includes(query) ||
        word.definition?.toLowerCase().includes(query) ||
        word.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Source filter
    if (selectedSource !== 'all') {
      filtered = filtered.filter(word => word.source_type === selectedSource);
    }

    // Level filter
    if (selectedLevel !== 'all') {
      filtered = filtered.filter(word => word.difficulty_level === selectedLevel);
    }

    // Mastery filter
    if (selectedMastery !== 'all') {
      if (selectedMastery === 'low') {
        filtered = filtered.filter(word => word.mastery_level <= 33);
      } else if (selectedMastery === 'medium') {
        filtered = filtered.filter(word => word.mastery_level > 33 && word.mastery_level <= 66);
      } else if (selectedMastery === 'high') {
        filtered = filtered.filter(word => word.mastery_level > 66);
      }
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return b.added_at.getTime() - a.added_at.getTime();
        case 'mastery':
          return b.mastery_level - a.mastery_level;
        case 'alphabetical':
          return a.english.localeCompare(b.english);
        default:
          return 0;
      }
    });

    setFilteredWords(filtered);
  };

  const groupWords = (): GroupedWords => {
    const groups: GroupedWords = {};

    filteredWords.forEach(word => {
      let key = '';
      if (viewMode === 'grouped') {
        // Group by source type
        key = word.source_type;
      }
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(word);
    });

    return groups;
  };

  const toggleWordSelection = (wordId: string) => {
    const newSelection = new Set(selectedWords);
    if (newSelection.has(wordId)) {
      newSelection.delete(wordId);
    } else {
      newSelection.add(wordId);
    }
    setSelectedWords(newSelection);
  };

  const selectAllWords = () => {
    if (selectedWords.size === filteredWords.length) {
      setSelectedWords(new Set());
    } else {
      setSelectedWords(new Set(filteredWords.map(w => w.id!)));
    }
  };

  const practiceSelectedWords = () => {
    const wordsToPractice = words.filter(w => selectedWords.has(w.id!));
    onPractice?.(wordsToPractice);
  };

  const playPronunciation = async (word: string) => {
    try {
      const audio = await elevenLabsService.generatePronunciationExample(word);
      const audioElement = new Audio(audio.audio_url);
      audioElement.play();
    } catch (error) {
      console.error('Error playing pronunciation:', error);
    }
  };

  const addWord = async () => {
    if (!newWord.english || !newWord.translation) return;

    try {
      await studentDictionaryService.addWord(
        studentId,
        {
          english: newWord.english,
          translation: newWord.translation,
          language: 'en'
        },
        {
          type: 'manual',
          added_by: isTeacher ? 'teacher' : 'student'
        },
        {
          definition: newWord.definition,
          example_sentences: newWord.example ? [newWord.example] : [],
          tags: newWord.tags ? newWord.tags.split(',').map(t => t.trim()) : [],
          difficulty_level: newWord.difficulty_level
        }
      );

      setNewWord({
        english: '',
        translation: '',
        definition: '',
        example: '',
        tags: '',
        difficulty_level: 'intermediate'
      });
      setShowAddDialog(false);
      loadDictionary();
    } catch (error) {
      console.error('Error adding word:', error);
    }
  };

  const updateWord = async () => {
    if (!editingWord) return;

    try {
      await studentDictionaryService.updateWord(editingWord.id!, {
        definition: editingWord.definition,
        example_sentences: editingWord.example_sentences,
        tags: editingWord.tags,
        difficulty_level: editingWord.difficulty_level
      });
      setEditingWord(null);
      loadDictionary();
    } catch (error) {
      console.error('Error updating word:', error);
    }
  };

  const deleteWord = async (wordId: string) => {
    if (window.confirm('Are you sure you want to delete this word?')) {
      try {
        await studentDictionaryService.deleteWord(wordId);
        loadDictionary();
      } catch (error) {
        console.error('Error deleting word:', error);
      }
    }
  };

  const exportDictionary = async () => {
    try {
      const data = await studentDictionaryService.exportDictionary(studentId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dictionary-${studentId}-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    } catch (error) {
      console.error('Error exporting dictionary:', error);
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'session': return <BookOpen className="w-4 h-4" />;
      case 'speaking': return <MessageSquare className="w-4 h-4" />;
      case 'ai_extracted': return <Brain className="w-4 h-4" />;
      case 'teacher_added': return <GraduationCap className="w-4 h-4" />;
      case 'manual': return <Edit3 className="w-4 h-4" />;
      default: return <BookMarked className="w-4 h-4" />;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'session': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'speaking': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'ai_extracted': return 'bg-green-50 text-green-700 border-green-200';
      case 'teacher_added': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'manual': return 'bg-gray-50 text-gray-700 border-gray-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getMasteryColor = (level: number) => {
    if (level <= 33) return 'text-red-500';
    if (level <= 66) return 'text-yellow-500';
    return 'text-green-500';
  };

  const renderWordCard = (word: DictionaryEntry) => (
    <Card key={word.id} className="relative">
      <CardContent className="p-4">
        {/* Selection checkbox */}
        {!isTeacher && (
          <div className="absolute top-2 right-2">
            <input
              type="checkbox"
              checked={selectedWords.has(word.id!)}
              onChange={() => toggleWordSelection(word.id!)}
              className="w-4 h-4"
            />
          </div>
        )}

        <div className="space-y-3">
          {/* Word and translation */}
          <div>
            <div className="flex items-start justify-between">
              <h4 className="font-semibold text-lg">{word.english}</h4>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => playPronunciation(word.english)}
              >
                <Volume2 className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-muted-foreground">{word.translation}</p>
          </div>

          {/* Definition */}
          {word.definition && (
            <p className="text-sm text-muted-foreground">{word.definition}</p>
          )}

          {/* Example */}
          {word.example_sentences && word.example_sentences.length > 0 && (
            <div className="bg-muted p-2 rounded-md">
              <p className="text-sm italic">"{word.example_sentences[0]}"</p>
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cn("text-xs", getSourceColor(word.source_type))}>
              {getSourceIcon(word.source_type)}
              <span className="ml-1">{word.source_type}</span>
            </Badge>
            {word.difficulty_level && (
              <Badge variant="outline" className="text-xs">
                {word.difficulty_level}
              </Badge>
            )}
            {word.cefr_level && (
              <Badge variant="outline" className="text-xs">
                {word.cefr_level}
              </Badge>
            )}
          </div>

          {/* Progress and stats */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span>Mastery</span>
              <span className={cn("font-medium", getMasteryColor(word.mastery_level))}>
                {word.mastery_level}%
              </span>
            </div>
            <Progress value={word.mastery_level} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{word.review_count} reviews</span>
              {word.next_review && (
                <span>Next: {new Date(word.next_review).toLocaleDateString()}</span>
              )}
            </div>
          </div>

          {/* Tags */}
          {word.tags && word.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {word.tags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  <Hash className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Actions */}
          {(isTeacher || word.added_by === 'student') && (
            <div className="flex gap-2 pt-2 border-t">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingWord(word)}
              >
                <Edit3 className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => deleteWord(word.id!)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading dictionary...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Unified Dictionary</h2>
        <p className="text-muted-foreground">
          All your vocabulary in one place - from sessions, speaking practice, and manual entries
        </p>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-5 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">Total Words</span>
              </div>
              <p className="text-2xl font-bold">{stats.total_words}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Avg. Mastery</span>
              </div>
              <p className="text-2xl font-bold">{Math.round(stats.average_mastery)}%</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">Recent</span>
              </div>
              <p className="text-2xl font-bold">{stats.recent_additions}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                <span className="text-sm text-muted-foreground">Due Review</span>
              </div>
              <p className="text-2xl font-bold">{stats.due_for_review}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-500" />
                <span className="text-sm text-muted-foreground">From Speaking</span>
              </div>
              <p className="text-2xl font-bold">{stats.words_by_source.speaking}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Controls */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Search and view controls */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search words, definitions, tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="list">List View</SelectItem>
                  <SelectItem value="cards">Card View</SelectItem>
                  <SelectItem value="grouped">Grouped View</SelectItem>
                </SelectContent>
              </Select>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" onClick={() => setShowAddDialog(true)}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Add new word</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="session">Sessions</SelectItem>
                  <SelectItem value="speaking">Speaking</SelectItem>
                  <SelectItem value="ai_extracted">AI Extracted</SelectItem>
                  <SelectItem value="teacher_added">Teacher Added</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger className="w-[140px]">
                  <Layers className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedMastery} onValueChange={setSelectedMastery}>
                <SelectTrigger className="w-[140px]">
                  <Target className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Mastery" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Mastery</SelectItem>
                  <SelectItem value="low">Low (0-33%)</SelectItem>
                  <SelectItem value="medium">Medium (34-66%)</SelectItem>
                  <SelectItem value="high">High (67-100%)</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="w-[140px]">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Recent First</SelectItem>
                  <SelectItem value="mastery">By Mastery</SelectItem>
                  <SelectItem value="alphabetical">Alphabetical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bulk actions */}
            {!isTeacher && selectedWords.size > 0 && (
              <div className="flex items-center justify-between p-2 bg-primary/10 rounded-lg">
                <span className="text-sm font-medium">
                  {selectedWords.size} word{selectedWords.size !== 1 ? 's' : ''} selected
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedWords(new Set())}
                  >
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    onClick={practiceSelectedWords}
                  >
                    <Zap className="w-4 h-4 mr-1" />
                    Practice Selected
                  </Button>
                </div>
              </div>
            )}

            {/* Export/Import */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportDictionary}
              >
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Words Display */}
      <ScrollArea className="h-[600px]">
        {filteredWords.length > 0 ? (
          viewMode === 'cards' ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredWords.map(word => renderWordCard(word))}
            </div>
          ) : viewMode === 'grouped' ? (
            <div className="space-y-4">
              {Object.entries(groupWords()).map(([group, groupWords]) => (
                <Collapsible
                  key={group}
                  open={expandedGroups.has(group)}
                  onOpenChange={(open) => {
                    const newExpanded = new Set(expandedGroups);
                    if (open) {
                      newExpanded.add(group);
                    } else {
                      newExpanded.delete(group);
                    }
                    setExpandedGroups(newExpanded);
                  }}
                >
                  <CollapsibleTrigger className="w-full">
                    <Card>
                      <CardHeader className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {expandedGroups.has(group) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                            {getSourceIcon(group)}
                            <span className="font-medium capitalize">
                              {group.replace('_', ' ')}
                            </span>
                            <Badge variant="secondary">{groupWords.length}</Badge>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {groupWords.map(word => renderWordCard(word))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {/* Select all checkbox */}
              {!isTeacher && (
                <div className="flex items-center gap-2 p-2 border-b">
                  <input
                    type="checkbox"
                    checked={selectedWords.size === filteredWords.length && filteredWords.length > 0}
                    onChange={selectAllWords}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Select All</span>
                </div>
              )}
              {filteredWords.map(word => (
                <Card key={word.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {!isTeacher && (
                        <input
                          type="checkbox"
                          checked={selectedWords.has(word.id!)}
                          onChange={() => toggleWordSelection(word.id!)}
                          className="w-4 h-4 mt-1"
                        />
                      )}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{word.english}</h4>
                            <p className="text-sm text-muted-foreground">{word.translation}</p>
                            {word.definition && (
                              <p className="text-sm text-muted-foreground mt-1">{word.definition}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn("text-sm font-medium", getMasteryColor(word.mastery_level))}>
                              {word.mastery_level}%
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => playPronunciation(word.english)}
                            >
                              <Volume2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={cn("text-xs", getSourceColor(word.source_type))}>
                            {getSourceIcon(word.source_type)}
                            <span className="ml-1">{word.source_type}</span>
                          </Badge>
                          {word.difficulty_level && (
                            <Badge variant="outline" className="text-xs">
                              {word.difficulty_level}
                            </Badge>
                          )}
                          {word.tags?.map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : (
          <div className="text-center py-12">
            <BookMarked className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No words found</p>
            <p className="text-sm text-muted-foreground">Try adjusting your filters or add new words</p>
          </div>
        )}
      </ScrollArea>

      {/* Add/Edit Word Dialog */}
      <Dialog open={showAddDialog || !!editingWord} onOpenChange={(open) => {
        if (!open) {
          setShowAddDialog(false);
          setEditingWord(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingWord ? 'Edit Word' : 'Add New Word'}</DialogTitle>
            <DialogDescription>
              {editingWord ? 'Update word details' : 'Add a word to your dictionary'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!editingWord && (
              <>
                <div>
                  <Label>English Word</Label>
                  <Input
                    value={newWord.english}
                    onChange={(e) => setNewWord(prev => ({ ...prev, english: e.target.value }))}
                    placeholder="Enter the word"
                  />
                </div>
                <div>
                  <Label>Translation</Label>
                  <Input
                    value={newWord.translation}
                    onChange={(e) => setNewWord(prev => ({ ...prev, translation: e.target.value }))}
                    placeholder="Translation in your language"
                  />
                </div>
              </>
            )}
            <div>
              <Label>Definition</Label>
              <Textarea
                value={editingWord ? editingWord.definition : newWord.definition}
                onChange={(e) => {
                  if (editingWord) {
                    setEditingWord(prev => ({ ...prev!, definition: e.target.value }));
                  } else {
                    setNewWord(prev => ({ ...prev, definition: e.target.value }));
                  }
                }}
                placeholder="Explain the meaning"
                rows={2}
              />
            </div>
            <div>
              <Label>Example Usage</Label>
              <Input
                value={editingWord ? editingWord.example_sentences?.[0] || '' : newWord.example}
                onChange={(e) => {
                  if (editingWord) {
                    setEditingWord(prev => ({ ...prev!, example_sentences: [e.target.value] }));
                  } else {
                    setNewWord(prev => ({ ...prev, example: e.target.value }));
                  }
                }}
                placeholder="Example sentence"
              />
            </div>
            <div>
              <Label>Tags (comma-separated)</Label>
              <Input
                value={editingWord ? editingWord.tags?.join(', ') || '' : newWord.tags}
                onChange={(e) => {
                  if (editingWord) {
                    setEditingWord(prev => ({
                      ...prev!,
                      tags: e.target.value.split(',').map(t => t.trim()).filter(t => t)
                    }));
                  } else {
                    setNewWord(prev => ({ ...prev, tags: e.target.value }));
                  }
                }}
                placeholder="e.g., business, travel, daily"
              />
            </div>
            <div>
              <Label>Difficulty Level</Label>
              <Select
                value={editingWord ? editingWord.difficulty_level : newWord.difficulty_level}
                onValueChange={(value: any) => {
                  if (editingWord) {
                    setEditingWord(prev => ({ ...prev!, difficulty_level: value }));
                  } else {
                    setNewWord(prev => ({ ...prev, difficulty_level: value }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddDialog(false);
                  setEditingWord(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={editingWord ? updateWord : addWord}>
                {editingWord ? 'Update' : 'Add'} Word
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}