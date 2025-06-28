
import React, { useState, useEffect, useContext } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, LogIn, Loader2, School, AlertCircle } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from 'react-router-dom';
import { UserContext } from '@/App';

const Login = () => {
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
      if (parsedUser.role === 'admin' || parsedUser.role === 'teacher') {
        console.log("User already logged in, redirecting to dashboard...");
        navigate('/');
      } else {
        // Clear non-admin/teacher user data
        localStorage.removeItem('user');
      }
    }
  }, [navigate]);

  // Test database connection
  const testDatabaseConnection = async () => {
    console.log("=== DATABASE CONNECTION TEST ===");
    
    try {
      setConnectionStatus('testing');
      
      // Test basic connection by checking for users
      console.log("Testing database connection...");
      const { data: users, error: connectionError } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      if (connectionError) {
        console.error("❌ Database connection failed:", connectionError);
        setConnectionStatus('failed');
        return;
      }
      
      console.log("✅ Database connection successful");
      setConnectionStatus('connected');
      
    } catch (error) {
      console.error('❌ Database test failed:', error);
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
      
      console.log("=== SCHOOL MANAGEMENT LOGIN ATTEMPT ===");
      console.log("Email:", email);
      console.log("Using new verify_school_login function...");
      
      // Use the new database function to verify login
      const { data: loginResults, error: loginError } = await supabase
        .rpc('verify_school_login', {
          p_email: email.toLowerCase().trim(),
          p_password: password
        });
      
      if (loginError) {
        console.error("❌ Login function error:", loginError);
        throw new Error(`Login failed: ${loginError.message}`);
      }
      
      console.log("Login results:", loginResults);
      
      if (!loginResults || loginResults.length === 0) {
        throw new Error('No response from login function');
      }
      
      const result = loginResults[0];
      
      if (!result.success) {
        console.error("❌ Login failed:", result.message);
        throw new Error(result.message);
      }
      
      console.log("✅ Login successful!");
      
      // Create user session
      const userData = {
        id: result.user_id,
        firstName: result.first_name,
        lastName: result.last_name,
        email: result.email,
        role: result.role,
        schoolId: result.school_id
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
      navigate('/');
      
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
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <School className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">School Management</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your school management dashboard
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
              Don't have a school account yet?{' '}
              <Link to="/school-setup" className="text-primary hover:underline">
                Set up your school
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Login;
