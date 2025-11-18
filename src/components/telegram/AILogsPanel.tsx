import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageSquare, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface AILogsPanelProps {
  schoolId: string;
}

interface AILog {
  id: string;
  studentId: string;
  userMessage: string;
  aiMessage: string;
  wasEscalated: boolean;
  escalationReason: string | null;
  confidence: number;
  tokensUsed: number;
  timestamp: any;
}

export function AILogsPanel({ schoolId }: AILogsPanelProps) {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['ai-logs', schoolId],
    queryFn: async () => {
      const logsRef = collection(db, 'ai_chat_logs');
      const q = query(
        logsRef,
        where('schoolId', '==', schoolId),
        orderBy('timestamp', 'desc'),
        limit(50)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AILog[];
    },
    enabled: !!schoolId,
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle>AI Chat Logs</CardTitle>
          </div>
          <CardDescription>
            Recent AI conversations with students (last 50 interactions)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!logs || logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No AI conversations yet
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <Card key={log.id} className="border-l-4 border-l-primary/20">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'MMM d, yyyy HH:mm:ss') : 'Unknown'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {log.wasEscalated ? (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Escalated
                          </Badge>
                        ) : (
                          <Badge variant="default" className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Handled
                          </Badge>
                        )}
                        <Badge variant="outline">
                          {log.tokensUsed} tokens
                        </Badge>
                        <Badge variant="secondary">
                          {Math.round(log.confidence * 100)}% confidence
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* Student Message */}
                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="text-xs font-medium text-muted-foreground mb-1">
                          Student Message:
                        </div>
                        <div className="text-sm">{log.userMessage}</div>
                      </div>

                      {/* AI Response */}
                      <div className={`rounded-lg p-3 ${log.wasEscalated ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                        <div className="text-xs font-medium text-muted-foreground mb-1">
                          AI Response:
                        </div>
                        <div className="text-sm">{log.aiMessage}</div>
                      </div>

                      {/* Escalation Reason */}
                      {log.wasEscalated && log.escalationReason && (
                        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                          <div className="text-xs font-medium text-destructive mb-1">
                            Escalation Reason:
                          </div>
                          <div className="text-sm text-muted-foreground">{log.escalationReason}</div>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 text-xs text-muted-foreground">
                      Student ID: {log.studentId}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
