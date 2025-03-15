
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

// License verification schema
const licenseSchema = z.object({
  licenseNumber: z.string().min(4, { message: "License number is required" }),
});

type LicenseFormValues = z.infer<typeof licenseSchema>;

const LicenseVerification: React.FC = () => {
  const { signUp } = useAuth();
  const [isVerifying, setIsVerifying] = useState(false);
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
      console.log("Verifying license:", data.licenseNumber);
      
      const result = await signUp(data.licenseNumber);
      
      console.log("License verification result:", result);
      
      if (result.valid && result.licenseId) {
        toast.success(result.message || "License validated successfully");
        // Use direct navigation to the account creation page with licenseId as URL parameter
        navigate(`/auth/create-account/${result.licenseId}`);
      } else {
        toast.error(result.message || "License verification failed");
      }
    } catch (error) {
      console.error("License verification error:", error);
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
      
      <div className="text-center mt-4">
        <p className="text-sm text-muted-foreground">
          Already have an account? 
          <Button variant="link" className="p-0 ml-1" onClick={() => navigate("/auth")}>Log in</Button>
        </p>
      </div>
    </div>
  );
};

export default LicenseVerification;
