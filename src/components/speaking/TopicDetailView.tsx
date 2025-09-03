import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import AudioRecorder from './AudioRecorder';
import AudioPlayer from './AudioPlayer';
import { speakingPracticeService } from '@/services/firebase/speakingPractice.service';
// import { vocabularyProgressService } from '@/services/firebase/vocabularyProgress.service';
import { 
  SpeakingTopic, 
  SpeakingConversation, 
  SpeakingMessage,
  SpeakingFeedback 
} from '@/types/speakingPractice';
import { 
  ArrowLeft,
  PlayCircle,
  FileText,
  MessageSquare,
  Mic,
  Star,
  Clock,
  User,
  BookOpen,
  Video,
  Download,
  Send,
  Plus,
  ThumbsUp,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { useContext } from 'react';
import { UserContext } from '@/App';

interface TopicDetailViewProps {
  topic: SpeakingTopic;
  conversation?: SpeakingConversation;
  studentId: string;
  onBack: () => void;
}

const TopicDetailView: React.FC<TopicDetailViewProps> = ({ 
  topic, 
  conversation: existingConversation,
  studentId,
  onBack 
}) => {
  const { user } = useContext(UserContext);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [isRecording, setIsRecording] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [showVocabulary, setShowVocabulary] = useState(false);

  // Create or get conversation
  const [conversation, setConversation] = useState<SpeakingConversation | undefined>(existingConversation);

  useEffect(() => {
    if (!existingConversation && !conversation) {
      // Create a new conversation
      createConversation();
    }
  }, []);

  const createConversation = async () => {
    try {
      const newConversation: Omit<SpeakingConversation, 'id' | 'created_at' | 'updated_at'> = {
        topic_id: topic.id,
        student_id: studentId,
        teacher_id: topic.teacher_id,
        school_id: topic.school_id,
        status: 'active',
        message_count: 0,
        last_message_from: 'teacher',
        last_activity: new Date(),
        total_duration: 0
      };
      
      const id = await speakingPracticeService.createConversation(newConversation);
      const created = { ...newConversation, id, created_at: new Date(), updated_at: new Date() };
      setConversation(created as SpeakingConversation);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start conversation",
        variant: "destructive"
      });
    }
  };

  // Fetch messages
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['conversation-messages', conversation?.id],
    queryFn: () => speakingPracticeService.getConversationMessages(conversation!.id),
    enabled: !!conversation?.id
  });

  // Fetch feedback
  const { data: feedbacks } = useQuery({
    queryKey: ['conversation-feedbacks', conversation?.id],
    queryFn: () => speakingPracticeService.getMessageFeedbacks(conversation!.id),
    enabled: !!conversation?.id
  });

  // Submit audio recording
  const submitRecording = useMutation({
    mutationFn: async ({ audioUrl, duration, transcription }: {
      audioUrl: string;
      duration: number;
      transcription?: string;
    }) => {
      if (!conversation) throw new Error('No conversation');

      const message: Omit<SpeakingMessage, 'id' | 'created_at'> = {
        conversation_id: conversation.id,
        sender_type: 'student',
        sender_id: studentId,
        audio_url: audioUrl,
        duration,
        transcription,
        order_index: messages?.length || 0
      };

      await speakingPracticeService.addMessage(message);
      
      // Update conversation
      await speakingPracticeService.updateConversation(conversation.id, {
        message_count: (conversation.message_count || 0) + 1,
        last_message_from: 'student',
        last_activity: new Date(),
        total_duration: (conversation.total_duration || 0) + duration
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-messages'] });
      queryClient.invalidateQueries({ queryKey: ['student-conversations'] });
      toast({
        title: "Success",
        description: "Your response has been recorded"
      });
      setIsRecording(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit recording",
        variant: "destructive"
      });
    }
  });

  // Add vocabulary word
  const addVocabularyWord = useMutation({
    mutationFn: async (word: string) => {
      // TODO: Implement vocabulary word addition
      // This will be integrated with the vocabulary service
      console.log('Adding word to vocabulary:', word);
    },
    onSuccess: (_, word) => {
      toast({
        title: "Vocabulary Added",
        description: `"${word}" has been added to your vocabulary list`
      });
    }
  });

  // Submit rating
  const submitRating = useMutation({
    mutationFn: async (rating: number) => {
      if (!conversation) throw new Error('No conversation');
      
      await speakingPracticeService.updateConversation(conversation.id, {
        student_rating: rating,
        status: 'completed',
        completed_at: new Date()
      });
    },
    onSuccess: () => {
      toast({
        title: "Thank you!",
        description: "Your rating has been submitted"
      });
      queryClient.invalidateQueries({ queryKey: ['student-conversations'] });
    }
  });

  const handleRecordingComplete = async (blob: Blob) => {
    if (!conversation) return;
    
    // Upload audio
    const fileName = `${Date.now()}.webm`;
    const uploadUrl = await speakingPracticeService.uploadAudio(
      blob,
      conversation.id,
      fileName,
      (progress) => console.log('Upload progress:', progress)
    );

    // Calculate duration (approximate)
    const duration = Math.round(blob.size / 16000); // Rough estimate

    await submitRecording.mutateAsync({
      audioUrl: uploadUrl,
      duration
    });
  };

  const getFeedbackForMessage = (messageId: string) => {
    return feedbacks?.filter(f => f.message_id === messageId) || [];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{topic.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{topic.difficulty_level}</Badge>
              {topic.genre && <Badge variant="outline">{topic.genre}</Badge>}
              {conversation?.status === 'completed' && (
                <Badge className="bg-green-500">Completed</Badge>
              )}
            </div>
          </div>
        </div>
        
        {conversation?.status === 'active' && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowVocabulary(!showVocabulary)}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Vocabulary
            </Button>
            <Button
              onClick={() => {
                if (window.confirm('Are you ready to complete this topic and submit your rating?')) {
                  // Show rating dialog
                  const rating = prompt('Please rate this topic from 1-5 stars:');
                  if (rating && !isNaN(Number(rating)) && Number(rating) >= 1 && Number(rating) <= 5) {
                    submitRating.mutate(Number(rating));
                  }
                }
              }}
            >
              Complete & Rate
            </Button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="conversation">
            Conversation ({messages?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">{topic.instructions}</p>
            </CardContent>
          </Card>

          {topic.vocabulary_hints && topic.vocabulary_hints.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Vocabulary Hints</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {topic.vocabulary_hints.map((word, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="cursor-pointer hover:bg-blue-50"
                      onClick={() => addVocabularyWord.mutate(word)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {word}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Click on any word to add it to your vocabulary list
                </p>
              </CardContent>
            </Card>
          )}

          {topic.teacher_audio_url && (
            <Card>
              <CardHeader>
                <CardTitle>Teacher's Introduction</CardTitle>
              </CardHeader>
              <CardContent>
                <AudioPlayer
                  url={topic.teacher_audio_url}
                  title="Introduction"
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Conversation Tab */}
        <TabsContent value="conversation" className="space-y-4">
          <Card className="h-[600px] flex flex-col">
            <CardHeader>
              <CardTitle>Conversation Thread</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4">
                  {messages?.map((message) => {
                    const isStudent = message.sender_type === 'student';
                    const messageFeedbacks = getFeedbackForMessage(message.id);
                    
                    return (
                      <div key={message.id} className="space-y-2">
                        <div className={`flex ${isStudent ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] ${isStudent ? 'order-2' : ''}`}>
                            <div className={`rounded-lg p-4 ${
                              isStudent 
                                ? 'bg-blue-500 text-white' 
                                : 'bg-gray-100'
                            }`}>
                              <div className="flex items-center gap-2 mb-2">
                                <User className="h-4 w-4" />
                                <span className="text-sm font-medium">
                                  {isStudent ? 'You' : 'Teacher'}
                                </span>
                                <span className={`text-xs ${isStudent ? 'text-blue-100' : 'text-gray-500'}`}>
                                  {format(message.created_at.toDate(), 'p')}
                                </span>
                              </div>
                              
                              <AudioPlayer
                                url={message.audio_url}
                                title=""
                                variant="compact"
                                className={isStudent ? 'bg-blue-600' : 'bg-white'}
                              />
                              
                              {message.transcription && (
                                <p className={`text-sm mt-2 ${isStudent ? 'text-blue-50' : 'text-gray-600'}`}>
                                  {message.transcription}
                                </p>
                              )}
                            </div>
                            
                            {/* Feedback for this message */}
                            {messageFeedbacks.map(feedback => (
                              <div key={feedback.id} className="mt-2 ml-4 border-l-2 border-yellow-400 pl-3">
                                <div className="bg-yellow-50 rounded p-3">
                                  <div className="flex items-center gap-2 mb-1">
                                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                                    <span className="text-sm font-medium text-yellow-900">Teacher Feedback</span>
                                  </div>
                                  {feedback.type === 'audio' && feedback.content_url ? (
                                    <AudioPlayer
                                      url={feedback.content_url}
                                      title=""
                                      variant="compact"
                                      className="bg-yellow-100"
                                    />
                                  ) : feedback.type === 'video' && feedback.content_url ? (
                                    <video 
                                      src={feedback.content_url} 
                                      controls 
                                      className="w-full rounded mt-2"
                                    />
                                  ) : (
                                    <p className="text-sm text-gray-700">{feedback.text_content}</p>
                                  )}
                                  {feedback.suggestions && feedback.suggestions.length > 0 && (
                                    <div className="mt-2">
                                      <p className="text-xs font-medium text-gray-600">Suggestions:</p>
                                      <ul className="text-xs text-gray-600 mt-1 space-y-1">
                                        {feedback.suggestions.map((suggestion, idx) => (
                                          <li key={idx}>• {suggestion}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {messages?.length === 0 && (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No messages yet</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Listen to the teacher's introduction and record your response to start the conversation
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              <Separator className="my-4" />
              
              {/* Recording Section */}
              <div className="p-4 bg-gray-50 rounded-lg">
                {isRecording ? (
                  <AudioRecorder
                    onRecordingComplete={handleRecordingComplete}
                    onCancel={() => setIsRecording(false)}
                    maxDuration={300} // 5 minutes max
                  />
                ) : (
                  <Button 
                    onClick={() => setIsRecording(true)}
                    className="w-full"
                    disabled={conversation?.status === 'completed'}
                  >
                    <Mic className="h-4 w-4 mr-2" />
                    Record Your Response
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="space-y-4">
          {topic.video_urls && topic.video_urls.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Videos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topic.video_urls.map((url, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex items-center gap-3">
                        <Video className="h-5 w-5 text-blue-500" />
                        <span className="text-sm">Video {index + 1}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(url, '_blank')}
                      >
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Watch
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {topic.material_urls && topic.material_urls.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Materials</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topic.material_urls.map((url, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-green-500" />
                        <span className="text-sm">Material {index + 1}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(url, '_blank')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {conversation?.teacher_rating && (
            <Card>
              <CardHeader>
                <CardTitle>Your Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg font-medium">Teacher Rating:</span>
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i}
                        className={`h-5 w-5 ${
                          i < conversation.teacher_rating! 
                            ? 'text-yellow-500 fill-yellow-500' 
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-gray-600">({conversation.teacher_rating}/5)</span>
                </div>
                
                {conversation.teacher_feedback && (
                  <div>
                    <p className="font-medium mb-2">Teacher's Feedback:</p>
                    <p className="text-gray-700">{conversation.teacher_feedback}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Vocabulary Sidebar */}
      {showVocabulary && (
        <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-lg z-50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Vocabulary Helper</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowVocabulary(false)}
            >
              ✕
            </Button>
          </div>
          <div className="space-y-2">
            {topic.vocabulary_hints?.map((word, index) => (
              <div
                key={index}
                className="p-3 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
                onClick={() => addVocabularyWord.mutate(word)}
              >
                <p className="font-medium">{word}</p>
                <p className="text-xs text-gray-500">Click to add to your list</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TopicDetailView;