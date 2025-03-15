
import React from "react";
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

interface AccountCreationProps {
  licenseId: string;
}

const AccountCreation: React.FC<AccountCreationProps> = ({ licenseId }) => {
  const { completeSignUp, isLoading } = useAuth();
  const navigate = useNavigate();
  
  const accountForm = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleSubmit = async (data: AccountFormValues) => {
    try {
      // Simple user data for initial account creation
      const userData = {
        licenseId: licenseId,
        firstName: "New",
        lastName: "User",
        schoolName: "New School",
      };

      await completeSignUp(data.email, data.password, userData);
      toast.success("Account created successfully!");
      navigate("/");
    } catch (error: any) {
      console.error("Account creation error:", error);
      toast.error(error.message || "An error occurred during account creation");
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">Create Your Account</h1>
        <p className="text-muted-foreground">Enter your credentials to complete signup</p>
      </div>

      <Form {...accountForm}>
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            accountForm.handleSubmit(handleSubmit)(e);
          }} 
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
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default AccountCreation;
