import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, User, BookOpen, FileText, CheckCircle, XCircle, AlertCircle, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

interface Session {
  id: string;
  subscription_id: string;
  scheduled_datetime?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  duration_minutes: number;
  status: string;
  payment_status: string;
  cost: number;
  notes?: string;
  meeting_link?: string;
  homework?: string;
  vocabulary?: any[];
  teacher_notes?: string;
}

const SessionDetails: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;

      if (data) {
        setSession(data);
      } else {
        toast.error('Session not found');
        navigate('/student-dashboard');
      }
    } catch (error) {
      console.error('Error loading session:', error);
      toast.error('Failed to load session details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          <p className="text-muted-foreground">Loading session details...</p>
        </motion.div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-4">Session not found</h2>
            <Button onClick={() => navigate('/student-dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getSessionDateTime = () => {
    try {
      if (session.scheduled_datetime) {
        const date = new Date(session.scheduled_datetime);
        if (!isNaN(date.getTime())) return date;
      }
      if (session.scheduled_date && session.scheduled_time) {
        const date = new Date(`${session.scheduled_date}T${session.scheduled_time}`);
        if (!isNaN(date.getTime())) return date;
      }
      if (session.scheduled_date) {
        const date = new Date(session.scheduled_date);
        if (!isNaN(date.getTime())) return date;
      }
    } catch (error) {
      console.error('Error parsing session date:', error);
    }
    // Return current date as fallback
    return new Date();
  };

  const sessionDate = getSessionDateTime();
  const isValidDate = !isNaN(sessionDate.getTime());

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

  const getPaymentBadge = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Paid</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Pending</Badge>;
      case 'unpaid':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Unpaid</Badge>;
      default:
        return <Badge variant="secondary">{paymentStatus}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-950 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Button
            variant="ghost"
            onClick={() => navigate('/student-dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Session Details</h1>
            <div className="flex items-center gap-2">
              {getStatusIcon(session.status)}
              {getStatusBadge(session.status)}
            </div>
          </div>
        </motion.div>

        {/* Main Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-6 shadow-lg dark:bg-gray-800/50">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30">
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                <Calendar className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                Session Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4 dark:bg-gray-800/30">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Date & Time</p>
                  {isValidDate ? (
                    <>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {format(sessionDate, 'EEEE, MMMM d, yyyy')}
                      </p>
                      <p className="text-gray-700 dark:text-gray-300">
                        {format(sessionDate, 'h:mm a')} • {session.duration_minutes || 60} minutes
                      </p>
                    </>
                  ) : (
                    <p className="text-gray-700 dark:text-gray-300">
                      Session #{session.id?.slice(-6) || 'N/A'} • {session.duration_minutes || 60} minutes
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Payment Status</p>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-500 dark:text-green-400" />
                    <span className="font-semibold text-gray-900 dark:text-white">
                      RUB {session.cost || 0}
                    </span>
                    {getPaymentBadge(session.payment_status)}
                  </div>
                </div>
              </div>

              {session.meeting_link && (
                <div className="pt-4 border-t dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Meeting Link</p>
                  <Button
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    onClick={() => window.open(session.meeting_link, '_blank')}
                  >
                    Join Session
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs for Additional Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs defaultValue="notes" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
              <TabsTrigger value="notes" className="text-gray-700 dark:text-gray-300 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white">
                <FileText className="h-4 w-4 mr-2" />
                Notes
              </TabsTrigger>
              <TabsTrigger value="homework" className="text-gray-700 dark:text-gray-300 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white">
                <BookOpen className="h-4 w-4 mr-2" />
                Homework
              </TabsTrigger>
              <TabsTrigger value="vocabulary" className="text-gray-700 dark:text-gray-300 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white">
                <FileText className="h-4 w-4 mr-2" />
                Vocabulary
              </TabsTrigger>
            </TabsList>

            <TabsContent value="notes">
              <Card className="shadow-lg dark:bg-gray-800/50">
                <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/30 dark:to-teal-900/30">
                  <CardTitle className="text-gray-900 dark:text-white">Session Notes</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 dark:bg-gray-800/30">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {session.notes || 'No notes available for this session.'}
                  </p>
                  {session.teacher_notes && (
                    <div className="mt-4 pt-4 border-t dark:border-gray-700">
                      <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Teacher's Notes</p>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {session.teacher_notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="homework">
              <Card className="shadow-lg dark:bg-gray-800/50">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/30 dark:to-red-900/30">
                  <CardTitle className="text-gray-900 dark:text-white">Homework Assignment</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 dark:bg-gray-800/30">
                  {session.homework ? (
                    <div className="space-y-4">
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {session.homework}
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                      No homework assigned for this session.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="vocabulary">
              <Card className="shadow-lg dark:bg-gray-800/50">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30">
                  <CardTitle className="text-gray-900 dark:text-white">Vocabulary Words</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 dark:bg-gray-800/30">
                  {session.vocabulary && session.vocabulary.length > 0 ? (
                    <div className="grid gap-3">
                      {session.vocabulary.map((word: any, index: number) => (
                        <div
                          key={index}
                          className="flex justify-between items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                        >
                          <span className="font-medium text-gray-900 dark:text-white">
                            {word.word || word}
                          </span>
                          {word.translation && (
                            <span className="text-gray-600 dark:text-gray-400">
                              {word.translation}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                      No vocabulary words for this session.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default SessionDetails;