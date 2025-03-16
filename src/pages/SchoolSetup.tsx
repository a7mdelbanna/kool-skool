
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { School, CheckCircle, KeyRound, User, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase, SchoolSetupResponse } from "@/integrations/supabase/client";
import { useNavigate } from 'react-router-dom';
import LicenseWidget from '@/components/LicenseWidget';

const SchoolSetup = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    licenseKey: '',
    schoolName: '',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPassword: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = useState({
    licenseKey: '',
    schoolName: '',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPassword: '',
    confirmPassword: ''
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error on change
    if (name in errors) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  const validate = () => {
    const newErrors = {
      licenseKey: '',
      schoolName: '',
      adminFirstName: '',
      adminLastName: '',
      adminEmail: '',
      adminPassword: '',
      confirmPassword: ''
    };
    
    let isValid = true;
    
    // Validate license key
    if (!formData.licenseKey.trim()) {
      newErrors.licenseKey = 'License key is required';
      isValid = false;
    }
    
    // Validate school name
    if (!formData.schoolName.trim()) {
      newErrors.schoolName = 'School name is required';
      isValid = false;
    }
    
    // Validate admin first name
    if (!formData.adminFirstName.trim()) {
      newErrors.adminFirstName = 'First name is required';
      isValid = false;
    }
    
    // Validate admin last name
    if (!formData.adminLastName.trim()) {
      newErrors.adminLastName = 'Last name is required';
      isValid = false;
    }
    
    // Validate admin email
    if (!formData.adminEmail.trim()) {
      newErrors.adminEmail = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.adminEmail)) {
      newErrors.adminEmail = 'Email is invalid';
      isValid = false;
    }
    
    // Validate admin password
    if (!formData.adminPassword) {
      newErrors.adminPassword = 'Password is required';
      isValid = false;
    } else if (formData.adminPassword.length < 8) {
      newErrors.adminPassword = 'Password must be at least 8 characters';
      isValid = false;
    }
    
    // Validate password confirmation
    if (formData.adminPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const { data, error } = await supabase.rpc('verify_license_and_create_school', {
        license_key: formData.licenseKey,
        school_name: formData.schoolName,
        admin_first_name: formData.adminFirstName,
        admin_last_name: formData.adminLastName,
        admin_email: formData.adminEmail,
        admin_password: formData.adminPassword
      });
      
      if (error) {
        throw error;
      }
      
      // Cast data first to unknown, then to our custom interface
      const response = (data as unknown) as SchoolSetupResponse;
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to verify license');
      }

      // After successful school setup, automatically log in the user
      const { data: loginData, error: loginError } = await supabase.rpc('user_login', {
        user_email: formData.adminEmail,
        user_password: formData.adminPassword
      });
      
      if (loginError) {
        // Still show success message even if auto-login fails
        toast({
          title: "School setup complete",
          description: `${formData.schoolName} has been successfully set up! Please log in.`,
        });
        navigate('/login');
        return;
      }
      
      // Store user information in local storage
      localStorage.setItem('user', JSON.stringify({
        id: response.user_id,
        firstName: formData.adminFirstName,
        lastName: formData.adminLastName,
        role: 'admin',
        schoolId: response.school_id
      }));
      
      toast({
        title: "School setup complete",
        description: `${formData.schoolName} has been successfully set up!`,
      });
      
      // Redirect to dashboard
      navigate('/');
      
    } catch (error) {
      console.error('Error during school setup:', error);
      toast({
        title: "School setup failed",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center gap-2 mb-6">
        <School className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">School Setup</h1>
      </div>
      
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Set Up Your School</CardTitle>
              <CardDescription>
                Verify your license and create your administrator account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="licenseKey">License Key</Label>
                  <div className="flex gap-2">
                    <div className="flex-grow flex items-center">
                      <KeyRound className="h-4 w-4 mr-2 text-muted-foreground" />
                      <Input
                        id="licenseKey"
                        name="licenseKey"
                        value={formData.licenseKey}
                        onChange={handleChange}
                        placeholder="Enter your license key"
                        className={errors.licenseKey ? "border-red-500" : ""}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  {errors.licenseKey && (
                    <p className="text-red-500 text-sm flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {errors.licenseKey}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="schoolName">School Name</Label>
                  <Input
                    id="schoolName"
                    name="schoolName"
                    value={formData.schoolName}
                    onChange={handleChange}
                    placeholder="Enter school name"
                    className={errors.schoolName ? "border-red-500" : ""}
                    disabled={isSubmitting}
                  />
                  {errors.schoolName && (
                    <p className="text-red-500 text-sm flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {errors.schoolName}
                    </p>
                  )}
                </div>
                
                <div className="border-t pt-4">
                  <h3 className="text-lg font-medium mb-4">Administrator Account</h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="adminFirstName">First Name</Label>
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2 text-muted-foreground" />
                        <Input
                          id="adminFirstName"
                          name="adminFirstName"
                          value={formData.adminFirstName}
                          onChange={handleChange}
                          placeholder="First name"
                          className={errors.adminFirstName ? "border-red-500" : ""}
                          disabled={isSubmitting}
                        />
                      </div>
                      {errors.adminFirstName && (
                        <p className="text-red-500 text-sm flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> {errors.adminFirstName}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="adminLastName">Last Name</Label>
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2 text-muted-foreground" />
                        <Input
                          id="adminLastName"
                          name="adminLastName"
                          value={formData.adminLastName}
                          onChange={handleChange}
                          placeholder="Last name"
                          className={errors.adminLastName ? "border-red-500" : ""}
                          disabled={isSubmitting}
                        />
                      </div>
                      {errors.adminLastName && (
                        <p className="text-red-500 text-sm flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> {errors.adminLastName}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="adminEmail">Email Address</Label>
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                      <Input
                        id="adminEmail"
                        name="adminEmail"
                        type="email"
                        value={formData.adminEmail}
                        onChange={handleChange}
                        placeholder="admin@school.com"
                        className={errors.adminEmail ? "border-red-500" : ""}
                        disabled={isSubmitting}
                      />
                    </div>
                    {errors.adminEmail && (
                      <p className="text-red-500 text-sm flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {errors.adminEmail}
                      </p>
                    )}
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="adminPassword">Password</Label>
                      <div className="flex items-center">
                        <Lock className="h-4 w-4 mr-2 text-muted-foreground" />
                        <Input
                          id="adminPassword"
                          name="adminPassword"
                          type="password"
                          value={formData.adminPassword}
                          onChange={handleChange}
                          placeholder="Create password"
                          className={errors.adminPassword ? "border-red-500" : ""}
                          disabled={isSubmitting}
                        />
                      </div>
                      {errors.adminPassword && (
                        <p className="text-red-500 text-sm flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> {errors.adminPassword}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <div className="flex items-center">
                        <Lock className="h-4 w-4 mr-2 text-muted-foreground" />
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          type="password"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          placeholder="Confirm password"
                          className={errors.confirmPassword ? "border-red-500" : ""}
                          disabled={isSubmitting}
                        />
                      </div>
                      {errors.confirmPassword && (
                        <p className="text-red-500 text-sm flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> {errors.confirmPassword}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full mt-6" 
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete School Setup
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <LicenseWidget />
          
          <Card>
            <CardHeader>
              <CardTitle>Setup Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    1
                  </div>
                  <p className="text-sm">Enter your license key to verify your subscription</p>
                </div>
                
                <div className="flex gap-2">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    2
                  </div>
                  <p className="text-sm">Set up your school information</p>
                </div>
                
                <div className="flex gap-2">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    3
                  </div>
                  <p className="text-sm">Create your administrator account</p>
                </div>
                
                <div className="flex gap-2">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    4
                  </div>
                  <p className="text-sm">You can add team members afterward from the Team Access page</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SchoolSetup;
