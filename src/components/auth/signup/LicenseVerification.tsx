
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

// License verification schema
const licenseSchema = z.object({
  licenseNumber: z.string().min(4, { message: "License number is required" }),
});

type LicenseFormValues = z.infer<typeof licenseSchema>;

const LicenseVerification: React.FC = () => {
  const { signUp } = useAuth();
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  
  const licenseForm = useForm<LicenseFormValues>({
    resolver: zodResolver(licenseSchema),
    defaultValues: {
      licenseNumber: "",
    },
  });

  const verifyLicense = async (data: LicenseFormValues) => {
    try {
      setIsVerifying(true);
      setError(null);
      console.log("Verifying license:", data.licenseNumber);
      
      // Check if license exists in database
      const { data: licenses, error: licenseError } = await supabase
        .from('licenses')
        .select('id, is_active, used_by')
        .eq('license_number', data.licenseNumber)
        .eq('is_active', true);
      
      if (licenseError) {
        console.error("License verification error:", licenseError);
        setError(licenseError.message || "An error occurred during license verification");
        toast.error("An error occurred during license verification");
        return;
      }
      
      console.log("License query results:", licenses);
      
      if (!licenses || licenses.length === 0) {
        setError("Invalid or already used license number");
        toast.error("Invalid or already used license number");
        return;
      }
      
      const license = licenses[0];
      
      // Get current user, if any
      const { data: userData } = await supabase.auth.getUser();
      const currentUser = userData?.user?.id;
      
      // For a new license, used_by will be null
      // For an existing license, check if it's already used by another user
      if (license.used_by && license.used_by !== currentUser) {
        setError("This license is already in use by another account");
        toast.error("This license is already in use by another account");
        return;
      }
      
      // License is valid
      toast.success("License validated successfully");
      
      // Store complete license info in sessionStorage
      sessionStorage.setItem('licenseNumber', data.licenseNumber);
      sessionStorage.setItem('licenseId', license.id);
      
      // Navigate to account creation with license ID
      navigate(`/auth/create-account/${license.id}`);
      
    } catch (error: any) {
      console.error("License verification error:", error);
      setError(error.message || "An error occurred during license verification");
      toast.error("An error occurred during license verification");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">License Verification</h1>
        <p className="text-muted-foreground">Enter your license number to get started</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form {...licenseForm}>
        <form 
          onSubmit={licenseForm.handleSubmit(verifyLicense)} 
          className="space-y-4"
        >
          <FormField
            control={licenseForm.control}
            name="licenseNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>License Number</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter your license number"
                    {...field}
                    disabled={isVerifying}
                  />
                </FormControl>
                <FormDescription>
                  Enter the license number provided to your school
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isVerifying}
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify License"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default LicenseVerification;
