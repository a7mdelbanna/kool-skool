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
  Send,
  Settings,
  TestTube,
  Eye,
  EyeOff,
  HelpCircle,
  Bell,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
  QrCode,
  Clock,
  MessageSquare,
  Users,
  Link as LinkIcon,
  Unlink,
  Bot
} from 'lucide-react';
import { UserContext } from '@/App';
import NotificationLogsViewer from '@/components/NotificationLogsViewer';
import { telegramService, TelegramConfig } from '@/services/telegram.service';
import { notificationSettingsService } from '@/services/notificationSettings.service';
import NotificationTemplateEditor from '@/components/NotificationTemplateEditor';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';
import NotificationRulesEditor from '@/components/NotificationRulesEditor';
import NotificationTestFlow from '@/components/NotificationTestFlow';
import { AISettingsPanel } from '@/components/settings/AISettingsPanel';
import { AILogsPanel } from '@/components/telegram/AILogsPanel';
import { AITestPanel } from '@/components/telegram/AITestPanel';
import {
  NotificationTemplate,
  NotificationRule,
  NotificationRuleType,
  NotificationChannel,
  NotificationTemplateType,
  DEFAULT_TEMPLATES,
  DEFAULT_NOTIFICATION_RULES
} from '@/types/notification.types';
import { QRCodeSVG } from 'qrcode.react';
import { databaseService } from '@/services/firebase/database.service';

const TelegramSettings = () => {
  const { user } = useContext(UserContext);
  const queryClient = useQueryClient();

  // State
  const [activeTab, setActiveTab] = useState('config');
  const [showToken, setShowToken] = useState(false);
  const [testChatId, setTestChatId] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [botInfo, setBotInfo] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
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
  const [showInitializeDialog, setShowInitializeDialog] = useState(false);

  // Student linking state
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'ru'>('en');
  const [linkingCode, setLinkingCode] = useState('');
  const [showQRCode, setShowQRCode] = useState(false);
  const [linkedStudents, setLinkedStudents] = useState<any[]>([]);

  // Form state
  const [config, setConfig] = useState<TelegramConfig>({
    botToken: '',
    botUsername: '',
    isActive: false,
    defaultLanguage: 'en',
    reminderTimings: {
      lessonReminder: '2 hours',
      subscriptionExpiry: '7 days'
    }
  });

  // Draft storage key
  const getDraftKey = () => `telegram-config-draft-${user?.schoolId || 'unknown'}`;

  // Fetch Telegram config
  const { data: telegramConfig, isLoading } = useQuery({
    queryKey: ['telegram-config', user?.schoolId],
    queryFn: () => telegramService.getConfig(user!.schoolId),
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

  // Fetch students
  const { data: students = [], isLoading: isLoadingStudents, error: studentsError } = useQuery({
    queryKey: ['students', user?.schoolId],
    queryFn: async () => {
      if (!user?.schoolId) return [];
      const result = await databaseService.getBySchoolId('students', user.schoolId);
      console.log('Fetched students for Telegram linking:', result?.length || 0, result);
      return result;
    },
    enabled: !!user?.schoolId
  });

  // Fetch linked students
  const { data: enabledStudents = [] } = useQuery({
    queryKey: ['telegram-enabled-students', user?.schoolId],
    queryFn: () => telegramService.getEnabledStudents(user!.schoolId),
    enabled: !!user?.schoolId
  });

  // Save config mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (data: TelegramConfig) => {
      return await telegramService.saveConfig(user!.schoolId, data);
    },
    onSuccess: () => {
      clearDraftValues();
      queryClient.invalidateQueries({ queryKey: ['telegram-config'] });
      toast.success('Telegram configuration saved successfully!');
      setValidationErrors([]);
    },
    onError: (error: any) => {
      console.error('Save configuration error:', error);
      let errorMessage = 'Failed to save configuration';

      if (error.message) {
        errorMessage += ': ' + error.message;
      }

      toast.error(errorMessage);
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

  // Verify bot token mutation
  const verifyBotMutation = useMutation({
    mutationFn: async () => {
      return await telegramService.verifyBotToken(config.botToken);
    },
    onSuccess: async (data) => {
      if (data.valid && data.botInfo) {
        setBotInfo(data.botInfo);
        const updatedConfig = { ...config, botUsername: data.botInfo.username };
        setConfig(updatedConfig);

        // Auto-save configuration after successful verification
        try {
          await telegramService.saveConfig(user!.schoolId, updatedConfig);
          clearDraftValues();
          queryClient.invalidateQueries({ queryKey: ['telegram-config'] });
          toast.success('Bot verified and configuration saved!');
        } catch (saveError) {
          console.error('Failed to auto-save after verification:', saveError);
          toast.warning('Bot verified but failed to save. Please click Save Configuration.');
        }

        setTestResults({
          success: true,
          message: `Bot verified: @${data.botInfo.username}`,
          details: data.botInfo,
          timestamp: new Date()
        });
        setShowTestResults(true);
      } else {
        toast.error(data.error || 'Invalid bot token');

        setTestResults({
          success: false,
          message: data.error || 'Invalid bot token',
          details: null,
          timestamp: new Date()
        });
        setShowTestResults(true);
      }
    },
    onError: (error: any) => {
      console.error('Bot verification error:', error);
      toast.error('Failed to verify bot token: ' + error.message);
    }
  });

  // Send test message mutation
  const sendTestMutation = useMutation({
    mutationFn: async () => {
      return await telegramService.sendTestMessage(user!.schoolId, {
        chatId: testChatId,
        message: testMessage
      });
    },
    onSuccess: () => {
      toast.success(`Test message sent successfully to ${testChatId}!`);
      setTestChatId('');
      setTestMessage('');
    },
    onError: (error: any) => {
      console.error('Send test message error:', error);
      let errorMessage = 'Failed to send test message';

      if (error.message) {
        errorMessage += ': ' + error.message;
      }

      toast.error(errorMessage);
    }
  });

  // Generate linking code mutation
  const generateLinkingCodeMutation = useMutation({
    mutationFn: async ({ studentId, language }: { studentId: string; language: 'en' | 'ru' }) => {
      return await telegramService.generateLinkingCode(studentId, user!.schoolId, language);
    },
    onSuccess: (code) => {
      setLinkingCode(code);
      setShowQRCode(true);
      toast.success('Linking code generated successfully!');
    },
    onError: (error: any) => {
      console.error('Generate linking code error:', error);
      toast.error('Failed to generate linking code');
    }
  });

  // Unlink student mutation
  const unlinkStudentMutation = useMutation({
    mutationFn: async (studentId: string) => {
      return await telegramService.unlinkStudent(studentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegram-enabled-students'] });
      toast.success('Student unlinked successfully');
    },
    onError: (error: any) => {
      console.error('Unlink student error:', error);
      toast.error('Failed to unlink student');
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
    if (telegramConfig && !hasLoadedFromFirestore) {
      const draftKey = getDraftKey();
      const savedDraft = localStorage.getItem(draftKey);

      if (!savedDraft) {
        setConfig(telegramConfig);

        // If config has botUsername, set botInfo to show as verified
        if (telegramConfig.botUsername) {
          setBotInfo({
            username: telegramConfig.botUsername,
            first_name: telegramConfig.botUsername
          });
        }
      }

      setHasLoadedFromFirestore(true);
    }
  }, [telegramConfig, hasLoadedFromFirestore]);

  // Save draft values to localStorage whenever config changes
  useEffect(() => {
    if (!user?.schoolId || !hasLoadedFromFirestore) return;

    const draftKey = getDraftKey();
    const hasValues = config.botToken || config.isActive;

    if (hasValues) {
      try {
        localStorage.setItem(draftKey, JSON.stringify(config));
      } catch (error) {
        console.warn('Failed to save Telegram config draft to localStorage:', error);
      }
    }
  }, [config, user?.schoolId, hasLoadedFromFirestore]);

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

  // Update linked students list
  useEffect(() => {
    if (enabledStudents) {
      setLinkedStudents(enabledStudents);
    }
  }, [enabledStudents]);

  const handleConfigSave = () => {
    const errors: string[] = [];

    if (!config.botToken || config.botToken.trim().length === 0) {
      errors.push('Bot token is required');
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      toast.error(`Please fix ${errors.length} validation error${errors.length > 1 ? 's' : ''} before saving`);
      return;
    }

    setValidationErrors([]);
    saveConfigMutation.mutate(config);
  };

  const clearDraftValues = () => {
    if (!user?.schoolId) return;
    const draftKey = getDraftKey();
    try {
      localStorage.removeItem(draftKey);
    } catch (error) {
      console.warn('Failed to clear Telegram config draft from localStorage:', error);
    }
  };

  const handleInitializeDefaults = () => {
    setShowInitializeDialog(true);
  };

  const confirmInitializeDefaults = () => {
    initializeDefaultsMutation.mutate();
    setShowInitializeDialog(false);
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

  const handleSaveNotificationRules = () => {
    saveNotificationRulesMutation.mutate(notificationRules);
  };

  const handleVerifyBot = () => {
    if (!config.botToken) {
      toast.error('Please enter a bot token');
      return;
    }

    verifyBotMutation.mutate();
  };

  const handleSendTest = () => {
    if (!testChatId || !testMessage) {
      toast.error('Please provide chat ID and message');
      return;
    }

    sendTestMutation.mutate();
  };

  const handleGenerateLinkingCode = () => {
    if (!selectedStudentId) {
      toast.error('Please select a student');
      return;
    }

    generateLinkingCodeMutation.mutate({ studentId: selectedStudentId, language: selectedLanguage });
  };

  const handleUnlinkStudent = (studentId: string) => {
    unlinkStudentMutation.mutate(studentId);
  };

  const getRuleTypeDisplayName = (type: NotificationRuleType): string => {
    const names: Record<NotificationRuleType, string> = {
      [NotificationRuleType.LESSON_REMINDERS]: 'Lesson Reminders',
      [NotificationRuleType.PAYMENT_REMINDERS]: 'Payment Reminders',
      [NotificationRuleType.LESSON_CANCELLATION]: 'Lesson Cancellation'
    };
    return names[type] || type;
  };

  const getTemplatesByType = (type: NotificationTemplateType) => {
    return notificationTemplates.filter(t => t.type === type && t.isActive);
  };

  // Helper to identify Telegram-relevant templates
  const isTelegramTemplate = (template: NotificationTemplate): boolean => {
    const telegramTypes = [
      NotificationTemplateType.LESSON_REMINDER_1_DAY,
      NotificationTemplateType.LESSON_REMINDER_2_HOURS,
      NotificationTemplateType.LESSON_REMINDER_15_MIN,
      NotificationTemplateType.SUBSCRIPTION_EXPIRY
    ];
    return telegramTypes.includes(template.type);
  };

  // Helper to identify Telegram-relevant rules
  const isTelegramRule = (rule: NotificationRule): boolean => {
    return rule.reminders?.some(r => r.channel === 'telegram' || r.channel === 'both') || false;
  };

  const getConfigurationStatus = () => {
    if (config.isActive && config.botToken && botInfo) {
      return { variant: 'default' as const, message: 'Active' };
    }
    if (config.botToken) {
      return { variant: 'secondary' as const, message: 'Configured' };
    }
    return { variant: 'outline' as const, message: 'Not Configured' };
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
          <h1 className="text-3xl font-bold">Telegram Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure Telegram bot for automated notifications
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(() => {
            const status = getConfigurationStatus();
            return (
              <Badge variant={status.variant}>
                {status.message}
              </Badge>
            );
          })()}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="config">
            <Settings className="h-4 w-4 mr-2" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="ai">
            <Bot className="h-4 w-4 mr-2" />
            AI Assistant
          </TabsTrigger>
          <TabsTrigger value="ai-logs">
            <MessageSquare className="h-4 w-4 mr-2" />
            AI Logs
          </TabsTrigger>
          <TabsTrigger value="ai-test">
            <TestTube className="h-4 w-4 mr-2" />
            AI Test
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
          <TabsTrigger value="linking">
            <LinkIcon className="h-4 w-4 mr-2" />
            Student Linking
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
                  <h3 className="font-medium text-blue-900">Setting up Telegram Bot Integration</h3>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p>To create and configure your Telegram bot:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Open Telegram and search for <strong>@BotFather</strong></li>
                      <li>Send the command <code className="bg-blue-100 px-1 rounded">/newbot</code> to create a new bot</li>
                      <li>Follow the instructions to choose a name and username for your bot</li>
                      <li>Copy the <strong>API token</strong> provided by BotFather</li>
                      <li>Paste the token below and click "Verify Bot Token"</li>
                    </ol>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Telegram Bot Configuration</CardTitle>
              <CardDescription>
                Connect your Telegram bot to enable automated notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="active">Enable Telegram Integration</Label>
                <Switch
                  id="active"
                  checked={config.isActive}
                  onCheckedChange={(checked) => setConfig({ ...config, isActive: checked })}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="botToken">Bot Token</Label>
                  <div className="group relative">
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    <div className="invisible group-hover:visible absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap z-10">
                      Get from @BotFather on Telegram
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <Input
                    id="botToken"
                    type={showToken ? "text" : "password"}
                    value={config.botToken}
                    onChange={(e) => {
                      setConfig({ ...config, botToken: e.target.value });
                      setBotInfo(null); // Clear bot info when token changes
                    }}
                    placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                    className={validationErrors.length > 0 ? 'border-red-500' : ''}
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
                <p className="text-xs text-muted-foreground">
                  Your bot token from BotFather
                </p>
              </div>

              {/* Bot Info Display */}
              {botInfo && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      Bot Verified
                    </span>
                  </div>
                  <div className="text-sm text-green-700 space-y-1">
                    <p><strong>Bot Name:</strong> {botInfo.first_name}</p>
                    <p><strong>Username:</strong> @{botInfo.username}</p>
                    {botInfo.can_read_all_group_messages !== undefined && (
                      <p><strong>Can read messages:</strong> {botInfo.can_read_all_group_messages ? 'Yes' : 'No'}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="defaultLanguage">Default Language</Label>
                <Select
                  value={config.defaultLanguage}
                  onValueChange={(value: 'en' | 'ru') => setConfig({ ...config, defaultLanguage: value })}
                >
                  <SelectTrigger id="defaultLanguage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ru">Russian (Русский)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Default language for notification messages
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
                  <ul className="text-sm text-red-700 space-y-1 ml-6 list-disc">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleVerifyBot}
                  disabled={verifyBotMutation.isPending || !config.botToken?.trim()}
                  className="flex-1"
                >
                  {verifyBotMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : botInfo ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Re-verify Bot Token
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Verify Bot Token
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleConfigSave}
                  disabled={saveConfigMutation.isPending || !config.botToken?.trim()}
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

              {!config.botToken?.trim() && (
                <p className="text-sm text-muted-foreground text-center">
                  Enter your bot token to verify and save the configuration
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <AISettingsPanel schoolId={user?.schoolId || ''} />
        </TabsContent>

        <TabsContent value="ai-logs" className="space-y-4">
          <AILogsPanel schoolId={user?.schoolId || ''} />
        </TabsContent>

        <TabsContent value="ai-test" className="space-y-4">
          <AITestPanel schoolId={user?.schoolId || ''} />
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
                    <p>Configure when and how Telegram notifications are sent to students.</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Set up lesson reminders with custom timing</li>
                      <li>Configure subscription expiry notifications</li>
                      <li>Customize message templates and recipients</li>
                      <li>Support for English and Russian languages</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Initialize Defaults Button */}
          {(() => {
            const hasTelegramRules = notificationRules.some(rule => isTelegramRule(rule));
            const hasTelegramTemplates = notificationTemplates.some(t => isTelegramTemplate(t));
            const shouldShowInitialize = !hasTelegramRules && !hasTelegramTemplates;

            return shouldShowInitialize && (
              <Card className="border-dashed border-2">
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <div className="text-muted-foreground">
                      <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">No Telegram notification rules found</p>
                      <p className="text-sm">Initialize default notification settings to get started with automated Telegram notifications.</p>
                    </div>
                    <Button
                      onClick={handleInitializeDefaults}
                      disabled={initializeDefaultsMutation.isPending}
                      size="lg"
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
            );
          })()}

          {/* Notification Rules Editor */}
          {notificationRules.length > 0 || notificationTemplates.length > 0 ? (
            <NotificationRulesEditor
              schoolId={user?.schoolId || ''}
              templates={notificationTemplates.filter(t => isTelegramTemplate(t))}
              onSave={(updatedRules) => {
                const formattedRules = updatedRules.map(rule => ({
                  ...rule,
                  schoolId: user?.schoolId || '',
                  id: rule.type
                }));
                saveNotificationRulesMutation.mutate(formattedRules);
              }}
              initialRules={notificationRules
                .filter(rule => isTelegramRule(rule))
                .map(rule => ({
                  type: rule.type,
                  name: getRuleTypeDisplayName(rule.type),
                  description: `Configure ${getRuleTypeDisplayName(rule.type).toLowerCase()} settings`,
                  enabled: rule.enabled,
                  recipients: rule.recipients || { students: true, parents: false, teachers: false },
                  reminders: rule.reminders?.map((r, idx) => ({
                    id: idx.toString(),
                    value: r.timing?.value || 1,
                    unit: r.timing?.unit || 'hours',
                    channel: 'telegram' as any,
                    templateId: r.templateId
                  })) || []
                }))}
              loading={saveNotificationRulesMutation.isPending}
            />
          ) : null}

          {/* Template Management */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Message Templates</CardTitle>
                  <CardDescription>
                    Manage Telegram notification message templates
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
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded-full">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium text-blue-900">Template Variables</h3>
                  <div className="text-sm text-blue-800">
                    <p className="mb-2">Available variables for your templates:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <code className="bg-blue-100 px-2 py-1 rounded">{'{'}studentName{'}'}</code>
                      <code className="bg-blue-100 px-2 py-1 rounded">{'{'}parentName{'}'}</code>
                      <code className="bg-blue-100 px-2 py-1 rounded">{'{'}teacherName{'}'}</code>
                      <code className="bg-blue-100 px-2 py-1 rounded">{'{'}subject{'}'}</code>
                      <code className="bg-blue-100 px-2 py-1 rounded">{'{'}lessonTime{'}'}</code>
                      <code className="bg-blue-100 px-2 py-1 rounded">{'{'}zoomLink{'}'}</code>
                      <code className="bg-blue-100 px-2 py-1 rounded">{'{'}subscriptionEndDate{'}'}</code>
                      <code className="bg-blue-100 px-2 py-1 rounded">{'{'}daysUntilExpiry{'}'}</code>
                      <code className="bg-blue-100 px-2 py-1 rounded">{'{'}sessionsRemaining{'}'}</code>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Manage Templates</CardTitle>
                  <CardDescription>
                    Create and edit notification templates for Telegram
                  </CardDescription>
                </div>
                <Button onClick={handleCreateTemplate}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {notificationTemplates.filter(t => isTelegramTemplate(t)).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4" />
                  <p>No Telegram templates found</p>
                  <p className="text-sm">Create your first template or initialize defaults</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notificationTemplates
                    .filter(t => isTelegramTemplate(t))
                    .map(template => (
                      <div key={template.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{template.name}</h4>
                              <Badge variant="outline" className="text-xs">
                                {template.language.toUpperCase()}
                              </Badge>
                              {template.isDefault && (
                                <Badge variant="secondary" className="text-xs">Default</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {notificationSettingsService.getTemplateTypeDisplayName(template.type)}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditTemplate(template)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            {!template.isDefault && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteTemplate(template.id!)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="bg-muted p-3 rounded text-sm">
                          {template.body}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Send Test Message</CardTitle>
              <CardDescription>
                Test your Telegram bot configuration by sending a message
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Chat ID</Label>
                <Input
                  value={testChatId}
                  onChange={(e) => setTestChatId(e.target.value)}
                  placeholder="123456789"
                />
                <p className="text-xs text-muted-foreground">
                  The Telegram chat ID to send the test message to. Users can get their chat ID by messaging your bot.
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
                disabled={sendTestMutation.isPending || !config.isActive || !testChatId || !testMessage}
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
                  Enable Telegram integration first
                </p>
              )}

              {config.isActive && !config.botToken && (
                <p className="text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Configure bot token in the Configuration tab
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="linking" className="space-y-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded-full">
                  <LinkIcon className="h-4 w-4 text-blue-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium text-blue-900">How Student Linking Works</h3>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p>To link a student's Telegram account:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Select a student from the dropdown below</li>
                      <li>Click "Generate Linking Code" to create a unique QR code</li>
                      <li>Student scans the QR code or clicks the link</li>
                      <li>Student starts a conversation with your bot on Telegram</li>
                      <li>The account is automatically linked</li>
                    </ol>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generate Linking Code</CardTitle>
              <CardDescription>
                Create a QR code or link for students to connect their Telegram account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Student</Label>
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId} disabled={isLoadingStudents}>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingStudents ? "Loading students..." : students.length === 0 ? "No students found" : "Choose a student..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {students.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        No students available
                      </div>
                    ) : (
                      students.map(student => (
                        <SelectItem key={student.id} value={student.id!}>
                          {student.firstName} {student.lastName}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {studentsError && (
                  <p className="text-xs text-red-600">
                    Error loading students: {(studentsError as Error).message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="student-language">Preferred Language</Label>
                <Select value={selectedLanguage} onValueChange={(value: 'en' | 'ru') => setSelectedLanguage(value)}>
                  <SelectTrigger id="student-language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ru">Russian (Русский)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Student will be asked to confirm their language preference when linking
                </p>
              </div>

              <Button
                onClick={handleGenerateLinkingCode}
                disabled={!selectedStudentId || !config.botUsername || generateLinkingCodeMutation.isPending}
                className="w-full"
              >
                {generateLinkingCodeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <QrCode className="h-4 w-4 mr-2" />
                    Generate QR Code
                  </>
                )}
              </Button>

              {!config.botUsername && (
                <p className="text-sm text-yellow-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Please verify your bot token first to enable linking
                </p>
              )}

              {showQRCode && linkingCode && config.botUsername && (
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex flex-col items-center space-y-4">
                    <QRCodeSVG
                      value={telegramService.generateDeepLink(config.botUsername, linkingCode)}
                      size={256}
                      level="H"
                      includeMargin={true}
                    />
                    <div className="text-center space-y-2">
                      <p className="text-sm font-medium">Linking Code: {linkingCode}</p>
                      <p className="text-xs text-muted-foreground">
                        Or share this link:
                      </p>
                      <code className="text-xs bg-muted px-2 py-1 rounded block">
                        {telegramService.generateDeepLink(config.botUsername, linkingCode)}
                      </code>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Linked Students</CardTitle>
              <CardDescription>
                Students who have connected their Telegram accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {linkedStudents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4" />
                  <p>No students linked yet</p>
                  <p className="text-sm">Generate linking codes to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {linkedStudents.map(student => (
                    <div key={student.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">
                          {student.firstName} {student.lastName}
                        </p>
                        {student.telegramNotifications?.username && (
                          <p className="text-sm text-muted-foreground">
                            @{student.telegramNotifications.username}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Chat ID: {student.telegramNotifications?.chatId}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnlinkStudent(student.id!)}
                        disabled={unlinkStudentMutation.isPending}
                        className="text-destructive hover:text-destructive"
                      >
                        <Unlink className="h-4 w-4 mr-1" />
                        Unlink
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <NotificationLogsViewer
            schoolId={user?.schoolId || ''}
            defaultChannel="telegram"
          />
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
                  Verification Successful
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  Verification Failed
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
                : 'bg-red-50 border-red-200'
            }`}>
              <p className={`font-medium ${
                testResults?.success
                  ? 'text-green-800'
                  : 'text-red-800'
              }`}>
                {testResults?.message}
              </p>
            </div>

            {testResults?.details && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-700">Bot Information:</h4>
                <div className="bg-gray-50 p-3 rounded border text-xs font-mono max-h-60 overflow-y-auto">
                  <pre>{JSON.stringify(testResults.details, null, 2)}</pre>
                </div>
              </div>
            )}

            {testResults?.success && (
              <div className="space-y-2 text-sm text-gray-600">
                <h4 className="font-medium text-gray-700">Next Steps:</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Save your configuration to enable the bot</li>
                  <li>Set up notification templates and rules</li>
                  <li>Generate linking codes for students</li>
                  <li>Test notifications with the Test tab</li>
                </ul>
              </div>
            )}

            {!testResults?.success && (
              <div className="space-y-2 text-sm">
                <h4 className="font-medium text-gray-700">Troubleshooting:</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Verify the bot token is correct from @BotFather</li>
                  <li>Make sure the bot hasn't been deleted</li>
                  <li>Check your internet connection</li>
                  <li>Try creating a new bot if the issue persists</li>
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

      {/* Initialize Defaults Confirmation Dialog */}
      <ConfirmationDialog
        open={showInitializeDialog}
        onOpenChange={setShowInitializeDialog}
        title="Initialize Default Settings"
        description="This will initialize default notification templates and rules for your school. This action will help you get started quickly with pre-configured templates for common notifications."
        onConfirm={confirmInitializeDefaults}
        confirmText="OK"
        cancelText="Cancel"
        type="info"
        loading={initializeDefaultsMutation.isPending}
      />
    </div>
  );
};

export default TelegramSettings;
