import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Key, Eye, EyeOff, Edit, Copy, CheckCheck } from 'lucide-react';
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
  has_password: boolean;
}

const StudentAccess = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentAccessInfo | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [copiedPasswords, setCopiedPasswords] = useState<Set<string>>(new Set());
  const [passwordCache, setPasswordCache] = useState<Map<string, string>>(new Map());

  const queryClient = useQueryClient();

  // Get current user's school ID
  const userData = localStorage.getItem('user');
  const user = userData ? JSON.parse(userData) : null;
  const schoolId = user?.schoolId;

  console.log('=== STUDENT ACCESS DEBUG ===');
  console.log('School ID:', schoolId);

  // Fetch students and their password info using the existing RPC function
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

      // Use the existing RPC function to get password information
      console.log('Fetching password info using RPC function...');
      const { data: passwordInfo, error: passwordError } = await supabase.rpc('get_students_password_info', {
        p_school_id: schoolId
      });

      console.log('Password RPC result:', { 
        data: passwordInfo, 
        error: passwordError,
        count: passwordInfo?.length || 0
      });

      // Create a map of user_id to password info
      const passwordMap = new Map();
      if (passwordInfo && Array.isArray(passwordInfo)) {
        passwordInfo.forEach((info: any) => {
          passwordMap.set(info.user_id, {
            has_password: info.has_password,
            password_length: info.password_length
          });
        });
      }

      console.log('Password info map size:', passwordMap.size);
      console.log('Password info map entries:', Array.from(passwordMap.entries()));

      // Combine student data with password info
      const result = studentsData.map(student => {
        const passwordInfo = passwordMap.get(student.user_id);
        const teacherName = student.teacher_first_name && student.teacher_last_name
          ? `${student.teacher_first_name} ${student.teacher_last_name}`
          : 'No Teacher';

        console.log(`Student ${student.first_name} ${student.last_name}:`, {
          user_id: student.user_id,
          has_password: passwordInfo?.has_password || false,
          password_length: passwordInfo?.password_length || 0
        });

        return {
          id: student.user_id || '',
          student_id: student.id,
          first_name: student.first_name || '',
          last_name: student.last_name || '',
          email: student.email || '',
          password_hash: passwordInfo?.has_password ? 'SET' : null,
          has_password: passwordInfo?.has_password || false,
          course_name: student.course_name || 'No Course',
          teacher_name: teacherName
        };
      });

      console.log('Final students with passwords:', result);
      console.log('Students with passwords count:', result.filter(s => s.has_password).length);
      return result;
    },
    enabled: !!schoolId,
  });

  // Fetch actual password hash for display using direct query with better error handling
  const fetchPasswordHash = async (userId: string) => {
    console.log('=== FETCH PASSWORD DEBUG ===');
    console.log('Fetching password hash for user:', userId);
    
    // Check cache first
    if (passwordCache.has(userId)) {
      console.log('Using cached password hash');
      return passwordCache.get(userId);
    }

    try {
      console.log('Querying users table...');
      
      // Direct query to users table to get password hash - using maybeSingle() instead of single()
      const { data, error } = await supabase
        .from('users')
        .select('password_hash, role, email')
        .eq('id', userId)
        .maybeSingle();

      console.log('Query result:', { data, error });

      if (error) {
        console.error('Error fetching password hash:', error);
        toast.error('Failed to fetch password: ' + error.message);
        return null;
      }

      if (!data) {
        console.log('No user found with ID:', userId);
        toast.error('User not found');
        return null;
      }

      console.log('User found:', { 
        email: data.email, 
        role: data.role, 
        hasPassword: !!data.password_hash,
        passwordLength: data.password_hash?.length || 0
      });

      const passwordHash = data.password_hash || null;
      
      // Cache the result if we have a password
      if (passwordHash) {
        setPasswordCache(prev => new Map(prev).set(userId, passwordHash));
        console.log('Password cached for user:', userId);
      } else {
        console.log('No password hash found for user:', userId);
      }
      
      return passwordHash;
    } catch (error) {
      console.error('Exception fetching password hash:', error);
      toast.error('Failed to fetch password');
      return null;
    }
  };

  // Update password mutation with verification
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
      
      // Clear cache for this user
      setPasswordCache(prev => {
        const newCache = new Map(prev);
        newCache.delete(userId);
        return newCache;
      });
      
      // Verify the update worked using the existing RPC function
      const { data: verifyData, error: verifyError } = await supabase.rpc('verify_password_update', {
        p_user_id: userId
      });

      console.log('Password verification:', { 
        data: verifyData, 
        error: verifyError,
        has_password: verifyData?.[0]?.has_password || false,
        password_length: verifyData?.[0]?.password_hash_length || 0
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

  const togglePasswordVisibility = async (studentId: string) => {
    console.log('=== TOGGLE PASSWORD VISIBILITY ===');
    console.log('Student ID:', studentId);
    
    if (visiblePasswords.has(studentId)) {
      // Hide password
      console.log('Hiding password for:', studentId);
      setVisiblePasswords(prev => {
        const newSet = new Set(prev);
        newSet.delete(studentId);
        return newSet;
      });
    } else {
      // Show password - fetch it first
      console.log('Showing password for:', studentId);
      const passwordHash = await fetchPasswordHash(studentId);
      console.log('Fetched password hash:', passwordHash ? 'Found' : 'Not found');
      
      if (passwordHash) {
        setVisiblePasswords(prev => new Set(prev).add(studentId));
        console.log('Password visibility toggled on for:', studentId);
      } else {
        console.log('No password hash available, cannot show password');
        toast.error('No password available to display');
      }
    }
  };

  const copyPasswordToClipboard = async (studentId: string, studentName: string) => {
    console.log('=== COPY PASSWORD ===');
    console.log('Copying password for:', studentId, studentName);
    
    const passwordHash = await fetchPasswordHash(studentId);
    console.log('Password hash for copy:', passwordHash ? 'Found' : 'Not found');
    
    if (passwordHash) {
      try {
        await navigator.clipboard.writeText(passwordHash);
        setCopiedPasswords(prev => new Set(prev).add(studentId));
        toast.success(`Password copied for ${studentName}`);
        console.log('Password copied successfully for:', studentName);
        
        // Reset copied state after 2 seconds
        setTimeout(() => {
          setCopiedPasswords(prev => {
            const newSet = new Set(prev);
            newSet.delete(studentId);
            return newSet;
          });
        }, 2000);
      } catch (error) {
        console.error('Failed to copy password:', error);
        toast.error('Failed to copy password');
      }
    } else {
      console.log('No password hash available for copying');
      toast.error('No password available to copy');
    }
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
                  <TableHead>Password</TableHead>
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
                      {student.has_password ? (
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
                      {student.has_password && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => togglePasswordVisibility(student.id)}
                            className="h-8 w-8 p-0"
                          >
                            {visiblePasswords.has(student.id) ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyPasswordToClipboard(student.id, `${student.first_name} ${student.last_name}`)}
                            className="h-8 w-8 p-0"
                          >
                            {copiedPasswords.has(student.id) ? (
                              <CheckCheck className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          {visiblePasswords.has(student.id) && (
                            <span className="text-sm font-mono text-muted-foreground max-w-32 truncate">
                              {passwordCache.get(student.id) || '••••••••'}
                            </span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetPassword(student)}
                        className="flex items-center gap-2"
                      >
                        {student.has_password ? <Edit className="h-4 w-4" /> : <Key className="h-4 w-4" />}
                        {student.has_password ? 'Update' : 'Set'} Password
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
              {selectedStudent?.has_password ? 'Update Password' : 'Set Password'}
            </DialogTitle>
            <DialogDescription>
              {selectedStudent?.has_password 
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
