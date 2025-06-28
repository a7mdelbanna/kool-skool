
import React, { useState, useEffect, useContext } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, LogIn, Loader2, GraduationCap } from 'lucide-react';
import { supabase, UserLoginResponse } from "@/integrations/supabase/client";
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
      
      // Use the custom login endpoint
      const { data, error } = await supabase.rpc('user_login', {
        user_email: email,
        user_password: password
      });
      
      if (error) {
        console.error('Login RPC error:', error);
        throw error;
      }
      
      // Cast data to our custom interface
      const response = (data as unknown) as UserLoginResponse;
      
      if (!response.success) {
        throw new Error(response.message || 'Invalid email or password');
      }
      
      // Check if the user is a student
      if (response.role !== 'student') {
        throw new Error('This login page is for students only. Please use the main login page.');
      }
      
      // Store user information in local storage
      const userData = {
        id: response.user_id,
        firstName: response.first_name,
        lastName: response.last_name,
        email: email,
        role: response.role,
        schoolId: response.school_id
      };
      
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      
      // Dispatch a storage event to notify other tabs
      window.dispatchEvent(new Event('storage'));
      
      toast({
        title: "Welcome back!",
        description: `Hello, ${response.first_name}! You're now logged in.`,
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
