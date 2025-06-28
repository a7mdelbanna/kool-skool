
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

  // Test database connection and show sample data
  const testDatabaseConnection = async () => {
    console.log("=== DATABASE CONNECTION TEST ===");
    let debugMessage = '';
    
    try {
      setConnectionStatus('testing');
      
      // Test basic connection
      console.log("Testing basic database connection...");
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
      
      // Get sample student data with passwords info
      console.log("Fetching sample students with password info...");
      const { data: studentUsers, error: studentsError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, role, school_id, password_plain, password_hash')
        .eq('role', 'student')
        .limit(5);
      
      if (studentsError) {
        console.error("❌ Error fetching students:", studentsError);
        debugMessage += `❌ Error fetching students: ${studentsError.message}\n`;
      } else {
        console.log("📋 Sample students found:", studentUsers?.length || 0);
        debugMessage += `📋 Sample students found: ${studentUsers?.length || 0}\n`;
        if (studentUsers && studentUsers.length > 0) {
          studentUsers.forEach((user, index) => {
            const hasPlainPassword = !!(user.password_plain && user.password_plain.trim() !== '');
            const hasHashedPassword = !!(user.password_hash && user.password_hash.trim() !== '');
            debugMessage += `   ${index + 1}. ${user.email} (${user.first_name} ${user.last_name})\n`;
            debugMessage += `      - Plain password: ${hasPlainPassword ? 'YES' : 'NO'}\n`;
            debugMessage += `      - Hashed password: ${hasHashedPassword ? 'YES' : 'NO'}\n`;
            if (hasPlainPassword) {
              debugMessage += `      - Plain password value: "${user.password_plain}"\n`;
            }
          });
        }
        debugMessage += '\n';
      }
      
      // Test specific email lookup if provided
      if (email && email.includes('@')) {
        console.log(`Testing lookup for email: ${email}`);
        debugMessage += `🔍 Testing lookup for email: ${email}\n`;
        
        const { data: specificUser, error: lookupError } = await supabase
          .from('users')
          .select('id, email, first_name, last_name, role, school_id, password_plain, password_hash')
          .eq('email', email)
          .eq('role', 'student');
        
        if (lookupError) {
          console.error("❌ Error in specific lookup:", lookupError);
          debugMessage += `❌ Lookup error: ${lookupError.message}\n`;
        } else {
          debugMessage += `📧 Found ${specificUser?.length || 0} student(s) with email ${email}\n`;
          if (specificUser && specificUser.length > 0) {
            const user = specificUser[0];
            const hasPlainPassword = !!(user.password_plain && user.password_plain.trim() !== '');
            const hasHashedPassword = !!(user.password_hash && user.password_hash.trim() !== '');
            debugMessage += `   Student: ${user.first_name} ${user.last_name}\n`;
            debugMessage += `   Plain password: ${hasPlainPassword ? 'YES' : 'NO'}\n`;
            debugMessage += `   Hashed password: ${hasHashedPassword ? 'YES' : 'NO'}\n`;
            if (hasPlainPassword) {
              debugMessage += `   Plain password value: "${user.password_plain}"\n`;
            }
          }
        }
      }
      
      setConnectionStatus('connected');
      setDebugInfo(debugMessage);
      
    } catch (error) {
      console.error('❌ Database test failed:', error);
      debugMessage += `❌ Database test failed: ${error.message}\n`;
      setConnectionStatus('failed');
      setDebugInfo(debugMessage);
    }
  };

  // Run connection test on component mount
  useEffect(() => {
    testDatabaseConnection();
  }, []);
  
  // Re-run test when email changes to show specific lookup
  useEffect(() => {
    if (email && email.includes('@')) {
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
      
      console.log("=== STUDENT LOGIN ATTEMPT ===");
      console.log("Email:", email);
      console.log("Password provided:", !!password);
      
      // Look for student user with this email
      console.log("Looking for student user...");
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, role, school_id, password_plain, password_hash')
        .eq('email', email.toLowerCase().trim())
        .eq('role', 'student');
      
      if (userError) {
        console.error("❌ Database error:", userError);
        throw new Error(`Database error: ${userError.message}`);
      }
      
      console.log("Users found:", users?.length || 0);
      
      if (!users || users.length === 0) {
        throw new Error('No student account found with this email address. Please check your email or contact your teacher.');
      }
      
      const user = users[0];
      console.log("Student found:", user.first_name, user.last_name);
      
      // Check password
      console.log("Checking password...");
      let passwordMatch = false;
      let passwordSource = '';
      
      // Try plain text password first
      if (user.password_plain && user.password_plain.trim() !== '') {
        console.log("Checking plain text password");
        passwordMatch = password === user.password_plain;
        passwordSource = 'plain';
        console.log("Plain password match:", passwordMatch);
        console.log("Expected:", user.password_plain, "| Provided:", password);
      }
      
      // If no plain password match, try hashed password
      if (!passwordMatch && user.password_hash && user.password_hash.trim() !== '') {
        console.log("Checking hashed password");
        passwordMatch = password === user.password_hash;
        passwordSource = 'hash';
        console.log("Hash password match:", passwordMatch);
      }
      
      if (!passwordMatch) {
        if (!user.password_plain && !user.password_hash) {
          throw new Error('No password set for this student account. Please contact your teacher to set up your password.');
        } else {
          throw new Error(`Invalid password. Please check your password and try again. (Checked ${passwordSource})`);
        }
      }
      
      console.log("✅ Password verified using", passwordSource);
      
      // Check for student record
      console.log("Checking for student record...");
      const { data: studentRecords, error: studentError } = await supabase
        .from('students')
        .select('id, school_id, teacher_id, course_id')
        .eq('user_id', user.id);
      
      if (studentError) {
        console.error('❌ Error fetching student record:', studentError);
        throw new Error(`Database error: ${studentError.message}`);
      }
      
      if (!studentRecords || studentRecords.length === 0) {
        throw new Error('Student profile not found. Please contact your administrator.');
      }
      
      const studentRecord = studentRecords[0];
      console.log("✅ Student record found");
      
      // Create user session
      const userData = {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        schoolId: user.school_id || studentRecord.school_id
      };
      
      console.log("Creating user session:", userData);
      
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      
      // Dispatch storage event
      window.dispatchEvent(new Event('storage'));
      
      toast({
        title: "Welcome back!",
        description: `Hello, ${user.first_name}! You're now logged in.`,
      });
      
      console.log("✅ Login successful, redirecting...");
      navigate('/student-dashboard');
      
    } catch (error: any) {
      console.error('❌ Login error:', error);
      setError(error.message || 'Login failed. Please try again.');
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
                    autoComplete="email"
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
                    autoComplete="current-password"
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
