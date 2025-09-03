import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserContext } from '@/App';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Users,
  Calendar,
  Clock,
  BookOpen,
  Video,
  Paperclip,
  Mic,
  Target,
  TrendingUp,
  Archive,
  Send,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { speakingPracticeService, SpeakingTopic } from '@/services/firebase/speakingPractice.service';
import { toast } from 'sonner';

const SpeakingTopics = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGenre, setFilterGenre] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<SpeakingTopic | null>(null);
  const [activeTab, setActiveTab] = useState('published');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    genre: 'conversation' as SpeakingTopic['genre'],
    difficulty: 'intermediate' as SpeakingTopic['difficulty'],
    instructions: '',
    estimated_duration: 10,
    tags: [] as string[],
    vocabulary_hints: [] as string[],
    video_urls: [] as string[],
    is_published: false
  });

  // Fetch topics
  const { data: topics = [], isLoading } = useQuery({
    queryKey: ['speaking-topics', user?.userId],
    queryFn: async () => {
      if (!user?.userId) return [];
      return await speakingPracticeService.getTeacherTopics(user.userId);
    },
    enabled: !!user?.userId
  });

  // Create topic mutation
  const createTopicMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user?.userId) throw new Error('No user ID');
      
      const topicData: Omit<SpeakingTopic, 'id' | 'created_at' | 'updated_at'> = {
        teacher_id: user.userId,
        school_id: user.schoolId,
        name: data.name,
        description: data.description,
        genre: data.genre,
        difficulty: data.difficulty,
        instructions: data.instructions,
        estimated_duration: data.estimated_duration,
        tags: data.tags,
        vocabulary_hints: data.vocabulary_hints,
        video_urls: data.video_urls,
        is_published: data.is_published,
        scheduled_release: data.scheduled_release,
        materials: [],
        rubric_template: undefined
      };
      
      return await speakingPracticeService.createTopic(topicData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['speaking-topics'] });
      toast.success('Topic created successfully');
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to create topic');
      console.error('Create topic error:', error);
    }
  });

  // Update topic mutation
  const updateTopicMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SpeakingTopic> }) => {
      return await speakingPracticeService.updateTopic(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['speaking-topics'] });
      toast.success('Topic updated successfully');
      setEditingTopic(null);
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to update topic');
      console.error('Update topic error:', error);
    }
  });

  // Delete topic mutation
  const deleteTopicMutation = useMutation({
    mutationFn: async (topicId: string) => {
      // In a real app, you'd add a delete method to the service
      // For now, we'll archive it
      return await speakingPracticeService.updateTopic(topicId, { is_published: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['speaking-topics'] });
      toast.success('Topic deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete topic');
      console.error('Delete topic error:', error);
    }
  });

  // Filter topics
  const filteredTopics = topics.filter(topic => {
    const matchesSearch = topic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          topic.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGenre = filterGenre === 'all' || topic.genre === filterGenre;
    const matchesDifficulty = filterDifficulty === 'all' || topic.difficulty === filterDifficulty;
    const matchesTab = activeTab === 'published' ? topic.is_published : !topic.is_published;
    
    return matchesSearch && matchesGenre && matchesDifficulty && matchesTab;
  });

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      genre: 'conversation',
      difficulty: 'intermediate',
      instructions: '',
      estimated_duration: 10,
      tags: [],
      vocabulary_hints: [],
      video_urls: [],
      is_published: false
    });
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingTopic) {
      updateTopicMutation.mutate({
        id: editingTopic.id!,
        data: formData
      });
    } else {
      createTopicMutation.mutate(formData);
    }
  };

  // Handle edit
  const handleEdit = (topic: SpeakingTopic) => {
    setEditingTopic(topic);
    setFormData({
      name: topic.name,
      description: topic.description || '',
      genre: topic.genre,
      difficulty: topic.difficulty,
      instructions: topic.instructions,
      estimated_duration: topic.estimated_duration || 10,
      tags: topic.tags || [],
      vocabulary_hints: topic.vocabulary_hints,
      video_urls: topic.video_urls,
      is_published: topic.is_published
    });
    setIsCreateDialogOpen(true);
  };

  // Handle duplicate
  const handleDuplicate = (topic: SpeakingTopic) => {
    setFormData({
      name: `${topic.name} (Copy)`,
      description: topic.description || '',
      genre: topic.genre,
      difficulty: topic.difficulty,
      instructions: topic.instructions,
      estimated_duration: topic.estimated_duration || 10,
      tags: topic.tags || [],
      vocabulary_hints: topic.vocabulary_hints,
      video_urls: topic.video_urls,
      is_published: false
    });
    setIsCreateDialogOpen(true);
  };

  // Handle assign to students
  const handleAssign = (topicId: string) => {
    navigate(`/speaking-topics/${topicId}/assign`);
  };

  // Handle view conversations
  const handleViewConversations = (topicId: string) => {
    navigate(`/speaking-topics/${topicId}/conversations`);
  };

  // Get genre color
  const getGenreColor = (genre: string) => {
    const colors = {
      conversation: 'bg-blue-100 text-blue-800',
      presentation: 'bg-purple-100 text-purple-800',
      debate: 'bg-red-100 text-red-800',
      storytelling: 'bg-green-100 text-green-800',
      interview: 'bg-yellow-100 text-yellow-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[genre as keyof typeof colors] || colors.other;
  };

  // Get difficulty color
  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      beginner: 'bg-green-100 text-green-800',
      intermediate: 'bg-yellow-100 text-yellow-800',
      advanced: 'bg-red-100 text-red-800'
    };
    return colors[difficulty as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Speaking Topics</h1>
          <p className="text-muted-foreground">
            Create and manage speaking practice topics for your students
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Topic
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTopic ? 'Edit Topic' : 'Create New Topic'}
              </DialogTitle>
              <DialogDescription>
                Create a speaking practice topic with instructions and materials
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Basic Information */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Topic Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Daily Routine Conversation"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the topic"
                    rows={2}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="genre">Genre</Label>
                    <Select
                      value={formData.genre}
                      onValueChange={(value) => setFormData({ ...formData, genre: value as any })}
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
                  
                  <div>
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <Select
                      value={formData.difficulty}
                      onValueChange={(value) => setFormData({ ...formData, difficulty: value as any })}
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
                </div>
                
                <div>
                  <Label htmlFor="instructions">Instructions</Label>
                  <Textarea
                    id="instructions"
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    placeholder="Detailed instructions for the student"
                    rows={4}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="duration">Estimated Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.estimated_duration}
                    onChange={(e) => setFormData({ ...formData, estimated_duration: parseInt(e.target.value) })}
                    min={1}
                    max={60}
                  />
                </div>
                
                <div>
                  <Label htmlFor="vocabulary">Vocabulary Hints (comma-separated)</Label>
                  <Textarea
                    id="vocabulary"
                    value={formData.vocabulary_hints.join(', ')}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      vocabulary_hints: e.target.value.split(',').map(v => v.trim()).filter(v => v)
                    })}
                    placeholder="e.g., morning routine, breakfast, commute"
                    rows={2}
                  />
                </div>
                
                <div>
                  <Label htmlFor="videos">Video URLs (one per line)</Label>
                  <Textarea
                    id="videos"
                    value={formData.video_urls.join('\n')}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      video_urls: e.target.value.split('\n').map(v => v.trim()).filter(v => v)
                    })}
                    placeholder="YouTube or Vimeo URLs"
                    rows={2}
                  />
                </div>
                
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_published}
                      onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                      className="rounded"
                    />
                    <span>Publish immediately</span>
                  </label>
                  {!formData.is_published && (
                    <p className="text-sm text-muted-foreground">
                      Topic will be saved as draft
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setEditingTopic(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createTopicMutation.isPending || updateTopicMutation.isPending}>
                  {editingTopic ? 'Update' : 'Create'} Topic
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search topics..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={filterGenre} onValueChange={setFilterGenre}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Genres" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genres</SelectItem>
                <SelectItem value="conversation">Conversation</SelectItem>
                <SelectItem value="presentation">Presentation</SelectItem>
                <SelectItem value="debate">Debate</SelectItem>
                <SelectItem value="storytelling">Storytelling</SelectItem>
                <SelectItem value="interview">Interview</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Topics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="published">Published</TabsTrigger>
          <TabsTrigger value="drafts">Drafts</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : filteredTopics.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTopics.map((topic) => (
                <Card key={topic.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{topic.name}</CardTitle>
                        {topic.description && (
                          <CardDescription className="mt-1">
                            {topic.description}
                          </CardDescription>
                        )}
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(topic)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(topic)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAssign(topic.id!)}>
                            <Users className="h-4 w-4 mr-2" />
                            Assign to Students
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewConversations(topic.id!)}>
                            <Mic className="h-4 w-4 mr-2" />
                            View Conversations
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => deleteTopicMutation.mutate(topic.id!)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge className={getGenreColor(topic.genre)}>
                        {topic.genre}
                      </Badge>
                      <Badge className={getDifficultyColor(topic.difficulty)}>
                        {topic.difficulty}
                      </Badge>
                      {topic.estimated_duration && (
                        <Badge variant="outline" className="gap-1">
                          <Clock className="h-3 w-3" />
                          {topic.estimated_duration} min
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-2 text-sm">
                      {topic.vocabulary_hints.length > 0 && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <BookOpen className="h-4 w-4" />
                          <span>{topic.vocabulary_hints.length} vocabulary hints</span>
                        </div>
                      )}
                      
                      {topic.video_urls.length > 0 && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Video className="h-4 w-4" />
                          <span>{topic.video_urls.length} video(s)</span>
                        </div>
                      )}
                      
                      {topic.materials.length > 0 && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Paperclip className="h-4 w-4" />
                          <span>{topic.materials.length} material(s)</span>
                        </div>
                      )}
                      
                      {topic.scheduled_release && !topic.is_published && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Scheduled: {format(topic.scheduled_release, 'MMM dd, yyyy')}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleAssign(topic.id!)}
                      >
                        <Users className="h-4 w-4 mr-1" />
                        Assign
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleViewConversations(topic.id!)}
                      >
                        <Mic className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Mic className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  {searchTerm || filterGenre !== 'all' || filterDifficulty !== 'all'
                    ? 'No topics found matching your filters'
                    : activeTab === 'published'
                    ? 'No published topics yet'
                    : 'No draft topics yet'}
                </p>
                <Button
                  className="mt-4"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  Create Your First Topic
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SpeakingTopics;