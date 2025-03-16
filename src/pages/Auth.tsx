
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, LogIn, UserPlus, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

const signupSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  confirmPassword: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  licenseNumber: z.string().min(1, { message: 'License number is required' }),
  schoolName: z.string().min(1, { message: 'School name is required' }),
  firstName: z.string().min(1, { message: 'First name is required' }),
  lastName: z.string().min(1, { message: 'Last name is required' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;

const Auth = () => {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [licenseVerified, setLicenseVerified] = useState(false);
  const [verifyingLicense, setVerifyingLicense] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      licenseNumber: '',
      schoolName: '',
      firstName: '',
      lastName: '',
    },
  });

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate('/');
      }
    };
    
    checkSession();
    
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          navigate('/');
        }
      }
    );
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const onLoginSubmit = async (data: LoginFormValues) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) throw error;

      toast({
        title: 'Login successful',
        description: 'Welcome back!',
      });
    } catch (error: any) {
      toast({
        title: 'Login failed',
        description: error.message || 'Please check your credentials and try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyLicense = async () => {
    const licenseNumber = signupForm.getValues('licenseNumber');
    if (!licenseNumber) {
      signupForm.setError('licenseNumber', {
        type: 'manual',
        message: 'Please enter a license number',
      });
      return;
    }

    try {
      setVerifyingLicense(true);
      
      const { data: licenseData, error: licenseError } = await supabase
        .rpc('verify_license', { license_number_param: licenseNumber });
      
      if (licenseError) {
        console.error('License verification error:', licenseError);
        throw licenseError;
      }
      
      if (!licenseData || !Array.isArray(licenseData) || licenseData.length === 0) {
        throw new Error('Invalid license number or license has expired');
      }
      
      setLicenseVerified(true);
      toast({
        title: 'License verified',
        description: 'License is valid. You can proceed with creating your account.',
      });
    } catch (error: any) {
      console.error('License verification failed:', error);
      toast({
        title: 'License verification failed',
        description: error.message || 'Invalid license number',
        variant: 'destructive',
      });
      setLicenseVerified(false);
    } finally {
      setVerifyingLicense(false);
    }
  };

  const onSignupSubmit = async (data: SignupFormValues) => {
    if (!licenseVerified) {
      toast({
        title: 'License not verified',
        description: 'Please verify your license before creating an account',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      console.log('Starting signup process...');
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName
          },
          // Disable email confirmation for development
          emailRedirectTo: window.location.origin
        }
      });

      if (authError) {
        console.error('Auth error during signup:', authError);
        throw authError;
      }
      
      console.log('User account created successfully:', authData.user?.id);
      
      if (authData.user) {
        const { data: licenseData, error: licenseError } = await supabase
          .rpc('verify_license', { license_number_param: data.licenseNumber });
        
        if (licenseError) {
          console.error('License verification error during signup:', licenseError);
          throw licenseError;
        }
        
        if (!licenseData || !Array.isArray(licenseData) || licenseData.length === 0) {
          console.error('License validation failed during signup');
          throw new Error('License validation failed');
        }
        
        console.log('License verified successfully:', licenseData[0].license_id);
        
        const { data: schoolData, error: schoolError } = await supabase
          .rpc('create_school_and_associate_director', {
            license_id_param: licenseData[0].license_id,
            school_name_param: data.schoolName
          });
        
        if (schoolError) {
          console.error("School creation error:", schoolError);
          throw schoolError;
        }
        
        console.log('School created successfully with ID:', schoolData);
        
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({
            first_name: data.firstName,
            last_name: data.lastName
          })
          .eq('id', authData.user.id);
          
        if (profileUpdateError) {
          console.error("Profile update error:", profileUpdateError);
        }
        
        toast({
          title: 'Account created',
          description: 'Your account has been created and associated with your school.',
        });
        
        // Auto sign-in after successful signup
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });
        
        if (signInError) {
          console.error("Auto sign-in error:", signInError);
          toast({
            title: 'Please sign in',
            description: 'Your account has been created. Please sign in with your credentials.',
          });
        } else {
          // Navigate should happen automatically due to the auth state change listener
          console.log("Auto sign-in successful");
        }
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      toast({
        title: 'Signup failed',
        description: error.message || 'Please try again with different credentials',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLicenseChange = () => {
    setLicenseVerified(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <Card className="w-full">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">School CRM</CardTitle>
            <CardDescription className="text-center">
              {tab === 'login' ? 'Login to manage your school' : 'Create your school account'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(t) => setTab(t as 'login' | 'signup')}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="your.email@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showPassword ? "text" : "password"} 
                                placeholder="Password" 
                                {...field} 
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
                          <span>Logging in...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <LogIn size={16} />
                          <span>Login</span>
                        </div>
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="signup">
                <Form {...signupForm}>
                  <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
                    <div className="p-4 border rounded-lg mb-4 bg-gray-50">
                      <h3 className="font-medium mb-2 flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        License Verification
                      </h3>
                      
                      <div className="space-y-4">
                        <FormField
                          control={signupForm.control}
                          name="licenseNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>License Number</FormLabel>
                              <FormControl>
                                <div className="flex gap-2">
                                  <Input 
                                    placeholder="Enter your license number" 
                                    {...field} 
                                    onChange={(e) => {
                                      field.onChange(e);
                                      handleLicenseChange();
                                    }}
                                    disabled={licenseVerified}
                                    className={licenseVerified ? "bg-green-50 border-green-200" : ""}
                                  />
                                  <Button 
                                    type="button" 
                                    onClick={verifyLicense} 
                                    disabled={verifyingLicense || licenseVerified}
                                    size="sm"
                                  >
                                    {verifyingLicense ? (
                                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
                                    ) : licenseVerified ? "Verified" : "Verify"}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {licenseVerified && (
                          <FormField
                            control={signupForm.control}
                            name="schoolName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>School Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter your school name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    </div>
                    
                    {licenseVerified && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={signupForm.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>First Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="First name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={signupForm.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Last Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Last name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={signupForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input placeholder="your.email@example.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={signupForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    type={showPassword ? "text" : "password"} 
                                    placeholder="Password" 
                                    {...field} 
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full px-3"
                                    onClick={() => setShowPassword(!showPassword)}
                                  >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={signupForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirm Password</FormLabel>
                              <FormControl>
                                <Input 
                                  type={showPassword ? "text" : "password"} 
                                  placeholder="Confirm password" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loading || !licenseVerified}
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
                          <span>Creating account...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <UserPlus size={16} />
                          <span>Create Account</span>
                        </div>
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <div className="text-xs text-gray-500 text-center">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
