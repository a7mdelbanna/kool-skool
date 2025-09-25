import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  Send,
  SkipForward,
  BookOpen,
  Brain,
  MessageSquare,
  Loader2,
  PlayCircle,
  PauseCircle,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  User,
  Bot,
  Clock,
  Award,
  Star,
  BookMarked
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { speakingPracticeService } from '@/services/firebase/speakingPractice.service';
import { openAIService } from '@/services/ai/openai.service';
import { elevenLabsService } from '@/services/ai/elevenlabs.service';
import { studentDictionaryService } from '@/services/firebase/studentDictionary.service';
import type {
  SpeakingTopic,
  ConversationSession,
  ConversationTurn
} from '@/services/firebase/speakingPractice.service';
import type { ExtractedVocabulary } from '@/services/ai/openai.service';

interface StudentConversationProps {
  studentId: string;
  topicId: string;
  sessionId?: string;
  onComplete?: () => void;
}

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  audio_url?: string;
  is_ai?: boolean;
  vocabulary?: ExtractedVocabulary;
  feedback?: {
    grammar?: any;
    pronunciation?: any;
  };
}

export default function StudentConversation({
  studentId,
  topicId,
  sessionId: existingSessionId,
  onComplete
}: StudentConversationProps) {
  // State
  const [topic, setTopic] = useState<SpeakingTopic | null>(null);
  const [session, setSession] = useState<ConversationSession | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [extractedVocabulary, setExtractedVocabulary] = useState<ExtractedVocabulary[]>([]);
  const [sessionStats, setSessionStats] = useState({
    duration: 0,
    turnsCount: 0,
    wordsSpoken: 0,
    accuracyScore: 0,
    fluencyScore: 0
  });

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load topic and session
  useEffect(() => {
    loadTopicAndSession();
    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    };
  }, [topicId, existingSessionId]);

  // Start session timer
  useEffect(() => {
    if (session && session.status === 'in_progress') {
      sessionTimerRef.current = setInterval(() => {
        setSessionStats(prev => ({
          ...prev,
          duration: prev.duration + 1
        }));
      }, 1000);
    } else if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
    }
  }, [session?.status]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const loadTopicAndSession = async () => {
    try {
      // Load topic
      const topicData = await speakingPracticeService.getTopic(topicId);
      if (topicData) {
        setTopic(topicData);
      }

      // Load or create session
      let sessionData: ConversationSession | null = null;
      if (existingSessionId) {
        sessionData = await speakingPracticeService.getSession(existingSessionId);
      } else {
        // Create new session
        const sessionId = await speakingPracticeService.startSession(studentId, topicId);
        sessionData = await speakingPracticeService.getSession(sessionId);
      }

      if (sessionData) {
        setSession(sessionData);
        // Load existing messages if any
        if (sessionData.conversation_history) {
          const existingMessages = sessionData.conversation_history.map((turn, index) => ({
            id: `msg-${index}`,
            role: turn.speaker as 'user' | 'assistant',
            content: turn.text,
            timestamp: turn.timestamp,
            audio_url: turn.audio_url,
            is_ai: turn.is_ai
          }));
          setMessages(existingMessages);
        }

        // Start with first prompt if new session
        if (!existingSessionId && topicData?.pre_recorded_prompts?.length) {
          playPrompt(0);
        }
      }
    } catch (error) {
      console.error('Error loading topic and session:', error);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processStudentAudio(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const processStudentAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      // Transcribe audio
      const transcription = await openAIService.transcribeAudio(audioBlob, {
        language: 'en',
        prompt: topic?.description
      });

      // Add student message
      const studentMessage: ConversationMessage = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: transcription.text,
        timestamp: new Date(),
        audio_url: URL.createObjectURL(audioBlob),
        is_ai: false
      };
      setMessages(prev => [...prev, studentMessage]);

      // Update session stats
      setSessionStats(prev => ({
        ...prev,
        turnsCount: prev.turnsCount + 1,
        wordsSpoken: prev.wordsSpoken + transcription.text.split(' ').length
      }));

      // Extract vocabulary
      const vocabulary = await openAIService.extractVocabulary(
        transcription.text,
        topic?.english_level || 'intermediate'
      );
      if (vocabulary.words.length > 0) {
        setExtractedVocabulary(prev => [...prev, vocabulary]);
        // Add to student dictionary
        await studentDictionaryService.addWords(
          studentId,
          vocabulary.words.map(word => ({
            english: word.english,
            translation: '', // Will need translation
            language: 'en',
            additionalData: {
              source_context: word.context_sentence,
              part_of_speech: word.part_of_speech as any,
              definition: word.definition,
              difficulty_level: word.difficulty_level
            }
          })),
          {
            type: 'speaking',
            id: session?.id,
            added_by: 'ai'
          }
        );
      }

      // Generate AI response if enabled
      if (topic?.ai_config?.enabled && topic.ai_config.mode === 'full_ai') {
        await generateAIResponse(transcription.text);
      } else if (topic?.ai_config?.enabled && topic.ai_config.mode === 'ai_assisted') {
        // Just provide grammar feedback
        const grammarCheck = await openAIService.checkGrammar(
          transcription.text,
          topic?.english_level
        );
        if (grammarCheck.has_errors) {
          // Show feedback inline
          studentMessage.feedback = { grammar: grammarCheck };
          setMessages(prev => [...prev.slice(0, -1), studentMessage]);
        }
      }

      // Save turn to session
      await speakingPracticeService.addTurn(session!.id, {
        speaker: 'student',
        text: transcription.text,
        audio_url: '', // Would need to upload to storage
        timestamp: new Date(),
        is_ai: false,
        vocabulary_extracted: vocabulary.words.map(w => w.english)
      });
    } catch (error) {
      console.error('Error processing audio:', error);
      alert('Error processing your audio. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const generateAIResponse = async (studentText: string) => {
    setIsProcessing(true);
    try {
      // Generate response
      const aiResponse = await openAIService.generateResponse(
        messages.map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content
        })),
        {
          model: topic?.ai_config?.model || 'gpt-4',
          student_level: topic?.english_level,
          conversation_style: topic?.ai_config?.conversation_style,
          correction_mode: topic?.ai_config?.correction_mode,
          vocabulary_focus: topic?.ai_config?.vocabulary_hints
        }
      );

      // Generate audio if TTS enabled
      let audioUrl: string | undefined;
      if (topic?.ai_config?.voice_enabled) {
        const audio = await elevenLabsService.generateConversationAudio(
          aiResponse,
          topic.ai_config.conversation_style || 'encouraging'
        );
        audioUrl = audio.audio_url;
      }

      // Add AI message
      const aiMessage: ConversationMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
        audio_url: audioUrl,
        is_ai: true
      };
      setMessages(prev => [...prev, aiMessage]);

      // Play audio if available
      if (audioUrl) {
        playAudio(audioUrl);
      }

      // Save AI turn
      await speakingPracticeService.addTurn(session!.id, {
        speaker: 'ai',
        text: aiResponse,
        audio_url: audioUrl || '',
        timestamp: new Date(),
        is_ai: true
      });
    } catch (error) {
      console.error('Error generating AI response:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const playPrompt = async (index: number) => {
    if (!topic?.pre_recorded_prompts?.[index]) return;

    const prompt = topic.pre_recorded_prompts[index];
    setCurrentPromptIndex(index);

    // Add prompt message
    const promptMessage: ConversationMessage = {
      id: `prompt-${index}`,
      role: 'assistant',
      content: prompt.text,
      timestamp: new Date(),
      audio_url: prompt.audio_url,
      is_ai: false
    };
    setMessages(prev => [...prev, promptMessage]);

    // Play audio if available
    if (prompt.audio_url) {
      playAudio(prompt.audio_url);
    }
  };

  const playAudio = (url: string) => {
    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio();
    }
    audioPlayerRef.current.src = url;
    audioPlayerRef.current.play();
    setIsPlayingAudio(true);

    audioPlayerRef.current.onended = () => {
      setIsPlayingAudio(false);
    };
  };

  const skipToNextPrompt = () => {
    if (topic?.pre_recorded_prompts && currentPromptIndex < topic.pre_recorded_prompts.length - 1) {
      playPrompt(currentPromptIndex + 1);
    }
  };

  const completeSession = async () => {
    if (!session) return;

    try {
      // Calculate final scores
      const avgAccuracy = sessionStats.accuracyScore;
      const avgFluency = sessionStats.fluencyScore;

      // End session
      await speakingPracticeService.endSession(
        session.id,
        {
          duration_seconds: sessionStats.duration,
          turns_count: sessionStats.turnsCount,
          vocabulary_learned: extractedVocabulary.flatMap(v => v.words.map(w => w.english)),
          average_accuracy_score: avgAccuracy,
          average_fluency_score: avgFluency,
          ai_feedback_summary: 'Session completed successfully'
        }
      );

      onComplete?.();
    } catch (error) {
      console.error('Error completing session:', error);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!topic || !session) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Conversation Area */}
        <div className="md:col-span-2 space-y-4">
          {/* Topic Header */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{topic.name}</CardTitle>
                  <CardDescription className="mt-2">
                    {topic.description}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant={topic.ai_config?.enabled ? 'default' : 'secondary'}>
                    {topic.ai_config?.enabled ? (
                      <><Bot className="w-3 h-3 mr-1" /> AI Mode</>
                    ) : (
                      <><User className="w-3 h-3 mr-1" /> Manual Mode</>
                    )}
                  </Badge>
                  <Badge>{topic.english_level || 'B1'}</Badge>
                </div>
              </div>

              {/* Session Stats */}
              <div className="flex gap-4 mt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatDuration(sessionStats.duration)}
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-4 h-4" />
                  {sessionStats.turnsCount} turns
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  {sessionStats.wordsSpoken} words
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Conversation Messages */}
          <Card className="h-[500px]">
            <CardContent className="p-0 h-full flex flex-col">
              <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex gap-3",
                        message.role === 'user' ? "justify-end" : "justify-start"
                      )}
                    >
                      {message.role !== 'user' && (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          {message.is_ai ? (
                            <Bot className="w-4 h-4 text-primary" />
                          ) : (
                            <User className="w-4 h-4 text-primary" />
                          )}
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[70%] space-y-2",
                          message.role === 'user' ? "items-end" : "items-start"
                        )}
                      >
                        <div
                          className={cn(
                            "rounded-lg px-4 py-2",
                            message.role === 'user'
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          )}
                        >
                          <p className="text-sm">{message.content}</p>
                        </div>

                        {/* Audio Player */}
                        {message.audio_url && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => playAudio(message.audio_url!)}
                            className="h-8"
                          >
                            <Volume2 className="w-4 h-4 mr-1" />
                            Play Audio
                          </Button>
                        )}

                        {/* Grammar Feedback */}
                        {message.feedback?.grammar?.has_errors && (
                          <Alert className="mt-2">
                            <AlertCircle className="w-4 h-4" />
                            <AlertDescription className="text-sm">
                              <strong>Grammar feedback:</strong>
                              <ul className="mt-1 space-y-1">
                                {message.feedback.grammar.errors.slice(0, 2).map((error: any, i: number) => (
                                  <li key={i} className="text-xs">
                                    "{error.text}" → "{error.correction}"
                                  </li>
                                ))}
                              </ul>
                            </AlertDescription>
                          </Alert>
                        )}

                        <span className="text-xs text-muted-foreground">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      {message.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                          <User className="w-4 h-4 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  ))}

                  {isProcessing && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-primary animate-pulse" />
                      </div>
                      <div className="bg-muted rounded-lg px-4 py-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Recording Controls */}
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="lg"
                          variant={isRecording ? "destructive" : "default"}
                          onClick={isRecording ? stopRecording : startRecording}
                          disabled={isProcessing}
                          className="flex-1"
                        >
                          {isRecording ? (
                            <><MicOff className="w-5 h-5 mr-2" /> Stop Recording</>
                          ) : (
                            <><Mic className="w-5 h-5 mr-2" /> Start Speaking</>
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{isRecording ? "Click to stop" : "Click and speak clearly"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {topic.pre_recorded_prompts && currentPromptIndex < topic.pre_recorded_prompts.length - 1 && (
                    <Button
                      variant="outline"
                      onClick={skipToNextPrompt}
                      disabled={isProcessing}
                    >
                      <SkipForward className="w-4 h-4 mr-2" />
                      Next Prompt
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    onClick={completeSession}
                    disabled={isProcessing || sessionStats.turnsCount < 2}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Complete
                  </Button>
                </div>

                {/* Prompt Progress */}
                {topic.pre_recorded_prompts && (
                  <div className="mt-2">
                    <Progress
                      value={((currentPromptIndex + 1) / topic.pre_recorded_prompts.length) * 100}
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Prompt {currentPromptIndex + 1} of {topic.pre_recorded_prompts.length}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Side Panel */}
        <div className="space-y-4">
          {/* Vocabulary Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookMarked className="w-4 h-4" />
                Vocabulary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                {extractedVocabulary.length > 0 ? (
                  <div className="space-y-2">
                    {extractedVocabulary.flatMap(v => v.words).map((word, index) => (
                      <div key={index} className="p-2 bg-muted rounded-lg">
                        <div className="font-medium text-sm">{word.english}</div>
                        {word.definition && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {word.definition}
                          </div>
                        )}
                        <Badge variant="outline" className="mt-1 text-xs">
                          {word.difficulty_level}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    New vocabulary will appear here
                  </p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Learning Objectives */}
          {topic.learning_objectives && topic.learning_objectives.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Learning Goals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {topic.learning_objectives.map((objective, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <ChevronRight className="w-4 h-4 text-primary mt-0.5" />
                      <span>{objective}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Speaking Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Star className="w-4 h-4 text-yellow-500 mt-0.5" />
                  <span>Speak clearly and at a natural pace</span>
                </li>
                <li className="flex items-start gap-2">
                  <Star className="w-4 h-4 text-yellow-500 mt-0.5" />
                  <span>Don't worry about perfect grammar</span>
                </li>
                <li className="flex items-start gap-2">
                  <Star className="w-4 h-4 text-yellow-500 mt-0.5" />
                  <span>Focus on expressing your ideas</span>
                </li>
                <li className="flex items-start gap-2">
                  <Star className="w-4 h-4 text-yellow-500 mt-0.5" />
                  <span>Use the vocabulary hints if stuck</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}