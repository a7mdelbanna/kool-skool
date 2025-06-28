
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
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      setLoading(true);
      
      console.log("Attempting student login with email:", email);
      
      // First, let's check if there are ANY users with this email (without role filter)
      const { data: allUsers, error: allUsersError } = await supabase
        .from('users')
        .select('id, email, role, first_name, last_name, school_id, password_plain, password_hash')
        .eq('email', email);
      
      console.log("All users with this email:", { allUsers, allUsersError });
      
      // Now check specifically for students
      const { data: users, error: userError } = await supabase
        .from('users')
        .select(`
          id,
          email,
          first_name,
          last_name,
          role,
          school_id,
          password_plain,
          password_hash
        `)
        .eq('email', email)
        .eq('role', 'student');
      
      console.log("Student users query result:", { users, userError });
      
      if (userError) {
        throw new Error('Database error: ' + userError.message);
      }
      
      // If no students found, but other users found, give specific error
      if ((!users || users.length === 0) && allUsers && allUsers.length > 0) {
        const userRole = allUsers[0].role;
        throw new Error(`User found but with role '${userRole}'. This login is for students only. Please use the main login page.`);
      }
      
      if (!users || users.length === 0) {
        throw new Error('No student found with this email address');
      }
      
      const user = users[0];
      console.log("Found user:", { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        hasPlainPassword: !!user.password_plain,
        hasHashPassword: !!user.password_hash,
        plainPasswordValue: user.password_plain, // For debugging
        hashPasswordValue: user.password_hash ? 'exists' : 'null'
      });
      
      // Check password - try plain text first, then hash
      let passwordMatch = false;
      
      if (user.password_plain) {
        console.log("Checking against plain password:", user.password_plain);
        passwordMatch = password === user.password_plain;
        console.log("Plain password match:", passwordMatch, "Input:", password, "Stored:", user.password_plain);
      } else if (user.password_hash) {
        console.log("Checking against hashed password");
        // For now, we'll assume the hash check would be done server-side
        // This is a temporary solution - in production you'd want proper bcrypt checking
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
      
      // Store user information in local storage
      const userData = {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        schoolId: user.school_id
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
      <Card className="w-full max-w-md">
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
    </div>
  );
};

export default StudentLogin;
