import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Send,
  Search,
  Loader2,
  MessageCircle,
  User,
  Clock,
  CheckCheck,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { telegramMessagesService, TelegramMessage, ChatSummary } from '@/services/telegramMessages.service';
import { telegramService } from '@/services/telegram.service';
import { FirebaseStudent } from '@/services/firebase/students.service';

interface MessengerHubProps {
  schoolId: string;
}

interface StudentChat {
  student: FirebaseStudent;
  lastMessage?: string;
  lastMessageAt?: Date;
  unreadCount: number;
}

export function MessengerHub({ schoolId }: MessengerHubProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch students with Telegram linked
  const { data: students = [], isLoading: isLoadingStudents } = useQuery({
    queryKey: ['telegram-enabled-students', schoolId],
    queryFn: () => telegramService.getEnabledStudents(schoolId),
    enabled: !!schoolId
  });

  // Fetch chat summaries
  const { data: chatSummaries = [] } = useQuery({
    queryKey: ['chatSummaries', schoolId],
    queryFn: () => telegramMessagesService.getChatSummaries(schoolId),
    enabled: !!schoolId,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Combine students with chat summaries
  const studentChats: StudentChat[] = React.useMemo(() => {
    return students.map(student => {
      const summary = chatSummaries.find(s => s.studentId === student.id);
      return {
        student,
        lastMessage: summary?.lastMessage,
        lastMessageAt: summary?.lastMessageAt,
        unreadCount: summary?.unreadCount || 0
      };
    }).sort((a, b) => {
      // Sort by last message time, most recent first
      if (!a.lastMessageAt) return 1;
      if (!b.lastMessageAt) return -1;
      return b.lastMessageAt.getTime() - a.lastMessageAt.getTime();
    });
  }, [students, chatSummaries]);

  // Filter students based on search
  const filteredChats = studentChats.filter(chat => {
    const fullName = `${chat.student.firstName} ${chat.student.lastName}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || chat.lastMessage?.toLowerCase().includes(query);
  });

  // Get selected student data
  const selectedStudent = studentChats.find(c => c.student.id === selectedStudentId)?.student;

  // Subscribe to real-time messages for selected chat
  useEffect(() => {
    if (!selectedStudentId || !schoolId) return;

    const unsubscribe = telegramMessagesService.subscribeToChat(
      schoolId,
      selectedStudentId,
      (newMessages) => {
        setMessages(newMessages);
        // Scroll to bottom when new messages arrive
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [selectedStudentId, schoolId]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!selectedStudent?.telegramNotifications?.chatId || !selectedStudentId) {
        throw new Error('No chat ID available');
      }

      return await telegramMessagesService.sendMessage(
        schoolId,
        selectedStudentId,
        text
      );
    },
    onSuccess: () => {
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: ['chatSummaries', schoolId] });
      toast({
        title: 'Message sent',
        description: 'Your message has been sent successfully.'
      });
    },
    onError: (error) => {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive'
      });
    }
  });

  const handleSendMessage = () => {
    const trimmedText = messageText.trim();
    if (!trimmedText || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(trimmedText);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (isLoadingStudents) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Telegram Chats</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            No students have linked their Telegram accounts yet. Students need to start a chat with your bot first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-12rem)]">
      {/* Chat List Sidebar */}
      <Card className="lg:col-span-1 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Chats ({students.length})
          </CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <ScrollArea className="flex-1">
          <div className="px-4 pb-4 space-y-2">
            {filteredChats.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No students found
              </div>
            ) : (
              filteredChats.map((chat) => (
                <button
                  key={chat.student.id}
                  onClick={() => setSelectedStudentId(chat.student.id!)}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left",
                    selectedStudentId === chat.student.id
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted/50 border border-transparent"
                  )}
                >
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={chat.student.profilePictureUrl} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(chat.student.firstName, chat.student.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-sm truncate">
                        {chat.student.firstName} {chat.student.lastName}
                      </h4>
                      {chat.lastMessageAt && (
                        <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                          {formatTime(chat.lastMessageAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground truncate">
                        {chat.lastMessage || 'No messages yet'}
                      </p>
                      {chat.unreadCount > 0 && (
                        <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5 flex-shrink-0">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Chat View */}
      <Card className="lg:col-span-2 flex flex-col">
        {selectedStudent ? (
          <>
            {/* Chat Header */}
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedStudent.profilePictureUrl} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(selectedStudent.firstName, selectedStudent.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold">
                    {selectedStudent.firstName} {selectedStudent.lastName}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    @{selectedStudent.telegramNotifications?.username || 'Unknown'}
                  </p>
                </div>
              </div>
            </CardHeader>

            {/* Messages Area */}
            <ScrollArea className="flex-1 px-4 py-4">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                    <MessageCircle className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
                    <p className="text-muted-foreground">No messages yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Start the conversation by sending a message
                    </p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex items-end gap-2",
                        message.direction === 'outgoing' ? "justify-end" : "justify-start"
                      )}
                    >
                      {message.direction === 'incoming' && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={selectedStudent.profilePictureUrl} />
                          <AvatarFallback className="bg-muted text-xs">
                            {getInitials(selectedStudent.firstName, selectedStudent.lastName)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={cn(
                          "max-w-[70%] rounded-2xl px-4 py-2 shadow-sm",
                          message.direction === 'outgoing'
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted text-foreground rounded-bl-sm"
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.messageText}
                        </p>
                        <div
                          className={cn(
                            "flex items-center gap-1 mt-1 text-xs",
                            message.direction === 'outgoing'
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground"
                          )}
                        >
                          <Clock className="h-3 w-3" />
                          <span>
                            {new Date(message.sentAt).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          {message.direction === 'outgoing' && (
                            <CheckCheck className="h-3 w-3 ml-1" />
                          )}
                        </div>
                      </div>
                      {message.direction === 'outgoing' && (
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="border-t p-4">
              <div className="flex items-end gap-2">
                <Input
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={sendMessageMutation.isPending}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || sendMessageMutation.isPending}
                  size="icon"
                  className="h-10 w-10"
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Press Enter to send, Shift + Enter for new line
              </p>
            </div>
          </>
        ) : (
          <CardContent className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Select a Chat</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Choose a student from the list to view your conversation and send messages
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
