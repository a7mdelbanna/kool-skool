import { useContext, useEffect, useState } from 'react';
import { UserContext } from '@/App';
import {
  messageStatisticsService,
  MessageStats,
  DateRange
} from '@/services/messageStatistics.service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart3,
  MessageSquare,
  Send,
  Download,
  TrendingUp,
  Clock,
  Users,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Separator } from '@/components/ui/separator';

export default function MessageStatistics() {
  const { user } = useContext(UserContext);
  const { toast } = useToast();
  const [stats, setStats] = useState<MessageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'today' | 'last7Days' | 'last30Days' | 'thisMonth' | 'lastMonth' | 'thisYear'>('last30Days');

  const COLORS = {
    primary: 'hsl(var(--primary))',
    secondary: 'hsl(var(--secondary))',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6'
  };

  useEffect(() => {
    if (user?.schoolId) {
      loadStatistics();
    }
  }, [user?.schoolId, dateRange]);

  const loadStatistics = async () => {
    if (!user?.schoolId) return;

    setLoading(true);
    try {
      const ranges = messageStatisticsService.getDateRanges();
      const selectedRange = ranges[dateRange];

      const fetchedStats = await messageStatisticsService.getStatistics(
        user.schoolId,
        selectedRange
      );

      setStats(fetchedStats);
    } catch (error) {
      console.error('Error loading statistics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load message statistics',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatHour = (hour: number) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}${ampm}`;
  };

  const getDateRangeLabel = () => {
    switch (dateRange) {
      case 'today': return 'Today';
      case 'last7Days': return 'Last 7 Days';
      case 'last30Days': return 'Last 30 Days';
      case 'thisMonth': return 'This Month';
      case 'lastMonth': return 'Last Month';
      case 'thisYear': return 'This Year';
      default: return 'Last 30 Days';
    }
  };

  if (!user?.schoolId) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Please log in to view message statistics.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Message Statistics</h1>
          <p className="text-muted-foreground mt-1">
            Analytics and insights for Telegram messaging
          </p>
        </div>
        <div className="flex gap-3">
          <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="last7Days">Last 7 Days</SelectItem>
              <SelectItem value="last30Days">Last 30 Days</SelectItem>
              <SelectItem value="thisMonth">This Month</SelectItem>
              <SelectItem value="lastMonth">Last Month</SelectItem>
              <SelectItem value="thisYear">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => loadStatistics()}>
            <Download className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading statistics...</p>
            </div>
          </CardContent>
        </Card>
      ) : stats ? (
        <>
          {/* Overview Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalMessages}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {getDateRangeLabel()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
                <Send className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.sentMessages}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  <ArrowUp className="h-3 w-3 inline mr-1" />
                  Outgoing
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Messages Received</CardTitle>
                <Download className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.receivedMessages}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  <ArrowDown className="h-3 w-3 inline mr-1" />
                  Incoming
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.responseRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg: {stats.averageResponseTime}min
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Messages Over Time */}
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Messages Over Time</CardTitle>
                <CardDescription>Daily message trends</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.messagesOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="sent"
                      stroke={COLORS.primary}
                      strokeWidth={2}
                      name="Sent"
                    />
                    <Line
                      type="monotone"
                      dataKey="received"
                      stroke={COLORS.success}
                      strokeWidth={2}
                      name="Received"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Message Types Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Message Types</CardTitle>
                <CardDescription>Distribution by type</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Text', value: stats.messagesByType.text },
                        { name: 'Commands', value: stats.messagesByType.command },
                        { name: 'Callbacks', value: stats.messagesByType.callback }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill={COLORS.primary} />
                      <Cell fill={COLORS.success} />
                      <Cell fill={COLORS.info} />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Peak Hours */}
            <Card>
              <CardHeader>
                <CardTitle>Peak Hours</CardTitle>
                <CardDescription>Messages by hour of day</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stats.peakHours}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="hour"
                      tickFormatter={formatHour}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      labelFormatter={formatHour}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                    />
                    <Bar dataKey="count" fill={COLORS.primary} name="Messages" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Students */}
          {stats.topStudents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Most Active Students</CardTitle>
                <CardDescription>Top students by message count</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.topStudents.map((student, index) => (
                    <div
                      key={student.studentId}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">
                            {student.studentName || `Student ${student.studentId.slice(0, 8)}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {student.messageCount} messages
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{student.messageCount}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Additional Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Key Metrics</CardTitle>
              <CardDescription>Detailed statistics breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Average Response Time</p>
                  </div>
                  <p className="text-2xl font-bold">
                    {stats.averageResponseTime} min
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Time to reply to incoming messages
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Response Rate</p>
                  </div>
                  <p className="text-2xl font-bold">
                    {stats.responseRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Percentage of messages responded to
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Active Conversations</p>
                  </div>
                  <p className="text-2xl font-bold">
                    {stats.topStudents.length}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Students with message history
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No statistics available</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
