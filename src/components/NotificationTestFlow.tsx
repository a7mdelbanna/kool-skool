import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Calendar,
  DollarSign,
  Send,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  Phone,
  MessageSquare,
  TestTube,
  Play,
  RotateCcw,
  User,
  CreditCard,
  CalendarDays,
  Bell
} from 'lucide-react';
import { format, addDays, addHours } from 'date-fns';
import { toast } from 'sonner';
import { collection, query, where, getDocs, addDoc, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { notificationSchedulerService } from '@/services/notificationScheduler.service';
import { notificationSettingsService } from '@/services/notificationSettings.service';
import { twilioService } from '@/services/twilio.service';

interface TestRecipient {
  name: string;
  phone: string;
  type: 'student' | 'parent' | 'teacher';
}

interface TestSession {
  id?: string;
  studentId: string;
  teacherId: string;
  date: string;
  time: string;
  duration: string;
  subject: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

interface TestPayment {
  id?: string;
  studentId: string;
  amount: number;
  dueDate: Date;
  status: 'pending' | 'paid' | 'overdue';
  description: string;
}

interface NotificationTestFlowProps {
  schoolId: string;
  userId: string;
}

const NotificationTestFlow: React.FC<NotificationTestFlowProps> = ({
  schoolId,
  userId
}) => {
  const [testRecipient, setTestRecipient] = useState<TestRecipient>({
    name: '',
    phone: '',
    type: 'student'
  });
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [testMode, setTestMode] = useState<'quick' | 'detailed'>('quick');
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  
  // Test data states
  const [testSession, setTestSession] = useState<TestSession>({
    studentId: '',
    teacherId: userId,
    date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    time: '14:00',
    duration: '60 min',
    subject: 'Mathematics',
    status: 'scheduled'
  });

  const [testPayment, setTestPayment] = useState<TestPayment>({
    studentId: '',
    amount: 150,
    dueDate: addDays(new Date(), 3),
    status: 'pending',
    description: 'Monthly tuition fee'
  });

  // Load templates
  useEffect(() => {
    loadTemplates();
  }, [schoolId]);

  const loadTemplates = async () => {
    try {
      const templatesData = await notificationSettingsService.getTemplates(schoolId);
      setTemplates(templatesData);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load templates');
    }
  };

  const sendTestNotification = async () => {
    try {
      if (!selectedTemplate) {
        toast.error('Please select a template');
        return;
      }

      const template = templates.find(t => t.id === selectedTemplate);
      if (!template) {
        toast.error('Template not found');
        return;
      }

      addTestResult('Sending Test', `Sending test notification to ${testRecipient.phone}`, 'info');

      // Replace variables in template
      let message = template.body;
      const variables = {
        studentName: testRecipient.name,
        parentName: testRecipient.name,
        teacherName: testRecipient.name,
        lessonTime: `${testSession.date} at ${testSession.time}`,
        date: testSession.date,
        subject: testSession.subject,
        duration: testSession.duration,
        amount: `$${testPayment.amount}`,
        schoolName: 'TutorFlow Academy'
      };

      Object.entries(variables).forEach(([key, value]) => {
        message = message.replace(new RegExp(`{${key}}`, 'g'), value);
      });

      // Send via Twilio service
      try {
        // First check what channels are available
        const config = await twilioService.getConfig(schoolId);
        
        if (!config || !config.isActive) {
          addTestResult('Error', 'Twilio integration is not configured or not active', 'error');
          return { success: false, error: 'Twilio not configured' };
        }
        
        // Determine the channel to use based on what's available
        let channel: 'sms' | 'whatsapp' = 'sms';
        
        // Check what channels are actually configured
        const hasSMS = !!config.phoneNumberSms;
        const hasWhatsApp = !!config.phoneNumberWhatsapp;
        
        if (!hasSMS && !hasWhatsApp) {
          addTestResult('Error', 'No phone numbers configured. Please configure SMS or WhatsApp number in Configuration tab', 'error');
          return { success: false, error: 'No phone numbers configured' };
        }
        
        // Determine which channel to use based on template and availability
        if (template.channel === 'whatsapp') {
          if (hasWhatsApp) {
            channel = 'whatsapp';
          } else if (hasSMS) {
            channel = 'sms';
            addTestResult('Info', 'WhatsApp not configured, using SMS instead', 'warning');
          }
        } else if (template.channel === 'sms') {
          if (hasSMS) {
            channel = 'sms';
          } else if (hasWhatsApp) {
            channel = 'whatsapp';
            addTestResult('Info', 'SMS not configured, using WhatsApp instead', 'warning');
          }
        } else if (template.channel === 'both') {
          // Use whichever is available
          channel = hasSMS ? 'sms' : 'whatsapp';
        } else {
          // Default to whatever is available
          channel = hasSMS ? 'sms' : 'whatsapp';
        }

        const result = await twilioService.sendTestMessage(
          schoolId,
          {
            phone: testRecipient.phone,
            message: message,
            channel: channel
          }
        );

        if (result && result.success) {
          addTestResult('Success', `Test notification sent successfully via ${channel}`, 'success');
          
          // If template is set to 'both', send via the other channel too
          if (template.channel === 'both') {
            const secondChannel = channel === 'sms' ? 'whatsapp' : 'sms';
            const secondResult = await twilioService.sendTestMessage(
              schoolId,
              {
                phone: testRecipient.phone,
                message: message,
                channel: secondChannel
              }
            );
            
            if (secondResult && secondResult.success) {
              addTestResult('Success', `Test notification also sent via ${secondChannel}`, 'success');
            } else {
              addTestResult('Warning', `Failed to send via ${secondChannel}: ${secondResult?.error || 'Unknown error'}`, 'warning');
            }
          }
        } else {
          addTestResult('Failed', result?.error || 'Failed to send notification', 'error');
        }

        return result;
      } catch (serviceError) {
        console.error('Twilio service error:', serviceError);
        addTestResult('Service Error', serviceError instanceof Error ? serviceError.message : 'Failed to connect to notification service', 'error');
        throw serviceError;
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      addTestResult('Error', 'Failed to send test notification', 'error');
      throw error;
    }
  };

  const runTestFlow = async () => {
    setIsRunning(true);
    setTestResults([]);

    try {
      // Step 1: Validate inputs
      if (!testRecipient.name || !testRecipient.phone) {
        toast.error('Please enter a name and phone number');
        return;
      }

      if (!selectedTemplate) {
        toast.error('Please select a template');
        return;
      }

      // Validate phone number format
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(testRecipient.phone.replace(/[\s()-]/g, ''))) {
        toast.error('Please enter a valid phone number');
        return;
      }

      addTestResult('Test Setup', `Testing with ${testRecipient.name} (${testRecipient.phone})`, 'info');

      // Step 2: Send test notification
      await sendTestNotification();

      addTestResult('Test Complete', 'Notification test completed successfully', 'success');

    } catch (error) {
      console.error('Test flow error:', error);
      addTestResult('Error', error instanceof Error ? error.message : 'Test flow failed', 'error');
    } finally {
      setIsRunning(false);
    }
  };

  const testNow = async () => {
    setIsRunning(true);
    setTestResults([]);

    try {
      // Validate inputs
      if (!testRecipient.phone) {
        toast.error('Please enter a phone number');
        return;
      }

      if (!selectedTemplate) {
        toast.error('Please select a template');
        return;
      }

      addTestResult('Immediate Test', 'Sending notification immediately...', 'info');
      await sendTestNotification();

    } catch (error) {
      console.error('Test error:', error);
      addTestResult('Error', error instanceof Error ? error.message : 'Test failed', 'error');
    } finally {
      setIsRunning(false);
    }
  };


  const addTestResult = (title: string, description: string, type: 'info' | 'success' | 'warning' | 'error') => {
    setTestResults(prev => [...prev, {
      title,
      description,
      type,
      timestamp: new Date()
    }]);
  };

  const resetTest = () => {
    setTestResults([]);
    setTestRecipient({
      name: '',
      phone: '',
      type: 'student'
    });
    setSelectedTemplate('');
    setTestSession({
      studentId: '',
      teacherId: userId,
      date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
      time: '14:00',
      duration: '60 min',
      subject: 'Mathematics',
      status: 'scheduled'
    });
    setTestPayment({
      studentId: '',
      amount: 150,
      dueDate: addDays(new Date(), 3),
      status: 'pending',
      description: 'Monthly tuition fee'
    });
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Test Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            <CardTitle>Notification Test Flow</CardTitle>
          </div>
          <CardDescription>
            Test the complete notification flow with a test student, session, and payment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Test Mode Selection */}
          <div className="space-y-2">
            <Label>Test Mode</Label>
            <div className="flex gap-2">
              <Button
                variant={testMode === 'quick' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTestMode('quick')}
              >
                Quick Test (Immediate)
              </Button>
              <Button
                variant={testMode === 'detailed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTestMode('detailed')}
              >
                Detailed Test (Scheduled)
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {testMode === 'quick' 
                ? 'Immediately trigger notifications for testing'
                : 'Run actual scheduler to check for due notifications'}
            </p>
          </div>

          <Separator />

          {/* Test Recipient Details */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Test Recipient Details
            </Label>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Name</Label>
                <Input
                  placeholder="Enter test name"
                  value={testRecipient.name}
                  onChange={(e) => setTestRecipient({ ...testRecipient, name: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Phone Number</Label>
                <Input
                  placeholder="+1234567890"
                  value={testRecipient.phone}
                  onChange={(e) => setTestRecipient({ ...testRecipient, phone: e.target.value })}
                />
              </div>
            </div>
            
            <div>
              <Label className="text-xs">Recipient Type</Label>
              <Select value={testRecipient.type} onValueChange={(value: 'student' | 'parent' | 'teacher') => setTestRecipient({ ...testRecipient, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Test Session Configuration */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Test Session Details
            </Label>
            
            {/* Template Selection */}
            <div>
              <Label className="text-xs">Notification Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template to test" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        <span>{template.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {template.channel === 'both' ? 'SMS & WhatsApp' : template.channel?.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {template.language}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={testSession.date}
                  onChange={(e) => setTestSession({ ...testSession, date: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Time</Label>
                <Input
                  type="time"
                  value={testSession.time}
                  onChange={(e) => setTestSession({ ...testSession, time: e.target.value })}
                />
              </div>
            </div>
            
            <div className="flex gap-2 mt-4">
              <Button
                onClick={testNow}
                disabled={isRunning || !testRecipient.phone || !selectedTemplate}
                variant="default"
                className="flex-1"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Test Now
                  </>
                )}
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground text-center">
              This will send the notification immediately with the current date/time
            </div>
          </div>


          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={runTestFlow}
              disabled={isRunning || !testRecipient.name || !testRecipient.phone || !selectedTemplate}
              className="flex-1"
              variant="outline"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running Test...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Schedule Test
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={resetTest}
              disabled={isRunning}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Test Results</CardTitle>
            <CardDescription>
              Step-by-step execution log
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div key={index} className="flex items-start gap-3 pb-3 border-b last:border-0">
                  {getResultIcon(result.type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{result.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(result.timestamp, 'HH:mm:ss')}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {result.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Test Mode:</strong> This creates temporary test data to validate your notification setup. 
          In quick mode, test data is automatically cleaned up after the test. 
          In detailed mode, test data remains for manual inspection.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default NotificationTestFlow;