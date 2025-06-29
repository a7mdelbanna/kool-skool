
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Users, Calendar, DollarSign, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreateGroupModal } from './CreateGroupModal';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Group {
  id: string;
  name: string;
  description: string;
  teacher_id: string;
  teacher_name: string;
  session_count: number;
  schedule: any[];
  currency: string;
  price_mode: string;
  price_per_session: number;
  total_price: number;
  status: string;
  student_count: number;
  created_at: string;
}

export function GroupsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { user } = useAuth();

  const { data: groups = [], isLoading, refetch } = useQuery({
    queryKey: ['groups', user?.school_id],
    queryFn: async () => {
      if (!user?.school_id) return [];
      
      const { data, error } = await supabase.rpc('get_school_groups', {
        p_school_id: user.school_id
      });
      
      if (error) throw error;
      return data as Group[];
    },
    enabled: !!user?.school_id
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatSchedule = (schedule: any[]) => {
    if (!schedule || schedule.length === 0) return 'No schedule';
    
    return schedule.map((item: any) => 
      `${item.day} at ${item.time}`
    ).join(', ');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading groups...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Groups</h1>
          <p className="text-gray-600 mt-1">Manage group lessons and classes</p>
        </div>
        <Button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No groups yet</h3>
            <p className="text-gray-600 text-center mb-4">
              Create your first group to start organizing group lessons for your students.
            </p>
            <Button 
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <Card key={group.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold mb-1">
                      {group.name}
                    </CardTitle>
                    {group.description && (
                      <p className="text-sm text-gray-600 mb-2">
                        {group.description}
                      </p>
                    )}
                  </div>
                  <Badge className={getStatusColor(group.status)}>
                    {group.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <User className="h-4 w-4 mr-2" />
                  <span>{group.teacher_name}</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="h-4 w-4 mr-2" />
                  <span>{group.student_count} students</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>{group.session_count} sessions</span>
                </div>
                
                <div className="text-sm text-gray-600">
                  <strong>Schedule:</strong> {formatSchedule(group.schedule)}
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <DollarSign className="h-4 w-4 mr-2" />
                  <span>
                    {group.price_mode === 'perSession' 
                      ? `${group.price_per_session} ${group.currency}/session`
                      : `${group.total_price} ${group.currency} total`
                    }
                  </span>
                </div>
                
                <div className="pt-2 border-t">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => {
                      // TODO: Navigate to group details page
                      console.log('View group details:', group.id);
                    }}
                  >
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateGroupModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          refetch();
          setIsCreateModalOpen(false);
        }}
      />
    </div>
  );
}
