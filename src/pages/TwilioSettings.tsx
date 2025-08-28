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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
  EyeOff,
  HelpCircle,
  Bell,
  Plus,
  Edit,
  Trash2,
  Users
} from 'lucide-react';
import { UserContext } from '@/App';
import NotificationLogsViewer from '@/components/NotificationLogsViewer';
import { twilioService } from '@/services/twilio.service';
import { notificationSettingsService } from '@/services/notificationSettings.service';
import NotificationTemplateEditor from '@/components/NotificationTemplateEditor';
import { 
  validateTwilioConfig, 
  validatePhoneNumber, 
  formatWhatsAppNumber,
  isLikelyEncoded,
  getFieldValidationMessage,
  tryDecodeAccountSid,
  normalizePhoneNumber,
  isChannelConfigured,
  getAvailableChannels,
  getConfigurationStatus,
  type TwilioValidationError 
} from '@/utils/twilioValidation';
import {
  NotificationTemplate,
  NotificationRule,
  NotificationRuleType,
  NotificationChannel,
  NotificationTemplateType,
  DEFAULT_TEMPLATES,
  DEFAULT_NOTIFICATION_RULES
} from '@/types/notification.types';

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
  const [validationErrors, setValidationErrors] = useState<TwilioValidationError[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [hasLoadedFromFirestore, setHasLoadedFromFirestore] = useState(false);
  const [showTestResults, setShowTestResults] = useState(false);
  const [testResults, setTestResults] = useState<{
    success: boolean;
    message: string;
    details?: any;
    timestamp: Date;
  } | null>(null);

  // Notification Rules state
  const [notificationRules, setNotificationRules] = useState<NotificationRule[]>([]);
  const [notificationTemplates, setNotificationTemplates] = useState<NotificationTemplate[]>([]);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [templateEditorMode, setTemplateEditorMode] = useState<'create' | 'edit'>('create');
  
  // Form state
  const [config, setConfig] = useState({
    accountSid: '',
    authToken: '',
    phoneNumberSms: '',
    phoneNumberWhatsapp: '',
    isActive: false,
    monthlyBudget: 0
  });
  
  // Draft storage key
  const getDraftKey = () => `twilio-config-draft-${user?.schoolId || 'unknown'}`;
  
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

  // Fetch notification rules
  const { data: fetchedNotificationRules } = useQuery({
    queryKey: ['notification-rules', user?.schoolId],
    queryFn: () => notificationSettingsService.getNotificationRules(user!.schoolId),
    enabled: !!user?.schoolId
  });

  // Fetch notification templates  
  const { data: fetchedNotificationTemplates } = useQuery({
    queryKey: ['notification-templates', user?.schoolId],
    queryFn: () => notificationSettingsService.getTemplates(user!.schoolId),
    enabled: !!user?.schoolId
  });
  
  // Save config mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (data: typeof config) => {
      return await twilioService.saveConfig(user!.schoolId, data);
    },
    onSuccess: () => {
      // Clear draft values only after successful save
      clearDraftValues();
      queryClient.invalidateQueries({ queryKey: ['twilio-config'] });
      
      // Show success message with configuration details
      const status = getConfigurationStatus(config);
      let successMessage = 'Twilio configuration saved successfully!';
      
      if (status.isFullyConfigured) {
        successMessage += ' You can now send SMS and WhatsApp messages.';
      } else if (status.hasCredentials) {
        successMessage += ' Add phone numbers to enable messaging.';
      }
      
      toast.success(successMessage);
      
      // Clear any validation errors after successful save
      setValidationErrors([]);
      setFieldErrors({});
    },
    onError: (error: any) => {
      console.error('Save configuration error:', error);
      let errorMessage = 'Failed to save configuration';
      
      if (error.message) {
        errorMessage += ': ' + error.message;
      }
      
      // Show specific guidance for common errors
      if (error.message.includes('permission')) {
        errorMessage += '. Please check your account permissions.';
      } else if (error.message.includes('network')) {
        errorMessage += '. Please check your internet connection and try again.';
      }
      
      toast.error(errorMessage);
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

  // Save notification rules mutation
  const saveNotificationRulesMutation = useMutation({
    mutationFn: async (rules: NotificationRule[]) => {
      const promises = rules.map(rule => 
        notificationSettingsService.saveNotificationRule({
          ...rule,
          schoolId: user!.schoolId
        })
      );
      return await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-rules'] });
      toast.success('Notification rules saved successfully');
    },
    onError: (error: any) => {
      console.error('Error saving notification rules:', error);
      toast.error('Failed to save notification rules');
    }
  });

  // Initialize defaults mutation
  const initializeDefaultsMutation = useMutation({
    mutationFn: async () => {
      return await notificationSettingsService.initializeDefaults(user!.schoolId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-rules'] });
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      toast.success('Default templates and rules initialized');
    },
    onError: (error: any) => {
      console.error('Error initializing defaults:', error);
      toast.error('Failed to initialize defaults');
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
      const channelName = testChannel === 'sms' ? 'SMS' : 'WhatsApp';
      toast.success(`Test ${channelName} message sent successfully to ${testPhone}!`);
      setTestPhone('');
      setTestMessage('');
    },
    onError: (error: any) => {
      console.error('Send test message error:', error);
      let errorMessage = 'Failed to send test message';
      
      if (error.message) {
        errorMessage += ': ' + error.message;
      }
      
      // Provide specific guidance based on error type
      if (error.message.includes('phone number')) {
        errorMessage += '. Please check the phone number format.';
      } else if (error.message.includes('credentials')) {
        errorMessage += '. Please verify your Twilio credentials.';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage += '. Your Twilio account may need more funds.';
      } else if (error.message.includes('Function not found')) {
        errorMessage = 'Test message feature requires server setup. Please configure your Firebase functions.';
      }
      
      toast.error(errorMessage);
    }
  });
  
  // Test configuration mutation
  const testConfigMutation = useMutation({
    mutationFn: async () => {
      console.log('🧪 Starting Twilio configuration test...', {
        accountSid: config.accountSid ? `${config.accountSid.substring(0, 6)}...` : 'missing',
        authToken: config.authToken ? '***hidden***' : 'missing',
        phoneNumberSms: config.phoneNumberSms || 'not configured',
        phoneNumberWhatsapp: config.phoneNumberWhatsapp || 'not configured',
        schoolId: user?.schoolId
      });

      // Show immediate feedback
      toast.info('Testing configuration...', {
        duration: 2000,
        description: 'Validating your Twilio credentials'
      });
      
      // First, validate the configuration locally
      console.log('🔍 Performing local validation...');
      const validation = validateTwilioConfig(config);
      if (!validation.isValid) {
        const errorMessages = validation.errors.map(e => e.message).join(', ');
        console.error('❌ Local validation failed:', validation.errors);
        throw new Error(`Invalid configuration: ${errorMessages}`);
      }
      console.log('✅ Local validation passed');
      
      // Add timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Test timed out after 30 seconds. Please check your internet connection and Twilio credentials.'));
        }, 30000);
      });
      
      // Test the credentials with Twilio's API
      console.log('🌐 Testing credentials with Twilio API...');
      const testPromise = twilioService.testTwilioCredentials(user!.schoolId, {
        accountSid: config.accountSid,
        authToken: config.authToken,
        phoneNumberSms: config.phoneNumberSms,
        phoneNumberWhatsapp: config.phoneNumberWhatsapp
      });
      
      const result = await Promise.race([testPromise, timeoutPromise]) as { valid: boolean; details: any };
      
      console.log('🎯 Twilio API test result:', result);
      
      if (!result.valid) {
        console.error('❌ Twilio credentials validation failed:', result.details);
        throw new Error('Twilio credentials are invalid or cannot be verified');
      }
      
      console.log('✅ All tests passed successfully!');
      return result;
    },
    onSuccess: (data) => {
      console.log('🎉 Test configuration completed successfully:', data);
      
      const hasPhoneNumbers = config.phoneNumberSms || config.phoneNumberWhatsapp;
      const successMessage = hasPhoneNumbers 
        ? 'Configuration is valid! Your Twilio credentials and phone numbers are working correctly.'
        : 'Twilio credentials are valid! Add phone numbers to enable SMS/WhatsApp messaging.';
      
      // Set test results for modal display
      setTestResults({
        success: true,
        message: successMessage,
        details: data,
        timestamp: new Date()
      });
      
      // Show modal with results
      setShowTestResults(true);
      
      // Also show toast for immediate feedback
      toast.success(successMessage, {
        duration: 4000,
        description: 'Click to view detailed results'
      });
      
      // Clear any previous validation errors
      setValidationErrors([]);
      setFieldErrors({});
    },
    onError: (error: any) => {
      console.error('❌ Test configuration failed:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      let errorMessage = 'Configuration test failed';
      let detailedMessage = '';
      
      if (error.message) {
        if (error.message.includes('timed out')) {
          errorMessage = 'Test timed out';
          detailedMessage = 'The test took longer than expected. This might indicate network issues or incorrect credentials.';
        } else if (error.message.includes('Account SID')) {
          errorMessage = 'Invalid Account SID';
          detailedMessage = 'Please verify your Account SID from the Twilio Console. It should start with "AC".';
        } else if (error.message.includes('Auth Token')) {
          errorMessage = 'Invalid Auth Token';
          detailedMessage = 'Please verify your Auth Token from the Twilio Console.';
        } else if (error.message.includes('phone number')) {
          errorMessage = 'Phone number configuration issue';
          detailedMessage = 'Please check your phone number configuration in Twilio.';
        } else if (error.message.includes('Function not found')) {
          errorMessage = 'Server configuration incomplete';
          detailedMessage = 'Basic validation passed, but full credential testing requires server setup. Your configuration looks correct.';
          
          // Set test results for modal display (warning case)
          setTestResults({
            success: false,
            message: errorMessage,
            details: { warning: true, originalError: error.message },
            timestamp: new Date()
          });
          
          setShowTestResults(true);
          toast.warning(errorMessage, {
            duration: 5000,
            description: detailedMessage
          });
          return;
        } else {
          errorMessage += ': ' + error.message;
          detailedMessage = 'Check the console for more details and verify your Twilio account setup.';
        }
      }
      
      // Set test results for modal display
      setTestResults({
        success: false,
        message: errorMessage,
        details: { error: error.message, originalError: error },
        timestamp: new Date()
      });
      
      // Show modal with error details
      setShowTestResults(true);
      
      // Also show toast
      toast.error(errorMessage, {
        duration: 6000,
        description: detailedMessage || 'Check the detailed results for more information'
      });
    }
  });
  
  // Load draft values from localStorage on mount
  useEffect(() => {
    if (!user?.schoolId) return;
    
    const draftKey = getDraftKey();
    const savedDraft = localStorage.getItem(draftKey);
    
    if (savedDraft) {
      try {
        const parsedDraft = JSON.parse(savedDraft);
        setConfig(parsedDraft);
      } catch (error) {
        console.warn('Failed to parse saved draft:', error);
        localStorage.removeItem(draftKey);
      }
    }
  }, [user?.schoolId]);
  
  // Load existing config from Firestore (only once on initial mount)
  useEffect(() => {
    if (twilioConfig && !hasLoadedFromFirestore) {
      // Only load from Firestore if we don't have draft values
      const draftKey = getDraftKey();
      const savedDraft = localStorage.getItem(draftKey);
      
      if (!savedDraft) {
        setConfig(twilioConfig);
        
        // Check if loaded credentials look suspicious (might be encoded)
        if (isLikelyEncoded(twilioConfig.accountSid)) {
          toast.warning('Your Twilio credentials may need to be re-entered. Please check the Account SID format.');
        }
      }
      
      setHasLoadedFromFirestore(true);
    }
  }, [twilioConfig, hasLoadedFromFirestore, getDraftKey]);
  
  // Save draft values to localStorage whenever config changes
  useEffect(() => {
    if (!user?.schoolId || !hasLoadedFromFirestore) return;
    
    const draftKey = getDraftKey();
    
    // Only save if user has made changes (not empty values)
    const hasValues = config.accountSid || config.authToken || config.phoneNumberSms || 
                     config.phoneNumberWhatsapp || config.isActive || config.monthlyBudget > 0;
    
    if (hasValues) {
      try {
        localStorage.setItem(draftKey, JSON.stringify(config));
      } catch (error) {
        console.warn('Failed to save Twilio config draft to localStorage:', error);
      }
    }
  }, [config, user?.schoolId, hasLoadedFromFirestore, getDraftKey]);
  
  // Auto-select test channel based on configuration changes
  useEffect(() => {
    const availableChannels = getAvailableChannels(config);
    if (availableChannels.length > 0 && !availableChannels.includes(testChannel)) {
      setTestChannel(availableChannels[0]);
    }
  }, [config.phoneNumberSms, config.phoneNumberWhatsapp]);
  
  useEffect(() => {
    if (notificationSettings) {
      setTemplates(notificationSettings);
    }
  }, [notificationSettings]);

  // Load notification rules
  useEffect(() => {
    if (fetchedNotificationRules) {
      setNotificationRules(fetchedNotificationRules);
    }
  }, [fetchedNotificationRules]);

  // Load notification templates
  useEffect(() => {
    if (fetchedNotificationTemplates) {
      setNotificationTemplates(fetchedNotificationTemplates);
    }
  }, [fetchedNotificationTemplates]);
  
  const handleConfigSave = () => {
    // Allow saving with just credentials if user doesn't want to configure phone numbers yet
    // But if they provide phone numbers, validate them
    
    // Create a modified validation that doesn't require phone numbers
    const configToValidate = { ...config };
    const validation = validateTwilioConfig(configToValidate);
    
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      
      // Convert errors to field-specific errors for UI
      const errors: Record<string, string> = {};
      validation.errors.forEach(error => {
        errors[error.field] = error.message;
      });
      setFieldErrors(errors);
      
      toast.error(`Please fix ${validation.errors.length} validation error${validation.errors.length > 1 ? 's' : ''} before saving`);
      return;
    }
    
    // Clear any previous errors
    setValidationErrors([]);
    setFieldErrors({});
    
    // Check for potentially encoded values
    if (isLikelyEncoded(config.accountSid)) {
      toast.error('Account SID appears to be encoded. Please enter the original Account SID from your Twilio console.');
      return;
    }
    
    // Show appropriate success message based on what was configured
    const hasSMS = !!config.phoneNumberSms;
    const hasWhatsApp = !!config.phoneNumberWhatsapp;
    
    saveConfigMutation.mutate(config);
  };
  
  const clearDraftValues = () => {
    if (!user?.schoolId) return;
    const draftKey = getDraftKey();
    try {
      localStorage.removeItem(draftKey);
    } catch (error) {
      console.warn('Failed to clear Twilio config draft from localStorage:', error);
    }
  };
  
  const handleQuickFix = (fieldName: string, suggestion: string) => {
    switch (fieldName) {
      case 'accountSid':
        if (suggestion.includes('Did you mean:')) {
          const decoded = tryDecodeAccountSid(config.accountSid);
          if (decoded) {
            setConfig({ ...config, accountSid: decoded });
            toast.success('Account SID decoded successfully');
          }
        }
        break;
      case 'phoneNumberSms':
        if (suggestion.includes('Did you mean:') || suggestion.includes('Cleaned format:')) {
          const normalized = normalizePhoneNumber(config.phoneNumberSms);
          setConfig({ ...config, phoneNumberSms: normalized });
          toast.success('Phone number formatted');
        }
        break;
      case 'phoneNumberWhatsapp':
        if (suggestion.includes('Did you mean:') || suggestion.includes('Cleaned format:')) {
          const normalized = normalizePhoneNumber(config.phoneNumberWhatsapp.replace('whatsapp:', ''));
          setConfig({ ...config, phoneNumberWhatsapp: formatWhatsAppNumber(normalized) });
          toast.success('WhatsApp number formatted');
        }
        break;
    }
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
    
    // Check if the selected channel is configured
    const channelNumber = testChannel === 'sms' ? config.phoneNumberSms : config.phoneNumberWhatsapp;
    if (!channelNumber) {
      toast.error(`${testChannel === 'sms' ? 'SMS' : 'WhatsApp'} phone number is not configured. Please configure it in the Configuration tab first.`);
      return;
    }
    
    // Validate test phone number
    const phoneError = validatePhoneNumber(testPhone, 'testPhone', true);
    if (phoneError) {
      toast.error(phoneError.message);
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

  // Notification Rules handlers
  const handleRuleChange = (ruleIndex: number, field: keyof NotificationRule, value: any) => {
    const updatedRules = [...notificationRules];
    updatedRules[ruleIndex] = { ...updatedRules[ruleIndex], [field]: value };
    setNotificationRules(updatedRules);
  };

  const handleReminderChange = (ruleIndex: number, reminderIndex: number, field: string, value: any) => {
    const updatedRules = [...notificationRules];
    const updatedReminders = [...updatedRules[ruleIndex].reminders];
    updatedReminders[reminderIndex] = { ...updatedReminders[reminderIndex], [field]: value };
    updatedRules[ruleIndex] = { ...updatedRules[ruleIndex], reminders: updatedReminders };
    setNotificationRules(updatedRules);
  };

  const handleSaveNotificationRules = () => {
    saveNotificationRulesMutation.mutate(notificationRules);
  };

  const handleInitializeDefaults = () => {
    if (confirm('This will initialize default notification templates and rules. Continue?')) {
      initializeDefaultsMutation.mutate();
    }
  };

  const handleEditTemplate = (template: NotificationTemplate) => {
    setEditingTemplate(template);
    setTemplateEditorMode('edit');
    setShowTemplateEditor(true);
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateEditorMode('create');
    setShowTemplateEditor(true);
  };

  const handleTemplateAction = (template: NotificationTemplate) => {
    const updatedTemplates = [...notificationTemplates];
    const existingIndex = updatedTemplates.findIndex(t => t.id === template.id);
    
    if (existingIndex >= 0) {
      updatedTemplates[existingIndex] = template;
    } else {
      updatedTemplates.push(template);
    }
    
    setNotificationTemplates(updatedTemplates);
    queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
  };

  const handleDeleteTemplate = (templateId: string) => {
    const updatedTemplates = notificationTemplates.filter(t => t.id !== templateId);
    setNotificationTemplates(updatedTemplates);
    queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
  };

  const getRuleTypeDisplayName = (type: NotificationRuleType): string => {
    const names: Record<NotificationRuleType, string> = {
      [NotificationRuleType.LESSON_REMINDERS]: 'Lesson Reminders',
      [NotificationRuleType.PAYMENT_REMINDERS]: 'Payment Reminders',
      [NotificationRuleType.LESSON_CANCELLATION]: 'Lesson Cancellation'
    };
    return names[type] || type;
  };

  const getChannelDisplayName = (channel: NotificationChannel): string => {
    const names: Record<NotificationChannel, string> = {
      [NotificationChannel.SMS]: 'SMS',
      [NotificationChannel.WHATSAPP]: 'WhatsApp', 
      [NotificationChannel.BOTH]: 'Both'
    };
    return names[channel] || channel;
  };

  const getTemplatesByType = (type: NotificationTemplateType) => {
    return notificationTemplates.filter(t => t.type === type && t.isActive);
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
        <div className="flex items-center gap-2">
          {(() => {
            const status = getConfigurationStatus(config);
            const variant = status.isFullyConfigured ? "default" : 
                           status.hasCredentials ? "secondary" : "outline";
            return (
              <>
                <Badge variant={variant}>
                  {status.statusMessage}
                </Badge>
                {status.hasSMS && (
                  <Badge variant="outline" className="text-xs">
                    SMS
                  </Badge>
                )}
                {status.hasWhatsApp && (
                  <Badge variant="outline" className="text-xs">
                    WhatsApp
                  </Badge>
                )}
              </>
            );
          })()} 
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="config">
            <Settings className="h-4 w-4 mr-2" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="rules">
            <Bell className="h-4 w-4 mr-2" />
            Notification Rules
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
          {/* Help and Setup Instructions */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded-full">
                  <HelpCircle className="h-4 w-4 text-blue-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium text-blue-900">Setting up Twilio Integration</h3>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p>To find your Twilio credentials:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Log in to your <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">Twilio Console</a></li>
                      <li>Go to <strong>Account Info</strong> section</li>
                      <li>Copy your <strong>Account SID</strong> (starts with "AC") and <strong>Auth Token</strong></li>
                      <li>Go to <strong>Phone Numbers</strong> section to find your SMS and WhatsApp numbers</li>
                    </ol>
                    <p className="mt-2 text-blue-700 font-medium">Note: If you see an "accountSid must start with AC" error, please re-enter your credentials from the Twilio console.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Twilio Configuration</CardTitle>
              <CardDescription>
                Connect your Twilio account to enable SMS and WhatsApp messaging. Phone numbers are optional - you can save just your credentials and add them later.
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
                  <div className="flex items-center gap-2">
                    <Label htmlFor="accountSid">Account SID</Label>
                    <div className="group relative">
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      <div className="invisible group-hover:visible absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap z-10">
                        Find in Twilio Console → Account Info
                      </div>
                    </div>
                  </div>
                  <Input
                    id="accountSid"
                    value={config.accountSid}
                    onChange={(e) => {
                      setConfig({ ...config, accountSid: e.target.value });
                      // Clear field error when user starts typing
                      if (fieldErrors.accountSid) {
                        setFieldErrors({ ...fieldErrors, accountSid: '' });
                      }
                    }}
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className={fieldErrors.accountSid ? 'border-red-500' : ''}
                  />
                  {fieldErrors.accountSid && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {fieldErrors.accountSid}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {getFieldValidationMessage('accountSid')}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="authToken">Auth Token</Label>
                    <div className="group relative">
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      <div className="invisible group-hover:visible absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap z-10">
                        Find in Twilio Console → Account Info
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <Input
                      id="authToken"
                      type={showToken ? "text" : "password"}
                      value={config.authToken}
                      onChange={(e) => {
                        setConfig({ ...config, authToken: e.target.value });
                        // Clear field error when user starts typing
                        if (fieldErrors.authToken) {
                          setFieldErrors({ ...fieldErrors, authToken: '' });
                        }
                      }}
                      placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className={fieldErrors.authToken ? 'border-red-500' : ''}
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
                  {fieldErrors.authToken && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {fieldErrors.authToken}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {getFieldValidationMessage('authToken')}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="smsNumber">SMS Phone Number (Optional)</Label>
                    <div className="group relative">
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      <div className="invisible group-hover:visible absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap z-10">
                        From Twilio Console → Phone Numbers
                      </div>
                    </div>
                  </div>
                  <Input
                    id="smsNumber"
                    value={config.phoneNumberSms}
                    onChange={(e) => {
                      setConfig({ ...config, phoneNumberSms: e.target.value });
                      // Clear field error when user starts typing
                      if (fieldErrors.phoneNumberSms) {
                        setFieldErrors({ ...fieldErrors, phoneNumberSms: '' });
                      }
                    }}
                    placeholder="+1234567890"
                    className={fieldErrors.phoneNumberSms ? 'border-red-500' : ''}
                  />
                  {fieldErrors.phoneNumberSms && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {fieldErrors.phoneNumberSms}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Leave empty if you only want to use WhatsApp. {getFieldValidationMessage('phoneNumberSms')}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="whatsappNumber">WhatsApp Number (Optional)</Label>
                    <div className="group relative">
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      <div className="invisible group-hover:visible absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap z-10">
                        WhatsApp-enabled number from Twilio
                      </div>
                    </div>
                  </div>
                  <Input
                    id="whatsappNumber"
                    value={config.phoneNumberWhatsapp}
                    onChange={(e) => {
                      setConfig({ ...config, phoneNumberWhatsapp: e.target.value });
                      // Clear field error when user starts typing
                      if (fieldErrors.phoneNumberWhatsapp) {
                        setFieldErrors({ ...fieldErrors, phoneNumberWhatsapp: '' });
                      }
                    }}
                    onBlur={(e) => {
                      // Auto-format WhatsApp number on blur
                      if (e.target.value && !e.target.value.startsWith('whatsapp:') && e.target.value.startsWith('+')) {
                        setConfig({ ...config, phoneNumberWhatsapp: formatWhatsAppNumber(e.target.value) });
                      }
                    }}
                    placeholder="whatsapp:+1234567890"
                    className={fieldErrors.phoneNumberWhatsapp ? 'border-red-500' : ''}
                  />
                  {fieldErrors.phoneNumberWhatsapp && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {fieldErrors.phoneNumberWhatsapp}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Leave empty if you only want to use SMS. {getFieldValidationMessage('phoneNumberWhatsapp')}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="budget">Monthly Budget (Optional)</Label>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="budget"
                    type="number"
                    min="0"
                    max="10000"
                    step="0.01"
                    value={config.monthlyBudget || ''}
                    onChange={(e) => {
                      const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                      setConfig({ ...config, monthlyBudget: value });
                      // Clear field error when user starts typing
                      if (fieldErrors.monthlyBudget) {
                        setFieldErrors({ ...fieldErrors, monthlyBudget: '' });
                      }
                    }}
                    placeholder="100.00"
                    className={fieldErrors.monthlyBudget ? 'border-red-500' : ''}
                  />
                </div>
                {fieldErrors.monthlyBudget && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.monthlyBudget}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Set a monthly spending limit for SMS/WhatsApp messages (max $10,000)
                </p>
              </div>
              
              {/* Display validation errors summary */}
              {validationErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-800">
                      Please fix the following errors:
                    </span>
                  </div>
                  <ul className="text-sm text-red-700 space-y-2 ml-6">
                    {validationErrors.map((error, index) => (
                      <li key={index} className="list-disc space-y-1">
                        <div>
                          <strong>{error.field}:</strong> {error.message}
                        </div>
                        {error.suggestions && error.suggestions.length > 0 && (
                          <div className="ml-4 text-xs text-red-600">
                            <span className="font-medium">Suggestions:</span>
                            <ul className="mt-1 space-y-1">
                              {error.suggestions.map((suggestion, suggestionIndex) => (
                                <li key={suggestionIndex} className="flex items-center justify-between gap-2 ml-4">
                                  <span className="list-disc">{suggestion}</span>
                                  {(suggestion.includes('Did you mean:') || suggestion.includes('Cleaned format:')) && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 px-2 text-xs"
                                      onClick={() => handleQuickFix(error.field, suggestion)}
                                    >
                                      Apply Fix
                                    </Button>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="space-y-4">
                {/* Success indicator for saved configurations */}
                {(() => {
                  const status = getConfigurationStatus(config);
                  const isSaved = twilioConfig && 
                    twilioConfig.accountSid === config.accountSid && 
                    twilioConfig.authToken === config.authToken &&
                    twilioConfig.phoneNumberSms === config.phoneNumberSms &&
                    twilioConfig.phoneNumberWhatsapp === config.phoneNumberWhatsapp;
                  
                  if (isSaved && status.hasCredentials) {
                    return (
                      <div className="bg-green-50 border border-green-200 rounded-md p-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-800">
                            Configuration saved successfully
                          </span>
                        </div>
                        <p className="text-xs text-green-700 mt-1">
                          {status.isFullyConfigured 
                            ? 'Ready to send SMS and WhatsApp messages' 
                            : 'Add phone numbers to enable messaging'}
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      console.log('🔍 Test Configuration button clicked');
                      console.log('Current config state:', {
                        hasAccountSid: !!config.accountSid,
                        hasAuthToken: !!config.authToken,
                        accountSidPreview: config.accountSid ? `${config.accountSid.substring(0, 6)}...` : 'missing',
                        isActive: config.isActive
                      });
                      
                      // Show immediate loading state feedback
                      toast.loading('Initializing test...', { duration: 1000 });
                      
                      // Start the mutation
                      testConfigMutation.mutate();
                    }}
                    disabled={testConfigMutation.isPending || saveConfigMutation.isPending || !config.accountSid || !config.authToken}
                    className="flex-1"
                  >
                    {testConfigMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Testing Configuration...
                      </>
                    ) : (
                      <>
                        <TestTube className="h-4 w-4 mr-2" />
                        Test Configuration
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    onClick={handleConfigSave}
                    disabled={saveConfigMutation.isPending || testConfigMutation.isPending || !config.accountSid || !config.authToken}
                    className="flex-1"
                  >
                    {saveConfigMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Settings className="h-4 w-4 mr-2" />
                        Save Configuration
                      </>
                    )}
                  </Button>
                </div>
                
                {/* Help text for disabled buttons */}
                {(!config.accountSid || !config.authToken) && (
                  <p className="text-sm text-muted-foreground text-center">
                    Enter your Account SID and Auth Token to test and save the configuration
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="rules" className="space-y-4">
          {/* Help Section */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded-full">
                  <Bell className="h-4 w-4 text-blue-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium text-blue-900">Notification Rules</h3>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p>Configure when and how notifications are sent to students and parents.</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Set up lesson reminders with custom timing</li>
                      <li>Configure payment reminder schedules</li>
                      <li>Customize message templates and recipients</li>
                      <li>Choose delivery channels (SMS, WhatsApp, or both)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Initialize Defaults Button */}
          {notificationRules.length === 0 && notificationTemplates.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-4" />
                    <p>No notification rules or templates found.</p>
                    <p className="text-sm">Initialize default notification settings to get started.</p>
                  </div>
                  <Button
                    onClick={handleInitializeDefaults}
                    disabled={initializeDefaultsMutation.isPending}
                  >
                    {initializeDefaultsMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Initialize Default Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notification Rules */}
          {notificationRules.map((rule, ruleIndex) => (
            <Card key={rule.type}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg">
                      {getRuleTypeDisplayName(rule.type)}
                    </CardTitle>
                    <CardDescription>
                      Configure {getRuleTypeDisplayName(rule.type).toLowerCase()} settings
                    </CardDescription>
                  </div>
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={(enabled) => handleRuleChange(ruleIndex, 'enabled', enabled)}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Recipients */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Recipients
                  </Label>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`${rule.type}-student`}
                        checked={rule.recipients.student}
                        onCheckedChange={(checked) => 
                          handleRuleChange(ruleIndex, 'recipients', {
                            ...rule.recipients,
                            student: checked
                          })
                        }
                      />
                      <Label htmlFor={`${rule.type}-student`} className="text-sm">
                        Students
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`${rule.type}-parent`}
                        checked={rule.recipients.parent}
                        onCheckedChange={(checked) => 
                          handleRuleChange(ruleIndex, 'recipients', {
                            ...rule.recipients,
                            parent: checked
                          })
                        }
                      />
                      <Label htmlFor={`${rule.type}-parent`} className="text-sm">
                        Parents
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Reminders */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Reminder Schedule</Label>
                  <div className="space-y-3">
                    {rule.reminders.map((reminder, reminderIndex) => (
                      <div key={reminder.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={reminder.enabled}
                              onCheckedChange={(enabled) => 
                                handleReminderChange(ruleIndex, reminderIndex, 'enabled', enabled)
                              }
                            />
                            <span className="text-sm font-medium">
                              {reminder.timing.value} {reminder.timing.unit} before
                            </span>
                          </div>
                          <Badge variant="secondary">
                            {getChannelDisplayName(reminder.channel)}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-xs">Channel</Label>
                            <Select
                              value={reminder.channel}
                              onValueChange={(value: NotificationChannel) => 
                                handleReminderChange(ruleIndex, reminderIndex, 'channel', value)
                              }
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={NotificationChannel.SMS}>SMS Only</SelectItem>
                                <SelectItem value={NotificationChannel.WHATSAPP}>WhatsApp Only</SelectItem>
                                <SelectItem value={NotificationChannel.BOTH}>Both SMS & WhatsApp</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-xs">Template</Label>
                            <Select
                              value={reminder.customTemplateId || reminder.templateType}
                              onValueChange={(value) => {
                                // Check if it's a custom template ID or template type
                                const isCustomTemplate = notificationTemplates.find(t => t.id === value);
                                if (isCustomTemplate) {
                                  handleReminderChange(ruleIndex, reminderIndex, 'customTemplateId', value);
                                } else {
                                  handleReminderChange(ruleIndex, reminderIndex, 'templateType', value);
                                  handleReminderChange(ruleIndex, reminderIndex, 'customTemplateId', undefined);
                                }
                              }}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {/* Default templates for this type */}
                                {notificationTemplates
                                  .filter(t => t.type === reminder.templateType && t.isDefault)
                                  .map(template => (
                                    <SelectItem key={template.id} value={template.type}>
                                      {template.name} ({template.language.toUpperCase()})
                                    </SelectItem>
                                  ))
                                }
                                {/* Custom templates */}
                                {notificationTemplates
                                  .filter(t => t.type === reminder.templateType && !t.isDefault)
                                  .map(template => (
                                    <SelectItem key={template.id} value={template.id!}>
                                      {template.name} (Custom - {template.language.toUpperCase()})
                                    </SelectItem>
                                  ))
                                }
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Template Management */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Message Templates</CardTitle>
                  <CardDescription>
                    Manage notification message templates
                  </CardDescription>
                </div>
                <Button onClick={handleCreateTemplate} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {notificationTemplates.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                  <p>No templates found</p>
                  <p className="text-sm">Create your first template or initialize defaults</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.values(NotificationTemplateType).map(type => {
                    const templatesOfType = getTemplatesByType(type);
                    if (templatesOfType.length === 0 && type === NotificationTemplateType.CUSTOM) return null;
                    
                    return (
                      <div key={type} className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">
                          {notificationSettingsService.getTemplateTypeDisplayName(type)}
                        </h4>
                        {templatesOfType.length === 0 ? (
                          <p className="text-xs text-muted-foreground ml-4">
                            No templates for this type
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {templatesOfType.map(template => (
                              <div key={template.id} className="border rounded p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{template.name}</span>
                                    <Badge variant={template.isDefault ? "secondary" : "outline"} className="text-xs">
                                      {template.language.toUpperCase()}
                                    </Badge>
                                    {template.isDefault && (
                                      <Badge variant="secondary" className="text-xs">Default</Badge>
                                    )}
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditTemplate(template)}
                                      className="h-6 w-6 p-0"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    {!template.isDefault && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteTemplate(template.id!)}
                                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {template.body}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save Button */}
          {notificationRules.length > 0 && (
            <Button
              onClick={handleSaveNotificationRules}
              disabled={saveNotificationRulesMutation.isPending}
              className="w-full"
            >
              {saveNotificationRulesMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving Rules...
                </>
              ) : (
                'Save Notification Rules'
              )}
            </Button>
          )}
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
                    <SelectItem value="sms" disabled={!config.phoneNumberSms}>
                      SMS {!config.phoneNumberSms && '(Not configured)'}
                    </SelectItem>
                    <SelectItem value="whatsapp" disabled={!config.phoneNumberWhatsapp}>
                      WhatsApp {!config.phoneNumberWhatsapp && '(Not configured)'}
                    </SelectItem>
                  </SelectContent>
                </Select>
                {testChannel === 'sms' && !config.phoneNumberSms && (
                  <p className="text-sm text-yellow-600 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    SMS phone number not configured. Please add it in the Configuration tab.
                  </p>
                )}
                {testChannel === 'whatsapp' && !config.phoneNumberWhatsapp && (
                  <p className="text-sm text-yellow-600 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    WhatsApp phone number not configured. Please add it in the Configuration tab.
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+1234567890"
                />
                <p className="text-xs text-muted-foreground">
                  Include country code (e.g., +1 for US, +44 for UK). For WhatsApp, number will be automatically formatted.
                </p>
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
                disabled={sendTestMutation.isPending || !config.isActive || 
                  (testChannel === 'sms' && !config.phoneNumberSms) ||
                  (testChannel === 'whatsapp' && !config.phoneNumberWhatsapp)}
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
              
              {config.isActive && !config.phoneNumberSms && !config.phoneNumberWhatsapp && (
                <p className="text-sm text-orange-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Configure at least one phone number (SMS or WhatsApp) to send test messages
                </p>
              )}
              
              {config.isActive && !config.accountSid.startsWith('AC') && (
                <p className="text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Invalid Twilio configuration - please check your Account SID
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="logs">
          <NotificationLogsViewer schoolId={user?.schoolId || ''} />
        </TabsContent>
      </Tabs>

      {/* Notification Template Editor */}
      <NotificationTemplateEditor
        open={showTemplateEditor}
        onOpenChange={setShowTemplateEditor}
        template={editingTemplate}
        schoolId={user?.schoolId || ''}
        onSave={handleTemplateAction}
        onDelete={handleDeleteTemplate}
        mode={templateEditorMode}
      />

      {/* Test Results Modal */}
      <Dialog open={showTestResults} onOpenChange={setShowTestResults}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {testResults?.success ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Configuration Test Passed
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  Configuration Test Results
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Test completed at {testResults?.timestamp.toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className={`p-4 rounded-lg border ${
              testResults?.success 
                ? 'bg-green-50 border-green-200' 
                : testResults?.details?.warning 
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-red-50 border-red-200'
            }`}>
              <p className={`font-medium ${
                testResults?.success 
                  ? 'text-green-800' 
                  : testResults?.details?.warning 
                    ? 'text-yellow-800'
                    : 'text-red-800'
              }`}>
                {testResults?.message}
              </p>
            </div>
            
            {testResults?.details && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-700">Technical Details:</h4>
                <div className="bg-gray-50 p-3 rounded border text-xs font-mono max-h-60 overflow-y-auto">
                  <pre>{JSON.stringify(testResults.details, null, 2)}</pre>
                </div>
              </div>
            )}
            
            <div className="space-y-2 text-sm text-gray-600">
              <h4 className="font-medium text-gray-700">What was tested:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Account SID format and validity</li>
                <li>Auth Token authentication</li>
                {config.phoneNumberSms && <li>SMS phone number configuration</li>}
                {config.phoneNumberWhatsapp && <li>WhatsApp phone number configuration</li>}
                <li>Twilio API connectivity</li>
              </ul>
            </div>
            
            {!testResults?.success && (
              <div className="space-y-2 text-sm">
                <h4 className="font-medium text-gray-700">Next Steps:</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Double-check your credentials in the Twilio Console</li>
                  <li>Ensure your Twilio account has sufficient funds</li>
                  <li>Verify your phone numbers are properly configured</li>
                  <li>Check that your Firebase functions are deployed</li>
                </ul>
              </div>
            )}
            
            <div className="flex justify-end pt-4">
              <Button onClick={() => setShowTestResults(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TwilioSettings;