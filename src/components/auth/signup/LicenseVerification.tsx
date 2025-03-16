
import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Key } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// License verification form schema
const licenseSchema = z.object({
  licenseNumber: z.string().min(6, { message: "License number must be at least 6 characters" }),
});

type LicenseFormValues = z.infer<typeof licenseSchema>;

// Define the license data interface
export interface LicenseData {
  licenseId: string;
  licenseNumber: string;
}

interface LicenseVerificationProps {
  onLicenseVerified: (licenseData: LicenseData) => void;
}

const LicenseVerification: React.FC<LicenseVerificationProps> = ({ onLicenseVerified }) => {
  const { signUp } = useAuth();
  const [isVerifying, setIsVerifying] = useState(false);

  const form = useForm<LicenseFormValues>({
    resolver: zodResolver(licenseSchema),
    defaultValues: {
      licenseNumber: "",
    },
  });

  const onSubmit = async (values: LicenseFormValues) => {
    try {
      setIsVerifying(true);
      
      // Call the license verification function
      console.log("Submitting license:", values.licenseNumber);
      const result = await signUp(values.licenseNumber);
      console.log("License verification result:", result);
      
      if (result.valid) {
        // Create the license data object with the verified data
        const licenseData: LicenseData = {
          licenseId: result.licenseId || "",
          licenseNumber: values.licenseNumber
        };
        
        toast.success("License verified successfully");
        console.log("License verified, passing data to parent:", licenseData);
        
        // Force a small delay to ensure state updates properly
        setTimeout(() => {
          // Call the callback with the license data
          onLicenseVerified(licenseData);
        }, 100);
      } else {
        toast.error(result.message || "License verification failed");
      }
    } catch (error) {
      console.error("License verification error:", error);
      toast.error("An error occurred during verification");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-xl">Verify Your License</CardTitle>
        <CardDescription>
          Enter your license number to activate your school account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="licenseNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>License Number</FormLabel>
                  <FormControl>
                    <div className="flex items-center">
                      <Key className="w-4 h-4 mr-2 text-muted-foreground" />
                      <Input placeholder="Enter your license number" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isVerifying}>
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
      </CardContent>
    </Card>
  );
};

export default LicenseVerification;
