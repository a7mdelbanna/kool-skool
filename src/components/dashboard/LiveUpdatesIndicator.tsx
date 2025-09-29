import React, { useState, useEffect, useContext } from 'react';
import {
  Activity,
  Bell,
  Circle,
  DollarSign,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { UserContext } from '@/App';
import {
  realtimeDashboardService,
  RealtimeMetrics,
  RealtimeUpdate
} from '@/services/realtimeDashboard.service';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface LiveUpdate {
  id: string;
  type: string;
  message: string;
  timestamp: Date;
  icon: React.ElementType;
  color: string;
}

const LiveUpdatesIndicator: React.FC = () => {
  const { user } = useContext(UserContext);
  const [isConnected, setIsConnected] = useState(false);
  const [metrics, setMetrics] = useState<RealtimeMetrics | null>(null);
  const [recentUpdates, setRecentUpdates] = useState<LiveUpdate[]>([]);
  const [showPopover, setShowPopover] = useState(false);
  const [pulseAnimation, setPulseAnimation] = useState(false);

  useEffect(() => {
    if (!user?.schoolId) return;

    // Start listening to real-time updates
    realtimeDashboardService.startListening(user.schoolId);
    setIsConnected(true);

    // Subscribe to metrics updates
    const unsubscribeMetrics = realtimeDashboardService.onMetricsUpdate((newMetrics) => {
      setMetrics(newMetrics);
    });

    // Subscribe to event updates
    const unsubscribeEvents = realtimeDashboardService.onEventUpdate((update) => {
      handleRealtimeUpdate(update);
    });

    // Cleanup on unmount
    return () => {
      unsubscribeMetrics();
      unsubscribeEvents();
      realtimeDashboardService.stopListening();
      setIsConnected(false);
    };
  }, [user?.schoolId]);

  const handleRealtimeUpdate = (update: RealtimeUpdate) => {
    // Create a user-friendly message
    let message = '';
    let icon: React.ElementType = AlertCircle;
    let color = 'text-blue-500';

    switch (update.type) {
      case 'payment':
        if (update.action === 'added') {
          message = `New payment received: $${update.data.amount}`;
          icon = DollarSign;
          color = 'text-green-500';
          toast.success(message);
        } else if (update.action === 'modified') {
          message = `Payment updated: ${update.data.student_name}`;
          icon = DollarSign;
          color = 'text-yellow-500';
        }
        break;

      case 'session':
        if (update.action === 'added') {
          message = `New session scheduled: ${update.data.course_name}`;
          icon = Calendar;
          color = 'text-blue-500';
        } else if (update.action === 'modified') {
          message = `Session updated: ${update.data.course_name}`;
          icon = Calendar;
          color = 'text-yellow-500';
        }
        break;

      case 'student':
        if (update.action === 'added') {
          message = 'New student enrolled!';
          icon = Users;
          color = 'text-purple-500';
          toast.success(message);
        }
        break;

      case 'todo':
        if (update.action === 'added') {
          message = `New task: ${update.data.title}`;
          icon = CheckCircle;
          color = 'text-orange-500';
        } else if (update.action === 'modified' && update.data.status === 'completed') {
          message = `Task completed: ${update.data.title}`;
          icon = CheckCircle;
          color = 'text-green-500';
        }
        break;

      case 'attendance':
        message = `Attendance marked for ${update.data.student_name}`;
        icon = CheckCircle;
        color = 'text-green-500';
        break;
    }

    if (message) {
      const newUpdate: LiveUpdate = {
        id: `${update.type}-${Date.now()}`,
        type: update.type,
        message,
        timestamp: update.timestamp,
        icon,
        color
      };

      setRecentUpdates(prev => [newUpdate, ...prev.slice(0, 19)]);
      setPulseAnimation(true);
      setTimeout(() => setPulseAnimation(false), 1000);
    }
  };

  const formatMetricValue = (value: number | undefined, prefix = '') => {
    if (value === undefined) return '-';
    return `${prefix}${value.toLocaleString()}`;
  };

  return (
    <>
      {/* Live Connection Status Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <Wifi className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Live Updates Active</span>
                <Circle className="h-2 w-2 fill-green-500 text-green-500 animate-pulse" />
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-red-500" />
                <span className="text-xs text-muted-foreground">Disconnected</span>
              </>
            )}
          </div>

          {metrics && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <Badge variant="secondary" className="bg-white/5">
                ${formatMetricValue(metrics.todayRevenue)} today
              </Badge>
              <Badge variant="secondary" className="bg-white/5">
                {metrics.todaySessions} sessions
              </Badge>
              <Badge variant="secondary" className="bg-white/5">
                {metrics.activeStudents} students
              </Badge>
              {metrics.urgentTasks > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  {metrics.urgentTasks} urgent
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Recent Updates Popover */}
        <Popover open={showPopover} onOpenChange={setShowPopover}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "relative",
                pulseAnimation && "animate-pulse"
              )}
            >
              <Bell className="h-4 w-4" />
              {recentUpdates.length > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
                >
                  {recentUpdates.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96" align="end">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Live Updates</h4>
                {recentUpdates.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRecentUpdates([])}
                    className="text-xs"
                  >
                    Clear All
                  </Button>
                )}
              </div>

              <ScrollArea className="h-[300px]">
                {recentUpdates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No recent updates
                  </div>
                ) : (
                  <AnimatePresence>
                    <div className="space-y-2">
                      {recentUpdates.map((update) => (
                        <motion.div
                          key={update.id}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -100 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-start gap-3 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
                        >
                          <div className={cn("mt-0.5", update.color)}>
                            <update.icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground">
                              {update.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {format(update.timestamp, 'HH:mm:ss')}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </AnimatePresence>
                )}
              </ScrollArea>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Live Metrics Mini Cards */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          <Card className="glass-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Live Revenue</p>
                <p className="text-lg font-bold text-foreground">
                  ${formatMetricValue(metrics.todayRevenue)}
                </p>
              </div>
              <Activity className="h-4 w-4 text-green-500 animate-pulse" />
            </div>
          </Card>

          <Card className="glass-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Active Now</p>
                <p className="text-lg font-bold text-foreground">
                  {metrics.todaySessions}
                </p>
              </div>
              <Calendar className="h-4 w-4 text-blue-500" />
            </div>
          </Card>

          <Card className="glass-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Students</p>
                <p className="text-lg font-bold text-foreground">
                  {metrics.activeStudents}
                </p>
              </div>
              <Users className="h-4 w-4 text-purple-500" />
            </div>
          </Card>

          <Card className="glass-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Pending</p>
                <p className="text-lg font-bold text-foreground">
                  {metrics.pendingPayments}
                </p>
              </div>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </div>
          </Card>
        </div>
      )}
    </>
  );
};

export default LiveUpdatesIndicator;