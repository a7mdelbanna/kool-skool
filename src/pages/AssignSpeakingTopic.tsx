import React, { useState, useContext, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserContext } from '@/App';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Users, 
  User,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  Mic,
  FileText,
  Star,
  Search,
  UserCheck,
  UsersRound,
  Send
} from 'lucide-react';
import { format } from 'date-fns';
import { speakingPracticeService, SpeakingTopic, SpeakingAssignment } from '@/services/firebase/speakingPractice.service';
import { databaseService } from '@/services/firebase/database.service';
import AudioRecorder from '@/components/speaking/AudioRecorder';

const AssignSpeakingTopic = () => {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const queryClient = useQueryClient();

  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [scheduledFor, setScheduledFor] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [teacherIntroText, setTeacherIntroText] = useState('');
  const [teacherIntroAudio, setTeacherIntroAudio] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [assignmentMode, setAssignmentMode] = useState<'individual' | 'group'>('individual');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch topic
  const { data: topic, isLoading: topicLoading } = useQuery({
    queryKey: ['speaking-topic', topicId],
    queryFn: () => speakingPracticeService.getTopic(topicId!),
    enabled: !!topicId
  });

  // Fetch students
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const result = await databaseService.getAll('students');
      return result.filter((s: any) => s.status === 'active');
    }
  });

  // Fetch groups
  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => databaseService.getAll('groups')
  });

  // Fetch existing assignments
  const { data: existingAssignments = [] } = useQuery({
    queryKey: ['topic-assignments', topicId],
    queryFn: () => speakingPracticeService.getTopicAssignments(topicId!),
    enabled: !!topicId
  });

  // Get students from selected groups
  useEffect(() => {
    if (assignmentMode === 'group' && selectedGroups.length > 0) {
      const groupStudents = new Set<string>();
      selectedGroups.forEach(groupId => {
        const group = groups.find((g: any) => g.id === groupId);
        if (group?.students) {
          group.students.forEach((studentId: string) => groupStudents.add(studentId));
        }
      });
      setSelectedStudents(Array.from(groupStudents));
    }
  }, [selectedGroups, groups, assignmentMode]);

  // Assign topic mutation
  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!topicId) throw new Error('No topic ID');
      if (selectedStudents.length === 0) throw new Error('No students selected');

      const options = {
        scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        priority,
        teacherIntroText,
        teacherIntroAudio,
        notes
      };

      return await speakingPracticeService.assignTopicToStudents(
        topicId,
        selectedStudents,
        options
      );
    },
    onSuccess: () => {
      toast.success(`Topic assigned to ${selectedStudents.length} student(s)`);
      queryClient.invalidateQueries({ queryKey: ['topic-assignments'] });
      navigate('/speaking-topics');
    },
    onError: (error) => {
      toast.error('Failed to assign topic');
      console.error('Assignment error:', error);
    }
  });

  // Handle audio recording
  const handleRecordingComplete = async (blob: Blob) => {
    try {
      const fileName = `intro-${Date.now()}.webm`;
      const url = await speakingPracticeService.uploadAudio(
        blob,
        `intros/${topicId}`,
        fileName,
        (progress) => console.log('Upload progress:', progress)
      );
      setTeacherIntroAudio(url);
      setIsRecording(false);
      toast.success('Introduction recorded');
    } catch (error) {
      toast.error('Failed to upload recording');
      console.error('Upload error:', error);
    }
  };

  // Filter students
  const filteredStudents = students.filter((student: any) => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          student.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Check if student is already assigned
  const isStudentAssigned = (studentId: string) => {
    return existingAssignments.some(a => a.student_id === studentId && a.status !== 'completed');
  };

  // Toggle student selection
  const toggleStudent = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  // Toggle group selection
  const toggleGroup = (groupId: string) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  if (topicLoading || studentsLoading || groupsLoading) {
    return <div>Loading...</div>;
  }

  if (!topic) {
    return <div>Topic not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/speaking-topics')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Assign Speaking Topic</h1>
            <p className="text-muted-foreground">
              Assign "{topic.name}" to students
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Student Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Students</CardTitle>
              <CardDescription>
                Choose students to assign this topic to
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={assignmentMode} onValueChange={(v) => setAssignmentMode(v as 'individual' | 'group')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="individual">
                    <User className="h-4 w-4 mr-2" />
                    Individual Students
                  </TabsTrigger>
                  <TabsTrigger value="group">
                    <UsersRound className="h-4 w-4 mr-2" />
                    Groups
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="individual" className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search students..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  <div className="border rounded-lg max-h-96 overflow-y-auto">
                    {filteredStudents.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">No students found</p>
                    ) : (
                      <div className="divide-y">
                        {filteredStudents.map((student: any) => {
                          const isAssigned = isStudentAssigned(student.id);
                          return (
                            <label
                              key={student.id}
                              className={`flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer ${
                                isAssigned ? 'opacity-50' : ''
                              }`}
                            >
                              <Checkbox
                                checked={selectedStudents.includes(student.id)}
                                onCheckedChange={() => toggleStudent(student.id)}
                                disabled={isAssigned}
                              />
                              <div className="flex-1">
                                <p className="font-medium">{student.name}</p>
                                <p className="text-sm text-muted-foreground">{student.email}</p>
                              </div>
                              {isAssigned && (
                                <Badge variant="secondary">Already Assigned</Badge>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {selectedStudents.length} student(s) selected
                  </p>
                </TabsContent>

                <TabsContent value="group" className="space-y-4">
                  <div className="border rounded-lg max-h-96 overflow-y-auto">
                    {groups.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">No groups found</p>
                    ) : (
                      <div className="divide-y">
                        {groups.map((group: any) => (
                          <label
                            key={group.id}
                            className="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer"
                          >
                            <Checkbox
                              checked={selectedGroups.includes(group.id)}
                              onCheckedChange={() => toggleGroup(group.id)}
                            />
                            <div className="flex-1">
                              <p className="font-medium">{group.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {group.students?.length || 0} students
                              </p>
                            </div>
                            <Badge variant="outline">{group.level}</Badge>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedGroups.length > 0 && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-900">
                        <UserCheck className="h-4 w-4 inline mr-1" />
                        {selectedStudents.length} students will be assigned from selected groups
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Assignment Options */}
          <Card>
            <CardHeader>
              <CardTitle>Assignment Options</CardTitle>
              <CardDescription>
                Configure when and how students will receive this topic
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="scheduled">Schedule For</Label>
                  <Input
                    id="scheduled"
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave empty to make available immediately
                  </p>
                </div>

                <div>
                  <Label htmlFor="due">Due Date</Label>
                  <Input
                    id="due"
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    min={scheduledFor || new Date().toISOString().slice(0, 16)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Optional deadline for completion
                  </p>
                </div>
              </div>

              <div>
                <Label>Priority</Label>
                <RadioGroup value={priority} onValueChange={(v) => setPriority(v as any)}>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <RadioGroupItem value="low" />
                      <span>Low</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <RadioGroupItem value="medium" />
                      <span>Medium</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <RadioGroupItem value="high" />
                      <span>High</span>
                    </label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="intro">Teacher Introduction (Text)</Label>
                <Textarea
                  id="intro"
                  placeholder="Optional introduction or instructions for students..."
                  value={teacherIntroText}
                  onChange={(e) => setTeacherIntroText(e.target.value)}
                  rows={3}
                />
              </div>

              <div>
                <Label>Teacher Introduction (Audio)</Label>
                {isRecording ? (
                  <AudioRecorder
                    onRecordingComplete={handleRecordingComplete}
                    onCancel={() => setIsRecording(false)}
                    maxDuration={120}
                  />
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsRecording(true)}
                    >
                      <Mic className="h-4 w-4 mr-2" />
                      Record Introduction
                    </Button>
                    {teacherIntroAudio && (
                      <Badge variant="secondary">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Recorded
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="notes">Internal Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Notes for yourself (not visible to students)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Topic Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Topic Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{topic.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Difficulty</p>
                <Badge variant="outline">{topic.difficulty}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Genre</p>
                <Badge variant="outline">{topic.genre}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="font-medium">{topic.estimated_duration} minutes</p>
              </div>
            </CardContent>
          </Card>

          {/* Existing Assignments */}
          <Card>
            <CardHeader>
              <CardTitle>Existing Assignments</CardTitle>
              <CardDescription>
                Students already assigned this topic
              </CardDescription>
            </CardHeader>
            <CardContent>
              {existingAssignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No assignments yet</p>
              ) : (
                <div className="space-y-2">
                  {existingAssignments.slice(0, 5).map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between">
                      <p className="text-sm">{assignment.student_name || assignment.student_id}</p>
                      <Badge variant={
                        assignment.status === 'completed' ? 'default' :
                        assignment.status === 'overdue' ? 'destructive' :
                        'secondary'
                      }>
                        {assignment.status}
                      </Badge>
                    </div>
                  ))}
                  {existingAssignments.length > 5 && (
                    <p className="text-xs text-muted-foreground">
                      +{existingAssignments.length - 5} more
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <Button
                className="w-full"
                onClick={() => assignMutation.mutate()}
                disabled={selectedStudents.length === 0 || assignMutation.isPending}
              >
                <Send className="h-4 w-4 mr-2" />
                Assign to {selectedStudents.length} Student(s)
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AssignSpeakingTopic;