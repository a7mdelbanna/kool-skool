import { useContext, useEffect, useState } from 'react';
import { UserContext } from '@/App';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Send,
  Users,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  Search,
  Filter
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';
import { messageTemplatesService, MessageTemplate } from '@/services/messageTemplates.service';
import { studentsService, Student } from '@/services/firebase/students.service';

interface BroadcastResult {
  success: boolean;
  total: number;
  sent: number;
  failed: number;
  results: {
    studentId: string;
    success: boolean;
    error?: string;
  }[];
}

export default function BroadcastMessages() {
  const { user } = useContext(UserContext);
  const { toast } = useToast();

  // State
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<BroadcastResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('active');

  useEffect(() => {
    if (user?.schoolId) {
      loadStudents();
      loadTemplates();
    }
  }, [user?.schoolId]);

  const loadStudents = async () => {
    if (!user?.schoolId) return;

    try {
      const fetchedStudents = await studentsService.getStudents(user.schoolId);
      setStudents(fetchedStudents);
    } catch (error) {
      console.error('Error loading students:', error);
      toast({
        title: 'Error',
        description: 'Failed to load students',
        variant: 'destructive'
      });
    }
  };

  const loadTemplates = async () => {
    if (!user?.schoolId) return;

    try {
      const fetchedTemplates = await messageTemplatesService.getTemplates(user.schoolId);
      setTemplates(fetchedTemplates.filter(t => t.type === 'custom' || t.isActive));
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setMessage(template.content);
    }
  };

  const handleSelectAll = () => {
    const filteredStudents = getFilteredStudents();
    const allSelected = filteredStudents.every(s => selectedStudentIds.has(s.id!));

    if (allSelected) {
      // Deselect all filtered students
      const newSelected = new Set(selectedStudentIds);
      filteredStudents.forEach(s => newSelected.delete(s.id!));
      setSelectedStudentIds(newSelected);
    } else {
      // Select all filtered students
      const newSelected = new Set(selectedStudentIds);
      filteredStudents.forEach(s => {
        if (s.id) newSelected.add(s.id);
      });
      setSelectedStudentIds(newSelected);
    }
  };

  const handleStudentToggle = (studentId: string) => {
    const newSelected = new Set(selectedStudentIds);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudentIds(newSelected);
  };

  const getFilteredStudents = () => {
    return students.filter(student => {
      // Filter by status
      if (filterStatus === 'active' && student.status !== 'active') return false;
      if (filterStatus === 'inactive' && student.status === 'active') return false;

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
        const email = student.email?.toLowerCase() || '';
        return fullName.includes(query) || email.includes(query);
      }

      return true;
    });
  };

  const handleSend = async () => {
    if (selectedStudentIds.size === 0) {
      toast({
        title: 'No Recipients',
        description: 'Please select at least one student',
        variant: 'destructive'
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: 'No Message',
        description: 'Please enter a message',
        variant: 'destructive'
      });
      return;
    }

    setSending(true);
    setSendProgress(0);

    try {
      const sendBroadcast = httpsCallable<any, BroadcastResult>(
        functions,
        'sendTelegramBroadcast'
      );

      const result = await sendBroadcast({
        schoolId: user?.schoolId,
        studentIds: Array.from(selectedStudentIds),
        message: message,
        useTemplate: !!selectedTemplate,
        templateId: selectedTemplate || undefined
      });

      setSendProgress(100);
      setBroadcastResult(result.data);
      setResultDialogOpen(true);

      // Clear form
      setSelectedStudentIds(new Set());
      setMessage('');
      setSelectedTemplate('');

      toast({
        title: 'Broadcast Sent',
        description: `Successfully sent to ${result.data.sent} out of ${result.data.total} students`
      });
    } catch (error: any) {
      console.error('Error sending broadcast:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send broadcast message',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
      setSendProgress(0);
    }
  };

  if (!user?.schoolId) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Please log in to send broadcast messages.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredStudents = getFilteredStudents();
  const allFilteredSelected = filteredStudents.length > 0 &&
    filteredStudents.every(s => selectedStudentIds.has(s.id!));

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Broadcast Messages</h1>
          <p className="text-muted-foreground mt-1">
            Send messages to multiple students at once
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Student Selection Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recipients</CardTitle>
              <Badge variant="secondary">
                {selectedStudentIds.size} selected
              </Badge>
            </div>
            <CardDescription>
              Select students to send the message to
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Filter */}
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Select All */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={allFilteredSelected}
                onCheckedChange={handleSelectAll}
              />
              <label
                htmlFor="select-all"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Select All ({filteredStudents.length})
              </label>
            </div>

            <Separator />

            {/* Student List */}
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {filteredStudents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No students found
                </p>
              ) : (
                filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/50"
                  >
                    <Checkbox
                      id={`student-${student.id}`}
                      checked={selectedStudentIds.has(student.id!)}
                      onCheckedChange={() => handleStudentToggle(student.id!)}
                    />
                    <label
                      htmlFor={`student-${student.id}`}
                      className="flex-1 text-sm cursor-pointer"
                    >
                      <div className="font-medium">
                        {student.firstName} {student.lastName}
                      </div>
                      {student.email && (
                        <div className="text-xs text-muted-foreground">
                          {student.email}
                        </div>
                      )}
                    </label>
                    <Badge
                      variant={student.status === 'active' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {student.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Message Composition Panel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Compose Message</CardTitle>
            <CardDescription>
              Write or select a template for your broadcast message
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Template Selection */}
            <div>
              <Label htmlFor="template">Use Template (Optional)</Label>
              <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Template</SelectItem>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={template.id!}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Message Content */}
            <div>
              <Label htmlFor="message">Message Content *</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your message here..."
                rows={12}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {message.length} characters
              </p>
            </div>

            {/* Send Progress */}
            {sending && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Sending broadcast...</span>
                  <span className="font-medium">{sendProgress}%</span>
                </div>
                <Progress value={sendProgress} />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSend}
                disabled={sending || selectedStudentIds.size === 0 || !message.trim()}
                className="flex-1"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send to {selectedStudentIds.size} Student{selectedStudentIds.size !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>

            {/* Info Box */}
            <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
                    <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="space-y-1 text-sm">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100">
                      Broadcast Tips
                    </h4>
                    <ul className="list-disc list-inside text-blue-800 dark:text-blue-200 space-y-1">
                      <li>Only students with active Telegram accounts will receive messages</li>
                      <li>Messages are sent with a small delay to avoid rate limiting</li>
                      <li>You'll receive a detailed report after sending</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>

      {/* Results Dialog */}
      <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Broadcast Results</DialogTitle>
            <DialogDescription>
              Summary of broadcast message delivery
            </DialogDescription>
          </DialogHeader>

          {broadcastResult && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-2xl font-bold">{broadcastResult.total}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <p className="text-2xl font-bold">{broadcastResult.sent}</p>
                      <p className="text-xs text-muted-foreground">Sent</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <XCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
                      <p className="text-2xl font-bold">{broadcastResult.failed}</p>
                      <p className="text-xs text-muted-foreground">Failed</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              {/* Detailed Results */}
              {broadcastResult.failed > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Failed Deliveries</h4>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {broadcastResult.results
                      .filter(r => !r.success)
                      .map((result) => {
                        const student = students.find(s => s.id === result.studentId);
                        return (
                          <div
                            key={result.studentId}
                            className="flex items-start justify-between p-3 bg-red-50 dark:bg-red-950 rounded-lg"
                          >
                            <div className="flex-1">
                              <p className="font-medium">
                                {student ? `${student.firstName} ${student.lastName}` : result.studentId}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {result.error}
                              </p>
                            </div>
                            <XCircle className="h-5 w-5 text-red-500" />
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setResultDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
