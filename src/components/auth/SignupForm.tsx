
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ArrowRight, ArrowLeft, Upload } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// License verification step schema
const licenseSchema = z.object({
  licenseNumber: z.string().length(16, { message: "License number must be exactly a 16-character code" }),
});

// Account details schema
const accountSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Profile details schema
const profileSchema = z.object({
  firstName: z.string().min(2, { message: "First name must be at least 2 characters" }),
  lastName: z.string().min(2, { message: "Last name must be at least 2 characters" }),
  role: z.string().min(1, { message: "Please select a role" }),
  schoolName: z.string().min(2, { message: "School name must be at least 2 characters" }),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  telegram: z.string().optional(),
});

type LicenseFormValues = z.infer<typeof licenseSchema>;
type AccountFormValues = z.infer<typeof accountSchema>;
type ProfileFormValues = z.infer<typeof profileSchema>;

const roles = [
  { value: "director", label: "School Director" },
  { value: "teacher", label: "Teacher" },
  { value: "manager", label: "Manager" },
  { value: "admin", label: "Administrator" },
];

const SignupForm = () => {
  const { signUp, completeSignUp, isLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [licenseData, setLicenseData] = useState<{ licenseId: string | null }>({ licenseId: null });
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // License verification form
  const licenseForm = useForm<LicenseFormValues>({
    resolver: zodResolver(licenseSchema),
    defaultValues: {
      licenseNumber: "",
    },
  });

  // Account details form
  const accountForm = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Profile details form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      role: "director",
      schoolName: "",
      phone: "",
      whatsapp: "",
      telegram: "",
    },
  });

  const handleLicenseSubmit = async (data: LicenseFormValues) => {
    const result = await signUp(data.licenseNumber);
    
    if (result.valid) {
      setLicenseData({ licenseId: result.licenseId });
      setStep(2);
    }
  };

  const handleAccountSubmit = (data: AccountFormValues) => {
    setStep(3);
  };

  const handleProfileSubmit = async (data: ProfileFormValues) => {
    await completeSignUp(
      accountForm.getValues().email,
      accountForm.getValues().password,
      {
        ...data,
        licenseId: licenseData.licenseId,
        profilePicture: profileImage,
      }
    );
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      licenseForm.setError("licenseNumber", { message: "Image size should be less than 5MB" });
      return;
    }
    
    if (!file.type.startsWith("image/")) {
      licenseForm.setError("licenseNumber", { message: "Only image files are allowed" });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setProfileImage(result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      {step === 1 && (
        <Form {...licenseForm}>
          <form onSubmit={licenseForm.handleSubmit(handleLicenseSubmit)} className="space-y-4">
            <FormField
              control={licenseForm.control}
              name="licenseNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>License Number</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter your 16-character license code" 
                      {...field} 
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter the 16-character license code provided to your school.
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
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </Form>
      )}

      {step === 2 && (
        <Form {...accountForm}>
          <form onSubmit={accountForm.handleSubmit(handleAccountSubmit)} className="space-y-4">
            <FormField
              control={accountForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="your-email@example.com" 
                      type="email" 
                      {...field} 
                      disabled={isLoading}
                    />
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
                    <Input 
                      placeholder="••••••••" 
                      type="password" 
                      {...field} 
                      disabled={isLoading}
                    />
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
                    <Input 
                      placeholder="••••••••" 
                      type="password" 
                      {...field} 
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-between pt-2">
              <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={isLoading}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button type="submit" disabled={isLoading}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </form>
        </Form>
      )}

      {step === 3 && (
        <Form {...profileForm}>
          <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
            <div className="flex flex-col items-center mb-4">
              <Avatar className="h-24 w-24 mb-2">
                <AvatarImage src={profileImage || ""} />
                <AvatarFallback>
                  {profileForm.watch("firstName")[0]}{profileForm.watch("lastName")[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center">
                <input 
                  type="file" 
                  id="profile-pic" 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isLoading}
                />
                <label htmlFor="profile-pic">
                  <Button type="button" variant="outline" size="sm" className="cursor-pointer" asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Photo
                    </span>
                  </Button>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={profileForm.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="First Name" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={profileForm.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Last Name" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={profileForm.control}
              name="schoolName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>School Name</FormLabel>
                  <FormControl>
                    <Input placeholder="School Name" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={profileForm.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={profileForm.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Phone Number" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={profileForm.control}
                name="whatsapp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp</FormLabel>
                    <FormControl>
                      <Input placeholder="WhatsApp (optional)" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={profileForm.control}
                name="telegram"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telegram</FormLabel>
                    <FormControl>
                      <Input placeholder="Telegram Username (optional)" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-between pt-2">
              <Button type="button" variant="outline" onClick={() => setStep(2)} disabled={isLoading}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Complete Setup"
                )}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
};

export default SignupForm;
