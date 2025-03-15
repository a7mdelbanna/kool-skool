
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ArrowRight, ArrowLeft, Upload, UserPlus, Plus, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import confetti from "canvas-confetti";

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
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  telegram: z.string().optional(),
  instagram: z.string().optional(),
});

// School details schema
const schoolSchema = z.object({
  schoolName: z.string().min(2, { message: "School name must be at least 2 characters" }),
  schoolPhone: z.string().optional(),
  schoolWhatsapp: z.string().optional(),
  schoolTelegram: z.string().optional(),
  schoolInstagram: z.string().optional(),
  skipSchoolDetails: z.boolean().optional(),
});

// Team members schema
const teamMemberSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  role: z.string().min(1, { message: "Please select a role" }),
});

const teamSchema = z.object({
  teamMembers: z.array(teamMemberSchema).optional(),
  skipTeamSetup: z.boolean().optional(),
});

type LicenseFormValues = z.infer<typeof licenseSchema>;
type AccountFormValues = z.infer<typeof accountSchema>;
type ProfileFormValues = z.infer<typeof profileSchema>;
type SchoolFormValues = z.infer<typeof schoolSchema>;
type TeamFormValues = z.infer<typeof teamSchema>;

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
  const [schoolLogo, setSchoolLogo] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<{ email: string; role: string }[]>([]);

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
      phone: "",
      whatsapp: "",
      telegram: "",
      instagram: "",
    },
  });

  // School details form
  const schoolForm = useForm<SchoolFormValues>({
    resolver: zodResolver(schoolSchema),
    defaultValues: {
      schoolName: "",
      schoolPhone: "",
      schoolWhatsapp: "",
      schoolTelegram: "",
      schoolInstagram: "",
      skipSchoolDetails: false,
    },
  });

  // Team setup form
  const teamForm = useForm<TeamFormValues>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      teamMembers: [],
      skipTeamSetup: false,
    },
  });

  const handleLicenseSubmit = async (data: LicenseFormValues) => {
    try {
      const result = await signUp(data.licenseNumber);
      
      console.log("License verification result:", result);
      
      if (result.valid) {
        setLicenseData({ licenseId: result.licenseId });
        toast.success(result.message || "License validated successfully");
        setStep(2);
      } else {
        toast.error(result.message || "License verification failed");
      }
    } catch (error) {
      console.error("License verification error:", error);
      toast.error("An error occurred during license verification");
    }
  };

  const handleAccountSubmit = (data: AccountFormValues) => {
    setStep(3);
  };

  const handleProfileSubmit = (data: ProfileFormValues) => {
    setStep(4);
  };

  const handleSchoolSubmit = (data: SchoolFormValues) => {
    if (data.skipSchoolDetails) {
      setStep(5);
      return;
    }
    
    // If school details are provided, update state and proceed
    setStep(5);
  };

  const handleTeamSubmit = async (data: TeamFormValues) => {
    // Combine all form data
    const profileData = profileForm.getValues();
    const schoolData = schoolForm.getValues();

    const userData = {
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      role: profileData.role,
      phone: profileData.phone,
      whatsapp: profileData.whatsapp,
      telegram: profileData.telegram,
      instagram: profileData.instagram,
      schoolName: schoolData.schoolName,
      schoolLogo: schoolLogo,
      schoolPhone: schoolData.schoolPhone,
      schoolWhatsapp: schoolData.schoolWhatsapp,
      schoolTelegram: schoolData.schoolTelegram,
      schoolInstagram: schoolData.schoolInstagram,
      teamMembers: data.skipTeamSetup ? [] : teamMembers,
      licenseId: licenseData.licenseId,
      profilePicture: profileImage,
    };

    try {
      await completeSignUp(
        accountForm.getValues().email,
        accountForm.getValues().password,
        userData
      );
      
      // Trigger confetti animation
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (error) {
      console.error("Signup completion error:", error);
      toast.error("An error occurred while completing signup");
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, setImage: (image: string | null) => void) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }
    
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImage(result);
    };
    reader.readAsDataURL(file);
  };

  const addTeamMember = () => {
    const email = teamForm.getValues("teamMembers")?.[0]?.email || "";
    const role = teamForm.getValues("teamMembers")?.[0]?.role || "teacher";
    
    if (!email) {
      toast.error("Please enter an email address");
      return;
    }
    
    if (!z.string().email().safeParse(email).success) {
      toast.error("Please enter a valid email address");
      return;
    }
    
    setTeamMembers([...teamMembers, { email, role }]);
    
    // Reset the input fields
    teamForm.setValue("teamMembers", [{ email: "", role: "teacher" }]);
  };

  const removeTeamMember = (index: number) => {
    setTeamMembers(teamMembers.filter((_, i) => i !== index));
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
            <h2 className="text-xl font-semibold mb-2">Account Details</h2>
            <p className="text-sm text-muted-foreground mb-4">Create your login credentials</p>
            
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
            <h2 className="text-xl font-semibold mb-2">Your Profile</h2>
            <p className="text-sm text-muted-foreground mb-4">Tell us about yourself</p>
            
            <div className="flex flex-col items-center mb-4">
              <Avatar className="h-24 w-24 mb-2">
                <AvatarImage src={profileImage || ""} alt="Profile" />
                <AvatarFallback>
                  {profileForm.watch("firstName")[0] || ""}{profileForm.watch("lastName")[0] || ""}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center">
                <input 
                  type="file" 
                  id="profile-pic" 
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, setProfileImage)}
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

            <div className="grid grid-cols-3 gap-4">
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
                      <Input placeholder="Telegram (optional)" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={profileForm.control}
                name="instagram"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instagram</FormLabel>
                    <FormControl>
                      <Input placeholder="Instagram (optional)" {...field} disabled={isLoading} />
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
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </form>
        </Form>
      )}

      {step === 4 && (
        <Form {...schoolForm}>
          <form onSubmit={schoolForm.handleSubmit(handleSchoolSubmit)} className="space-y-4">
            <h2 className="text-xl font-semibold mb-2">School Information</h2>
            <p className="text-sm text-muted-foreground mb-4">Tell us about your school</p>
            
            <div className="flex items-end justify-between mb-4">
              <FormField
                control={schoolForm.control}
                name="skipSchoolDetails"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Skip this step</FormLabel>
                      <FormDescription>
                        You can complete the school details later in settings
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <div className="flex flex-col items-center">
                <Avatar className="h-24 w-24 mb-2">
                  <AvatarImage src={schoolLogo || ""} alt="School Logo" />
                  <AvatarFallback>
                    {schoolForm.watch("schoolName")[0] || "S"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center">
                  <input 
                    type="file" 
                    id="school-logo" 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, setSchoolLogo)}
                    disabled={isLoading || schoolForm.watch("skipSchoolDetails")}
                  />
                  <label htmlFor="school-logo">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="cursor-pointer" 
                      disabled={schoolForm.watch("skipSchoolDetails")}
                      asChild
                    >
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Logo
                      </span>
                    </Button>
                  </label>
                </div>
              </div>
            </div>

            <FormField
              control={schoolForm.control}
              name="schoolName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>School Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="School Name" 
                      {...field} 
                      disabled={isLoading || schoolForm.watch("skipSchoolDetails")} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={schoolForm.control}
              name="schoolPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>School Phone</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="School Phone Number" 
                      {...field} 
                      disabled={isLoading || schoolForm.watch("skipSchoolDetails")} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={schoolForm.control}
                name="schoolWhatsapp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School WhatsApp</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="WhatsApp (optional)" 
                        {...field} 
                        disabled={isLoading || schoolForm.watch("skipSchoolDetails")} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={schoolForm.control}
                name="schoolTelegram"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School Telegram</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Telegram (optional)" 
                        {...field} 
                        disabled={isLoading || schoolForm.watch("skipSchoolDetails")} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={schoolForm.control}
                name="schoolInstagram"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School Instagram</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Instagram (optional)" 
                        {...field} 
                        disabled={isLoading || schoolForm.watch("skipSchoolDetails")} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-between pt-2">
              <Button type="button" variant="outline" onClick={() => setStep(3)} disabled={isLoading}>
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

      {step === 5 && (
        <Form {...teamForm}>
          <form onSubmit={teamForm.handleSubmit(handleTeamSubmit)} className="space-y-4">
            <h2 className="text-xl font-semibold mb-2">Invite Team Members</h2>
            <p className="text-sm text-muted-foreground mb-4">Add teachers and staff to your school</p>
            
            <FormField
              control={teamForm.control}
              name="skipTeamSetup"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 mb-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Skip team setup</FormLabel>
                    <FormDescription>
                      You can invite team members later
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            
            {!teamForm.watch("skipTeamSetup") && (
              <>
                <div className="flex items-end gap-4 mb-2">
                  <div className="flex-1">
                    <FormLabel>Email</FormLabel>
                    <Input 
                      placeholder="team-member@example.com" 
                      value={teamForm.getValues("teamMembers")?.[0]?.email || ""}
                      onChange={(e) => teamForm.setValue("teamMembers", [{ 
                        email: e.target.value, 
                        role: teamForm.getValues("teamMembers")?.[0]?.role || "teacher" 
                      }])}
                      disabled={isLoading} 
                    />
                  </div>
                  <div className="w-40">
                    <FormLabel>Role</FormLabel>
                    <Select 
                      defaultValue="teacher"
                      onValueChange={(value) => teamForm.setValue("teamMembers", [{ 
                        email: teamForm.getValues("teamMembers")?.[0]?.email || "", 
                        role: value 
                      }])}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    type="button" 
                    size="icon" 
                    onClick={addTeamMember}
                    disabled={isLoading}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {teamMembers.length > 0 && (
                  <div className="border rounded-md p-4 space-y-2">
                    <h3 className="text-sm font-medium mb-2">Team Members to Invite:</h3>
                    {teamMembers.map((member, index) => (
                      <div key={index} className="flex items-center justify-between bg-muted p-2 rounded-md">
                        <div className="flex items-center gap-2">
                          <UserPlus className="h-4 w-4 text-muted-foreground" />
                          <span>{member.email}</span>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            {roles.find(r => r.value === member.role)?.label || member.role}
                          </span>
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeTeamMember(index)}
                          disabled={isLoading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="flex justify-between pt-2">
              <Button type="button" variant="outline" onClick={() => setStep(4)} disabled={isLoading}>
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
