import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { databaseService } from '@/services/firebase/database.service';
import { BookOpen, Calendar, DollarSign, User, Loader2 } from 'lucide-react';

interface GroupStudent {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  status: string;
  start_date: string;
}

interface GroupSubscriptionsTabProps {
  groupId: string;
  groupStudents: GroupStudent[];
}

const GroupSubscriptionsTab: React.FC<GroupSubscriptionsTabProps> = ({
  groupId,
  groupStudents
}) => {
  // Fetch all subscriptions for students in this group
  const { data: subscriptionsData, isLoading } = useQuery({
    queryKey: ['group-subscriptions', groupId],
    queryFn: async () => {
      if (!groupStudents || groupStudents.length === 0) return [];

      const results = await Promise.all(
        groupStudents.map(async (student) => {
          try {
            // Get subscriptions from Supabase
            const { data, error } = await supabase.rpc('get_student_subscriptions', {
              p_student_id: student.student_id
            });

            if (error) {
              console.error(`Error fetching subscriptions for ${student.student_name}:`, error);
              return {
                studentId: student.student_id,
                studentName: student.student_name,
                subscriptions: []
              };
            }

            console.log(`📋 Subscriptions for ${student.student_name}:`, data);
            console.log(`📋 Total subscriptions found: ${data?.length || 0}`);

            // Filter to only show subscriptions for this group
            // Check both snake_case (group_id) and camelCase (groupId) field names
            const groupSubs = (data || []).filter(
              (sub: any) => {
                const subGroupId = sub.group_id || sub.groupId;
                console.log(`🔍 Checking subscription ${sub.id}:`);
                console.log(`   - group_id: ${sub.group_id}`);
                console.log(`   - groupId: ${sub.groupId}`);
                console.log(`   - subGroupId (combined): ${subGroupId}`);
                console.log(`   - Looking for: ${groupId}`);
                console.log(`   - Match: ${subGroupId === groupId}`);
                return subGroupId === groupId;
              }
            );

            console.log(`✅ Filtered group subscriptions for ${student.student_name}:`, groupSubs);
            console.log(`✅ Count: ${groupSubs.length}`);

            return {
              studentId: student.student_id,
              studentName: student.student_name,
              subscriptions: groupSubs
            };
          } catch (error) {
            console.error(`Error fetching subscriptions for ${student.student_name}:`, error);
            return {
              studentId: student.student_id,
              studentName: student.student_name,
              subscriptions: []
            };
          }
        })
      );

      return results;
    },
    enabled: !!groupId && !!groupStudents && groupStudents.length > 0
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'completed':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300 border-gray-200 dark:border-gray-700';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!subscriptionsData || subscriptionsData.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No Students</h3>
        <p className="text-muted-foreground">
          Add students to this group to see their subscriptions
        </p>
      </div>
    );
  }

  const hasAnySubscriptions = subscriptionsData.some(s => s.subscriptions.length > 0);

  if (!hasAnySubscriptions) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No Subscriptions Yet</h3>
        <p className="text-muted-foreground">
          Students in this group don't have any subscriptions yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {subscriptionsData.map(({ studentId, studentName, subscriptions }) => {
        if (subscriptions.length === 0) return null;

        return (
          <Card key={studentId}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {studentName}
                </CardTitle>
                <Badge
                  variant={subscriptions.some((s: any) => s.status === 'active') ? 'default' : 'secondary'}
                  className={subscriptions.some((s: any) => s.status === 'active') ? getStatusColor('active') : getStatusColor('inactive')}
                >
                  {subscriptions.some((s: any) => s.status === 'active') ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {subscriptions.map((sub: any, index: number) => (
                  <div key={sub.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-foreground">Subscription #{index + 1}</h4>
                        <p className="text-sm text-muted-foreground">
                          {sub.session_count} sessions
                        </p>
                      </div>
                      <Badge variant="outline" className={getStatusColor(sub.status || 'inactive')}>
                        {sub.status || 'inactive'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {formatDate(sub.start_date)}
                          {sub.end_date && ` - ${formatDate(sub.end_date)}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span>{sub.total_price} {sub.currency || 'USD'}</span>
                      </div>
                    </div>

                    {/* Progress */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">
                          {sub.sessions_completed || 0}/{sub.session_count}
                        </span>
                      </div>
                      <Progress
                        value={((sub.sessions_completed || 0) / sub.session_count) * 100}
                        className="h-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {Math.round(((sub.sessions_completed || 0) / sub.session_count) * 100)}% complete
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default GroupSubscriptionsTab;
