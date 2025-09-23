import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Calendar,
  Clock,
  User,
  BookOpen,
  FileText,
  Paperclip,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { sessionDetailsService } from '@/services/firebase/sessionDetails.service';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface SessionDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  sessionData?: any;
}

interface SessionDetails {
  id?: string;
  session_id: string;
  topic?: string;
  notes?: string;
  vocabulary?: Array<{ english: string; translation?: string; pronunciation?: string; language?: string }>;
  attachments?: Array<{ name: string; url: string; type?: string }>;
}

const SessionDetailsDialog: React.FC<SessionDetailsDialogProps> = ({
  open,
  onOpenChange,
  sessionId,
  sessionData
}) => {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [sessionDetails, setSessionDetails] = useState<SessionDetails | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);

  useEffect(() => {
    if (open && sessionId) {
      loadSessionDetails();
    }
  }, [open, sessionId]);

  const loadSessionDetails = async () => {
    setLoading(true);
    try {
      // Use provided session data or fetch it
      let sessionInfo = sessionData;

      if (!sessionInfo) {
        const { data: sessionResult } = await supabase
          .from('lesson_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        sessionInfo = sessionResult;
      }

      setSession(sessionInfo);

      // Get subscription info for course name
      if (sessionInfo?.subscription_id) {
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('student_name, subject, teacher_id')
          .eq('id', sessionInfo.subscription_id)
          .single();

        setSubscriptionInfo(subData);
      }

      // Get session details from Firebase
      const details = await sessionDetailsService.getBySessionId(sessionId);
      if (details) {
        setSessionDetails(details);
      } else {
        // Create structure with sample vocabulary
        setSessionDetails({
          session_id: sessionId,
          topic: '',
          notes: '',
          vocabulary: [
            { english: 'hey', translation: 'эй', pronunciation: 'ey', language: 'ru' },
            { english: 'hello', translation: 'привет', pronunciation: 'pree-VYET', language: 'ru' },
            { english: 'goodbye', translation: 'до свидания', pronunciation: 'da svee-DAH-nee-ya', language: 'ru' },
            { english: 'thank you', translation: 'спасибо', pronunciation: 'spa-SEE-ba', language: 'ru' },
            { english: 'please', translation: 'пожалуйста', pronunciation: 'pa-ZHAL-sta', language: 'ru' }
          ],
          attachments: []
        });
      }
    } catch (error) {
      console.error('Error loading session details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSessionDateTime = () => {
    if (!session) return new Date();

    try {
      const dateField = session.scheduled_date ||
                       session.scheduledDate ||
                       session.scheduled_datetime ||
                       session.scheduledDateTime ||
                       session.created_at;

      if (dateField) {
        const date = new Date(dateField);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    } catch (error) {
      console.error('Error parsing date:', error);
    }

    return new Date();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'scheduled':
        return <Calendar className="h-5 w-5 text-blue-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Cancelled</Badge>;
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Scheduled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-gray-900 dark:text-white">
            <span>Session Details</span>
            {session && (
              <div className="flex items-center gap-2">
                {getStatusIcon(session.status)}
                {getStatusBadge(session.status)}
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Session Info Card */}
            <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <BookOpen className="h-5 w-5 text-gray-500 dark:text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Course</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {subscriptionInfo?.subject || sessionData?.course_name || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-gray-500 dark:text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Student</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {subscriptionInfo?.student_name || sessionData?.student_name || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-gray-500 dark:text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Date</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {format(getSessionDateTime(), 'PPP')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-gray-500 dark:text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Duration</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {session?.duration_minutes || 60} minutes
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs for Details */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-gray-100 dark:bg-gray-800">
                <TabsTrigger value="overview" className="dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white">
                  <FileText className="h-4 w-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="vocabulary" className="dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Vocabulary
                  {sessionDetails?.vocabulary && sessionDetails.vocabulary.length > 0 && (
                    <Badge variant="secondary" className="ml-2 dark:bg-gray-600 dark:text-gray-200">
                      {sessionDetails.vocabulary.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="attachments" className="dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white">
                  <Paperclip className="h-4 w-4 mr-2" />
                  Attachments
                  {sessionDetails?.attachments && sessionDetails.attachments.length > 0 && (
                    <Badge variant="secondary" className="ml-2 dark:bg-gray-600 dark:text-gray-200">
                      {sessionDetails.attachments.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[300px] mt-4">
                <TabsContent value="overview" className="mt-0">
                  <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">Topic</h4>
                          <p className="text-gray-600 dark:text-gray-300">
                            {sessionDetails?.topic || 'No topic specified'}
                          </p>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">Session Notes</h4>
                          <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                            {sessionDetails?.notes || 'No notes available for this session'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="vocabulary" className="mt-0">
                  <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardContent className="pt-6">
                      {sessionDetails?.vocabulary && sessionDetails.vocabulary.length > 0 ? (
                        <div className="space-y-2">
                          {sessionDetails.vocabulary.map((item, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-4 p-4 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors border-l-4 border-blue-500"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">🇷🇺</span>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 text-lg">
                                  <span className="font-semibold text-gray-900 dark:text-white">
                                    {item.english}
                                  </span>
                                  <span className="text-gray-500 dark:text-gray-400">›</span>
                                  <span className="font-medium text-blue-600 dark:text-blue-400">
                                    {item.translation || 'эй'}
                                  </span>
                                </div>
                                {item.pronunciation && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400 italic mt-1">
                                    /{item.pronunciation}/
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                          No vocabulary words for this session
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="attachments" className="mt-0">
                  <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardContent className="pt-6">
                      {sessionDetails?.attachments && sessionDetails.attachments.length > 0 ? (
                        <div className="space-y-2">
                          {sessionDetails.attachments.map((attachment, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-600"
                            >
                              <div className="flex items-center gap-3">
                                <Paperclip className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {attachment.name}
                                </span>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="hover:bg-gray-100 dark:hover:bg-gray-700"
                                onClick={() => window.open(attachment.url, '_blank')}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                          No attachments for this session
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SessionDetailsDialog;