import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Plus,
  Trash2,
  Save,
  Mic,
  MicOff,
  Play,
  Pause,
  Upload,
  ChevronRight,
  Settings,
  Brain,
  Volume2,
  FileAudio,
  Target,
  BookOpen,
  Tags,
  AlertCircle,
  Sparkles,
  TreePine,
  Loader2,
  Check,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import AudioRecorder from './AudioRecorder';
import {
  SpeakingTopic,
  PreRecordedPrompt,
  AIConfig,
  speakingPracticeService
} from '@/services/firebase/speakingPractice.service';
import { elevenLabsService } from '@/services/ai/elevenlabs.service';

interface EnhancedTopicBuilderProps {
  parentTopic?: SpeakingTopic;
  onSave: (topic: SpeakingTopic) => void;
  onCancel: () => void;
  editingTopic?: SpeakingTopic;
}

const EnhancedTopicBuilder: React.FC<EnhancedTopicBuilderProps> = ({
  parentTopic,
  onSave,
  onCancel,
  editingTopic
}) => {
  // Form state
  const [formData, setFormData] = useState<Partial<SpeakingTopic>>({
    name: editingTopic?.name || '',
    description: editingTopic?.description || '',
    genre: editingTopic?.genre || 'conversation',
    difficulty: editingTopic?.difficulty || 'intermediate',
    cefr_level: editingTopic?.cefr_level || 'B1',
    instructions: editingTopic?.instructions || '',
    estimated_duration: editingTopic?.estimated_duration || 10,
    parent_id: parentTopic?.id || editingTopic?.parent_id,
    tags: editingTopic?.tags || [],
    interests_tags: editingTopic?.interests_tags || [],
    learning_objectives: editingTopic?.learning_objectives || [],
    vocabulary_hints: editingTopic?.vocabulary_hints || [],
    pre_recorded_prompts: editingTopic?.pre_recorded_prompts || [],
    ai_config: editingTopic?.ai_config || {
      enabled: false,
      model: 'gpt-4',
      conversation_style: 'encouraging',
      correction_mode: 'subtle',
      temperature: 0.7
    },
    is_published: editingTopic?.is_published || false
  });

  // UI state
  const [activeTab, setActiveTab] = useState('basic');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingPromptIndex, setRecordingPromptIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<any[]>([]);
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  // Refs
  const audioRecorderRef = useRef<any>(null);

  // Load available AI voices
  useEffect(() => {
    loadVoices();
  }, []);

  const loadVoices = async () => {
    try {
      const voices = await elevenLabsService.getVoices();
      setAvailableVoices(voices);
    } catch (error) {
      console.error('Error loading voices:', error);
    }
  };

  // Handle form field changes
  const handleFieldChange = (field: keyof SpeakingTopic, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle AI config changes
  const handleAIConfigChange = (field: keyof AIConfig, value: any) => {
    setFormData(prev => ({
      ...prev,
      ai_config: {
        ...prev.ai_config!,
        [field]: value
      }
    }));
  };

  // Add learning objective
  const addLearningObjective = () => {
    const objective = prompt('Enter learning objective:');
    if (objective) {
      setFormData(prev => ({
        ...prev,
        learning_objectives: [...(prev.learning_objectives || []), objective]
      }));
    }
  };

  // Remove learning objective
  const removeLearningObjective = (index: number) => {
    setFormData(prev => ({
      ...prev,
      learning_objectives: prev.learning_objectives?.filter((_, i) => i !== index)
    }));
  };

  // Add vocabulary hint
  const addVocabularyHint = () => {
    const word = prompt('Enter vocabulary word or phrase:');
    if (word) {
      setFormData(prev => ({
        ...prev,
        vocabulary_hints: [...(prev.vocabulary_hints || []), word]
      }));
    }
  };

  // Remove vocabulary hint
  const removeVocabularyHint = (index: number) => {
    setFormData(prev => ({
      ...prev,
      vocabulary_hints: prev.vocabulary_hints?.filter((_, i) => i !== index)
    }));
  };

  // Add tag
  const addTag = (type: 'tags' | 'interests_tags', value: string) => {
    if (value && !formData[type]?.includes(value)) {
      setFormData(prev => ({
        ...prev,
        [type]: [...(prev[type] || []), value]
      }));
    }
  };

  // Remove tag
  const removeTag = (type: 'tags' | 'interests_tags', index: number) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type]?.filter((_, i) => i !== index)
    }));
  };

  // Handle audio recording completion
  const handleRecordingComplete = async (audioBlob: Blob, duration: number) => {
    if (recordingPromptIndex === null) return;

    try {
      // Upload audio to storage
      const audioUrl = await speakingPracticeService.uploadAudio(
        audioBlob,
        `prompts/${Date.now()}.webm`
      );

      // Get transcript (you might want to use OpenAI Whisper here)
      const transcript = prompt('Enter transcript for this recording:') || '';

      const newPrompt: PreRecordedPrompt = {
        id: Date.now().toString(),
        audio_url: audioUrl,
        transcript,
        order: recordingPromptIndex,
        prompt_type: recordingPromptIndex === 0 ? 'introduction' : 'question',
        expected_response_duration: 30
      };

      // Update prompts array
      const updatedPrompts = [...(formData.pre_recorded_prompts || [])];
      const existingIndex = updatedPrompts.findIndex(p => p.order === recordingPromptIndex);

      if (existingIndex >= 0) {
        updatedPrompts[existingIndex] = newPrompt;
      } else {
        updatedPrompts.push(newPrompt);
      }

      setFormData(prev => ({
        ...prev,
        pre_recorded_prompts: updatedPrompts.sort((a, b) => a.order - b.order)
      }));

      setRecordingPromptIndex(null);
      toast.success('Prompt recorded successfully');
    } catch (error) {
      console.error('Error saving recording:', error);
      toast.error('Failed to save recording');
    }
  };

  // Test AI voice
  const testVoice = async () => {
    if (!formData.ai_config?.voice_id) {
      toast.error('Please select a voice first');
      return;
    }

    setIsTestingVoice(true);
    try {
      const audio = await elevenLabsService.textToSpeech(
        "Hello! I'm excited to help you practice English today. Let's have a great conversation!",
        {
          voice_id: formData.ai_config.voice_id,
          voice_settings: formData.ai_config.voice_settings
        }
      );

      // Play the audio
      const audioElement = new Audio(audio.audio_url);
      await audioElement.play();
    } catch (error) {
      console.error('Error testing voice:', error);
      toast.error('Failed to test voice');
    } finally {
      setIsTestingVoice(false);
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    if (!formData.name?.trim()) {
      toast.error('Topic name is required');
      return false;
    }

    if (!formData.instructions?.trim()) {
      toast.error('Instructions are required');
      return false;
    }

    if (formData.ai_config?.enabled && !formData.pre_recorded_prompts?.length) {
      toast.warning('AI is enabled but no prompts are recorded. Students will start with AI directly.');
    }

    return true;
  };

  // Save topic
  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const topicData = {
        ...formData,
        teacher_id: '', // Will be set by service
        school_id: '', // Will be set by service
        created_at: new Date(),
        updated_at: new Date()
      } as SpeakingTopic;

      await onSave(topicData);
      toast.success('Topic saved successfully');
    } catch (error) {
      console.error('Error saving topic:', error);
      toast.error('Failed to save topic');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {editingTopic ? 'Edit Topic' : 'Create Speaking Topic'}
          </h2>
          {parentTopic && (
            <p className="text-muted-foreground mt-1">
              Parent: {parentTopic.name}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Topic
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="basic">
            <BookOpen className="h-4 w-4 mr-2" />
            Basic Info
          </TabsTrigger>
          <TabsTrigger value="content">
            <FileAudio className="h-4 w-4 mr-2" />
            Content
          </TabsTrigger>
          <TabsTrigger value="prompts">
            <Mic className="h-4 w-4 mr-2" />
            Prompts
          </TabsTrigger>
          <TabsTrigger value="ai">
            <Brain className="h-4 w-4 mr-2" />
            AI Assistant
          </TabsTrigger>
          <TabsTrigger value="objectives">
            <Target className="h-4 w-4 mr-2" />
            Objectives
          </TabsTrigger>
        </TabsList>

        {/* Basic Info Tab */}
        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Define the basic details of your speaking topic
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Topic Name*</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    placeholder="e.g., Daily Routine Conversation"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Estimated Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.estimated_duration}
                    onChange={(e) => handleFieldChange('estimated_duration', parseInt(e.target.value))}
                    min={5}
                    max={60}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  placeholder="Describe what students will practice in this topic..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Genre</Label>
                  <Select
                    value={formData.genre}
                    onValueChange={(value) => handleFieldChange('genre', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conversation">Conversation</SelectItem>
                      <SelectItem value="presentation">Presentation</SelectItem>
                      <SelectItem value="debate">Debate</SelectItem>
                      <SelectItem value="storytelling">Storytelling</SelectItem>
                      <SelectItem value="interview">Interview</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(value) => handleFieldChange('difficulty', value)}
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

                <div className="space-y-2">
                  <Label>CEFR Level</Label>
                  <Select
                    value={formData.cefr_level}
                    onValueChange={(value) => handleFieldChange('cefr_level', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A1">A1 (Beginner)</SelectItem>
                      <SelectItem value="A2">A2 (Elementary)</SelectItem>
                      <SelectItem value="B1">B1 (Intermediate)</SelectItem>
                      <SelectItem value="B2">B2 (Upper Intermediate)</SelectItem>
                      <SelectItem value="C1">C1 (Advanced)</SelectItem>
                      <SelectItem value="C2">C2 (Proficiency)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label>Publish immediately</Label>
                  <p className="text-sm text-muted-foreground">
                    Make this topic available to students right away
                  </p>
                </div>
                <Switch
                  checked={formData.is_published}
                  onCheckedChange={(checked) => handleFieldChange('is_published', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Instructions & Vocabulary</CardTitle>
              <CardDescription>
                Provide clear instructions and vocabulary hints for students
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="instructions">Instructions*</Label>
                <Textarea
                  id="instructions"
                  value={formData.instructions}
                  onChange={(e) => handleFieldChange('instructions', e.target.value)}
                  placeholder="Explain what students should do in this speaking practice..."
                  rows={5}
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Vocabulary Hints</Label>
                  <Button size="sm" variant="outline" onClick={addVocabularyHint}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Word
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.vocabulary_hints?.map((word, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {word}
                      <button
                        onClick={() => removeVocabularyHint(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {!formData.vocabulary_hints?.length && (
                    <p className="text-sm text-muted-foreground">
                      No vocabulary hints added yet
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prompts Tab */}
        <TabsContent value="prompts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pre-recorded Prompts</CardTitle>
              <CardDescription>
                Record voice prompts that will guide the conversation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Record prompts in order. Students will hear these before responding.
                  If AI is enabled, it will take over after your prompts.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                {[0, 1, 2, 3, 4].map((index) => {
                  const prompt = formData.pre_recorded_prompts?.find(p => p.order === index);
                  return (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Label>Prompt {index + 1}</Label>
                        {prompt && (
                          <Badge variant="outline" className="gap-1">
                            <Check className="h-3 w-3" />
                            Recorded
                          </Badge>
                        )}
                      </div>

                      {recordingPromptIndex === index ? (
                        <AudioRecorder
                          onRecordingComplete={handleRecordingComplete}
                          maxDuration={60}
                          showWaveform
                        />
                      ) : (
                        <div className="space-y-3">
                          {prompt ? (
                            <>
                              <p className="text-sm text-muted-foreground">
                                {prompt.transcript}
                              </p>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const audio = new Audio(prompt.audio_url);
                                    audio.play();
                                  }}
                                >
                                  <Play className="h-4 w-4 mr-1" />
                                  Play
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setRecordingPromptIndex(index)}
                                >
                                  <Mic className="h-4 w-4 mr-1" />
                                  Re-record
                                </Button>
                              </div>
                            </>
                          ) : (
                            <Button
                              variant="outline"
                              onClick={() => setRecordingPromptIndex(index)}
                            >
                              <Mic className="h-4 w-4 mr-2" />
                              Record Prompt
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Assistant Tab */}
        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Assistant Configuration</CardTitle>
              <CardDescription>
                Configure how the AI assistant will interact with students
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label>Enable AI Assistant</Label>
                  <p className="text-sm text-muted-foreground">
                    AI will continue the conversation after your prompts
                  </p>
                </div>
                <Switch
                  checked={formData.ai_config?.enabled}
                  onCheckedChange={(checked) => handleAIConfigChange('enabled', checked)}
                />
              </div>

              {formData.ai_config?.enabled && (
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>AI Model</Label>
                        <Select
                          value={formData.ai_config.model}
                          onValueChange={(value) => handleAIConfigChange('model', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gpt-4">GPT-4 (Best)</SelectItem>
                            <SelectItem value="gpt-3.5-turbo">GPT-3.5 (Faster)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Conversation Style</Label>
                        <Select
                          value={formData.ai_config.conversation_style}
                          onValueChange={(value) => handleAIConfigChange('conversation_style', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="formal">Formal</SelectItem>
                            <SelectItem value="casual">Casual</SelectItem>
                            <SelectItem value="encouraging">Encouraging</SelectItem>
                            <SelectItem value="challenging">Challenging</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Correction Mode</Label>
                        <Select
                          value={formData.ai_config.correction_mode}
                          onValueChange={(value) => handleAIConfigChange('correction_mode', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="immediate">Immediate</SelectItem>
                            <SelectItem value="end_of_session">End of Session</SelectItem>
                            <SelectItem value="subtle">Subtle</SelectItem>
                            <SelectItem value="none">None</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>AI Voice</Label>
                        <div className="flex gap-2">
                          <Select
                            value={formData.ai_config.voice_id}
                            onValueChange={(value) => handleAIConfigChange('voice_id', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select voice" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableVoices.map((voice) => (
                                <SelectItem key={voice.voice_id} value={voice.voice_id}>
                                  {voice.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            onClick={testVoice}
                            disabled={!formData.ai_config.voice_id || isTestingVoice}
                          >
                            {isTestingVoice ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Volume2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>System Prompt (Optional)</Label>
                      <Textarea
                        value={formData.ai_config.system_prompt}
                        onChange={(e) => handleAIConfigChange('system_prompt', e.target.value)}
                        placeholder="Custom instructions for the AI assistant..."
                        rows={3}
                      />
                    </div>

                    <Alert>
                      <Sparkles className="h-4 w-4" />
                      <AlertDescription>
                        AI will adapt to the student's level and provide personalized feedback.
                        Estimated cost: ~$0.02 per minute of conversation.
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                </AnimatePresence>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Objectives Tab */}
        <TabsContent value="objectives" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Learning Objectives & Tags</CardTitle>
              <CardDescription>
                Define what students will learn and how to categorize this topic
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Learning Objectives</Label>
                  <Button size="sm" variant="outline" onClick={addLearningObjective}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Objective
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.learning_objectives?.map((objective, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1">{objective}</span>
                      <button
                        onClick={() => removeLearningObjective(index)}
                        className="hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {!formData.learning_objectives?.length && (
                    <p className="text-sm text-muted-foreground">
                      No learning objectives defined yet
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>Interest Tags</Label>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Add interest tag (e.g., sports, technology)"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addTag('interests_tags', e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.interests_tags?.map((tag, index) => (
                    <Badge key={index} variant="outline" className="gap-1">
                      <Tags className="h-3 w-3" />
                      {tag}
                      <button
                        onClick={() => removeTag('interests_tags', index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedTopicBuilder;