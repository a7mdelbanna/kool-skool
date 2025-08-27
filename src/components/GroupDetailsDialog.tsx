
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Users, Calendar, DollarSign, Clock, Plus, User, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { databaseService } from '@/services/firebase/database.service';
import { UserContext } from '@/App';
import { useContext } from 'react';
import { useToast } from '@/hooks/use-toast';
import AddStudentToGroupDialog from './AddStudentToGroupDialog';

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
  onSuccess?: () => void;
}

interface RpcResponse {
  success: boolean;
  message: string;
}

const GroupDetailsDialog = ({ group, open, onOpenChange, onSuccess }: GroupDetailsDialogProps) => {
  const { user } = useContext(UserContext);
  const { toast } = useToast();
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [removingStudentId, setRemovingStudentId] = useState<string | null>(null);

  // Fetch group students from Firebase
  const { data: groupStudents, isLoading: studentsLoading, refetch: refetchStudents } = useQuery({
    queryKey: ['group-students', group?.id],
    queryFn: async () => {
      if (!group?.id) return [];

      console.log('Fetching students for group:', group.id);

      try {
        // Get the group students from Firebase subcollection
        const groupStudentsData = await databaseService.query(`groups/${group.id}/students`, {});
        
        console.log('Group students data:', groupStudentsData);

        if (!groupStudentsData || groupStudentsData.length === 0) {
          console.log('No active students found for group');
          return [];
        }

        // Get student details
        const enrichedStudents = await Promise.all(
          groupStudentsData.map(async (gs: any) => {
            const studentData = await databaseService.getById('students', gs.studentId);
            const userData = studentData ? await databaseService.getById('users', studentData.user_id || studentData.userId) : null;
            
            return {
              id: gs.id,
              student_id: gs.studentId,
              student_name: userData?.name || gs.studentName || 'Unknown Student',
              student_email: userData?.email || '',
              status: gs.status || 'active',
              start_date: gs.startDate || gs.start_date
            };
          })
        );

        return enrichedStudents as GroupStudent[];
      } catch (error) {
        console.error('Error fetching group students:', error);
        throw error;
      }

      if (studentsError) {
        console.error('Error fetching students:', studentsError);
        throw studentsError;
      }

      console.log('Students data:', studentsData);

      if (!studentsData || studentsData.length === 0) {
        console.log('No student records found');
        return [];
      }

      // Get user IDs from students
      const userIds = studentsData.map(s => s.user_id);
      console.log('User IDs to fetch:', userIds);

      // Fetch user data
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .in('id', userIds);

      if (usersError) {
        console.error('Error fetching users:', usersError);
        throw usersError;
      }

      console.log('Users data:', usersData);

      // Combine all the data
      const formattedStudents = groupStudentsData.map((groupStudent) => {
        const studentData = studentsData.find(s => s.id === groupStudent.student_id);
        const userData = studentData ? usersData?.find(u => u.id === studentData.user_id) : null;
        
        console.log('Matching data for student:', groupStudent.student_id, {
          studentData,
          userData
        });
        
        if (!studentData || !userData) {
          console.warn('Missing data for student_id:', groupStudent.student_id);
          return null;
        }

        return {
          id: groupStudent.id,
          student_id: groupStudent.student_id,
          student_name: `${userData.first_name} ${userData.last_name}`,
          student_email: userData.email,
          status: groupStudent.status,
          start_date: groupStudent.start_date
        };
      }).filter(Boolean) as GroupStudent[]; // Remove null entries and type assert

      console.log('Final formatted students:', formattedStudents);
      return formattedStudents;
    },
    enabled: !!group?.id && open
  });

  const handleRemoveStudent = async (studentId: string, studentName: string) => {
    if (!user?.schoolId || !group) {
      toast({
        title: "Error",
        description: "Unable to remove student. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setRemovingStudentId(studentId);
    
    try {
      // Find and remove the student from the group in Firebase
      const groupStudents = await databaseService.query(`groups/${group.id}/students`, {
        where: [{ field: 'studentId', operator: '==', value: studentId }]
      });
      
      if (groupStudents && groupStudents.length > 0) {
        // Remove the student from the group
        await databaseService.delete(`groups/${group.id}/students`, groupStudents[0].id);
      } else {
        throw new Error('Student not found in group');
      }

      toast({
        title: "Success!",
        description: `${studentName} has been removed from the group.`,
      });

      // Refresh the students list and group data
      refetchStudents();
      onSuccess?.();
      
    } catch (error) {
      console.error('Error removing student from group:', error);
      
      toast({
        title: "Error Removing Student",
        description: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRemovingStudentId(null);
    }
  };

  const handleAddStudentSuccess = () => {
    refetchStudents();
    onSuccess?.();
  };

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
    <>
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
                    Students ({groupStudents?.length || 0})
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
                      This group doesn't have any active students yet. Add students to get started.
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
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <Badge className={getStatusColor(student.status)}>
                                {student.status}
                              </Badge>
                              <p className="text-xs text-gray-500 mt-1">
                                Joined: {new Date(student.start_date).toLocaleDateString()}
                              </p>
                            </div>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  disabled={removingStudentId === student.student_id}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove Student from Group</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to remove {student.student_name} from this group? 
                                    This will mark their subscription as inactive and cancel all future scheduled sessions.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleRemoveStudent(student.student_id, student.student_name)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Remove Student
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Student Dialog */}
      <AddStudentToGroupDialog
        open={showAddStudent}
        onOpenChange={setShowAddStudent}
        group={group}
        onSuccess={handleAddStudentSuccess}
      />
    </>
  );
};

export default GroupDetailsDialog;
