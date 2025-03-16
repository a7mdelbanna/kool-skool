import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

// Account details schema
const accountSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
  confirmPassword: z.string().min(8, { message: "Password must be at least 8 characters" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type AccountFormValues = z.infer<typeof accountSchema>;

const AccountCreation: React.FC = () => {
  const { completeSignUp, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const { licenseId } = useParams<{ licenseId: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [licenseInfo, setLicenseInfo] = useState<{ license_number: string } | null>(null);
  const [licenseError, setLicenseError] = useState<string | null>(null);
  
  // Check if user is already signed in and redirect to onboarding if needed
  useEffect(() => {
    if (user) {
      console.log("User already signed in, redirecting to onboarding");
      navigate("/onboarding");
    }
  }, [user, navigate]);
  
  // Fetch license information when the component mounts
  useEffect(() => {
    // First check if we have a valid licenseId from params
    if (!licenseId) {
      setLicenseError("Invalid license. Please verify your license first.");
      toast.error("Invalid license. Please verify your license first.");
      navigate("/auth");
      return;
    }
    
    // Try to get stored license number from session storage first
    const storedLicenseNumber = sessionStorage.getItem('licenseNumber');
    const storedLicenseId = sessionStorage.getItem('licenseId');
    
    if (storedLicenseNumber && storedLicenseId === licenseId) {
      console.log("Using stored license info:", { number: storedLicenseNumber, id: storedLicenseId });
      setLicenseInfo({ license_number: storedLicenseNumber });
      return;
    }
    
    // Otherwise fetch from database using RPC function
    const fetchLicenseInfo = async () => {
      try {
        setLicenseError(null);
        
        // Use RPC function instead of direct query
        const { data, error } = await supabase
          .rpc('get_license_by_id', { license_id_param: licenseId });
          
        if (error) {
          console.error("Error fetching license:", error);
          setLicenseError("Could not fetch license information. Please try again.");
          toast.error("Could not fetch license information. Please try again.");
          return;
        }
        
        if (!data || data.length === 0) {
          console.error("License not found or invalid data format", data);
          setLicenseError("License not found. Please verify your license first.");
          toast.error("License not found. Please verify your license first.");
          navigate("/auth");
          return;
        }
        
        console.log("Successfully fetched license info:", data);
        setLicenseInfo({ license_number: data[0].license_number });
        
        // Store in session storage for future use
        sessionStorage.setItem('licenseNumber', data[0].license_number);
        sessionStorage.setItem('licenseId', licenseId);
      } catch (err) {
        console.error("Error in fetchLicenseInfo:", err);
        setLicenseError("An unexpected error occurred. Please try again.");
        toast.error("An unexpected error occurred. Please try again.");
        navigate("/auth");
      }
    };
    
    fetchLicenseInfo();
  }, [licenseId, navigate]);
  
  const accountForm = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleSubmit = async (data: AccountFormValues) => {
    if (!licenseId || !licenseInfo) {
      toast.error("Invalid license. Please verify your license first.");
      navigate("/auth");
      return;
    }
    
    try {
      setIsSubmitting(true);
      console.log("Creating account with license ID:", licenseId);
      console.log("License number:", licenseInfo.license_number);
      
      // Simple user data for initial account creation
      const userData = {
        licenseId: licenseId,
        licenseNumber: licenseInfo.license_number,
        firstName: "New",
        lastName: "User",
        schoolName: "New School",
      };

      const result = await completeSignUp(data.email, data.password, userData);
      
      if (result && result.success) {
        toast.success("Account created successfully!");
        console.log("Account created successfully, redirecting to onboarding");
        
        // Wait a moment for the auth state to update
        setTimeout(() => {
          navigate("/onboarding");
        }, 500);
      } else {
        toast.error(result?.error || "Failed to create account");
      }
    } catch (error: any) {
      console.error("Account creation error:", error);
      toast.error(error.message || "An error occurred during account creation");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (licenseError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted">
        <div className="p-4 w-full max-w-md">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">License Error</CardTitle>
              <CardDescription>{licenseError}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                onClick={() => navigate("/auth")}
              >
                Go Back to Sign Up
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!licenseInfo) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted">
        <div className="p-4 w-full max-w-md text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="mt-4">Loading license information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="p-4 w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Create Your Account</CardTitle>
            <CardDescription>Enter your credentials to complete signup</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...accountForm}>
              <form 
                onSubmit={accountForm.handleSubmit(handleSubmit)} 
                className="space-y-4"
              >
                <FormField
                  control={accountForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="your@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={accountForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={accountForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSubmitting || isLoading}
                >
                  {isSubmitting || isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
                
                <div className="text-center mt-4">
                  <p className="text-sm text-muted-foreground">
                    Already have an account? 
                    <Button variant="link" className="p-0 ml-1" onClick={() => navigate("/auth")}>
                      Log in
                    </Button>
                  </p>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccountCreation;
