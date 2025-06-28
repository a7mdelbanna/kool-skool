
import React, { useState, useEffect, useContext } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, LogIn, Loader2, GraduationCap } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from 'react-router-dom';
import { UserContext } from '@/App';

const StudentLogin = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { setUser } = useContext(UserContext);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  
  // Check if we're already authenticated and redirect if so
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      const parsedUser = JSON.parse(user);
      if (parsedUser.role === 'student') {
        console.log("Student already logged in, redirecting to dashboard...");
        navigate('/student-dashboard');
      } else {
        // Clear non-student user data
        localStorage.removeItem('user');
      }
    }
  }, [navigate]);

  // Debug function to check what exists in the database
  const checkDatabaseState = async () => {
    try {
      console.log("=== COMPREHENSIVE DATABASE DEBUG ===");
      
      // Check all users with role 'student'
      const { data: studentUsers, error: studentUsersError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, role, school_id, password_plain, password_hash')
        .eq('role', 'student');
      
      console.log("Student users in users table:", { studentUsers, studentUsersError });
      
      // Check all entries in students table
      const { data: studentsTable, error: studentsTableError } = await supabase
        .from('students')
        .select('id, user_id, school_id, teacher_id, course_id');
      
      console.log("All entries in students table:", { studentsTable, studentsTableError });
      
      // Check all schools
      const { data: schools, error: schoolsError } = await supabase
        .from('schools')
        .select('id, name');
      
      console.log("Schools in database:", { schools, schoolsError });
      
      // Build debug info
      let debugMessage = '';
      
      if (studentUsers && studentUsers.length > 0) {
        debugMessage += `Found ${studentUsers.length} student user(s) in users table:\n`;
        studentUsers.forEach(user => {
          debugMessage += `- ${user.email} (${user.first_name} ${user.last_name}) - School ID: ${user.school_id}\n`;
        });
      } else {
        debugMessage += "No student users found in users table.\n";
      }
      
      if (studentsTable && studentsTable.length > 0) {
        debugMessage += `\nFound ${studentsTable.length} record(s) in students table:\n`;
        studentsTable.forEach(student => {
          debugMessage += `- Student ID: ${student.id}, User ID: ${student.user_id}, School ID: ${student.school_id}\n`;
        });
      } else {
        debugMessage += "\nNo records found in students table.\n";
      }
      
      if (schools && schools.length > 0) {
        debugMessage += `\nFound ${schools.length} school(s):\n`;
        schools.forEach(school => {
          debugMessage += `- ${school.name} (ID: ${school.id})\n`;
        });
      } else {
        debugMessage += "\nNo schools found in database.\n";
      }
      
      // Check for the specific email
      const targetUser = studentUsers?.find(user => user.email === 'bruhbruh@bruh.com');
      if (targetUser) {
        debugMessage += `\n✅ Found target user: ${targetUser.email}`;
        debugMessage += `\n   - User ID: ${targetUser.id}`;
        debugMessage += `\n   - School ID: ${targetUser.school_id}`;
        debugMessage += `\n   - Has password: ${!!(targetUser.password_plain || targetUser.password_hash)}`;
        
        // Check if there's a matching student record
        const matchingStudent = studentsTable?.find(student => student.user_id === targetUser.id);
        if (matchingStudent) {
          debugMessage += `\n   - ✅ Has matching student record`;
        } else {
          debugMessage += `\n   - ❌ Missing student record - this is the problem!`;
        }
      } else {
        debugMessage += `\n❌ Target user bruhbruh@bruh.com not found in users table`;
      }
      
      setDebugInfo(debugMessage);
      
    } catch (error) {
      console.error('Debug check failed:', error);
      setDebugInfo(`Debug check failed: ${error.message}`);
    }
  };

  // Run debug check on component mount
  useEffect(() => {
    checkDatabaseState();
  }, []);
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDebugInfo('');
    
    try {
      setLoading(true);
      
      console.log("=== STUDENT LOGIN ATTEMPT ===");
      console.log("Attempting student login with email:", email);
      
      // First, check if user exists in users table with role 'student'
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, role, school_id, password_plain, password_hash')
        .eq('email', email)
        .eq('role', 'student');
      
      console.log("Student users query result:", { users, userError });
      
      if (userError) {
        throw new Error('Database error: ' + userError.message);
      }
      
      if (!users || users.length === 0) {
        throw new Error('No student found with this email address.');
      }
      
      const user = users[0];
      console.log("Found user:", { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        hasPlainPassword: !!user.password_plain,
        hasHashPassword: !!user.password_hash
      });
      
      // Check password - try plain text first, then hash
      let passwordMatch = false;
      
      if (user.password_plain) {
        console.log("Checking against plain password");
        passwordMatch = password === user.password_plain;
        console.log("Plain password match:", passwordMatch);
      } else if (user.password_hash) {
        console.log("Checking against hashed password");
        passwordMatch = password === user.password_hash;
        console.log("Hash password match:", passwordMatch);
      } else {
        console.log("No password set for this user");
        throw new Error('No password set for this student account. Please contact your teacher.');
      }
      
      console.log("Final password match result:", passwordMatch);
      
      if (!passwordMatch) {
        throw new Error('Invalid email or password');
      }
      
      // Now check if there's a corresponding student record
      const { data: studentRecords, error: studentError } = await supabase
        .from('students')
        .select('id, school_id')
        .eq('user_id', user.id);
      
      console.log("Student records query result:", { studentRecords, studentError });
      
      if (studentError) {
        console.error('Error fetching student record:', studentError);
        throw new Error('Database error while fetching student record: ' + studentError.message);
      }
      
      if (!studentRecords || studentRecords.length === 0) {
        throw new Error('Student record not found. Please contact your administrator to complete your account setup.');
      }
      
      const studentRecord = studentRecords[0];
      
      // Store user information in local storage
      const userData = {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        schoolId: user.school_id || studentRecord.school_id
      };
      
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      
      // Dispatch a storage event to notify other tabs
      window.dispatchEvent(new Event('storage'));
      
      toast({
        title: "Welcome back!",
        description: `Hello, ${user.first_name}! You're now logged in.`,
      });
      
      console.log("Student login successful, redirecting to dashboard...");
      console.log("Student data:", userData);
      
      // Redirect to student dashboard
      navigate('/student-dashboard');
      
    } catch (error: any) {
      console.error('Student login error:', error);
      setError(error.message || 'Invalid email or password');
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-4">
        <Card>
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Student Login</CardTitle>
            <CardDescription className="text-center">
              Enter your student credentials to access your learning dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    placeholder="your.email@example.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled={loading}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    disabled={loading}
                    required
                  />
                </div>
              </div>
              
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Log In
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-center text-muted-foreground">
              Need help? Contact your teacher or school administrator.
            </div>
          </CardFooter>
        </Card>
        
        {debugInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Database Debug Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md whitespace-pre-line">
                {debugInfo}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default StudentLogin;
