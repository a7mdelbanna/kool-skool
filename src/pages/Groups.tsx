import React, { useState } from 'react';
import { UsersRound, Plus, Eye, Users, Calendar, DollarSign, Clock, GraduationCap, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { databaseService } from '@/services/firebase/database.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { UserContext } from '@/App';
import { useContext } from 'react';
import GroupDetailsDialog from '@/components/GroupDetailsDialog';
import CreateGroupDialog from '@/components/CreateGroupDialog';
import { toast } from 'sonner';

interface Group {
  id: string;
  name: string;
  description: string;
  teacher_id: string;
  teacher_name: string;
  session_count: number;
  schedule: any;
  currency: string;
  price_mode: string;
  price_per_session: number;
  total_price: number;
  prices_by_currency?: { [currencyCode: string]: { per_session: number; total: number; symbol?: string } };
  status: string;
  student_count: number;
  created_at: string;
}

const Groups = () => {
  const { user } = useContext(UserContext);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);

  // Fetch school currencies from Firebase
  const { data: currencies } = useQuery({
    queryKey: ['currencies', user?.schoolId],
    queryFn: async () => {
      if (!user?.schoolId) return [];

      try {
        const data = await databaseService.query('currencies', {
          where: [{ field: 'school_id', operator: '==', value: user.schoolId }]
        });

        return data || [];
      } catch (error) {
        console.error('Error fetching currencies:', error);
        return [];
      }
    },
    enabled: !!user?.schoolId
  });

  // Fetch groups data
  const { data: groups, isLoading, error, refetch } = useQuery({
    queryKey: ['groups', user?.schoolId, currencies],
    queryFn: async () => {
      if (!user?.schoolId) {
        throw new Error('No school ID found');
      }

      // Fetch groups from Firebase
      const groups = await databaseService.query('groups', {
        where: [{ field: 'schoolId', operator: '==', value: user.schoolId }]
      });

      // Get unique teacher IDs
      const teacherIds = [...new Set(groups.map((g: any) => g.teacher_id).filter(Boolean))];

      // Fetch teacher details
      const teachers = await Promise.all(
        teacherIds.map(async (teacherId) => {
          try {
            const teacher = await databaseService.getById('users', teacherId);
            return teacher;
          } catch (error) {
            console.error(`Error fetching teacher ${teacherId}:`, error);
            return null;
          }
        })
      );

      // Create teacher map for quick lookup
      const teacherMap = new Map();
      teachers.forEach(teacher => {
        if (teacher) {
          const teacherName = `${teacher.firstName || teacher.first_name || ''} ${teacher.lastName || teacher.last_name || ''}`.trim() || 'Unknown Teacher';
          teacherMap.set(teacher.id, teacherName);
        }
      });

      // Create currency map for symbol lookup
      const currencyMap = new Map();
      if (currencies && currencies.length > 0) {
        currencies.forEach((currency: any) => {
          currencyMap.set(currency.code, currency.symbol);
        });
      }

      // Enrich groups with student count, teacher names, and currency symbols
      const enrichedGroups = await Promise.all(groups.map(async (group: any) => {
        const students = await databaseService.query(`groups/${group.id}/students`, {});
        const teacherName = group.teacher_id ? teacherMap.get(group.teacher_id) || 'Unknown Teacher' : 'No Teacher Assigned';

        // Enrich prices_by_currency with currency symbols
        let enrichedPrices = group.prices_by_currency || group.pricesByCurrency || {};
        console.log(`Group ${group.name} prices_by_currency:`, enrichedPrices);

        if (enrichedPrices && typeof enrichedPrices === 'object' && Object.keys(enrichedPrices).length > 0) {
          enrichedPrices = Object.keys(enrichedPrices).reduce((acc: any, code: string) => {
            acc[code] = {
              ...enrichedPrices[code],
              symbol: currencyMap.get(code) || '$'
            };
            return acc;
          }, {});
        }

        const enrichedGroup = {
          ...group,
          teacher_name: teacherName,
          student_count: students.length,
          students_count: students.length,
          prices_by_currency: enrichedPrices
        };

        console.log(`Enriched group ${group.name}:`, enrichedGroup);
        return enrichedGroup;
      }));

      return enrichedGroups as Group[];
    },
    enabled: !!user?.schoolId && !!currencies
  });

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!user?.schoolId || !user?.id) {
      toast.error('Authentication required to delete group');
      return;
    }

    setDeletingGroupId(groupId);

    try {
      console.log(`Starting cascade deletion for group: ${groupName} (${groupId})`);

      // Step 1: Find all subscriptions for this group
      const subscriptions = await databaseService.query('subscriptions', {
        where: [{ field: 'group_id', operator: '==', value: groupId }]
      });

      console.log(`Found ${subscriptions.length} subscriptions to delete`);

      // Step 2: Delete all payments/transactions linked to these subscriptions
      if (subscriptions.length > 0) {
        const subscriptionIds = subscriptions.map((sub: any) => sub.id);

        for (const subId of subscriptionIds) {
          // Query payments for this subscription
          const payments = await databaseService.query('payments', {
            where: [{ field: 'subscription_id', operator: '==', value: subId }]
          });

          console.log(`Found ${payments.length} payments for subscription ${subId}`);

          // Delete each payment
          for (const payment of payments) {
            await databaseService.delete('payments', payment.id);
            console.log(`Deleted payment ${payment.id}`);
          }
        }
      }

      // Step 3: Delete all subscriptions for this group
      for (const subscription of subscriptions) {
        await databaseService.delete('subscriptions', subscription.id);
        console.log(`Deleted subscription ${subscription.id}`);
      }

      // Step 4: Delete all sessions for this group
      const sessions = await databaseService.query('sessions', {
        where: [{ field: 'group_id', operator: '==', value: groupId }]
      });

      console.log(`Found ${sessions.length} sessions to delete`);

      for (const session of sessions) {
        await databaseService.delete('sessions', session.id);
        console.log(`Deleted session ${session.id}`);
      }

      // Step 5: Delete all students in the group's subcollection
      const groupStudents = await databaseService.query(`groups/${groupId}/students`, {});
      console.log(`Found ${groupStudents.length} students in group subcollection`);

      for (const student of groupStudents) {
        await databaseService.delete(`groups/${groupId}/students`, student.id);
        console.log(`Deleted student ${student.id} from group subcollection`);
      }

      // Step 6: Finally, delete the group itself
      await databaseService.delete('groups', groupId);

      console.log(`Successfully deleted group "${groupName}" and all related data`);

      toast.success(
        `Group "${groupName}" deleted successfully`,
        {
          description: `Deleted ${subscriptions.length} subscriptions, ${sessions.length} sessions, and all related payments`
        }
      );

      // Refresh the groups list
      refetch();

    } catch (error) {
      console.error('Error deleting group:', error);

      toast.error(
        error instanceof Error
          ? `Error deleting group: ${error.message}`
          : 'An unexpected error occurred while deleting the group'
      );
    } finally {
      setDeletingGroupId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300 border-gray-200 dark:border-gray-700';
      case 'completed':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  const formatPrice = (group: Group) => {
    // Check if group has multi-currency pricing
    if (group.prices_by_currency && Object.keys(group.prices_by_currency).length > 0) {
      const pricesArray = Object.entries(group.prices_by_currency)
        .filter(([_, priceData]) => {
          const price = group.price_mode === 'perSession' ? priceData.per_session : priceData.total;
          return price && parseFloat(String(price)) > 0;
        })
        .map(([code, priceData]) => {
          const price = group.price_mode === 'perSession' ? priceData.per_session : priceData.total;
          const symbol = priceData.symbol || code;
          if (group.price_mode === 'perSession') {
            return `${price} ${symbol}/session`;
          } else {
            return `${price} ${symbol} total`;
          }
        });

      return pricesArray.length > 0 ? pricesArray.join(' • ') : 'No price set';
    }

    // Fallback to old single-currency format
    if (group.price_mode === 'perSession') {
      return `${group.price_per_session} ${group.currency}/session`;
    } else {
      return `${group.total_price} ${group.currency} total`;
    }
  };

  const formatSchedule = (schedule: any) => {
    if (!schedule || !Array.isArray(schedule)) return 'No schedule';
    
    return schedule.map((item: any) => 
      `${item.day} ${item.time}`
    ).join(', ');
  };

  const handleViewDetails = (group: Group) => {
    setSelectedGroup(group);
    setShowGroupDetails(true);
  };

  const handleCreateSuccess = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <UsersRound className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Groups</h1>
            <p className="text-muted-foreground mt-1">Manage group lessons and subscriptions</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse rounded-2xl shadow-md">
              <CardHeader className="pb-4">
                <div className="h-6 bg-muted rounded-lg w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                  <div className="h-10 bg-muted rounded-lg mt-4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <UsersRound className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Groups</h1>
            <p className="text-muted-foreground mt-1">Manage group lessons and subscriptions</p>
          </div>
        </div>
        <Card className="rounded-2xl shadow-md border bg-card">
          <CardContent className="p-8 text-center">
            <div className="text-destructive font-medium">Error loading groups: {error.message}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <UsersRound className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Groups</h1>
            <p className="text-muted-foreground mt-1">Manage group lessons and subscriptions</p>
          </div>
        </div>
        <Button 
          className="flex items-center gap-2 px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
          onClick={() => setShowCreateGroup(true)}
        >
          <Plus className="h-4 w-4" />
          Create Group
        </Button>
      </div>

      {/* Groups List */}
      {!groups || groups.length === 0 ? (
        <Card className="rounded-2xl shadow-md border bg-card">
          <CardContent className="p-12 text-center">
            <div className="h-20 w-20 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <UsersRound className="h-10 w-10 text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold mb-3">No Groups Yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Create your first group to start managing group lessons and subscriptions.
            </p>
            <Button
              className="flex items-center gap-2 px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
              onClick={() => setShowCreateGroup(true)}
            >
              <Plus className="h-4 w-4" />
              Create Your First Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <Card
              key={group.id}
              className="rounded-2xl shadow-sm border border-border bg-card hover:shadow-lg hover:border-primary/20 transition-all duration-300 overflow-hidden"
            >
              <CardHeader className="pb-4 border-b border-border">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-xl font-bold text-foreground truncate">
                        {group.name}
                      </CardTitle>
                      <Badge
                        className={`${getStatusColor(group.status)} font-medium px-2.5 py-0.5 rounded-md text-xs border flex-shrink-0`}
                      >
                        {group.status}
                      </Badge>
                    </div>
                    {group.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {group.description}
                      </p>
                    )}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-1.5 h-auto flex-shrink-0"
                        disabled={deletingGroupId === group.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Group</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{group.name}"? This will also delete all subscriptions, sessions, and payments for students in this group. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteGroup(group.id, group.name)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete Group
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-3">
                {/* Teacher Info */}
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Teacher</p>
                    <p className="text-sm font-medium text-foreground truncate">{group.teacher_name}</p>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-3 py-2">
                  {/* Student Count */}
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-lg font-semibold text-foreground">{group.student_count}</p>
                      <p className="text-xs text-muted-foreground">students</p>
                    </div>
                  </div>

                  {/* Session Count */}
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-lg font-semibold text-foreground">{group.session_count}</p>
                      <p className="text-xs text-muted-foreground">sessions</p>
                    </div>
                  </div>
                </div>

                {/* Schedule */}
                <div className="flex items-start gap-3 pt-2 border-t border-border">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground mb-0.5">Schedule</p>
                    <p className="text-sm font-medium text-foreground leading-relaxed">
                      {formatSchedule(group.schedule)}
                    </p>
                  </div>
                </div>

                {/* Pricing */}
                <div className="flex items-start gap-3 pt-2 border-t border-border">
                  <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground mb-0.5">Price</p>
                    <p className="text-sm font-semibold text-foreground">{formatPrice(group)}</p>
                  </div>
                </div>

                {/* Action Button */}
                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2 mt-4 rounded-xl hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                  onClick={() => handleViewDetails(group)}
                >
                  <Eye className="h-4 w-4" />
                  View Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Group Details Dialog */}
      <GroupDetailsDialog
        group={selectedGroup}
        open={showGroupDetails}
        onOpenChange={setShowGroupDetails}
      />

      {/* Create Group Dialog */}
      <CreateGroupDialog
        open={showCreateGroup}
        onOpenChange={setShowCreateGroup}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
};

export default Groups;
