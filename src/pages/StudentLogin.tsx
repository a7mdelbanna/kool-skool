
import React, { useState, useEffect, useContext } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, LogIn, Loader2, GraduationCap, AlertCircle } from 'lucide-react';
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
  const [connectionStatus, setConnectionStatus] = useState('checking');
  
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

  // Test database connection and debug tables step by step
  const testDatabaseConnection = async () => {
    console.log("=== COMPREHENSIVE DATABASE CONNECTION TEST ===");
    let debugMessage = '';
    
    try {
      setConnectionStatus('testing');
      
      // Step 1: Test basic connection with a simple query
      console.log("Step 1: Testing basic database connection...");
      const { data: testConnection, error: connectionError } = await supabase
        .from('users')
        .select('count')
        .limit(1);
      
      if (connectionError) {
        console.error("❌ Database connection failed:", connectionError);
        debugMessage += `❌ Database connection failed: ${connectionError.message}\n`;
        setConnectionStatus('failed');
        setDebugInfo(debugMessage);
        return;
      }
      
      console.log("✅ Database connection successful");
      debugMessage += "✅ Database connection successful\n\n";
      
      // Step 2: Count total records in each table
      console.log("Step 2: Counting records in each table...");
      
      // Count users
      const { count: usersCount, error: usersCountError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      
      if (usersCountError) {
        console.error("❌ Error counting users:", usersCountError);
        debugMessage += `❌ Error counting users: ${usersCountError.message}\n`;
      } else {
        console.log(`📊 Total users in database: ${usersCount}`);
        debugMessage += `📊 Total users in database: ${usersCount}\n`;
      }
      
      // Count students
      const { count: studentsCount, error: studentsCountError } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });
      
      if (studentsCountError) {
        console.error("❌ Error counting students:", studentsCountError);
        debugMessage += `❌ Error counting students: ${studentsCountError.message}\n`;
      } else {
        console.log(`📊 Total students in database: ${studentsCount}`);
        debugMessage += `📊 Total students in database: ${studentsCount}\n`;
      }
      
      // Count schools
      const { count: schoolsCount, error: schoolsCountError } = await supabase
        .from('schools')
        .select('*', { count: 'exact', head: true });
      
      if (schoolsCountError) {
        console.error("❌ Error counting schools:", schoolsCountError);
        debugMessage += `❌ Error counting schools: ${schoolsCountError.message}\n`;
      } else {
        console.log(`📊 Total schools in database: ${schoolsCount}`);
        debugMessage += `📊 Total schools in database: ${schoolsCount}\n\n`;
      }
      
      // Step 3: Get sample data from each table
      console.log("Step 3: Fetching sample data...");
      
      // Sample users with role = 'student'
      const { data: sampleStudentUsers, error: sampleUsersError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, role, school_id, password_plain, password_hash')
        .eq('role', 'student')
        .limit(5);
      
      if (sampleUsersError) {
        console.error("❌ Error fetching sample student users:", sampleUsersError);
        debugMessage += `❌ Error fetching sample student users: ${sampleUsersError.message}\n`;
      } else {
        console.log("📋 Sample student users:", sampleStudentUsers);
        debugMessage += `📋 Sample student users found: ${sampleStudentUsers?.length || 0}\n`;
        if (sampleStudentUsers && sampleStudentUsers.length > 0) {
          sampleStudentUsers.forEach((user, index) => {
            debugMessage += `   ${index + 1}. ${user.email} (${user.first_name} ${user.last_name}) - School ID: ${user.school_id}\n`;
          });
        }
        debugMessage += '\n';
      }
      
      // Sample students table
      const { data: sampleStudents, error: sampleStudentsError } = await supabase
        .from('students')
        .select('id, user_id, school_id, teacher_id, course_id')
        .limit(5);
      
      if (sampleStudentsError) {
        console.error("❌ Error fetching sample students:", sampleStudentsError);
        debugMessage += `❌ Error fetching sample students: ${sampleStudentsError.message}\n`;
      } else {
        console.log("📋 Sample students:", sampleStudents);
        debugMessage += `📋 Sample students found: ${sampleStudents?.length || 0}\n`;
        if (sampleStudents && sampleStudents.length > 0) {
          sampleStudents.forEach((student, index) => {
            debugMessage += `   ${index + 1}. Student ID: ${student.id}, User ID: ${student.user_id}, School ID: ${student.school_id}\n`;
          });
        }
        debugMessage += '\n';
      }
      
      // Sample schools
      const { data: sampleSchools, error: sampleSchoolsError } = await supabase
        .from('schools')
        .select('id, name')
        .limit(5);
      
      if (sampleSchoolsError) {
        console.error("❌ Error fetching sample schools:", sampleSchoolsError);
        debugMessage += `❌ Error fetching sample schools: ${sampleSchoolsError.message}\n`;
      } else {
        console.log("📋 Sample schools:", sampleSchools);
        debugMessage += `📋 Sample schools found: ${sampleSchools?.length || 0}\n`;
        if (sampleSchools && sampleSchools.length > 0) {
          sampleSchools.forEach((school, index) => {
            debugMessage += `   ${index + 1}. ${school.name} (ID: ${school.id})\n`;
          });
        }
        debugMessage += '\n';
      }
      
      // Step 4: Test specific email lookup
      if (email && email.includes('@')) {
        console.log(`Step 4: Testing lookup for specific email: ${email}`);
        debugMessage += `🔍 Testing lookup for email: ${email}\n`;
        
        // Test direct user lookup
        const { data: directUserLookup, error: directLookupError } = await supabase
          .from('users')
          .select('id, email, first_name, last_name, role, school_id, password_plain, password_hash')
          .eq('email', email);
        
        if (directLookupError) {
          console.error("❌ Error in direct user lookup:", directLookupError);
          debugMessage += `❌ Direct user lookup error: ${directLookupError.message}\n`;
        } else {
          console.log("📧 Direct user lookup result:", directUserLookup);
          debugMessage += `📧 Direct user lookup found: ${directUserLookup?.length || 0} records\n`;
          if (directUserLookup && directUserLookup.length > 0) {
            directUserLookup.forEach((user, index) => {
              debugMessage += `   ${index + 1}. ${user.email} - Role: ${user.role} - School ID: ${user.school_id}\n`;
              debugMessage += `       Has password_plain: ${!!user.password_plain}\n`;
              debugMessage += `       Has password_hash: ${!!user.password_hash}\n`;
            });
          }
        }
      }
      
      setConnectionStatus('connected');
      setDebugInfo(debugMessage);
      
    } catch (error) {
      console.error('❌ Database test failed with exception:', error);
      debugMessage += `❌ Database test failed: ${error.message}\n`;
      setConnectionStatus('failed');
      setDebugInfo(debugMessage);
    }
  };

  // Run connection test on component mount and when email changes
  useEffect(() => {
    testDatabaseConnection();
  }, []);
  
  useEffect(() => {
    if (email && email.includes('@')) {
      // Re-run connection test when email is entered to test specific lookup
      testDatabaseConnection();
    }
  }, [email]);
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    
    try {
      setLoading(true);
      
      console.log("=== DETAILED STUDENT LOGIN ATTEMPT ===");
      console.log("Step 1: Input validation");
      console.log("- Email:", email);
      console.log("- Password length:", password.length);
      console.log("- Email format valid:", /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
      
      // Step 1: Test if we can find ANY user with this email
      console.log("\nStep 2: Looking for ANY user with this email...");
      const { data: anyUsers, error: anyUserError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, role, school_id, password_plain, password_hash')
        .eq('email', email);
      
      if (anyUserError) {
        console.error("❌ Error searching for any user:", anyUserError);
        throw new Error(`Database error searching for user: ${anyUserError.message}`);
      }
      
      console.log("📧 Any users found with this email:", anyUsers?.length || 0);
      if (anyUsers && anyUsers.length > 0) {
        anyUsers.forEach((user, index) => {
          console.log(`   User ${index + 1}:`, {
            id: user.id,
            email: user.email,
            role: user.role,
            school_id: user.school_id,
            has_password_plain: !!user.password_plain,
            has_password_hash: !!user.password_hash
          });
        });
      } else {
        throw new Error('No user found with this email address. Please check your email or contact your administrator.');
      }
      
      // Step 2: Filter for student users
      console.log("\nStep 3: Filtering for student users...");
      const studentUsers = anyUsers.filter(user => user.role === 'student');
      console.log("👨‍🎓 Student users found:", studentUsers.length);
      
      if (studentUsers.length === 0) {
        const userRoles = anyUsers.map(u => u.role).join(', ');
        throw new Error(`Account found but not a student account. Account role(s): ${userRoles}. Please use the correct login page for your role.`);
      }
      
      const user = studentUsers[0]; // Take the first student user
      console.log("✅ Student user selected:", {
        id: user.id,
        email: user.email,
        school_id: user.school_id
      });
      
      // Step 3: Verify password
      console.log("\nStep 4: Verifying password...");
      let passwordMatch = false;
      let passwordType = 'none';
      
      if (user.password_plain && user.password_plain.trim() !== '') {
        console.log("🔑 Checking against plain text password");
        passwordMatch = password === user.password_plain;
        passwordType = 'plain';
        console.log("Plain text password match:", passwordMatch);
      } else if (user.password_hash && user.password_hash.trim() !== '') {
        console.log("🔐 Checking against hashed password");
        passwordMatch = password === user.password_hash;
        passwordType = 'hash';
        console.log("Hashed password match:", passwordMatch);
      } else {
        console.log("❌ No password set for this user");
        throw new Error('No password set for this student account. Please contact your teacher to set up your password.');
      }
      
      if (!passwordMatch) {
        throw new Error(`Invalid password. Password type checked: ${passwordType}`);
      }
      
      console.log("✅ Password verification successful");
      
      // Step 4: Check for student record
      console.log("\nStep 5: Checking for student record...");
      const { data: studentRecords, error: studentError } = await supabase
        .from('students')
        .select('id, school_id, teacher_id, course_id')
        .eq('user_id', user.id);
      
      if (studentError) {
        console.error('❌ Error fetching student record:', studentError);
        throw new Error(`Database error fetching student record: ${studentError.message}`);
      }
      
      console.log("📚 Student records found:", studentRecords?.length || 0);
      if (!studentRecords || studentRecords.length === 0) {
        throw new Error('Student record not found. Your user account exists but is not properly linked to a student profile. Please contact your administrator.');
      }
      
      const studentRecord = studentRecords[0];
      console.log("✅ Student record found:", studentRecord);
      
      // Step 5: Verify school exists (if student has school_id)
      const effectiveSchoolId = user.school_id || studentRecord.school_id;
      console.log("\nStep 6: Verifying school...");
      console.log("School ID to check:", effectiveSchoolId);
      
      if (effectiveSchoolId) {
        const { data: schoolData, error: schoolError } = await supabase
          .from('schools')
          .select('id, name')
          .eq('id', effectiveSchoolId)
          .single();
        
        if (schoolError) {
          console.error('❌ Error fetching school:', schoolError);
          console.log('⚠️ Warning: School not found, but proceeding with login');
        } else {
          console.log("🏫 School found:", schoolData);
        }
      } else {
        console.log("⚠️ No school ID associated with student");
      }
      
      // Step 6: Create user session
      console.log("\nStep 7: Creating user session...");
      const userData = {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        schoolId: effectiveSchoolId
      };
      
      console.log("👤 User data for session:", userData);
      
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      
      // Dispatch a storage event to notify other tabs
      window.dispatchEvent(new Event('storage'));
      
      toast({
        title: "Welcome back!",
        description: `Hello, ${user.first_name}! You're now logged in.`,
      });
      
      console.log("✅ Student login successful, redirecting to dashboard...");
      
      // Redirect to student dashboard
      navigate('/student-dashboard');
      
    } catch (error: any) {
      console.error('❌ Student login error:', error);
      setError(error.message || 'Login failed. Please check your credentials and try again.');
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'checking':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'testing':
        return <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />;
      case 'connected':
        return <div className="h-4 w-4 rounded-full bg-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
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
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              {getConnectionStatusIcon()}
              <span>Database: {connectionStatus}</span>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
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
                disabled={loading || connectionStatus === 'failed'}
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
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Database Debug Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md whitespace-pre-line font-mono">
                {debugInfo}
              </div>
              <Button
                onClick={testDatabaseConnection}
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                disabled={connectionStatus === 'testing'}
              >
                {connectionStatus === 'testing' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Refresh Database Test'
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default StudentLogin;
