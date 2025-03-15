
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, ArrowRight, ArrowLeft, Upload, Plus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import confetti from "canvas-confetti";

// License verification step schema
const licenseSchema = z.object({
  licenseNumber: z.string().min(4, { message: "License number is required" }),
});

// Account details step schema
const accountSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
  confirmPassword: z.string().min(8, { message: "Password must be at least 8 characters" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Profile details step schema
const profileSchema = z.object({
  firstName: z.string().min(2, { message: "First name is required" }),
  lastName: z.string().min(2, { message: "Last name is required" }),
  role: z.string().min(1, { message: "Role is required" }),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  telegram: z.string().optional(),
  instagram: z.string().optional(),
  profilePicture: z.string().optional(),
});

// School information step schema
const schoolSchema = z.object({
  schoolName: z.string().min(2, { message: "School name is required" }),
  schoolLogo: z.string().optional(),
  schoolPhone: z.string().optional(),
  schoolTelegram: z.string().optional(),
  schoolWhatsapp: z.string().optional(),
  schoolInstagram: z.string().optional(),
});

// Team member schema
const teamMemberSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  role: z.string().min(1, { message: "Role is required" }),
});

// Team members step schema
const teamSchema = z.object({
  teamMembers: z.array(teamMemberSchema).optional(),
});

type LicenseFormValues = z.infer<typeof licenseSchema>;
type AccountFormValues = z.infer<typeof accountSchema>;
type ProfileFormValues = z.infer<typeof profileSchema>;
type SchoolFormValues = z.infer<typeof schoolSchema>;
type TeamFormValues = z.infer<typeof teamSchema>;

const SignupForm = () => {
  const { signUp, completeSignUp, isLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [licenseData, setLicenseData] = useState<{ licenseId: string | null }>({ licenseId: null });
  const [accountData, setAccountData] = useState<AccountFormValues | null>(null);
  const [profileData, setProfileData] = useState<ProfileFormValues | null>(null);
  const [schoolData, setSchoolData] = useState<SchoolFormValues | null>(null);
  const [teamData, setTeamData] = useState<{ teamMembers: { email: string; role: string }[] }>({ 
    teamMembers: [] 
  });

  // Initialize form for license verification
  const licenseForm = useForm<LicenseFormValues>({
    resolver: zodResolver(licenseSchema),
    defaultValues: {
      licenseNumber: "",
    },
  });

  // Initialize form for account details
  const accountForm = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Initialize form for profile details
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      role: "owner",
      phone: "",
      whatsapp: "",
      telegram: "",
      instagram: "",
      profilePicture: "",
    },
  });

  // Initialize form for school information
  const schoolForm = useForm<SchoolFormValues>({
    resolver: zodResolver(schoolSchema),
    defaultValues: {
      schoolName: "",
      schoolLogo: "",
      schoolPhone: "",
      schoolTelegram: "",
      schoolWhatsapp: "",
      schoolInstagram: "",
    },
  });

  // Team members form (add/remove members)
  const teamForm = useForm<TeamFormValues>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      teamMembers: [],
    },
  });

  // License verification submission handler
  const handleLicenseSubmit = async (data: LicenseFormValues) => {
    try {
      console.log("Submitting license number:", data.licenseNumber);
      
      const result = await signUp(data.licenseNumber);
      
      console.log("License verification result:", result);
      
      if (result.valid) {
        setLicenseData({ licenseId: result.licenseId });
        toast.success(result.message || "License validated successfully");
        console.log("Setting step to 2");
        
        // Important: Set step immediately and don't rely on timeouts
        setStep(2);
        console.log("Step should now be 2");
      } else {
        toast.error(result.message || "License verification failed");
      }
    } catch (error) {
      console.error("License verification error:", error);
      toast.error("An error occurred during license verification");
    }
  };

  // Account details submission handler
  const handleAccountSubmit = (data: AccountFormValues) => {
    setAccountData(data);
    setStep(3);
  };

  // Profile details submission handler
  const handleProfileSubmit = (data: ProfileFormValues) => {
    setProfileData(data);
    setStep(4);
  };

  // School information submission handler
  const handleSchoolSubmit = (data: SchoolFormValues) => {
    setSchoolData(data);
    setStep(5);
  };

  // Add team member
  const addTeamMember = () => {
    setTeamData(prev => ({
      teamMembers: [
        ...prev.teamMembers, 
        { email: "", role: "teacher" }
      ]
    }));
  };

  // Update team member
  const updateTeamMember = (index: number, field: "email" | "role", value: string) => {
    const updatedMembers = [...teamData.teamMembers];
    updatedMembers[index] = { 
      ...updatedMembers[index],
      [field]: value
    };
    setTeamData({ teamMembers: updatedMembers });
  };

  // Remove team member
  const removeTeamMember = (index: number) => {
    const updatedMembers = teamData.teamMembers.filter((_, i) => i !== index);
    setTeamData({ teamMembers: updatedMembers });
  };

  // Final submission
  const handleFinalSubmit = async () => {
    if (!accountData || !profileData || !licenseData.licenseId) {
      toast.error("Missing required information");
      return;
    }

    try {
      // Combine all data for final submission
      const userData = {
        ...profileData,
        licenseId: licenseData.licenseId,
        schoolName: schoolData?.schoolName || "My School",
        schoolLogo: schoolData?.schoolLogo,
        schoolPhone: schoolData?.schoolPhone,
        schoolTelegram: schoolData?.schoolTelegram,
        schoolWhatsapp: schoolData?.schoolWhatsapp,
        schoolInstagram: schoolData?.schoolInstagram,
        teamMembers: teamData.teamMembers.length > 0 ? teamData.teamMembers : undefined,
      };

      await completeSignUp(accountData.email, accountData.password, userData);
      
      // Trigger confetti animation on success
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 }
      });
    } catch (error) {
      console.error("Signup error:", error);
      toast.error("An error occurred during signup");
    }
  };

  // Handle file uploads (mock - would connect to supabase storage in real app)
  const handleFileUpload = (setter: (value: string) => void) => {
    // Mock the file upload process - in a real app this would upload to storage
    setTimeout(() => {
      // Simulate a successful upload with a random placeholder image
      const placeholderImage = "https://api.dicebear.com/7.x/initials/svg?seed=" + Math.random().toString(36).substring(7);
      setter(placeholderImage);
      toast.success("Image uploaded successfully");
    }, 1000);
  };

  // Render the current step
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Form {...licenseForm}>
            <form onSubmit={(e) => {
              e.preventDefault(); // Prevent form submission
              licenseForm.handleSubmit(handleLicenseSubmit)(e);
            }} className="space-y-4">
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

      case 2:
        return (
          <Form {...accountForm}>
            <form onSubmit={accountForm.handleSubmit(handleAccountSubmit)} className="space-y-4">
              <h2 className="text-lg font-semibold">Create Your Account</h2>
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
              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button type="submit">
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </Form>
        );

      case 3:
        return (
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
              <h2 className="text-lg font-semibold">Your Profile Information</h2>
              
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={profileForm.watch('profilePicture')} />
                    <AvatarFallback>
                      {profileForm.watch('firstName')?.charAt(0) || ''}
                      {profileForm.watch('lastName')?.charAt(0) || ''}
                    </AvatarFallback>
                  </Avatar>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon" 
                    className="absolute bottom-0 right-0 rounded-full" 
                    onClick={() => handleFileUpload((url) => profileForm.setValue('profilePicture', url))}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
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
                        <Input placeholder="John" {...field} />
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
                        <Input placeholder="Doe" {...field} />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="owner">Owner</SelectItem>
                        <SelectItem value="director">Director</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
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
                      <Input placeholder="+1 234 567 8900" {...field} />
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
                        <Input placeholder="WhatsApp number or ID" {...field} />
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
                        <Input placeholder="Telegram username" {...field} />
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
                        <Input placeholder="Instagram handle" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button type="submit">
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </Form>
        );

      case 4:
        return (
          <Form {...schoolForm}>
            <form onSubmit={schoolForm.handleSubmit(handleSchoolSubmit)} className="space-y-4">
              <h2 className="text-lg font-semibold">School Information</h2>
              
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={schoolForm.watch('schoolLogo')} />
                    <AvatarFallback>
                      {schoolForm.watch('schoolName')?.charAt(0) || 'S'}
                    </AvatarFallback>
                  </Avatar>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon" 
                    className="absolute bottom-0 right-0 rounded-full" 
                    onClick={() => handleFileUpload((url) => schoolForm.setValue('schoolLogo', url))}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <FormField
                control={schoolForm.control}
                name="schoolName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Driving School" {...field} />
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
                    <FormLabel>School Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 234 567 8900" {...field} />
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
                        <Input placeholder="WhatsApp number or ID" {...field} />
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
                        <Input placeholder="Telegram username" {...field} />
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
                        <Input placeholder="Instagram handle" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(3)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button type="submit">
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </Form>
        );

      case 5:
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Team Members (Optional)</h2>
            <p className="text-sm text-muted-foreground">
              Add team members who will receive invitations to join your school.
            </p>
            
            {teamData.teamMembers.map((member, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`email-${index}`}>Email Address</Label>
                        <Input
                          id={`email-${index}`}
                          type="email"
                          placeholder="team.member@email.com"
                          value={member.email}
                          onChange={(e) => updateTeamMember(index, "email", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`role-${index}`}>Role</Label>
                        <Select
                          value={member.role}
                          onValueChange={(value) => updateTeamMember(index, "role", value)}
                        >
                          <SelectTrigger id={`role-${index}`}>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="director">Director</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="teacher">Teacher</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeTeamMember(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))}
            
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={addTeamMember}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Team Member
            </Button>
            
            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => setStep(4)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button type="button" onClick={handleFinalSubmit} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    Complete Setup
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Log when step changes to help with debugging
  useEffect(() => {
    console.log("Current step is now:", step);
  }, [step]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {[1, 2, 3, 4, 5].map((stepNumber) => (
              <React.Fragment key={stepNumber}>
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step === stepNumber
                      ? "bg-primary text-primary-foreground"
                      : step > stepNumber
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {stepNumber}
                </div>
                {stepNumber < 5 && (
                  <div 
                    className={`h-1 w-4 ${
                      step > stepNumber ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
          <span className="text-sm text-muted-foreground">Step {step} of 5</span>
        </div>
        <h3 className="text-sm font-medium">
          {step === 1 && "License Verification"}
          {step === 2 && "Account Details"}
          {step === 3 && "Profile Information"}
          {step === 4 && "School Information"}
          {step === 5 && "Team Members"}
        </h3>
      </div>
      {renderStep()}
    </div>
  );
};

export default SignupForm;
