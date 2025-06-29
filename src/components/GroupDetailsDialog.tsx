
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Users, Calendar, DollarSign, Clock, Plus, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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

interface GroupStudent {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  status: string;
  start_date: string;
}

interface GroupDetailsDialogProps {
  group: Group | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GroupDetailsDialog = ({ group, open, onOpenChange }: GroupDetailsDialogProps) => {
  const [showAddStudent, setShowAddStudent] = useState(false);

  // Fetch group students
  const { data: groupStudents, isLoading: studentsLoading } = useQuery({
    queryKey: ['group-students', group?.id],
    queryFn: async () => {
      if (!group?.id) return [];

      const { data, error } = await supabase
        .from('group_students')
        .select(`
          id,
          student_id,
          status,
          start_date,
          students!inner(
            user_id,
            users!inner(
              first_name,
              last_name,
              email
            )
          )
        `)
        .eq('group_id', group.id)
        .eq('status', 'active');

      if (error) {
        console.error('Error fetching group students:', error);
        throw error;
      }

      return data?.map((item: any) => ({
        id: item.id,
        student_id: item.student_id,
        student_name: `${item.students.users.first_name} ${item.students.users.last_name}`,
        student_email: item.students.users.email,
        status: item.status,
        start_date: item.start_date
      })) || [];
    },
    enabled: !!group?.id && open
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

  if (!group) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-8 w-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Users className="h-4 w-4 text-white" />
            </div>
            {group.name}
            <Badge className={getStatusColor(group.status)}>
              {group.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Group Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Group Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {group.description && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
                  <p className="text-sm text-gray-900">{group.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Teacher</p>
                    <p className="text-sm text-gray-900">{group.teacher_name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Sessions</p>
                    <p className="text-sm text-gray-900">{group.session_count} sessions</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Schedule</p>
                    <p className="text-sm text-gray-900">{formatSchedule(group.schedule)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Price</p>
                    <p className="text-sm text-gray-900">{formatPrice(group)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Students List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Students ({group.student_count})
                </CardTitle>
                <Button 
                  onClick={() => setShowAddStudent(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Student to Group
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {studentsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-gray-200 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : !groupStudents || groupStudents.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Students Yet</h3>
                  <p className="text-gray-600 mb-4">
                    This group doesn't have any students yet. Add students to get started.
                  </p>
                  <Button 
                    onClick={() => setShowAddStudent(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add First Student
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {groupStudents.map((student) => (
                    <div key={student.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{student.student_name}</h4>
                          <p className="text-sm text-gray-600">{student.student_email}</p>
                        </div>
                        <div className="text-right">
                          <Badge className={getStatusColor(student.status)}>
                            {student.status}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            Joined: {new Date(student.start_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Add Student Modal - Placeholder for now */}
        {showAddStudent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Add Student to Group</h3>
              <p className="text-gray-600 mb-4">
                This feature will be implemented to allow adding students to the group.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowAddStudent(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setShowAddStudent(false)}>
                  Add Student
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GroupDetailsDialog;
