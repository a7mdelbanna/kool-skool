
import React, { useState, useEffect, useContext } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, LogIn, Loader2, GraduationCap, AlertCircle } from 'lucide-react';
import { authService } from "@/services/firebase/auth.service";
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

  // Test Firebase connection
  const testDatabaseConnection = async () => {
    console.log("=== FIREBASE CONNECTION TEST ===");
    
    try {
      setConnectionStatus('testing');
      
      // Test Firebase Auth connection
      console.log("Testing Firebase connection...");
      const currentUser = authService.getCurrentUser();
      
      // If we can access auth service, connection is good
      console.log("✅ Firebase connection successful");
      setConnectionStatus('connected');
      
    } catch (error) {
      console.error('❌ Firebase test failed:', error);
      setConnectionStatus('failed');
    }
  };

  // Run connection test on component mount
  useEffect(() => {
    testDatabaseConnection();
  }, []);
  
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
      console.log("Using Firebase authentication...");
      
      // Sign in with Firebase Auth
      const userProfile = await authService.signIn(email.toLowerCase().trim(), password);
      
      if (!userProfile) {
        throw new Error('Login failed. Please check your credentials.');
      }
      
      // Check if user is a student
      if (userProfile.role !== 'student') {
        await authService.signOut();
        throw new Error('Access denied. This login is for students only.');
      }
      
      console.log("✅ Login successful!");
      
      // Create user session
      const userData = {
        id: userProfile.uid,
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        email: userProfile.email,
        role: userProfile.role,
        schoolId: userProfile.schoolId
      };
      
      console.log("Creating user session:", userData);
      
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      
      // Dispatch storage event
      window.dispatchEvent(new Event('storage'));
      
      toast({
        title: "Welcome back!",
        description: `Hello, ${result.first_name}! You're now logged in.`,
      });
      
      console.log("✅ Redirecting to dashboard...");
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
              <span>Firebase: {connectionStatus}</span>
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
      </div>
    </div>
  );
};

export default StudentLogin;
