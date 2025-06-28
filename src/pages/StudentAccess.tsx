
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
  password_hash?: string;
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

  // Fetch students using the same approach as the Students page
  const { data: studentsData = [], isLoading } = useQuery({
    queryKey: ['students', schoolId],
    queryFn: () => getStudentsWithDetails(schoolId),
    enabled: !!schoolId,
  });

  // Transform the data to match our interface
  const students: StudentAccessInfo[] = studentsData.map(student => ({
    id: student.user_id || '',
    student_id: student.id,
    first_name: student.first_name || '',
    last_name: student.last_name || '',
    email: student.email || '',
    password_hash: student.password_hash,
    course_name: student.course_name || 'No Course',
    teacher_name: student.teacher_name || 'No Teacher'
  }));

  // Update password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      const { data, error } = await supabase.rpc('hash_password', { password });
      
      if (error) {
        console.error('Error hashing password:', error);
        throw error;
      }

      const hashedPassword = data;

      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          password_hash: hashedPassword,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating password:', updateError);
        throw updateError;
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', schoolId] });
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

    updatePasswordMutation.mutate({
      userId: selectedStudent.id,
      password: newPassword.trim()
    });
  };

  const filteredStudents = students.filter(student =>
    `${student.first_name} ${student.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
