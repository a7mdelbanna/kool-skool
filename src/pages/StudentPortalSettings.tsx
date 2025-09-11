import React, { useState, useEffect, useContext } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  Save,
  School,
  Clock,
  CreditCard,
  Users,
  Shield,
  Bell,
  Calendar,
  Ban,
  CheckCircle,
  AlertCircle,
  Info,
  FileText,
  Globe,
  Mail,
  Phone,
  DollarSign,
  RefreshCw,
  Building,
  User
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { UserContext } from '@/App';
import { useNavigate } from 'react-router-dom';

interface StudentPortalSettingsData {
  cancellation_notice_hours: number;
  allow_student_cancellation: boolean;
  allow_payment_upload: boolean;
  require_profile_completion: boolean;
  enable_google_calendar: boolean;
  enable_homework_submission: boolean;
  enable_messaging: boolean;
  payment_methods: string[];
  student_permissions: {
    can_view_grades: boolean;
    can_download_materials: boolean;
    can_submit_feedback: boolean;
    can_request_sessions: boolean;
  };
  notification_settings?: {
    send_cancellation_emails: boolean;
    send_payment_reminders: boolean;
    send_session_reminders: boolean;
    reminder_hours_before: number;
  };
  payment_settings?: {
    currency: string;
    late_payment_fee: number;
    payment_due_days: number;
    allow_partial_payments: boolean;
  };
  session_settings?: {
    default_duration_minutes: number;
    allow_online_sessions: boolean;
    allow_in_person_sessions: boolean;
    buffer_time_minutes: number;
  };
}

const StudentPortalSettings: React.FC = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [settings, setSettings] = useState<StudentPortalSettingsData>({
    cancellation_notice_hours: 24,
    allow_student_cancellation: true,
    allow_payment_upload: true,
    require_profile_completion: true,
    enable_google_calendar: true,
    enable_homework_submission: false,
    enable_messaging: false,
    payment_methods: ['manual'],
    student_permissions: {
      can_view_grades: true,
      can_download_materials: true,
      can_submit_feedback: true,
      can_request_sessions: false
    },
    notification_settings: {
      send_cancellation_emails: true,
      send_payment_reminders: true,
      send_session_reminders: true,
      reminder_hours_before: 24
    },
    payment_settings: {
      currency: 'USD',
      late_payment_fee: 0,
      payment_due_days: 7,
      allow_partial_payments: false
    },
    session_settings: {
      default_duration_minutes: 60,
      allow_online_sessions: true,
      allow_in_person_sessions: false,
      buffer_time_minutes: 15
    }
  });

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      toast.error('Access denied. Admin privileges required.');
      navigate('/');
      return;
    }
    loadSchoolSettings();
  }, [user, navigate]);

  const loadSchoolSettings = async () => {
    try {
      setLoading(true);

      // Load school info and settings
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('*')
        .eq('id', user?.schoolId)
        .single();

      if (schoolError) throw schoolError;

      setSchoolInfo(schoolData);
      
      // Merge existing settings with defaults
      if (schoolData.settings) {
        setSettings(prev => ({
          ...prev,
          ...schoolData.settings,
          student_permissions: {
            ...prev.student_permissions,
            ...(schoolData.settings.student_permissions || {})
          },
          notification_settings: {
            ...prev.notification_settings,
            ...(schoolData.settings.notification_settings || {})
          },
          payment_settings: {
            ...prev.payment_settings,
            ...(schoolData.settings.payment_settings || {})
          },
          session_settings: {
            ...prev.session_settings,
            ...(schoolData.settings.session_settings || {})
          }
        }));
      }
    } catch (error) {
      console.error('Error loading school settings:', error);
      toast.error('Failed to load school settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('schools')
        .update({
          settings: settings,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.schoolId);

      if (error) throw error;

      toast.success('Student portal settings updated successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key: keyof StudentPortalSettingsData) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key as keyof StudentPortalSettingsData]
    }));
  };

  const handlePermissionToggle = (permission: keyof typeof settings.student_permissions) => {
    setSettings(prev => ({
      ...prev,
      student_permissions: {
        ...prev.student_permissions,
        [permission]: !prev.student_permissions[permission]
      }
    }));
  };

  const handlePaymentMethodToggle = (method: string) => {
    setSettings(prev => {
      const methods = prev.payment_methods.includes(method)
        ? prev.payment_methods.filter(m => m !== method)
        : [...prev.payment_methods, method];
      return { ...prev, payment_methods: methods };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="h-8 w-8" />
              Student Portal Settings
            </h1>
            <p className="text-muted-foreground mt-2">
              Configure your student portal features and policies
            </p>
          </div>
          <Button
            onClick={handleSaveSettings}
            disabled={saving}
            size="lg"
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="cancellation" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="cancellation">Cancellation</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>

        {/* Cancellation Settings */}
        <TabsContent value="cancellation">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="h-5 w-5" />
                Cancellation Policy
              </CardTitle>
              <CardDescription>
                Configure how students can cancel or reschedule sessions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Allow Student Cancellations</Label>
                  <p className="text-sm text-muted-foreground">
                    Students can request to cancel or reschedule sessions
                  </p>
                </div>
                <Switch
                  checked={settings.allow_student_cancellation}
                  onCheckedChange={() => handleToggle('allow_student_cancellation')}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="notice-hours">Cancellation Notice Period</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="notice-hours"
                    type="number"
                    min="0"
                    max="168"
                    value={settings.cancellation_notice_hours}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      cancellation_notice_hours: parseInt(e.target.value) || 24
                    }))}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">hours before session</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Cancellations within this period will count as completed sessions
                </p>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Policy Summary:</strong>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>• Cancellations made {settings.cancellation_notice_hours}+ hours before: Session can be rescheduled</li>
                    <li>• Cancellations made within {settings.cancellation_notice_hours} hours: Session counts as completed</li>
                    <li>• All cancellation requests are logged for review</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Settings */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Settings
              </CardTitle>
              <CardDescription>
                Configure payment methods and policies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Accepted Payment Methods</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>Manual Payment (Bank Transfer, Cash)</span>
                    </div>
                    <Switch
                      checked={settings.payment_methods.includes('manual')}
                      onCheckedChange={() => handlePaymentMethodToggle('manual')}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span>Stripe (Credit/Debit Cards)</span>
                      <Badge variant="secondary">Coming Soon</Badge>
                    </div>
                    <Switch
                      checked={settings.payment_methods.includes('stripe')}
                      onCheckedChange={() => handlePaymentMethodToggle('stripe')}
                      disabled
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Allow Payment Proof Upload</Label>
                  <p className="text-sm text-muted-foreground">
                    Students can upload screenshots of payment receipts
                  </p>
                </div>
                <Switch
                  checked={settings.allow_payment_upload}
                  onCheckedChange={() => handleToggle('allow_payment_upload')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Default Currency</Label>
                  <Select
                    value={settings.payment_settings?.currency || 'USD'}
                    onValueChange={(value) => setSettings(prev => ({
                      ...prev,
                      payment_settings: {
                        ...prev.payment_settings!,
                        currency: value
                      }
                    }))}
                  >
                    <SelectTrigger id="currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      <SelectItem value="EGP">EGP - Egyptian Pound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment-due">Payment Due Period</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="payment-due"
                      type="number"
                      min="1"
                      max="30"
                      value={settings.payment_settings?.payment_due_days || 7}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        payment_settings: {
                          ...prev.payment_settings!,
                          payment_due_days: parseInt(e.target.value) || 7
                        }
                      }))}
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Allow Partial Payments</Label>
                  <p className="text-sm text-muted-foreground">
                    Students can pay in installments
                  </p>
                </div>
                <Switch
                  checked={settings.payment_settings?.allow_partial_payments || false}
                  onCheckedChange={(checked) => setSettings(prev => ({
                    ...prev,
                    payment_settings: {
                      ...prev.payment_settings!,
                      allow_partial_payments: checked
                    }
                  }))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Student Permissions */}
        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Student Permissions
              </CardTitle>
              <CardDescription>
                Control what students can access and do in their portal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Require Profile Completion</Label>
                    <p className="text-sm text-muted-foreground">
                      Students must complete their profile on first login
                    </p>
                  </div>
                  <Switch
                    checked={settings.require_profile_completion}
                    onCheckedChange={() => handleToggle('require_profile_completion')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Enable Google Calendar Integration</Label>
                    <p className="text-sm text-muted-foreground">
                      Students can add sessions to their Google Calendar
                    </p>
                  </div>
                  <Switch
                    checked={settings.enable_google_calendar}
                    onCheckedChange={() => handleToggle('enable_google_calendar')}
                  />
                </div>

                <Separator />

                <Label>Student Portal Features</Label>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">View Grades & Progress</span>
                    <Switch
                      checked={settings.student_permissions.can_view_grades}
                      onCheckedChange={() => handlePermissionToggle('can_view_grades')}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Download Course Materials</span>
                    <Switch
                      checked={settings.student_permissions.can_download_materials}
                      onCheckedChange={() => handlePermissionToggle('can_download_materials')}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Submit Session Feedback</span>
                    <Switch
                      checked={settings.student_permissions.can_submit_feedback}
                      onCheckedChange={() => handlePermissionToggle('can_submit_feedback')}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Request Additional Sessions</span>
                    <Switch
                      checked={settings.student_permissions.can_request_sessions}
                      onCheckedChange={() => handlePermissionToggle('can_request_sessions')}
                    />
                  </div>
                </div>

                <Separator />

                <Label>Future Features</Label>
                
                <div className="space-y-3 opacity-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Homework Submission</span>
                      <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                    </div>
                    <Switch
                      checked={settings.enable_homework_submission}
                      disabled
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Direct Messaging</span>
                      <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                    </div>
                    <Switch
                      checked={settings.enable_messaging}
                      disabled
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Configure automated notifications for students
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Send Cancellation Emails</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify students when sessions are cancelled
                    </p>
                  </div>
                  <Switch
                    checked={settings.notification_settings?.send_cancellation_emails || false}
                    onCheckedChange={(checked) => setSettings(prev => ({
                      ...prev,
                      notification_settings: {
                        ...prev.notification_settings!,
                        send_cancellation_emails: checked
                      }
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Send Payment Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Remind students about upcoming payments
                    </p>
                  </div>
                  <Switch
                    checked={settings.notification_settings?.send_payment_reminders || false}
                    onCheckedChange={(checked) => setSettings(prev => ({
                      ...prev,
                      notification_settings: {
                        ...prev.notification_settings!,
                        send_payment_reminders: checked
                      }
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Send Session Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Remind students about upcoming sessions
                    </p>
                  </div>
                  <Switch
                    checked={settings.notification_settings?.send_session_reminders || false}
                    onCheckedChange={(checked) => setSettings(prev => ({
                      ...prev,
                      notification_settings: {
                        ...prev.notification_settings!,
                        send_session_reminders: checked
                      }
                    }))}
                  />
                </div>

                {settings.notification_settings?.send_session_reminders && (
                  <div className="space-y-2 pl-6">
                    <Label htmlFor="reminder-hours">Send Reminder Before Session</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="reminder-hours"
                        type="number"
                        min="1"
                        max="48"
                        value={settings.notification_settings?.reminder_hours_before || 24}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          notification_settings: {
                            ...prev.notification_settings!,
                            reminder_hours_before: parseInt(e.target.value) || 24
                          }
                        }))}
                        className="w-32"
                      />
                      <span className="text-sm text-muted-foreground">hours</span>
                    </div>
                  </div>
                )}
              </div>

              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  Email notifications are sent to the email address associated with each student's account
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Session Settings */}
        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Session Settings
              </CardTitle>
              <CardDescription>
                Configure default session parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Default Session Duration</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="duration"
                      type="number"
                      min="15"
                      max="240"
                      step="15"
                      value={settings.session_settings?.default_duration_minutes || 60}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        session_settings: {
                          ...prev.session_settings!,
                          default_duration_minutes: parseInt(e.target.value) || 60
                        }
                      }))}
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">minutes</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buffer">Buffer Time Between Sessions</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="buffer"
                      type="number"
                      min="0"
                      max="60"
                      step="5"
                      value={settings.session_settings?.buffer_time_minutes || 15}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        session_settings: {
                          ...prev.session_settings!,
                          buffer_time_minutes: parseInt(e.target.value) || 15
                        }
                      }))}
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">minutes</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label>Session Types</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span>Online Sessions</span>
                    </div>
                    <Switch
                      checked={settings.session_settings?.allow_online_sessions || true}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        session_settings: {
                          ...prev.session_settings!,
                          allow_online_sessions: checked
                        }
                      }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>In-Person Sessions</span>
                    </div>
                    <Switch
                      checked={settings.session_settings?.allow_in_person_sessions || false}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        session_settings: {
                          ...prev.session_settings!,
                          allow_in_person_sessions: checked
                        }
                      }))}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StudentPortalSettings;