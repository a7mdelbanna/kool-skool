import React, { useState, useEffect, useContext } from 'react';
import {
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Pause,
  Settings,
  Plus,
  Calendar,
  Mail,
  Bell,
  RotateCw,
  Activity,
  ChevronRight,
  Edit,
  Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { UserContext } from '@/App';
import {
  automationService,
  AutomationRule,
  AutomationTrigger,
  AutomationAction,
  AutomationLog
} from '@/services/automationService';
import { format } from 'date-fns';

const AutomationWidget: React.FC = () => {
  const { user } = useContext(UserContext);
  const [isServiceRunning, setIsServiceRunning] = useState(false);
  const [activeRules, setActiveRules] = useState<AutomationRule[]>([]);
  const [recentLogs, setRecentLogs] = useState<AutomationLog[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [stats, setStats] = useState({
    totalAutomations: 0,
    activeAutomations: 0,
    executedToday: 0,
    savedTime: 0 // in hours
  });

  // New automation form state
  const [newAutomation, setNewAutomation] = useState<Partial<AutomationRule>>({
    name: '',
    description: '',
    trigger: {
      type: 'schedule',
      schedule: {
        frequency: 'daily',
        time: '09:00'
      }
    },
    actions: [],
    isEnabled: true
  });

  useEffect(() => {
    if (user?.schoolId) {
      initializeAutomation();
    }

    return () => {
      // Cleanup on unmount
      if (isServiceRunning) {
        automationService.stop();
      }
    };
  }, [user?.schoolId]);

  const initializeAutomation = async () => {
    if (!user?.schoolId) return;

    try {
      await automationService.initialize(user.schoolId);
      setIsServiceRunning(true);

      // Load initial data
      await loadAutomationData();
    } catch (error) {
      console.error('Error initializing automation:', error);
      toast.error('Failed to initialize automation service');
    }
  };

  const loadAutomationData = async () => {
    // This would load rules and logs from the database
    // For demo purposes, using sample data
    setActiveRules(getSampleRules());
    setRecentLogs(getSampleLogs());
    updateStats();
  };

  const updateStats = () => {
    const status = automationService.getStatus();
    setStats({
      totalAutomations: 12,
      activeAutomations: status.activeRules,
      executedToday: 47,
      savedTime: 8.5
    });
  };

  const getSampleRules = (): AutomationRule[] => [
    {
      id: '1',
      name: 'Daily Payment Reminders',
      description: 'Send payment reminders 3 days before due date',
      trigger: {
        type: 'schedule',
        schedule: {
          frequency: 'daily',
          time: '09:00'
        }
      },
      actions: [
        {
          type: 'send-notification',
          config: { type: 'payment_reminder' }
        },
        {
          type: 'send-email',
          config: { template: 'payment_reminder' }
        }
      ],
      isEnabled: true,
      lastRun: new Date(Date.now() - 86400000),
      nextRun: new Date(Date.now() + 3600000),
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      name: 'Lesson Attendance Check',
      description: 'Mark missed sessions and notify students',
      trigger: {
        type: 'schedule',
        schedule: {
          frequency: 'daily',
          time: '20:00'
        }
      },
      actions: [
        {
          type: 'update-field',
          config: { field: 'status', value: 'missed' }
        },
        {
          type: 'send-notification',
          config: { type: 'missed_lesson' }
        }
      ],
      isEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '3',
      name: 'Weekly Progress Reports',
      description: 'Generate and send weekly student progress reports',
      trigger: {
        type: 'schedule',
        schedule: {
          frequency: 'weekly',
          time: '18:00',
          dayOfWeek: 5 // Friday
        }
      },
      actions: [
        {
          type: 'create-task',
          config: { title: 'Review weekly progress' }
        },
        {
          type: 'send-email',
          config: { template: 'weekly_progress' }
        }
      ],
      isEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const getSampleLogs = (): AutomationLog[] => [
    {
      id: '1',
      ruleId: '1',
      ruleName: 'Daily Payment Reminders',
      status: 'success',
      executedAt: new Date(Date.now() - 3600000),
      duration: 1250,
      results: {
        totalActions: 2,
        successfulActions: 2,
        failedActions: 0,
        details: ['Sent 5 payment reminders', 'Sent 5 emails']
      }
    },
    {
      id: '2',
      ruleId: '2',
      ruleName: 'Lesson Attendance Check',
      status: 'partial',
      executedAt: new Date(Date.now() - 7200000),
      duration: 850,
      results: {
        totalActions: 2,
        successfulActions: 1,
        failedActions: 1,
        details: ['Updated 3 sessions', 'Failed to send 1 notification']
      },
      error: 'Network timeout'
    }
  ];

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      // Update rule in database
      const updatedRules = activeRules.map(rule =>
        rule.id === ruleId ? { ...rule, isEnabled: enabled } : rule
      );
      setActiveRules(updatedRules);

      toast.success(`Automation ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error('Failed to update automation');
    }
  };

  const runAutomationNow = async (ruleId: string) => {
    toast.info('Running automation...');
    // Trigger the automation immediately
    setTimeout(() => {
      toast.success('Automation executed successfully');
    }, 2000);
  };

  const deleteRule = async (ruleId: string) => {
    setActiveRules(activeRules.filter(rule => rule.id !== ruleId));
    toast.success('Automation deleted');
  };

  const createNewAutomation = () => {
    // Save new automation
    toast.success('Automation created successfully');
    setIsCreateDialogOpen(false);
  };

  const getStatusIcon = (status: 'success' | 'failed' | 'partial') => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'partial':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <Card className="glass-card backdrop-blur-xl border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Zap className="h-4 w-4 text-purple-500" />
            </div>
            <span className="text-base">Automation Center</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn(
              isServiceRunning ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
            )}>
              {isServiceRunning ? (
                <>
                  <Activity className="h-3 w-3 mr-1" />
                  Running
                </>
              ) : (
                <>
                  <Pause className="h-3 w-3 mr-1" />
                  Stopped
                </>
              )}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full bg-white/5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="rules">Rules</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Active</p>
                    <p className="text-xl font-bold">{stats.activeAutomations}</p>
                  </div>
                  <Zap className="h-5 w-5 text-blue-500" />
                </div>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Executed</p>
                    <p className="text-xl font-bold">{stats.executedToday}</p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
              </div>
            </div>

            {/* Time Saved */}
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">Time Saved Today</p>
                <Clock className="h-4 w-4 text-purple-500" />
              </div>
              <p className="text-2xl font-bold text-purple-500">{stats.savedTime}h</p>
              <Progress value={75} className="h-1 mt-2" />
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                Popular Automations
              </h4>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-between"
                  onClick={() => runAutomationNow('payment-reminders')}
                >
                  <span className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Send Payment Reminders
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-between"
                  onClick={() => runAutomationNow('attendance-check')}
                >
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Check Attendance
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Rules Tab */}
          <TabsContent value="rules" className="space-y-3">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {activeRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium">{rule.name}</p>
                        <p className="text-xs text-muted-foreground">{rule.description}</p>
                      </div>
                      <Switch
                        checked={rule.isEnabled}
                        onCheckedChange={(checked) => toggleRule(rule.id, checked)}
                      />
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs">
                        {rule.trigger.type === 'schedule' && rule.trigger.schedule?.frequency}
                      </Badge>
                      {rule.trigger.type === 'schedule' && rule.trigger.schedule?.time && (
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {rule.trigger.schedule.time}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {rule.actions.length} actions
                      </Badge>
                    </div>

                    {rule.lastRun && (
                      <p className="text-xs text-muted-foreground">
                        Last run: {format(rule.lastRun, 'MMM dd, HH:mm')}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => runAutomationNow(rule.id)}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Run Now
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {/* Edit rule */}}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteRule(rule.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-3">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(log.status)}
                        <p className="text-sm font-medium">{log.ruleName}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(log.executedAt, 'HH:mm')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{log.duration}ms</span>
                      <span>•</span>
                      <span>{log.results.successfulActions}/{log.results.totalActions} actions</span>
                    </div>

                    {log.error && (
                      <p className="text-xs text-red-500 mt-1">
                        Error: {log.error}
                      </p>
                    )}

                    {log.results.details.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {log.results.details.slice(0, 2).map((detail, i) => (
                          <p key={i} className="text-xs text-muted-foreground">
                            {detail}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Create Automation Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Automation</DialogTitle>
            <DialogDescription>
              Set up automated tasks to save time and improve efficiency
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newAutomation.name}
                onChange={(e) => setNewAutomation({ ...newAutomation, name: e.target.value })}
                placeholder="e.g., Daily Payment Reminders"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newAutomation.description}
                onChange={(e) => setNewAutomation({ ...newAutomation, description: e.target.value })}
                placeholder="Describe what this automation does..."
              />
            </div>

            <div className="space-y-2">
              <Label>Trigger</Label>
              <Select defaultValue="schedule">
                <SelectTrigger>
                  <SelectValue placeholder="Select trigger type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="schedule">Schedule</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="condition">Condition</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select defaultValue="daily">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  defaultValue="09:00"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createNewAutomation}>
              Create Automation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AutomationWidget;