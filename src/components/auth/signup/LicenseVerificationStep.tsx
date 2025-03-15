
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";

// License verification step schema
const licenseSchema = z.object({
  licenseNumber: z.string().min(4, { message: "License number is required" }),
});

type LicenseFormValues = z.infer<typeof licenseSchema>;

interface LicenseVerificationStepProps {
  onLicenseVerified: (licenseId: string) => void;
  isLoading: boolean;
  verifyLicense: (licenseNumber: string) => Promise<{valid: boolean; message: string; licenseId: string | null}>;
}

const LicenseVerificationStep: React.FC<LicenseVerificationStepProps> = ({ 
  onLicenseVerified, 
  isLoading,
  verifyLicense
}) => {
  const licenseForm = useForm<LicenseFormValues>({
    resolver: zodResolver(licenseSchema),
    defaultValues: {
      licenseNumber: "",
    },
  });

  const handleSubmit = async (data: LicenseFormValues) => {
    try {
      console.log("Submitting license number:", data.licenseNumber);
      
      const result = await verifyLicense(data.licenseNumber);
      
      console.log("License verification result:", result);
      
      if (result.valid && result.licenseId) {
        toast.success(result.message || "License validated successfully");
        onLicenseVerified(result.licenseId);
      } else {
        toast.error(result.message || "License verification failed");
      }
    } catch (error) {
      console.error("License verification error:", error);
      toast.error("An error occurred during license verification");
    }
  };

  return (
    <Form {...licenseForm}>
      <form 
        // Important: Using onSubmit directly to prevent form reloads
        onSubmit={(e) => {
          e.preventDefault();
          licenseForm.handleSubmit(handleSubmit)(e);
        }} 
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
                  disabled={isLoading}
                />
              </FormControl>
              <FormDescription>
                Enter the license number provided to your school
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              Verify License
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </form>
    </Form>
  );
};

export default LicenseVerificationStep;
