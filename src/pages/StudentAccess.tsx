import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Key, Eye, EyeOff, Edit } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase, getStudentsWithDetails } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StudentAccessInfo {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  password_hash?: string | null;
  student_id: string;
  course_name: string;
  teacher_name: string;
}

const StudentAccess = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentAccessInfo | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const queryClient = useQueryClient();

  // Get current user's school ID
  const userData = localStorage.getItem('user');
  const user = userData ? JSON.parse(userData) : null;
  const schoolId = user?.schoolId;

  console.log('=== STUDENT ACCESS DEBUG ===');
  console.log('School ID:', schoolId);

  // Fetch students and their password info with simplified approach
  const { data: studentsWithPasswords = [], isLoading } = useQuery({
    queryKey: ['students-with-passwords', schoolId],
    queryFn: async () => {
      if (!schoolId) {
        console.log('No school ID provided');
        return [];
      }

      console.log('Fetching students with password info for school:', schoolId);

      // First get all students with details
      const studentsData = await getStudentsWithDetails(schoolId);
      console.log('Students data received:', studentsData);

      if (!studentsData || studentsData.length === 0) {
        console.log('No students found');
        return [];
      }

      // Instead of a separate query, let's use the RPC function to get password info
      // This bypasses potential RLS issues
      console.log('Fetching password info using RPC...');
      const { data: passwordData, error: passwordError } = await supabase.rpc('get_user_passwords', {
        p_school_id: schoolId
      });

      console.log('Password RPC result:', { data: passwordData, error: passwordError });

      // If RPC doesn't exist, fall back to direct query with better error handling
      let userPasswordMap = new Map();
      
      if (passwordError) {
        console.log('RPC not available, trying direct query...');
        
        // Get all unique user IDs that are not null
        const userIds = studentsData
          .map(s => s.user_id)
          .filter(Boolean);

        console.log('User IDs for direct query:', userIds);

        if (userIds.length > 0) {
          // Try a more explicit query approach
          console.log('Executing direct password query...');
          
          try {
            const { data: directPasswordData, error: directError } = await supabase
              .from('users')
              .select('id, password_hash')
              .in('id', userIds);

            console.log('Direct password query result:', { 
              data: directPasswordData, 
              error: directError,
              count: directPasswordData?.length || 0
            });

            if (directError) {
              console.error('Direct query error:', directError);
              // Try with explicit authentication bypass
              const { data: bypassData, error: bypassError } = await supabase
                .from('users')
                .select('id, password_hash')
                .in('id', userIds)
                .eq('school_id', schoolId); // Add school_id filter to help with RLS

              console.log('Bypass query result:', { 
                data: bypassData, 
                error: bypassError,
                count: bypassData?.length || 0
              });

              if (bypassData) {
                bypassData.forEach(p => {
                  userPasswordMap.set(p.id, p.password_hash);
                });
              }
            } else if (directPasswordData) {
              directPasswordData.forEach(p => {
                userPasswordMap.set(p.id, p.password_hash);
              });
            }
          } catch (queryError) {
            console.error('Query execution error:', queryError);
          }
        }
      } else if (passwordData) {
        passwordData.forEach(p => {
          userPasswordMap.set(p.id, p.password_hash);
        });
      }

      console.log('Password map size:', userPasswordMap.size);
      console.log('Password map entries:', Array.from(userPasswordMap.entries()));

      // Combine student data with password info
      const result = studentsData.map(student => {
        const passwordHash = userPasswordMap.get(student.user_id);
        const teacherName = student.teacher_first_name && student.teacher_last_name
          ? `${student.teacher_first_name} ${student.teacher_last_name}`
          : 'No Teacher';

        console.log(`Student ${student.first_name} ${student.last_name}:`, {
          user_id: student.user_id,
          passwordHash: passwordHash || 'NOT_FOUND',
          has_password: !!passwordHash,
          password_length: passwordHash ? passwordHash.length : 0
        });

        return {
          id: student.user_id || '',
          student_id: student.id,
          first_name: student.first_name || '',
          last_name: student.last_name || '',
          email: student.email || '',
          password_hash: passwordHash || null,
          course_name: student.course_name || 'No Course',
          teacher_name: teacherName
        };
      });

      console.log('Final students with passwords:', result);
      console.log('Students with passwords count:', result.filter(s => s.password_hash).length);
      return result;
    },
    enabled: !!schoolId,
  });

  // Update password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      console.log('Updating password for user:', userId);
      
      // Hash the password using Supabase RPC function
      const { data: hashedPassword, error: hashError } = await supabase.rpc('hash_password', { 
        password: password 
      });
      
      if (hashError) {
        console.error('Error hashing password:', hashError);
        throw new Error('Failed to hash password: ' + hashError.message);
      }

      console.log('Password hashed successfully, length:', hashedPassword?.length);

      // Update the user's password
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          password_hash: hashedPassword,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating password:', updateError);
        throw new Error('Failed to update password: ' + updateError.message);
      }

      console.log('Password updated successfully in database');
      
      // Verify the update worked
      const { data: verifyData, error: verifyError } = await supabase
        .from('users')
        .select('id, password_hash')
        .eq('id', userId)
        .single();

      console.log('Password verification:', { 
        data: verifyData, 
        error: verifyError,
        has_password: !!verifyData?.password_hash,
        password_length: verifyData?.password_hash?.length || 0
      });

      return { success: true };
    },
    onSuccess: () => {
      console.log('Password update mutation succeeded, invalidating queries...');
      queryClient.invalidateQueries({ queryKey: ['students-with-passwords', schoolId] });
      setIsDialogOpen(false);
      setSelectedStudent(null);
      setNewPassword('');
      toast.success('Password updated successfully');
    },
    onError: (error: any) => {
      console.error('Update password error:', error);
      toast.error('Failed to update password: ' + error.message);
    },
  });

  const handleSetPassword = (student: StudentAccessInfo) => {
    console.log('Setting password for student:', student);
    setSelectedStudent(student);
    setNewPassword('');
    setIsDialogOpen(true);
  };

  const handleSubmitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStudent || !newPassword.trim()) {
      toast.error('Please enter a password');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    console.log('Submitting password update for:', selectedStudent.id);
    updatePasswordMutation.mutate({
      userId: selectedStudent.id,
      password: newPassword.trim()
    });
  };

  const filteredStudents = studentsWithPasswords.filter(student =>
    `${student.first_name} ${student.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  console.log('Filtered students for display:', filteredStudents);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Student Access</h1>
          <p className="text-muted-foreground">
            Manage student login credentials and access permissions
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Accounts</CardTitle>
          <CardDescription>
            View and manage login credentials for all students
          </CardDescription>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-muted-foreground">Loading students...</div>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              <div className="mb-2">No students found</div>
              {searchTerm && (
                <div className="text-sm">Try adjusting your search criteria</div>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Password Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.student_id}>
                    <TableCell className="font-medium">
                      {student.first_name} {student.last_name}
                    </TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>{student.course_name}</TableCell>
                    <TableCell>{student.teacher_name}</TableCell>
                    <TableCell>
                      {student.password_hash ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Password Set
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          No Password
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetPassword(student)}
                        className="flex items-center gap-2"
                      >
                        {student.password_hash ? <Edit className="h-4 w-4" /> : <Key className="h-4 w-4" />}
                        {student.password_hash ? 'Update' : 'Set'} Password
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedStudent?.password_hash ? 'Update Password' : 'Set Password'}
            </DialogTitle>
            <DialogDescription>
              {selectedStudent?.password_hash 
                ? `Update the login password for ${selectedStudent?.first_name} ${selectedStudent?.last_name}`
                : `Set a login password for ${selectedStudent?.first_name} ${selectedStudent?.last_name}`
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Student Email</Label>
              <Input
                id="email"
                value={selectedStudent?.email || ''}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="pr-10"
                  required
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Password must be at least 6 characters long
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updatePasswordMutation.isPending}
              >
                {updatePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentAccess;
