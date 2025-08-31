import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import {
  Search,
  Filter,
  Download,
  Eye,
  RefreshCw,
  Trash2,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Phone,
  DollarSign,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  X,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Users,
  BarChart3
} from 'lucide-react';
import { format, isAfter, isBefore, subDays, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import {
  NotificationLog,
  NotificationLogFilters,
  NotificationLogStats,
  NotificationLogQuery
} from '@/types/notificationLog.types';
import { notificationLogsService } from '@/services/notificationLogs.service';
import { createSampleNotificationLogs } from '@/utils/sampleNotificationLogs';

interface NotificationLogsViewerProps {
  schoolId: string;
}

const NotificationLogsViewer: React.FC<NotificationLogsViewerProps> = ({ schoolId }) => {
  // State
  const [filters, setFilters] = useState<NotificationLogFilters>({});
  const [sortBy, setSortBy] = useState<keyof NotificationLog>('sentAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [selectedLog, setSelectedLog] = useState<NotificationLog | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(false);
  
  const queryClient = useQueryClient();

  // Date presets
  const datePresets = [
    { label: 'Today', getValue: () => ({ start: new Date(), end: new Date() }) },
    { label: 'Yesterday', getValue: () => ({ start: subDays(new Date(), 1), end: subDays(new Date(), 1) }) },
    { label: 'Last 7 days', getValue: () => ({ start: subDays(new Date(), 7), end: new Date() }) },
    { label: 'Last 30 days', getValue: () => ({ start: subDays(new Date(), 30), end: new Date() }) },
    { label: 'This month', getValue: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }) },
    { label: 'Last month', getValue: () => ({ start: startOfMonth(subMonths(new Date(), 1)), end: endOfMonth(subMonths(new Date(), 1)) }) },
    { label: 'This week', getValue: () => ({ start: startOfWeek(new Date()), end: endOfWeek(new Date()) }) }
  ];

  // Build query options
  const queryOptions: NotificationLogQuery = useMemo(() => ({
    filters: {
      ...filters,
      recipientSearch: searchTerm || undefined
    },
    sortBy,
    sortOrder,
    page,
    limit
  }), [filters, sortBy, sortOrder, page, limit, searchTerm]);

  // Fetch logs
  const { data: logsData, isLoading: logsLoading, error: logsError } = useQuery({
    queryKey: ['notification-logs', schoolId, queryOptions],
    queryFn: () => notificationLogsService.getLogs(schoolId, queryOptions),
    refetchInterval: isRealTimeEnabled ? 30000 : false, // Refresh every 30 seconds if real-time is enabled
  });

  // Fetch statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['notification-stats', schoolId, filters.dateRange],
    queryFn: () => notificationLogsService.getStats(schoolId, filters.dateRange),
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: () => notificationLogsService.exportToCSV(schoolId, filters),
    onSuccess: (csvContent) => {
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `notification-logs-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Logs exported successfully');
    },
    onError: (error) => {
      console.error('Export error:', error);
      toast.error('Failed to export logs');
    }
  });

  // Resend message mutation
  const resendMutation = useMutation({
    mutationFn: (logId: string) => notificationLogsService.resendMessage(logId),
    onSuccess: () => {
      toast.success('Message queued for resending');
      queryClient.invalidateQueries({ queryKey: ['notification-logs'] });
    },
    onError: (error) => {
      console.error('Resend error:', error);
      toast.error('Failed to resend message');
    }
  });

  // Delete old logs mutation (admin only)
  const deleteOldLogsMutation = useMutation({
    mutationFn: (days: number) => notificationLogsService.deleteOldLogs(schoolId, days),
    onSuccess: (deletedCount) => {
      toast.success(`Deleted ${deletedCount} old logs`);
      queryClient.invalidateQueries({ queryKey: ['notification-logs'] });
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast.error('Failed to delete old logs');
    }
  });

  // Create sample data mutation (development only)
  const createSampleDataMutation = useMutation({
    mutationFn: () => createSampleNotificationLogs(schoolId),
    onSuccess: () => {
      toast.success('Sample notification logs created');
      queryClient.invalidateQueries({ queryKey: ['notification-logs'] });
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
    },
    onError: (error) => {
      console.error('Sample data error:', error);
      toast.error('Failed to create sample data');
    }
  });

  // Handle filter changes
  const handleFilterChange = (key: keyof NotificationLogFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPage(1); // Reset to first page when filters change
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
    setPage(1);
  };

  // Handle sort
  const handleSort = (field: keyof NotificationLog) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: NotificationLog['status']) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return 'default';
      case 'read':
        return 'secondary';
      case 'failed':
        return 'destructive';
      case 'pending':
        return 'outline';
      default:
        return 'outline';
    }
  };

  // Get status icon
  const getStatusIcon = (status: NotificationLog['status']) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <CheckCircle className="h-3 w-3" />;
      case 'read':
        return <CheckCircle className="h-3 w-3 text-green-600" />;
      case 'failed':
        return <XCircle className="h-3 w-3" />;
      case 'pending':
        return <Clock className="h-3 w-3" />;
      default:
        return <AlertCircle className="h-3 w-3" />;
    }
  };

  // Get channel icon
  const getChannelIcon = (channel: NotificationLog['channel']) => {
    switch (channel) {
      case 'sms':
        return <MessageSquare className="h-3 w-3" />;
      case 'whatsapp':
        return <Phone className="h-3 w-3" />;
      default:
        return <MessageSquare className="h-3 w-3" />;
    }
  };

  const logs = logsData?.logs || [];
  const hasMore = logsData?.hasMore || false;

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Sent</p>
                  <p className="text-2xl font-bold">{stats.totalSent + stats.totalDelivered + stats.totalRead}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-full">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</p>
                </div>
                <div className="p-2 bg-green-100 rounded-full">
                  {stats.successRate >= 95 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Cost</p>
                  <p className="text-2xl font-bold">${stats.totalCost.toFixed(2)}</p>
                </div>
                <div className="p-2 bg-orange-100 rounded-full">
                  <DollarSign className="h-4 w-4 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Failed</p>
                  <p className="text-2xl font-bold">{stats.totalFailed}</p>
                </div>
                <div className="p-2 bg-red-100 rounded-full">
                  <XCircle className="h-4 w-4 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by recipient name or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="whitespace-nowrap"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters {Object.keys(filters).length > 0 && `(${Object.keys(filters).length})`}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => exportMutation.mutate()}
                disabled={exportMutation.isPending}
                className="whitespace-nowrap"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>

              <Button
                variant="outline"
                onClick={() => setIsRealTimeEnabled(!isRealTimeEnabled)}
                className={`whitespace-nowrap ${isRealTimeEnabled ? 'bg-green-50 border-green-200' : ''}`}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRealTimeEnabled ? 'animate-spin text-green-600' : ''}`} />
                Real-time {isRealTimeEnabled ? 'ON' : 'OFF'}
              </Button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <>
              <Separator className="my-4" />
              <div className="space-y-4">
                {/* Date Range */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Date Range</Label>
                    <div className="flex gap-2">
                      <Popover open={showDatePicker === 'start'} onOpenChange={(open) => setShowDatePicker(open ? 'start' : null)}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="justify-start">
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            {filters.dateRange?.start ? format(filters.dateRange.start, 'MMM dd') : 'Start'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={filters.dateRange?.start}
                            onSelect={(date) => {
                              if (date) {
                                handleFilterChange('dateRange', {
                                  start: date,
                                  end: filters.dateRange?.end || date
                                });
                              }
                              setShowDatePicker(null);
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                      
                      <Popover open={showDatePicker === 'end'} onOpenChange={(open) => setShowDatePicker(open ? 'end' : null)}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="justify-start">
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            {filters.dateRange?.end ? format(filters.dateRange.end, 'MMM dd') : 'End'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={filters.dateRange?.end}
                            onSelect={(date) => {
                              if (date) {
                                handleFilterChange('dateRange', {
                                  start: filters.dateRange?.start || date,
                                  end: date
                                });
                              }
                              setShowDatePicker(null);
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    {/* Date Presets */}
                    <div className="flex flex-wrap gap-1">
                      {datePresets.map((preset) => (
                        <Button
                          key={preset.label}
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => handleFilterChange('dateRange', preset.getValue())}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <div className="space-y-2">
                      {['sent', 'delivered', 'read', 'failed', 'pending'].map((status) => (
                        <div key={status} className="flex items-center space-x-2">
                          <Checkbox
                            id={`status-${status}`}
                            checked={filters.status?.includes(status as NotificationLog['status']) || false}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                handleFilterChange('status', [
                                  ...(filters.status || []),
                                  status as NotificationLog['status']
                                ]);
                              } else {
                                handleFilterChange('status', 
                                  filters.status?.filter(s => s !== status) || []
                                );
                              }
                            }}
                          />
                          <Label htmlFor={`status-${status}`} className="text-sm capitalize flex items-center gap-1">
                            {getStatusIcon(status as NotificationLog['status'])}
                            {status}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Type & Channel</Label>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Notification Type</Label>
                        <div className="space-y-1 mt-1">
                          {['lesson_reminder', 'payment_reminder', 'lesson_cancellation', 'custom'].map((type) => (
                            <div key={type} className="flex items-center space-x-2">
                              <Checkbox
                                id={`type-${type}`}
                                checked={filters.type?.includes(type as NotificationLog['notificationType']) || false}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    handleFilterChange('type', [
                                      ...(filters.type || []),
                                      type as NotificationLog['notificationType']
                                    ]);
                                  } else {
                                    handleFilterChange('type', 
                                      filters.type?.filter(t => t !== type) || []
                                    );
                                  }
                                }}
                              />
                              <Label htmlFor={`type-${type}`} className="text-xs capitalize">
                                {type.replace('_', ' ')}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Channel</Label>
                        <div className="space-y-1 mt-1">
                          {['sms', 'whatsapp'].map((channel) => (
                            <div key={channel} className="flex items-center space-x-2">
                              <Checkbox
                                id={`channel-${channel}`}
                                checked={filters.channel?.includes(channel as NotificationLog['channel']) || false}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    handleFilterChange('channel', [
                                      ...(filters.channel || []),
                                      channel as NotificationLog['channel']
                                    ]);
                                  } else {
                                    handleFilterChange('channel', 
                                      filters.channel?.filter(c => c !== channel) || []
                                    );
                                  }
                                }}
                              />
                              <Label htmlFor={`channel-${channel}`} className="text-xs capitalize flex items-center gap-1">
                                {getChannelIcon(channel as NotificationLog['channel'])}
                                {channel}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-2" />
                      Clear Filters
                    </Button>
                    
                    {process.env.NODE_ENV === 'development' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => createSampleDataMutation.mutate()}
                        disabled={createSampleDataMutation.isPending}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Create Sample Data
                      </Button>
                    )}
                  </div>
                  
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm('Delete logs older than 90 days? This action cannot be undone.')) {
                        deleteOldLogsMutation.mutate(90);
                      }
                    }}
                    disabled={deleteOldLogsMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Old Logs
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Notification Logs</CardTitle>
              <CardDescription>
                {logs.length} of {logs.length + (hasMore ? '+' : '')} logs
              </CardDescription>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['notification-logs'] })}
                disabled={logsLoading}
              >
                <RefreshCw className={`h-4 w-4 ${logsLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {logsError && (
            <div className="text-center py-8">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
              <p className="text-lg font-medium">Setting up notification logs...</p>
              <p className="text-sm text-muted-foreground mt-2">
                Firebase indexes are being created. This usually takes 1-2 minutes.
              </p>
              <p className="text-sm text-muted-foreground">
                Please refresh the page in a moment.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Page
              </Button>
            </div>
          )}

          {logsLoading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-8 w-8 mx-auto mb-2" />
              <p>No notification logs found</p>
              <p className="text-sm">Try adjusting your filters or date range</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('sentAt')}
                      >
                        Date/Time
                        {sortBy === 'sentAt' && (
                          <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('recipientName')}
                      >
                        Recipient
                        {sortBy === 'recipientName' && (
                          <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('notificationType')}
                      >
                        Type
                        {sortBy === 'notificationType' && (
                          <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('status')}
                      >
                        Status
                        {sortBy === 'status' && (
                          <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('cost')}
                      >
                        Cost
                        {sortBy === 'cost' && (
                          <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </TableHead>
                      <TableHead>Message Preview</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-muted/50">
                        <TableCell className="font-mono text-sm">
                          {format(log.sentAt, 'MMM dd, HH:mm')}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{log.recipientName}</div>
                            <div className="text-sm text-muted-foreground capitalize">{log.recipientType}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{log.recipientPhone}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize">
                            {log.notificationType.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {getChannelIcon(log.channel)}
                            <span className="text-sm capitalize">{log.channel}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(log.status)} className="flex items-center gap-1 w-fit">
                            {getStatusIcon(log.status)}
                            <span className="capitalize">{log.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.cost ? `$${log.cost.toFixed(4)}` : '—'}
                        </TableCell>
                        <TableCell className="max-w-48">
                          <div className="truncate text-sm">{log.messagePreview}</div>
                          {log.templateName && (
                            <div className="text-xs text-muted-foreground truncate">{log.templateName}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedLog(log)}
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {log.status === 'failed' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => resendMutation.mutate(log.id)}
                                disabled={resendMutation.isPending}
                                className="h-8 w-8 p-0"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-muted-foreground">
                  Page {page} {hasMore && 'of many'}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={!hasMore}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Log Detail Modal */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Notification Details
            </DialogTitle>
            <DialogDescription>
              Sent on {selectedLog && format(selectedLog.sentAt, 'PPP p')}
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-6">
              {/* Status and Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">
                    <Badge variant={getStatusBadgeVariant(selectedLog.status)} className="flex items-center gap-1 w-fit">
                      {getStatusIcon(selectedLog.status)}
                      <span className="capitalize">{selectedLog.status}</span>
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Channel</Label>
                  <div className="mt-1 flex items-center gap-1">
                    {getChannelIcon(selectedLog.channel)}
                    <span className="text-sm capitalize">{selectedLog.channel}</span>
                  </div>
                </div>
              </div>

              {/* Recipient Info */}
              <div>
                <Label className="text-sm font-medium">Recipient</Label>
                <div className="mt-1 p-3 bg-muted rounded-md">
                  <div className="font-medium">{selectedLog.recipientName}</div>
                  <div className="text-sm text-muted-foreground">{selectedLog.recipientPhone}</div>
                  <div className="text-sm text-muted-foreground capitalize">{selectedLog.recipientType}</div>
                </div>
              </div>

              {/* Message */}
              <div>
                <Label className="text-sm font-medium">Message</Label>
                <div className="mt-1 p-3 bg-muted rounded-md">
                  <p className="text-sm whitespace-pre-wrap">{selectedLog.message}</p>
                </div>
              </div>

              {/* Template Info */}
              {selectedLog.templateName && (
                <div>
                  <Label className="text-sm font-medium">Template</Label>
                  <div className="mt-1 text-sm text-muted-foreground">{selectedLog.templateName}</div>
                </div>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium">Sent At</Label>
                  <div className="mt-1 text-sm">{format(selectedLog.sentAt, 'PPP p')}</div>
                </div>
                
                {selectedLog.deliveredAt && (
                  <div>
                    <Label className="text-sm font-medium">Delivered At</Label>
                    <div className="mt-1 text-sm">{format(selectedLog.deliveredAt, 'PPP p')}</div>
                  </div>
                )}
                
                {selectedLog.readAt && (
                  <div>
                    <Label className="text-sm font-medium">Read At</Label>
                    <div className="mt-1 text-sm">{format(selectedLog.readAt, 'PPP p')}</div>
                  </div>
                )}
              </div>

              {/* Cost and Technical Details */}
              <div className="grid grid-cols-2 gap-4">
                {selectedLog.cost && (
                  <div>
                    <Label className="text-sm font-medium">Cost</Label>
                    <div className="mt-1 text-sm font-mono">${selectedLog.cost.toFixed(4)}</div>
                  </div>
                )}
                
                {selectedLog.messageId && (
                  <div>
                    <Label className="text-sm font-medium">Message ID</Label>
                    <div className="mt-1 text-sm font-mono">{selectedLog.messageId}</div>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {selectedLog.errorMessage && (
                <div>
                  <Label className="text-sm font-medium text-destructive">Error</Label>
                  <div className="mt-1 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-sm text-destructive">{selectedLog.errorMessage}</p>
                  </div>
                </div>
              )}

              {/* Retry Count */}
              {selectedLog.retryCount > 0 && (
                <div>
                  <Label className="text-sm font-medium">Retry Count</Label>
                  <div className="mt-1 text-sm">{selectedLog.retryCount}</div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2">
                {selectedLog.status === 'failed' && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      resendMutation.mutate(selectedLog.id);
                      setSelectedLog(null);
                    }}
                    disabled={resendMutation.isPending}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Resend
                  </Button>
                )}
                <Button onClick={() => setSelectedLog(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotificationLogsViewer;