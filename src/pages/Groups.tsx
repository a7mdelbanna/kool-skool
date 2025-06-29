
import React, { useState } from 'react';
import { UsersRound, Plus, Eye, Users, Calendar, DollarSign, Clock, GraduationCap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserContext } from '@/App';
import { useContext } from 'react';
import GroupDetailsDialog from '@/components/GroupDetailsDialog';
import CreateGroupDialog from '@/components/CreateGroupDialog';

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
  status: string;
  student_count: number;
  created_at: string;
}

const Groups = () => {
  const { user } = useContext(UserContext);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  // Fetch groups data
  const { data: groups, isLoading, error, refetch } = useQuery({
    queryKey: ['groups', user?.schoolId],
    queryFn: async () => {
      if (!user?.schoolId) {
        throw new Error('No school ID found');
      }

      const { data, error } = await supabase.rpc('get_school_groups', {
        p_school_id: user.schoolId
      });

      if (error) {
        console.error('Error fetching groups:', error);
        throw error;
      }

      return data as Group[];
    },
    enabled: !!user?.schoolId
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'completed':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatPrice = (group: Group) => {
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
            <h1 className="text-3xl font-bold text-gray-900">Groups</h1>
            <p className="text-gray-600 mt-1">Manage group lessons and subscriptions</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse rounded-2xl shadow-md">
              <CardHeader className="pb-4">
                <div className="h-6 bg-gray-200 rounded-lg w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mt-2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-10 bg-gray-200 rounded-lg mt-4"></div>
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
            <h1 className="text-3xl font-bold text-gray-900">Groups</h1>
            <p className="text-gray-600 mt-1">Manage group lessons and subscriptions</p>
          </div>
        </div>
        <Card className="rounded-2xl shadow-md">
          <CardContent className="p-8 text-center">
            <div className="text-red-600 font-medium">Error loading groups: {error.message}</div>
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
            <h1 className="text-3xl font-bold text-gray-900">Groups</h1>
            <p className="text-gray-600 mt-1">Manage group lessons and subscriptions</p>
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
        <Card className="rounded-2xl shadow-md border-0 bg-gradient-to-br from-gray-50 to-white">
          <CardContent className="p-12 text-center">
            <div className="h-20 w-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <UsersRound className="h-10 w-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">No Groups Yet</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
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
              className="rounded-2xl shadow-md border-0 bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden group"
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <CardTitle className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">
                      {group.name}
                    </CardTitle>
                    {group.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                        {group.description}
                      </p>
                    )}
                  </div>
                  <Badge 
                    className={`${getStatusColor(group.status)} font-semibold px-3 py-1 rounded-full text-xs border ml-3 flex-shrink-0`}
                  >
                    {group.status}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Teacher Info */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Teacher</p>
                    <p className="text-sm font-semibold text-gray-900 truncate">{group.teacher_name}</p>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Student Count */}
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl">
                    <div className="h-7 w-7 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Users className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-blue-900">{group.student_count}</p>
                      <p className="text-xs text-blue-600 font-medium">students</p>
                    </div>
                  </div>

                  {/* Session Count */}
                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl">
                    <div className="h-7 w-7 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Clock className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-green-900">{group.session_count}</p>
                      <p className="text-xs text-green-600 font-medium">sessions</p>
                    </div>
                  </div>
                </div>

                {/* Schedule */}
                <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-xl">
                  <div className="h-8 w-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Calendar className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-orange-600 uppercase tracking-wide mb-1">Schedule</p>
                    <p className="text-sm font-semibold text-orange-900 leading-relaxed">
                      {formatSchedule(group.schedule)}
                    </p>
                  </div>
                </div>

                {/* Pricing */}
                <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
                  <div className="h-8 w-8 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <DollarSign className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Price</p>
                    <p className="text-sm font-bold text-emerald-900">{formatPrice(group)}</p>
                  </div>
                </div>

                {/* Action Button */}
                <Button 
                  variant="outline" 
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group-hover:border-blue-400 font-medium"
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
