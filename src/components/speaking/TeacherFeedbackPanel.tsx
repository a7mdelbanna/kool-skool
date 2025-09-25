import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Volume2,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Edit3,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  User,
  Bot,
  Clock,
  Award,
  FileText,
  Mic,
  Send,
  BookMarked,
  Star,
  ThumbsUp,
  ThumbsDown,
  Target,
  TrendingUp,
  MessageCircle,
  Highlighter
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { speakingPracticeService } from '@/services/firebase/speakingPractice.service';
import { studentDictionaryService } from '@/services/firebase/studentDictionary.service';
import type {
  ConversationSession,
  ConversationTurn,
  TeacherFeedback
} from '@/services/firebase/speakingPractice.service';

interface TeacherFeedbackPanelProps {
  sessionId: string;
  studentId: string;
  teacherId: string;
  onComplete?: () => void;
}

interface AnnotatedTurn extends ConversationTurn {
  annotations?: {
    id: string;
    type: 'correction' | 'praise' | 'suggestion' | 'vocabulary';
    text: string;
    startIndex?: number;
    endIndex?: number;
  }[];
}

export default function TeacherFeedbackPanel({
  sessionId,
  studentId,
  teacherId,
  onComplete
}: TeacherFeedbackPanelProps) {
  // State
  const [session, setSession] = useState<ConversationSession | null>(null);
  const [turns, setTurns] = useState<AnnotatedTurn[]>([]);
  const [selectedTurn, setSelectedTurn] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [feedback, setFeedback] = useState<TeacherFeedback>({
    teacher_id: teacherId,
    overall_feedback: '',
    strengths: [],
    areas_for_improvement: [],
    vocabulary_notes: [],
    grammar_corrections: [],
    pronunciation_notes: '',
    fluency_score: 50,
    accuracy_score: 50,
    vocabulary_score: 50,
    pronunciation_score: 50,
    task_completion_score: 50,
    suggestions_for_next_session: '',
    timestamp: new Date()
  });
  const [editingAnnotation, setEditingAnnotation] = useState<string | null>(null);
  const [newAnnotation, setNewAnnotation] = useState({
    type: 'correction' as const,
    text: ''
  });
  const [selectedText, setSelectedText] = useState('');
  const [showVocabularyDialog, setShowVocabularyDialog] = useState(false);
  const [newVocabularyWord, setNewVocabularyWord] = useState({
    english: '',
    translation: '',
    definition: '',
    example: ''
  });

  // Refs
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Load session data
  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    try {
      const sessionData = await speakingPracticeService.getSession(sessionId);
      if (sessionData) {
        setSession(sessionData);
        // Convert conversation history to annotated turns
        const annotatedTurns = sessionData.conversation_history.map(turn => ({
          ...turn,
          annotations: []
        }));
        setTurns(annotatedTurns);

        // Load existing feedback if any
        if (sessionData.teacher_feedback) {
          setFeedback({
            ...feedback,
            ...sessionData.teacher_feedback
          });
        }
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  const playAudio = (audioUrl: string) => {
    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio();
    }
    
    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.src = audioUrl;
      audioPlayerRef.current.play();
      setIsPlaying(true);

      audioPlayerRef.current.onended = () => {
        setIsPlaying(false);
      };
    }
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString());
    }
  };

  const addAnnotation = (turnIndex: number) => {
    if (!newAnnotation.text.trim()) return;

    const updatedTurns = [...turns];
    if (!updatedTurns[turnIndex].annotations) {
      updatedTurns[turnIndex].annotations = [];
    }
    updatedTurns[turnIndex].annotations!.push({
      id: `ann-${Date.now()}`,
      type: newAnnotation.type,
      text: newAnnotation.text
    });
    setTurns(updatedTurns);
    setNewAnnotation({ type: 'correction', text: '' });
  };

  const removeAnnotation = (turnIndex: number, annotationId: string) => {
    const updatedTurns = [...turns];
    updatedTurns[turnIndex].annotations = updatedTurns[turnIndex].annotations?.filter(
      ann => ann.id !== annotationId
    );
    setTurns(updatedTurns);
  };

  const addStrength = () => {
    const strength = prompt('Enter a strength:');
    if (strength) {
      setFeedback(prev => ({
        ...prev,
        strengths: [...prev.strengths, strength]
      }));
    }
  };

  const addImprovement = () => {
    const improvement = prompt('Enter an area for improvement:');
    if (improvement) {
      setFeedback(prev => ({
        ...prev,
        areas_for_improvement: [...prev.areas_for_improvement, improvement]
      }));
    }
  };

  const addGrammarCorrection = () => {
    const turn = turns[selectedTurn];
    if (turn.speaker !== 'student') return;

    const original = prompt('Enter the original text:');
    const corrected = prompt('Enter the corrected text:');
    const explanation = prompt('Explain the correction:');

    if (original && corrected && explanation) {
      setFeedback(prev => ({
        ...prev,
        grammar_corrections: [
          ...prev.grammar_corrections,
          {
            original,
            corrected,
            explanation,
            turn_index: selectedTurn
          }
        ]
      }));
    }
  };

  const addVocabularyNote = () => {
    if (newVocabularyWord.english && newVocabularyWord.definition) {
      setFeedback(prev => ({
        ...prev,
        vocabulary_notes: [
          ...prev.vocabulary_notes,
          {
            word: newVocabularyWord.english,
            definition: newVocabularyWord.definition,
            example_usage: newVocabularyWord.example,
            should_practice: true
          }
        ]
      }));

      // Add to student dictionary
      studentDictionaryService.addWord(
        studentId,
        {
          english: newVocabularyWord.english,
          translation: newVocabularyWord.translation,
          language: 'en'
        },
        {
          type: 'teacher_added',
          id: sessionId,
          added_by: 'teacher'
        },
        {
          definition: newVocabularyWord.definition,
          example_sentences: newVocabularyWord.example ? [newVocabularyWord.example] : [],
          source_context: `Added during feedback for session ${sessionId}`
        }
      );

      setNewVocabularyWord({ english: '', translation: '', definition: '', example: '' });
      setShowVocabularyDialog(false);
    }
  };

  const saveFeedback = async () => {
    try {
      await speakingPracticeService.addTeacherFeedback(sessionId, feedback);
      alert('Feedback saved successfully!');
      onComplete?.();
    } catch (error) {
      console.error('Error saving feedback:', error);
      alert('Error saving feedback. Please try again.');
    }
  };

  const calculateOverallScore = () => {
    const scores = [
      feedback.fluency_score,
      feedback.accuracy_score,
      feedback.vocabulary_score,
      feedback.pronunciation_score,
      feedback.task_completion_score
    ];
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  const getAnnotationIcon = (type: string) => {
    switch (type) {
      case 'correction': return <AlertCircle className="w-3 h-3" />;
      case 'praise': return <ThumbsUp className="w-3 h-3" />;
      case 'suggestion': return <Target className="w-3 h-3" />;
      case 'vocabulary': return <BookMarked className="w-3 h-3" />;
      default: return <MessageCircle className="w-3 h-3" />;
    }
  };

  const getAnnotationColor = (type: string) => {
    switch (type) {
      case 'correction': return 'text-red-500 bg-red-50 border-red-200';
      case 'praise': return 'text-green-500 bg-green-50 border-green-200';
      case 'suggestion': return 'text-blue-500 bg-blue-50 border-blue-200';
      case 'vocabulary': return 'text-purple-500 bg-purple-50 border-purple-200';
      default: return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading session...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Feedback Panel</h2>
          <p className="text-muted-foreground">Session: {session.topic_name}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-sm">
            Duration: {Math.round((session.end_time?.getTime() - session.start_time.getTime()) / 60000)} min
          </Badge>
          <Badge variant="outline" className="text-sm">
            {turns.filter(t => t.speaker === 'student').length} student turns
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Conversation Review */}
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conversation Transcript</CardTitle>
              <CardDescription>
                Review and annotate the conversation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Turn Navigation */}
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTurn(Math.max(0, selectedTurn - 1))}
                  disabled={selectedTurn === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium">
                  Turn {selectedTurn + 1} of {turns.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTurn(Math.min(turns.length - 1, selectedTurn + 1))}
                  disabled={selectedTurn >= turns.length - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Current Turn Display */}
              {turns[selectedTurn] && (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {turns[selectedTurn].speaker === 'student' ? (
                          <User className="w-4 h-4 text-primary" />
                        ) : turns[selectedTurn].is_ai ? (
                          <Bot className="w-4 h-4 text-primary" />
                        ) : (
                          <User className="w-4 h-4 text-primary" />
                        )}
                        <Badge variant={turns[selectedTurn].speaker === 'student' ? 'default' : 'secondary'}>
                          {turns[selectedTurn].speaker}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(turns[selectedTurn].timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      {turns[selectedTurn].audio_url && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => playAudio(turns[selectedTurn].audio_url)}
                        >
                          {isPlaying ? (
                            <><Pause className="w-4 h-4 mr-1" /> Pause</>
                          ) : (
                            <><Play className="w-4 h-4 mr-1" /> Play</>
                          )}
                        </Button>
                      )}
                    </div>
                    <p
                      className="text-sm leading-relaxed select-text"
                      onMouseUp={handleTextSelection}
                    >
                      {turns[selectedTurn].text}
                    </p>
                  </div>

                  {/* Annotations */}
                  {turns[selectedTurn].annotations && turns[selectedTurn].annotations!.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Annotations</h4>
                      {turns[selectedTurn].annotations!.map((ann) => (
                        <div
                          key={ann.id}
                          className={cn(
                            "flex items-start gap-2 p-2 rounded-lg border",
                            getAnnotationColor(ann.type)
                          )}
                        >
                          {getAnnotationIcon(ann.type)}
                          <p className="text-sm flex-1">{ann.text}</p>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeAnnotation(selectedTurn, ann.id)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Annotation */}
                  {turns[selectedTurn].speaker === 'student' && (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Select
                          value={newAnnotation.type}
                          onValueChange={(value: any) => setNewAnnotation(prev => ({ ...prev, type: value }))}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="correction">Correction</SelectItem>
                            <SelectItem value="praise">Praise</SelectItem>
                            <SelectItem value="suggestion">Suggestion</SelectItem>
                            <SelectItem value="vocabulary">Vocabulary</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Add annotation..."
                          value={newAnnotation.text}
                          onChange={(e) => setNewAnnotation(prev => ({ ...prev, text: e.target.value }))}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              addAnnotation(selectedTurn);
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={() => addAnnotation(selectedTurn)}
                          disabled={!newAnnotation.text.trim()}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Overall Feedback */}
          <Card>
            <CardHeader>
              <CardTitle>Overall Feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>General Comments</Label>
                <Textarea
                  placeholder="Provide overall feedback on the student's performance..."
                  value={feedback.overall_feedback}
                  onChange={(e) => setFeedback(prev => ({ ...prev, overall_feedback: e.target.value }))}
                  className="mt-2"
                  rows={4}
                />
              </div>

              <div>
                <Label>Suggestions for Next Session</Label>
                <Textarea
                  placeholder="What should the student focus on next time?"
                  value={feedback.suggestions_for_next_session}
                  onChange={(e) => setFeedback(prev => ({ ...prev, suggestions_for_next_session: e.target.value }))}
                  className="mt-2"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scoring and Notes Panel */}
        <div className="space-y-4">
          {/* Scores */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Performance Scores</CardTitle>
              <CardDescription>
                Rate different aspects of performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-primary">
                  {calculateOverallScore()}%
                </div>
                <p className="text-sm text-muted-foreground">Overall Score</p>
              </div>

              <Separator />

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <Label className="text-sm">Fluency</Label>
                    <span className="text-sm font-medium">{feedback.fluency_score}%</span>
                  </div>
                  <Slider
                    value={[feedback.fluency_score]}
                    onValueChange={([value]) => setFeedback(prev => ({ ...prev, fluency_score: value }))}
                    max={100}
                    step={5}
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <Label className="text-sm">Accuracy</Label>
                    <span className="text-sm font-medium">{feedback.accuracy_score}%</span>
                  </div>
                  <Slider
                    value={[feedback.accuracy_score]}
                    onValueChange={([value]) => setFeedback(prev => ({ ...prev, accuracy_score: value }))}
                    max={100}
                    step={5}
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <Label className="text-sm">Vocabulary</Label>
                    <span className="text-sm font-medium">{feedback.vocabulary_score}%</span>
                  </div>
                  <Slider
                    value={[feedback.vocabulary_score]}
                    onValueChange={([value]) => setFeedback(prev => ({ ...prev, vocabulary_score: value }))}
                    max={100}
                    step={5}
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <Label className="text-sm">Pronunciation</Label>
                    <span className="text-sm font-medium">{feedback.pronunciation_score}%</span>
                  </div>
                  <Slider
                    value={[feedback.pronunciation_score]}
                    onValueChange={([value]) => setFeedback(prev => ({ ...prev, pronunciation_score: value }))}
                    max={100}
                    step={5}
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <Label className="text-sm">Task Completion</Label>
                    <span className="text-sm font-medium">{feedback.task_completion_score}%</span>
                  </div>
                  <Slider
                    value={[feedback.task_completion_score]}
                    onValueChange={([value]) => setFeedback(prev => ({ ...prev, task_completion_score: value }))}
                    max={100}
                    step={5}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Strengths & Improvements */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Strengths & Areas to Improve</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm">Strengths</Label>
                  <Button size="sm" variant="ghost" onClick={addStrength}>
                    <ThumbsUp className="w-4 h-4" />
                  </Button>
                </div>
                {feedback.strengths.length > 0 ? (
                  <ul className="space-y-1">
                    {feedback.strengths.map((strength, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Star className="w-3 h-3 text-green-500 mt-0.5" />
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No strengths added</p>
                )}
              </div>

              <Separator />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm">Areas for Improvement</Label>
                  <Button size="sm" variant="ghost" onClick={addImprovement}>
                    <TrendingUp className="w-4 h-4" />
                  </Button>
                </div>
                {feedback.areas_for_improvement.length > 0 ? (
                  <ul className="space-y-1">
                    {feedback.areas_for_improvement.map((area, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Target className="w-3 h-3 text-orange-500 mt-0.5" />
                        <span>{area}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No areas added</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full justify-start"
                variant="outline"
                size="sm"
                onClick={addGrammarCorrection}
                disabled={turns[selectedTurn]?.speaker !== 'student'}
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Add Grammar Correction
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                size="sm"
                onClick={() => setShowVocabularyDialog(true)}
              >
                <BookMarked className="w-4 h-4 mr-2" />
                Add Vocabulary Note
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                size="sm"
                onClick={() => {
                  setFeedback(prev => ({
                    ...prev,
                    pronunciation_notes: prompt('Add pronunciation notes:') || prev.pronunciation_notes
                  }));
                }}
              >
                <Mic className="w-4 h-4 mr-2" />
                Add Pronunciation Note
              </Button>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={saveFeedback}
            disabled={!feedback.overall_feedback.trim()}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Feedback
          </Button>
        </div>
      </div>

      {/* Vocabulary Dialog */}
      <Dialog open={showVocabularyDialog} onOpenChange={setShowVocabularyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Vocabulary Note</DialogTitle>
            <DialogDescription>
              Add a word to the student's dictionary
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>English Word</Label>
              <Input
                value={newVocabularyWord.english}
                onChange={(e) => setNewVocabularyWord(prev => ({ ...prev, english: e.target.value }))}
                placeholder="Enter the word"
              />
            </div>
            <div>
              <Label>Translation (optional)</Label>
              <Input
                value={newVocabularyWord.translation}
                onChange={(e) => setNewVocabularyWord(prev => ({ ...prev, translation: e.target.value }))}
                placeholder="Translation in student's language"
              />
            </div>
            <div>
              <Label>Definition</Label>
              <Textarea
                value={newVocabularyWord.definition}
                onChange={(e) => setNewVocabularyWord(prev => ({ ...prev, definition: e.target.value }))}
                placeholder="Explain the meaning"
                rows={2}
              />
            </div>
            <div>
              <Label>Example Usage</Label>
              <Input
                value={newVocabularyWord.example}
                onChange={(e) => setNewVocabularyWord(prev => ({ ...prev, example: e.target.value }))}
                placeholder="Example sentence"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowVocabularyDialog(false)}>
                Cancel
              </Button>
              <Button onClick={addVocabularyNote}>
                Add to Dictionary
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}