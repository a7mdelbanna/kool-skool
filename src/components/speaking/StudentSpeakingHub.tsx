import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { speakingPracticeService } from '@/services/firebase/speakingPractice.service';
import { useContext } from 'react';
import { UserContext } from '@/App';
import { 
  Mic, 
  Calendar, 
  Clock, 
  Star, 
  MessageCircle,
  PlayCircle,
  Search,
  Filter,
  BookOpen,
  Target,
  TrendingUp,
  Award
} from 'lucide-react';
import { format } from 'date-fns';
import { SpeakingTopic, SpeakingConversation } from '@/types/speakingPractice';

interface StudentSpeakingHubProps {
  studentId: string;
  onTopicSelect: (topic: SpeakingTopic, conversation?: SpeakingConversation) => void;
}

const StudentSpeakingHub: React.FC<StudentSpeakingHubProps> = ({ 
  studentId,
  onTopicSelect 
}) => {
  const { user } = useContext(UserContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('active');

  // Fetch assigned topics with assignments
  const { data: assignedTopics, isLoading: topicsLoading } = useQuery({
    queryKey: ['student-topics', studentId],
    queryFn: () => speakingPracticeService.getAssignedTopicsForStudent(studentId)
  });

  // Fetch active conversations
  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ['student-conversations', studentId],
    queryFn: () => speakingPracticeService.getStudentConversations(studentId)
  });

  // Fetch student's speaking stats
  const { data: stats } = useQuery({
    queryKey: ['student-speaking-stats', studentId],
    queryFn: async () => {
      // This would be implemented in the service
      return {
        totalCompleted: 12,
        averageRating: 4.5,
        totalMinutes: 245,
        streak: 5,
        improvement: 15
      };
    }
  });

  const filteredTopics = assignedTopics?.filter(topic => {
    const matchesSearch = topic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          topic.instructions?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = selectedGenre === 'all' || topic.genre === selectedGenre;
    return matchesSearch && matchesGenre;
  });

  const activeConversations = conversations?.filter(c => c.status === 'active');
  const completedConversations = conversations?.filter(c => c.status === 'completed');

  const genres = Array.from(new Set(assignedTopics?.map(t => t.genre).filter(Boolean) || []));

  const getDifficultyColor = (level: string) => {
    switch(level) {
      case 'beginner': return 'bg-green-100 text-green-700';
      case 'intermediate': return 'bg-yellow-100 text-yellow-700';
      case 'advanced': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusBadge = (conversation: SpeakingConversation) => {
    if (conversation.status === 'completed') {
      return <Badge className="bg-green-500">Completed</Badge>;
    }
    if (conversation.last_message_from === 'teacher') {
      return <Badge className="bg-blue-500">New Message</Badge>;
    }
    return <Badge variant="outline">In Progress</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold">{stats?.totalCompleted || 0}</p>
              </div>
              <BookOpen className="h-8 w-8 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Rating</p>
                <p className="text-2xl font-bold">{stats?.averageRating || 0}⭐</p>
              </div>
              <Star className="h-8 w-8 text-yellow-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Minutes</p>
                <p className="text-2xl font-bold">{stats?.totalMinutes || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-purple-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Streak</p>
                <p className="text-2xl font-bold">{stats?.streak || 0} days</p>
              </div>
              <Target className="h-8 w-8 text-orange-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Improvement</p>
                <p className="text-2xl font-bold text-green-600">+{stats?.improvement || 0}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={selectedGenre === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedGenre('all')}
                size="sm"
              >
                All Genres
              </Button>
              {genres.map(genre => (
                <Button
                  key={genre}
                  variant={selectedGenre === genre ? 'default' : 'outline'}
                  onClick={() => setSelectedGenre(genre)}
                  size="sm"
                >
                  {genre}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">
            Active Topics ({activeConversations?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="new">
            New Topics ({filteredTopics?.filter(t => !conversations?.find(c => c.topic_id === t.id))?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedConversations?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Active Topics Tab */}
        <TabsContent value="active" className="space-y-4">
          {activeConversations?.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No active conversations</p>
                <p className="text-sm text-gray-400 mt-2">Start a new topic to begin practicing!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {activeConversations?.map(conversation => {
                const topic = assignedTopics?.find(t => t.id === conversation.topic_id);
                if (!topic) return null;
                
                return (
                  <Card 
                    key={conversation.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => onTopicSelect(topic, conversation)}
                  >
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{topic.name}</h3>
                            {getStatusBadge(conversation)}
                          </div>
                          <p className="text-gray-600 text-sm mb-3">{topic.instructions}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <MessageCircle className="h-4 w-4" />
                              {conversation.message_count} messages
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              Last activity: {format(conversation.last_activity.toDate(), 'PPp')}
                            </span>
                            {conversation.teacher_rating && (
                              <span className="flex items-center gap-1">
                                <Star className="h-4 w-4 text-yellow-500" />
                                {conversation.teacher_rating}/5
                              </span>
                            )}
                          </div>
                        </div>
                        <Button size="sm" className="ml-4">
                          <Mic className="h-4 w-4 mr-2" />
                          Continue
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* New Topics Tab */}
        <TabsContent value="new" className="space-y-4">
          {filteredTopics?.filter(t => !conversations?.find(c => c.topic_id === t.id))?.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No new topics available</p>
                <p className="text-sm text-gray-400 mt-2">Check back later for new assignments!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredTopics?.filter(t => !conversations?.find(c => c.topic_id === t.id))?.map(topic => {
                const assignment = (topic as any).assignment;
                return (
                  <Card 
                    key={topic.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => onTopicSelect(topic)}
                  >
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{topic.name}</h3>
                            <Badge className={getDifficultyColor(topic.difficulty_level)}>
                              {topic.difficulty_level}
                            </Badge>
                            {topic.genre && (
                              <Badge variant="outline">{topic.genre}</Badge>
                            )}
                            {assignment?.priority === 'high' && (
                              <Badge className="bg-red-500">High Priority</Badge>
                            )}
                          </div>
                          <p className="text-gray-600 text-sm mb-3">{topic.instructions}</p>
                          {assignment?.teacher_intro_text && (
                            <div className="bg-blue-50 p-2 rounded mb-3">
                              <p className="text-sm text-blue-900">
                                <MessageSquare className="h-3 w-3 inline mr-1" />
                                Teacher's note: {assignment.teacher_intro_text}
                              </p>
                            </div>
                          )}
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            {assignment?.scheduled_for && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Available: {format(new Date(assignment.scheduled_for), 'PPp')}
                              </span>
                            )}
                            {assignment?.due_date && (
                              <span className="flex items-center gap-1 text-orange-600">
                                <Clock className="h-4 w-4" />
                                Due: {format(new Date(assignment.due_date), 'PPp')}
                              </span>
                            )}
                            {topic.video_urls && topic.video_urls.length > 0 && (
                              <span className="flex items-center gap-1">
                                <PlayCircle className="h-4 w-4" />
                                {topic.video_urls.length} video{topic.video_urls.length > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button size="sm" className="ml-4">
                          <Mic className="h-4 w-4 mr-2" />
                          Start
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Completed Tab */}
        <TabsContent value="completed" className="space-y-4">
          {completedConversations?.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Award className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No completed conversations yet</p>
                <p className="text-sm text-gray-400 mt-2">Complete your first topic to see it here!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {completedConversations?.map(conversation => {
                const topic = assignedTopics?.find(t => t.id === conversation.topic_id);
                if (!topic) return null;
                
                return (
                  <Card 
                    key={conversation.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => onTopicSelect(topic, conversation)}
                  >
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{topic.name}</h3>
                            <Badge className="bg-green-500">Completed</Badge>
                            {conversation.teacher_rating && (
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star 
                                    key={i}
                                    className={`h-4 w-4 ${i < conversation.teacher_rating! ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                          <p className="text-gray-600 text-sm mb-3">{topic.instructions}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <MessageCircle className="h-4 w-4" />
                              {conversation.message_count} messages
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Completed: {format(conversation.completed_at!.toDate(), 'PP')}
                            </span>
                            {conversation.total_duration && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {Math.round(conversation.total_duration / 60)} minutes
                              </span>
                            )}
                          </div>
                        </div>
                        <Button size="sm" variant="outline" className="ml-4">
                          Review
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StudentSpeakingHub;