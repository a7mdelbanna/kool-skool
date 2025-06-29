
import React, { useState } from 'react';
import { UsersRound, Plus, Eye, Users, Calendar, DollarSign } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserContext } from '@/App';
import { useContext } from 'react';

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

  // Fetch groups data
  const { data: groups, isLoading, error } = useQuery({
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
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <UsersRound className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
            <p className="text-gray-600">Manage group lessons and subscriptions</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
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
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <UsersRound className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
            <p className="text-gray-600">Manage group lessons and subscriptions</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-red-600">Error loading groups: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <UsersRound className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
            <p className="text-gray-600">Manage group lessons and subscriptions</p>
          </div>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Group
        </Button>
      </div>

      {/* Groups List */}
      {!groups || groups.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <UsersRound className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Groups Yet</h2>
            <p className="text-gray-600 mb-4">
              Create your first group to start managing group lessons and subscriptions.
            </p>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <Card key={group.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                  </div>
                  <Badge className={getStatusColor(group.status)}>
                    {group.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Teacher Info */}
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span>Teacher: {group.teacher_name}</span>
                </div>

                {/* Student Count */}
                <div className="flex items-center gap-2 text-sm">
                  <UsersRound className="h-4 w-4 text-gray-400" />
                  <span>{group.student_count} students</span>
                </div>

                {/* Schedule */}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="truncate">{formatSchedule(group.schedule)}</span>
                </div>

                {/* Pricing */}
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <span>{formatPrice(group)}</span>
                </div>

                {/* Session Count */}
                <div className="text-sm text-gray-600">
                  {group.session_count} sessions total
                </div>

                {/* Action Button */}
                <Button 
                  variant="outline" 
                  className="w-full flex items-center gap-2"
                  onClick={() => setSelectedGroup(group)}
                >
                  <Eye className="h-4 w-4" />
                  View Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Groups;
