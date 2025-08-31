import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Trash2, 
  Clock,
  Calendar,
  Bell,
  Users,
  MessageSquare,
  Phone,
  Save,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import {
  NotificationRule,
  NotificationRuleType,
  NotificationChannel,
  NotificationTemplate
} from '@/types/notification.types';

interface ReminderSchedule {
  id: string;
  value: number;
  unit: 'minutes' | 'hours' | 'days';
  channel: NotificationChannel | 'both';
  templateId?: string;
}

interface NotificationRuleConfig {
  type: NotificationRuleType;
  name: string;
  description: string;
  enabled: boolean;
  recipients: {
    students: boolean;
    parents: boolean;
    teachers: boolean;
  };
  reminders: ReminderSchedule[];
}

interface NotificationRulesEditorProps {
  schoolId: string;
  templates: NotificationTemplate[];
  onSave: (rules: NotificationRuleConfig[]) => void;
  initialRules?: NotificationRuleConfig[];
  loading?: boolean;
}

const NotificationRulesEditor: React.FC<NotificationRulesEditorProps> = ({
  schoolId,
  templates,
  onSave,
  initialRules = [],
  loading = false
}) => {
  const [rules, setRules] = useState<NotificationRuleConfig[]>([
    {
      type: NotificationRuleType.LESSON_REMINDER,
      name: 'Lesson Reminders',
      description: 'Automated reminders before scheduled lessons',
      enabled: true,
      recipients: {
        students: true,
        parents: true,
        teachers: false
      },
      reminders: [
        {
          id: '1',
          value: 1,
          unit: 'days',
          channel: 'both',
          templateId: undefined
        },
        {
          id: '2',
          value: 2,
          unit: 'hours',
          channel: 'whatsapp',
          templateId: undefined
        }
      ]
    },
    {
      type: NotificationRuleType.PAYMENT_REMINDER,
      name: 'Payment Reminders',
      description: 'Payment due date notifications',
      enabled: true,
      recipients: {
        students: false,
        parents: true,
        teachers: false
      },
      reminders: [
        {
          id: '1',
          value: 3,
          unit: 'days',
          channel: 'sms',
          templateId: undefined
        }
      ]
    },
    {
      type: NotificationRuleType.LESSON_CANCELLATION,
      name: 'Lesson Cancellation',
      description: 'Immediate notification when lesson is cancelled',
      enabled: true,
      recipients: {
        students: true,
        parents: true,
        teachers: false
      },
      reminders: [
        {
          id: '1',
          value: 0,
          unit: 'minutes',
          channel: 'both',
          templateId: undefined
        }
      ]
    },
    {
      type: NotificationRuleType.ATTENDANCE_CONFIRMATION,
      name: 'Attendance Confirmation',
      description: 'Notify after attendance is marked',
      enabled: false,
      recipients: {
        students: false,
        parents: true,
        teachers: false
      },
      reminders: [
        {
          id: '1',
          value: 5,
          unit: 'minutes',
          channel: 'whatsapp',
          templateId: undefined
        }
      ]
    }
  ]);

  useEffect(() => {
    if (initialRules.length > 0) {
      setRules(initialRules);
    }
  }, [initialRules]);

  const handleRuleToggle = (ruleIndex: number) => {
    const updatedRules = [...rules];
    updatedRules[ruleIndex].enabled = !updatedRules[ruleIndex].enabled;
    setRules(updatedRules);
  };

  const handleRecipientToggle = (ruleIndex: number, recipient: 'students' | 'parents' | 'teachers') => {
    const updatedRules = [...rules];
    updatedRules[ruleIndex].recipients[recipient] = !updatedRules[ruleIndex].recipients[recipient];
    setRules(updatedRules);
  };

  const handleAddReminder = (ruleIndex: number) => {
    const updatedRules = [...rules];
    const newReminder: ReminderSchedule = {
      id: Date.now().toString(),
      value: 1,
      unit: 'hours',
      channel: 'both',
      templateId: undefined
    };
    updatedRules[ruleIndex].reminders.push(newReminder);
    setRules(updatedRules);
  };

  const handleRemoveReminder = (ruleIndex: number, reminderIndex: number) => {
    const updatedRules = [...rules];
    updatedRules[ruleIndex].reminders.splice(reminderIndex, 1);
    setRules(updatedRules);
  };

  const handleReminderChange = (
    ruleIndex: number, 
    reminderIndex: number, 
    field: keyof ReminderSchedule, 
    value: any
  ) => {
    const updatedRules = [...rules];
    updatedRules[ruleIndex].reminders[reminderIndex] = {
      ...updatedRules[ruleIndex].reminders[reminderIndex],
      [field]: value
    };
    setRules(updatedRules);
  };

  const getTimeUnitLabel = (value: number, unit: string) => {
    if (value === 0) return 'Immediately';
    const unitLabel = value === 1 ? unit.slice(0, -1) : unit;
    return `${value} ${unitLabel} before`;
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'sms':
        return <MessageSquare className="h-3 w-3" />;
      case 'whatsapp':
        return <Phone className="h-3 w-3" />;
      case 'both':
        return (
          <div className="flex gap-0.5">
            <MessageSquare className="h-3 w-3" />
            <Phone className="h-3 w-3" />
          </div>
        );
      default:
        return <Bell className="h-3 w-3" />;
    }
  };

  const getRelevantTemplates = (ruleType: NotificationRuleType) => {
    // Filter templates based on rule type
    return templates.filter(template => {
      // Match template type to rule type logic
      if (ruleType === NotificationRuleType.LESSON_REMINDER) {
        return template.type?.includes('lesson_reminder');
      }
      if (ruleType === NotificationRuleType.PAYMENT_REMINDER) {
        return template.type?.includes('payment');
      }
      if (ruleType === NotificationRuleType.LESSON_CANCELLATION) {
        return template.type?.includes('cancellation');
      }
      if (ruleType === NotificationRuleType.ATTENDANCE_CONFIRMATION) {
        return template.type?.includes('attendance');
      }
      return true;
    });
  };

  const handleSave = () => {
    // Validate rules
    const hasValidRules = rules.some(rule => rule.enabled && rule.reminders.length > 0);
    if (!hasValidRules) {
      toast.error('Please enable at least one rule with reminders');
      return;
    }

    onSave(rules);
    toast.success('Notification rules saved successfully');
  };

  return (
    <div className="space-y-6">
      {rules.map((rule, ruleIndex) => (
        <Card key={`rule-${rule.type}-${ruleIndex}`} className={!rule.enabled ? 'opacity-60' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-lg">{rule.name}</CardTitle>
                  <CardDescription className="text-sm mt-1">
                    {rule.description}
                  </CardDescription>
                </div>
              </div>
              <Switch
                checked={rule.enabled}
                onCheckedChange={() => handleRuleToggle(ruleIndex)}
              />
            </div>
          </CardHeader>
          
          {rule.enabled && (
            <CardContent className="space-y-6">
              {/* Recipients Section */}
              <div>
                <Label className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Recipients
                </Label>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`students-${ruleIndex}`}
                      checked={rule.recipients.students}
                      onCheckedChange={() => handleRecipientToggle(ruleIndex, 'students')}
                    />
                    <Label htmlFor={`students-${ruleIndex}`}>Students</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`parents-${ruleIndex}`}
                      checked={rule.recipients.parents}
                      onCheckedChange={() => handleRecipientToggle(ruleIndex, 'parents')}
                    />
                    <Label htmlFor={`parents-${ruleIndex}`}>Parents</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`teachers-${ruleIndex}`}
                      checked={rule.recipients.teachers}
                      onCheckedChange={() => handleRecipientToggle(ruleIndex, 'teachers')}
                    />
                    <Label htmlFor={`teachers-${ruleIndex}`}>Teachers</Label>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Reminder Schedule Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Reminder Schedule
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddReminder(ruleIndex)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Reminder
                  </Button>
                </div>

                <div className="space-y-3">
                  {rule.reminders.map((reminder, reminderIndex) => (
                    <div 
                      key={reminder.id}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                        {/* Time Value */}
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="999"
                            value={reminder.value}
                            onChange={(e) => handleReminderChange(
                              ruleIndex, 
                              reminderIndex, 
                              'value', 
                              parseInt(e.target.value) || 0
                            )}
                            className="w-20"
                            disabled={rule.type === NotificationRuleType.LESSON_CANCELLATION}
                          />
                          <Select
                            value={reminder.unit}
                            onValueChange={(value) => handleReminderChange(
                              ruleIndex, 
                              reminderIndex, 
                              'unit', 
                              value
                            )}
                            disabled={rule.type === NotificationRuleType.LESSON_CANCELLATION}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="minutes">Minutes</SelectItem>
                              <SelectItem value="hours">Hours</SelectItem>
                              <SelectItem value="days">Days</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Before text */}
                        <div className="flex items-center text-sm text-muted-foreground">
                          {rule.type === NotificationRuleType.LESSON_CANCELLATION ? 
                            'Send immediately' : 
                            'before'
                          }
                        </div>

                        {/* Channel Selection */}
                        <Select
                          value={reminder.channel}
                          onValueChange={(value) => handleReminderChange(
                            ruleIndex, 
                            reminderIndex, 
                            'channel', 
                            value
                          )}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sms">
                              <div className="flex items-center gap-2">
                                <MessageSquare className="h-3 w-3" />
                                SMS Only
                              </div>
                            </SelectItem>
                            <SelectItem value="whatsapp">
                              <div className="flex items-center gap-2">
                                <Phone className="h-3 w-3" />
                                WhatsApp Only
                              </div>
                            </SelectItem>
                            <SelectItem value="both">
                              <div className="flex items-center gap-2">
                                {getChannelIcon('both')}
                                Both SMS & WhatsApp
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Template Selection */}
                        <Select
                          value={reminder.templateId || 'default'}
                          onValueChange={(value) => handleReminderChange(
                            ruleIndex, 
                            reminderIndex, 
                            'templateId', 
                            value === 'default' ? undefined : value
                          )}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Select template" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Default Template</SelectItem>
                            {getRelevantTemplates(rule.type).map((template, index) => (
                              <SelectItem key={template.id || `template-${index}`} value={template.id || `default-${index}`}>
                                {template.name} ({template.language})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Delete Button */}
                      {rule.reminders.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveReminder(ruleIndex, reminderIndex)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Preview of schedule */}
                {rule.reminders.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                      <div className="text-sm text-blue-900">
                        <p className="font-medium mb-1">Reminder Schedule:</p>
                        <ul className="space-y-0.5">
                          {rule.reminders.map((reminder, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="text-blue-600">•</span>
                              {getTimeUnitLabel(reminder.value, reminder.unit)}
                              {reminder.value > 0 && ' the event'} via {' '}
                              <Badge variant="outline" className="text-xs">
                                {reminder.channel === 'both' ? 'SMS & WhatsApp' : reminder.channel.toUpperCase()}
                              </Badge>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      ))}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          disabled={loading}
          size="lg"
        >
          <Save className="h-4 w-4 mr-2" />
          Save Notification Rules
        </Button>
      </div>
    </div>
  );
};

export default NotificationRulesEditor;