import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  BookOpen,
  CheckSquare,
  FileText,
  Search,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';

interface SessionsContentTabProps {
  sessions: any[];
  sessionDetails: any[];
  todos: any[];
  isLoading: boolean;
}

const SessionsContentTab: React.FC<SessionsContentTabProps> = ({
  sessions,
  sessionDetails,
  todos,
  isLoading
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  const toggleSession = (sessionId: string) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedSessions(newExpanded);
  };

  const getSessionDetails = (sessionId: string) => {
    return sessionDetails.find((d: any) => d?.session_id === sessionId);
  };

  const getSessionTodos = (sessionId: string) => {
    return todos.filter((t: any) => t.session_id === sessionId);
  };

  const filteredSessions = sessions.filter(session => {
    if (!searchTerm) return true;
    const details = getSessionDetails(session.id);
    const searchLower = searchTerm.toLowerCase();
    
    return (
      session.topic?.toLowerCase().includes(searchLower) ||
      details?.notes?.toLowerCase().includes(searchLower) ||
      details?.vocabulary?.some((v: any) => 
        v.english?.toLowerCase().includes(searchLower) ||
        v.translation?.toLowerCase().includes(searchLower)
      )
    );
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sessions, vocabulary, notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filter
        </Button>
      </div>

      {/* Sessions List */}
      {filteredSessions.length > 0 ? (
        <div className="space-y-4">
          {filteredSessions.map((session: any) => {
            const details = getSessionDetails(session.id);
            const sessionTodos = getSessionTodos(session.id);
            const isExpanded = expandedSessions.has(session.id);
            
            return (
              <Card key={session.id} className="overflow-hidden">
                <Collapsible open={isExpanded} onOpenChange={() => toggleSession(session.id)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <CardTitle className="text-lg">
                              {session.topic || `Session ${session.id.slice(-6)}`}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-4 mt-1">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {session.date ? format(new Date(session.date), 'MMM dd, yyyy') : 'Date TBD'}
                              </span>
                              {session.time && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {session.time}
                                </span>
                              )}
                            </CardDescription>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="flex gap-2">
                            {details?.vocabulary && details.vocabulary.length > 0 && (
                              <Badge variant="secondary" className="gap-1">
                                <BookOpen className="h-3 w-3" />
                                {details.vocabulary.length} words
                              </Badge>
                            )}
                            {sessionTodos.length > 0 && (
                              <Badge variant="secondary" className="gap-1">
                                <CheckSquare className="h-3 w-3" />
                                {sessionTodos.length} todos
                              </Badge>
                            )}
                            {details?.notes && (
                              <Badge variant="secondary" className="gap-1">
                                <FileText className="h-3 w-3" />
                                Notes
                              </Badge>
                            )}
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="space-y-4 border-t">
                      {/* Session Notes */}
                      {details?.notes && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Session Notes
                          </h4>
                          <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded">
                            {details.notes}
                          </p>
                        </div>
                      )}

                      {/* Vocabulary */}
                      {details?.vocabulary && details.vocabulary.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            Vocabulary ({details.vocabulary.length} words)
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {details.vocabulary.map((word: any, index: number) => (
                              <div key={word.id || index} className="flex justify-between p-2 bg-gray-50 rounded">
                                <span className="font-medium">{word.english}</span>
                                <span className="text-muted-foreground">{word.translation}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* TODOs */}
                      {sessionTodos.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <CheckSquare className="h-4 w-4" />
                            TODOs ({sessionTodos.length})
                          </h4>
                          <div className="space-y-2">
                            {sessionTodos.map((todo: any) => (
                              <div key={todo.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <div className="flex items-center gap-2">
                                  <CheckSquare className={`h-4 w-4 ${
                                    todo.status === 'completed' ? 'text-green-500' : 'text-gray-400'
                                  }`} />
                                  <span className={todo.status === 'completed' ? 'line-through' : ''}>
                                    {todo.title}
                                  </span>
                                </div>
                                <Badge 
                                  variant={todo.status === 'completed' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {todo.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Attachments */}
                      {details?.attachments && details.attachments.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Attachments</h4>
                          <div className="space-y-1">
                            {details.attachments.map((attachment: any, index: number) => (
                              <div key={index} className="text-sm text-blue-600 hover:underline cursor-pointer">
                                {attachment.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {!details?.vocabulary?.length && !sessionTodos.length && !details?.notes && (
                        <p className="text-muted-foreground text-center py-4">
                          No content added for this session yet
                        </p>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchTerm ? 'No sessions found matching your search' : 'No sessions yet'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SessionsContentTab;