
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
  const { completeSignUp, isLoading } = useAuth();
  const navigate = useNavigate();
  const { licenseId } = useParams<{ licenseId: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidLicense, setIsValidLicense] = useState(true);
  
  // Verify the license exists in the database
  useEffect(() => {
    if (!licenseId) {
      console.error("No license ID provided in URL params");
      toast.error("Invalid license. Please verify your license first.");
      navigate("/auth");
      return;
    }
    
    const checkLicense = async () => {
      try {
        console.log("Checking license ID from URL:", licenseId);
        const { data, error } = await supabase
          .from('licenses')
          .select('*')
          .eq('id', licenseId)
          .maybeSingle(); // Using maybeSingle to avoid error when no record is found
        
        if (error) {
          console.error("Error checking license:", error);
          toast.error("Error validating license. Please try again.");
          setIsValidLicense(false);
          return;
        }
        
        if (!data) {
          console.error("License not found in database");
          toast.error("Invalid license. Please verify your license first.");
          setIsValidLicense(false);
          navigate("/auth");
          return;
        }
        
        // License is valid
        setIsValidLicense(true);
      } catch (error) {
        console.error("License verification error:", error);
        toast.error("Error validating license. Please try again.");
        setIsValidLicense(false);
      }
    };
    
    checkLicense();
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
    if (!licenseId || !isValidLicense) {
      console.error("Invalid license during account creation");
      toast.error("Invalid license. Please verify your license first.");
      navigate("/auth");
      return;
    }
    
    try {
      setIsSubmitting(true);
      console.log("Creating account with license ID:", licenseId);
      
      // Simple user data for initial account creation
      const userData = {
        licenseId: licenseId,
        firstName: "New",
        lastName: "User",
        schoolName: "New School",
      };

      // Call the completeSignUp function with the form data and license info
      const result = await completeSignUp(data.email, data.password, userData);
      
      if (result && result.success) {
        toast.success("Account created successfully!");
        // Redirect to the onboarding flow
        navigate("/onboarding");
      } else {
        const errorMessage = result?.message || "Failed to create account";
        toast.error(errorMessage);
      }
    } catch (error: any) {
      console.error("Account creation error:", error);
      toast.error(error.message || "An error occurred during account creation");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!licenseId || !isValidLicense) {
    return null; // Will redirect in useEffect
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
