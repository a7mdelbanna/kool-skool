
import React, { useState, useEffect, useContext } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, LogIn, Loader2, Shield, AlertCircle } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from 'react-router-dom';
import { UserContext } from '@/App';

const SuperAdminLogin = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { setUser } = useContext(UserContext);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Check if we're already authenticated as super admin and redirect if so
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      const parsedUser = JSON.parse(user);
      if (parsedUser.role === 'superadmin') {
        console.log("Super admin already logged in, redirecting to dashboard...");
        navigate('/superadmin');
      } else {
        // Clear non-super admin user data
        localStorage.removeItem('user');
      }
    }
  }, [navigate]);
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    
    try {
      setLoading(true);
      
      console.log("=== SUPER ADMIN LOGIN ATTEMPT ===");
      console.log("Email:", email);
      
      // Use the new database function to verify super admin login
      const { data: loginResults, error: loginError } = await supabase
        .rpc('verify_superadmin_login', {
          p_email: email.toLowerCase().trim(),
          p_password: password
        });
      
      if (loginError) {
        console.error("❌ Super admin login function error:", loginError);
        throw new Error(`Login failed: ${loginError.message}`);
      }
      
      console.log("Super admin login results:", loginResults);
      
      if (!loginResults || loginResults.length === 0) {
        throw new Error('No response from login function');
      }
      
      const result = loginResults[0];
      
      if (!result.success) {
        console.error("❌ Super admin login failed:", result.message);
        throw new Error(result.message);
      }
      
      console.log("✅ Super admin login successful!");
      
      // Create user session for super admin
      const userData = {
        id: result.user_id,
        firstName: result.first_name,
        lastName: result.last_name,
        email: result.email,
        role: result.role,
        schoolId: null // Super admin has no school
      };
      
      console.log("Creating super admin session:", userData);
      
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      
      // Dispatch storage event
      window.dispatchEvent(new Event('storage'));
      
      toast({
        title: "Welcome Super Admin!",
        description: `Hello, ${result.first_name}! You're now logged in.`,
      });
      
      console.log("✅ Redirecting to super admin dashboard...");
      navigate('/superadmin');
      
    } catch (error: any) {
      console.error('❌ Super admin login error:', error);
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
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-4">
        <Card>
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Super Admin Portal</CardTitle>
            <CardDescription className="text-center">
              Access the license management system
            </CardDescription>
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
                    placeholder="superadmin@example.com"
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
                className="w-full bg-red-600 hover:bg-red-700"
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
                    Super Admin Login
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-center text-muted-foreground">
              Need school access?{' '}
              <Link to="/login" className="text-primary hover:underline">
                School Login
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default SuperAdminLogin;
