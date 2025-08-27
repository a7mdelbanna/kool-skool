import React, { useState, useContext, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  MessageSquare, 
  Phone, 
  Settings, 
  Send, 
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  TestTube,
  Eye,
  EyeOff
} from 'lucide-react';
import { UserContext } from '@/App';
import { twilioService } from '@/services/twilio.service';

interface NotificationTemplate {
  type: string;
  enabled: boolean;
  channel: 'sms' | 'whatsapp' | 'both';
  template: string;
  timing: {
    value: number;
    unit: 'hours' | 'days';
  }[];
}

const TwilioSettings = () => {
  const { user } = useContext(UserContext);
  const queryClient = useQueryClient();
  
  // State
  const [activeTab, setActiveTab] = useState('config');
  const [showToken, setShowToken] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [testChannel, setTestChannel] = useState<'sms' | 'whatsapp'>('sms');
  
  // Form state
  const [config, setConfig] = useState({
    accountSid: '',
    authToken: '',
    phoneNumberSms: '',
    phoneNumberWhatsapp: '',
    isActive: false,
    monthlyBudget: 0
  });
  
  // Notification templates
  const [templates, setTemplates] = useState<NotificationTemplate[]>([
    {
      type: 'lesson_reminder',
      enabled: true,
      channel: 'both',
      template: 'Hi {name}, reminder: You have {subject} lesson with {teacher} at {time} tomorrow.',
      timing: [
        { value: 24, unit: 'hours' },
        { value: 1, unit: 'hours' }
      ]
    },
    {
      type: 'payment_reminder',
      enabled: true,
      channel: 'sms',
      template: 'Hi {name}, payment of {amount} for {course} is due on {date}. Please pay to avoid service interruption.',
      timing: [
        { value: 3, unit: 'days' },
        { value: 1, unit: 'days' }
      ]
    },
    {
      type: 'attendance_confirmation',
      enabled: false,
      channel: 'whatsapp',
      template: 'Hi {name}, your attendance for today\'s {subject} lesson has been marked as {status}.',
      timing: []
    },
    {
      type: 'schedule_change',
      enabled: true,
      channel: 'both',
      template: 'Important: Your {subject} lesson scheduled for {original_time} has been {change_type} to {new_time}.',
      timing: []
    }
  ]);
  
  // Fetch Twilio config
  const { data: twilioConfig, isLoading } = useQuery({
    queryKey: ['twilio-config', user?.schoolId],
    queryFn: () => twilioService.getConfig(user!.schoolId),
    enabled: !!user?.schoolId
  });
  
  // Fetch notification settings
  const { data: notificationSettings } = useQuery({
    queryKey: ['notification-settings', user?.schoolId],
    queryFn: () => twilioService.getNotificationSettings(user!.schoolId),
    enabled: !!user?.schoolId
  });
  
  // Save config mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (data: typeof config) => {
      return await twilioService.saveConfig(user!.schoolId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['twilio-config'] });
      toast.success('Twilio configuration saved successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to save configuration: ' + error.message);
    }
  });
  
  // Save templates mutation
  const saveTemplatesMutation = useMutation({
    mutationFn: async (data: NotificationTemplate[]) => {
      return await twilioService.saveNotificationSettings(user!.schoolId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      toast.success('Notification settings saved successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to save notification settings');
    }
  });
  
  // Send test message mutation
  const sendTestMutation = useMutation({
    mutationFn: async () => {
      return await twilioService.sendTestMessage(user!.schoolId, {
        phone: testPhone,
        message: testMessage,
        channel: testChannel
      });
    },
    onSuccess: () => {
      toast.success('Test message sent successfully!');
      setTestPhone('');
      setTestMessage('');
    },
    onError: (error: any) => {
      toast.error('Failed to send test message: ' + error.message);
    }
  });
  
  // Load existing config
  useEffect(() => {
    if (twilioConfig) {
      setConfig(twilioConfig);
    }
  }, [twilioConfig]);
  
  useEffect(() => {
    if (notificationSettings) {
      setTemplates(notificationSettings);
    }
  }, [notificationSettings]);
  
  const handleConfigSave = () => {
    if (!config.accountSid || !config.authToken) {
      toast.error('Please provide Twilio credentials');
      return;
    }
    saveConfigMutation.mutate(config);
  };
  
  const handleTemplateSave = () => {
    saveTemplatesMutation.mutate(templates);
  };
  
  const handleTemplateChange = (index: number, field: keyof NotificationTemplate, value: any) => {
    const updated = [...templates];
    updated[index] = { ...updated[index], [field]: value };
    setTemplates(updated);
  };
  
  const handleSendTest = () => {
    if (!testPhone || !testMessage) {
      toast.error('Please provide phone number and message');
      return;
    }
    sendTestMutation.mutate();
  };
  
  const getTemplateTitle = (type: string) => {
    const titles: { [key: string]: string } = {
      lesson_reminder: 'Lesson Reminders',
      payment_reminder: 'Payment Reminders',
      attendance_confirmation: 'Attendance Confirmations',
      schedule_change: 'Schedule Changes'
    };
    return titles[type] || type;
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Communication Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure SMS and WhatsApp notifications via Twilio
          </p>
        </div>
        <Badge variant={config.isActive ? "default" : "secondary"}>
          {config.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="config">
            <Settings className="h-4 w-4 mr-2" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="templates">
            <MessageSquare className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="test">
            <TestTube className="h-4 w-4 mr-2" />
            Test
          </TabsTrigger>
          <TabsTrigger value="logs">
            <Clock className="h-4 w-4 mr-2" />
            Logs
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Twilio Configuration</CardTitle>
              <CardDescription>
                Connect your Twilio account to enable SMS and WhatsApp messaging
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="active">Enable Twilio Integration</Label>
                <Switch
                  id="active"
                  checked={config.isActive}
                  onCheckedChange={(checked) => setConfig({ ...config, isActive: checked })}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="accountSid">Account SID</Label>
                  <Input
                    id="accountSid"
                    value={config.accountSid}
                    onChange={(e) => setConfig({ ...config, accountSid: e.target.value })}
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="authToken">Auth Token</Label>
                  <div className="relative">
                    <Input
                      id="authToken"
                      type={showToken ? "text" : "password"}
                      value={config.authToken}
                      onChange={(e) => setConfig({ ...config, authToken: e.target.value })}
                      placeholder="Enter auth token"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-0"
                      onClick={() => setShowToken(!showToken)}
                    >
                      {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smsNumber">SMS Phone Number</Label>
                  <Input
                    id="smsNumber"
                    value={config.phoneNumberSms}
                    onChange={(e) => setConfig({ ...config, phoneNumberSms: e.target.value })}
                    placeholder="+1234567890"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
                  <Input
                    id="whatsappNumber"
                    value={config.phoneNumberWhatsapp}
                    onChange={(e) => setConfig({ ...config, phoneNumberWhatsapp: e.target.value })}
                    placeholder="whatsapp:+1234567890"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="budget">Monthly Budget (Optional)</Label>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="budget"
                    type="number"
                    value={config.monthlyBudget}
                    onChange={(e) => setConfig({ ...config, monthlyBudget: parseFloat(e.target.value) })}
                    placeholder="100.00"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Set a monthly spending limit for SMS/WhatsApp messages
                </p>
              </div>
              
              <Button 
                onClick={handleConfigSave}
                disabled={saveConfigMutation.isPending}
                className="w-full"
              >
                {saveConfigMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Configuration'
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="templates" className="space-y-4">
          {templates.map((template, index) => (
            <Card key={template.type}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">
                    {getTemplateTitle(template.type)}
                  </CardTitle>
                  <Switch
                    checked={template.enabled}
                    onCheckedChange={(checked) => 
                      handleTemplateChange(index, 'enabled', checked)
                    }
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Channel</Label>
                  <Select
                    value={template.channel}
                    onValueChange={(value) => 
                      handleTemplateChange(index, 'channel', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sms">SMS Only</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp Only</SelectItem>
                      <SelectItem value="both">Both SMS & WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Message Template</Label>
                  <Textarea
                    value={template.template}
                    onChange={(e) => 
                      handleTemplateChange(index, 'template', e.target.value)
                    }
                    placeholder="Enter message template..."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Variables: {'{name}'}, {'{subject}'}, {'{teacher}'}, {'{time}'}, {'{date}'}, {'{amount}'}
                  </p>
                </div>
                
                {template.timing.length > 0 && (
                  <div className="space-y-2">
                    <Label>Send Timing</Label>
                    <div className="flex gap-2">
                      {template.timing.map((time, timeIndex) => (
                        <Badge key={timeIndex} variant="secondary">
                          {time.value} {time.unit} before
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          
          <Button 
            onClick={handleTemplateSave}
            disabled={saveTemplatesMutation.isPending}
            className="w-full"
          >
            {saveTemplatesMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving Templates...
              </>
            ) : (
              'Save All Templates'
            )}
          </Button>
        </TabsContent>
        
        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Send Test Message</CardTitle>
              <CardDescription>
                Test your Twilio configuration by sending a message
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Channel</Label>
                <Select value={testChannel} onValueChange={(v: any) => setTestChannel(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder={testChannel === 'whatsapp' ? '+1234567890' : '+1234567890'}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Enter test message..."
                  rows={3}
                />
              </div>
              
              <Button 
                onClick={handleSendTest}
                disabled={sendTestMutation.isPending || !config.isActive}
                className="w-full"
              >
                {sendTestMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Test Message
                  </>
                )}
              </Button>
              
              {!config.isActive && (
                <p className="text-sm text-yellow-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Enable Twilio integration first
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Message Delivery Logs</CardTitle>
              <CardDescription>
                Track sent messages and delivery status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Message logs will appear here once you start sending notifications
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TwilioSettings;