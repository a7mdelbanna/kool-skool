
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
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LicenseData } from "./LicenseVerification";

// Account details schema
const accountSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  schoolName: z.string().min(1, { message: "School name is required" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
  confirmPassword: z.string().min(8, { message: "Password must be at least 8 characters" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type AccountFormValues = z.infer<typeof accountSchema>;

// Define props interface for AccountCreation
export interface AccountCreationProps {
  licenseData: LicenseData;
}

const AccountCreation: React.FC<AccountCreationProps> = ({ licenseData }) => {
  const { completeSignUp, isLoading } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Redirect if no license data is available
  useEffect(() => {
    console.log("AccountCreation loaded with licenseData:", licenseData);
    if (!licenseData?.licenseId) {
      toast.error("Invalid license. Please verify your license first.");
      navigate("/auth");
    }
  }, [licenseData, navigate]);
  
  const accountForm = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      schoolName: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleSubmit = async (data: AccountFormValues) => {
    if (!licenseData?.licenseId) {
      toast.error("Invalid license. Please verify your license first.");
      navigate("/auth");
      return;
    }
    
    try {
      setIsSubmitting(true);
      console.log("Creating account with license ID:", licenseData.licenseId);
      console.log("License number:", licenseData.licenseNumber);
      
      // Initial user data for account creation
      const userData = {
        licenseId: licenseData.licenseId,
        licenseNumber: licenseData.licenseNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        schoolName: data.schoolName,
        role: "admin", // Set as admin since they're creating the school
      };

      await completeSignUp(data.email, data.password, userData);
      toast.success("Account created successfully!");
      
      // Redirect to the onboarding flow
      navigate("/onboarding");
    } catch (error: any) {
      console.error("Account creation error:", error);
      toast.error(error.message || "An error occurred during account creation");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!licenseData?.licenseId) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="p-4 w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Create Your Account</CardTitle>
            <CardDescription>Enter your information to complete signup</CardDescription>
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
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={accountForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={accountForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={accountForm.control}
                  name="schoolName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>School Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter school name" {...field} />
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
