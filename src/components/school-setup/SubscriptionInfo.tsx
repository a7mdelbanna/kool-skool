import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Card, 
  CardContent,
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { Loader2, Calendar, UserPlus, Users, Mail, Shield, EyeIcon, EyeOffIcon, PlusCircle, School } from "lucide-react";
import { toast } from "sonner";
import { differenceInCalendarDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Form schema for adding staff
const staffSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  role: z.string().min(1, { message: "Please select a role" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

// Form schema for creating a school
const schoolSchema = z.object({
  name: z.string().min(1, { message: "School name is required" }),
  license_number: z.string().min(1, { message: "License number is required" }),
});

type StaffFormValues = z.infer<typeof staffSchema>;
type SchoolFormValues = z.infer<typeof schoolSchema>;

const SubscriptionInfo = () => {
  const [license, setLicense] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [isCreatingSchool, setIsCreatingSchool] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [schoolDialogOpen, setSchoolDialogOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [noSchoolFound, setNoSchoolFound] = useState(false);
  const { user } = useAuth();
  
  const staffForm = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      email: "",
      role: "",
      password: "",
    },
  });

  const schoolForm = useForm<SchoolFormValues>({
    resolver: zodResolver(schoolSchema),
    defaultValues: {
      name: "",
      license_number: "",
    },
  });

  const fetchSubscriptionInfo = async () => {
    try {
      setIsLoading(true);
      
      if (!user?.id) {
        console.log("No user ID found");
        setIsLoading(false);
        setNoSchoolFound(true);
        return;
      }

      const { data: schoolIdData, error: schoolIdError } = await supabase
        .rpc('get_user_school_id', { user_id_param: user.id });

      if (schoolIdError) {
        console.error("Error fetching school ID:", schoolIdError);
        toast.error(`Error fetching school ID: ${schoolIdError.message}`);
        setNoSchoolFound(true);
        setIsLoading(false);
        return;
      }
      
      if (!schoolIdData || !Array.isArray(schoolIdData) || schoolIdData.length === 0 || !schoolIdData[0]?.school_id) {
        console.log("No school ID found:", schoolIdData);
        setNoSchoolFound(true);
        setIsLoading(false);
        return;
      }
      
      const schoolId = schoolIdData[0].school_id;
      console.log("Found school ID:", schoolId);
      setNoSchoolFound(false);

      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('*')
        .eq('id', schoolId)
        .single();

      if (schoolError) {
        console.error("Error fetching school:", schoolError);
        toast.error(`Error fetching school: ${schoolError.message}`);
        setNoSchoolFound(true);
        setIsLoading(false);
        return;
      }
      
      console.log("School data:", schoolData);
      setSchool(schoolData);
      
      if (schoolData.license_id) {
        const { data: licenseData, error: licenseError } = await supabase
          .from('licenses')
          .select('*')
          .eq('id', schoolData.license_id)
          .single();
          
        if (licenseError) {
          console.error("Error fetching license:", licenseError);
          toast.error(`Error fetching license: ${licenseError.message}`);
        } else {
          console.log("License data:", licenseData);
          setLicense(licenseData);
        }
      }
      
      const { data: staffData, error: staffError } = await supabase
        .from('profiles')
        .select('*')
        .eq('school_id', schoolId);
        
      if (staffError) {
        console.error("Error fetching staff:", staffError);
        toast.error(`Error fetching staff: ${staffError.message}`);
      } else {
        console.log("Staff data:", staffData);
        setStaffMembers(staffData || []);
      }
      
    } catch (error: any) {
      console.error("Error in fetchSubscriptionInfo:", error);
      toast.error(`Error fetching subscription info: ${error.message}`);
      setNoSchoolFound(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSubscriptionInfo();
    } else {
      setNoSchoolFound(true);
      setIsLoading(false);
    }
  }, [user]);

  const onSubmitStaffForm = async (data: StaffFormValues) => {
    if (!school?.id) {
      toast.error("School information not found");
      return;
    }
    
    setIsAddingStaff(true);
    
    try {
      const { data: existingUserData, error: existingUserError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', data.email);
        
      if (existingUserError) {
        throw existingUserError;
      }
      
      if (existingUserData && existingUserData.length > 0) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            school_id: school.id,
            role: data.role
          })
          .eq('email', data.email);
          
        if (updateError) throw updateError;
        
        toast.success(`${data.email} added to your school as ${data.role}`);
      } else {
        try {
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: data.email,
            password: data.password,
            email_confirm: true,
            user_metadata: {
              role: data.role
            }
          });
          
          if (authError) throw authError;
          
          const profileId = authData.user.id;
          
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: profileId,
              email: data.email,
              role: data.role,
              school_id: school.id
            });
            
          if (insertError) throw insertError;
          
          toast.success(`Account created for ${data.email} as ${data.role}`);
        } catch (adminError: any) {
          console.error("Admin creation failed, trying regular signup:", adminError);
          
          const { data: signupData, error: signupError } = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
              data: {
                role: data.role
              }
            }
          });
          
          if (signupError) throw signupError;
          
          const profileId = signupData.user?.id;
          
          if (!profileId) {
            throw new Error("Failed to create user account");
          }
          
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: profileId,
              email: data.email,
              role: data.role,
              school_id: school.id
            });
            
          if (insertError) throw insertError;
          
          toast.success(`Account created for ${data.email} as ${data.role}`);
        }
      }
      
      staffForm.reset();
      setDialogOpen(false);
      
      fetchSubscriptionInfo();
      
    } catch (error: any) {
      console.error("Error adding staff member:", error);
      toast.error(`Failed to add staff: ${error.message}`);
    } finally {
      setIsAddingStaff(false);
    }
  };

  const onSubmitSchoolForm = async (data: SchoolFormValues) => {
    setIsCreatingSchool(true);
    
    try {
      if (!user?.id) {
        toast.error("You must be logged in to create a school");
        return;
      }

      const { error } = await supabase.rest.rpc('create_school_and_update_profile', {
        school_name: data.name,
        license_number: data.license_number
      });
      
      if (error) {
        console.error("Error creating school:", error);
        toast.error(`Error creating school: ${error.message}`);
        throw error;
      }
      
      toast.success("School created successfully!");
      schoolForm.reset();
      setSchoolDialogOpen(false);
      
      fetchSubscriptionInfo();
      
    } catch (error: any) {
      console.error("Error creating school:", error);
      toast.error(`Failed to create school: ${error.message}`);
    } finally {
      setIsCreatingSchool(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const getRemainingDays = () => {
    if (!license?.expires_at) return 0;
    const expiryDate = new Date(license.expires_at);
    const today = new Date();
    return Math.max(0, differenceInCalendarDays(expiryDate, today));
  };

  const getStatusBadge = () => {
    if (!license) return null;
    
    const remainingDays = getRemainingDays();
    
    if (remainingDays <= 0) {
      return (
        <Badge variant="outline" className="bg-red-50 text-red-600 hover:bg-red-50">
          Expired
        </Badge>
      );
    } else if (remainingDays <= 7) {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-600 hover:bg-amber-50">
          Expiring Soon
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-600 hover:bg-green-50">
          Active
        </Badge>
      );
    }
  };

  const getSchoolInitials = () => {
    if (!school?.name) return "S";
    return school.name.split(" ")
      .map((word: string) => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("");
  };

  const getRoleLabel = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const isStaffPending = (staff: any) => {
    return !staff.first_name || !staff.last_name;
  };

  if (noSchoolFound && !isLoading) {
    return (
      <Card className="text-center">
        <CardHeader>
          <CardTitle>No School Found</CardTitle>
          <CardDescription>
            You don't have a school associated with your account yet. 
            Create a school to manage your subscription and staff.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 pb-8 flex flex-col items-center">
          <School className="h-12 w-12 text-muted-foreground mb-4" />
          <Dialog open={schoolDialogOpen} onOpenChange={setSchoolDialogOpen}>
            <DialogTrigger asChild>
              <Button className="mt-4">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create School
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create a School</DialogTitle>
                <DialogDescription>
                  Set up your school and connect it to your license.
                </DialogDescription>
              </DialogHeader>
              <Form {...schoolForm}>
                <form onSubmit={schoolForm.handleSubmit(onSubmitSchoolForm)} className="space-y-4">
                  <FormField
                    control={schoolForm.control}
                    name="name"
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
                    control={schoolForm.control}
                    name="license_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>License Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your license number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isCreatingSchool}>
                      {isCreatingSchool ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Create School
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription Information</CardTitle>
          <CardDescription>Loading your school's subscription details...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Subscription Information</CardTitle>
          <CardDescription>
            View your current school subscription status and details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!license ? (
            <div className="text-center py-8 text-muted-foreground">
              No active subscription found. Please contact support for assistance.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={school?.logo || ""} alt={school?.name} />
                  <AvatarFallback className="text-lg bg-primary/10">
                    {getSchoolInitials()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-medium">{school?.name || "School"}</h3>
                  <p className="text-sm text-muted-foreground">
                    {license?.license_number}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border bg-muted/20">
                  <div className="text-sm font-medium text-muted-foreground mb-1">Status</div>
                  <div className="flex items-center">
                    {getStatusBadge()}
                  </div>
                </div>
                
                <div className="p-4 rounded-lg border bg-muted/20">
                  <div className="text-sm font-medium text-muted-foreground mb-1">Expiry Date</div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{license?.expires_at ? format(new Date(license.expires_at), 'MMM d, yyyy') : "N/A"}</span>
                  </div>
                </div>
                
                <div className="p-4 rounded-lg border bg-muted/20">
                  <div className="text-sm font-medium text-muted-foreground mb-1">Days Remaining</div>
                  <div className="font-medium text-lg">
                    {getRemainingDays()} days
                  </div>
                  <div className="mt-1 h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${getRemainingDays() <= 7 ? 'bg-amber-500' : 'bg-green-500'}`}
                      style={{ 
                        width: `${Math.min(100, (getRemainingDays() / license?.duration_days) * 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>School Staff</CardTitle>
            <CardDescription>
              Manage staff members associated with your school
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="ml-auto">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Staff
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add Staff Member</DialogTitle>
                <DialogDescription>
                  Create an account for a new staff member to join your school.
                </DialogDescription>
              </DialogHeader>
              <Form {...staffForm}>
                <form onSubmit={staffForm.handleSubmit(onSubmitStaffForm)} className="space-y-4">
                  <FormField
                    control={staffForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter email address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={staffForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="teacher">Teacher</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="director">Director</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={staffForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showPassword ? "text" : "password"} 
                              placeholder="Enter password" 
                              {...field} 
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={togglePasswordVisibility}
                            >
                              {showPassword ? 
                                <EyeOffIcon className="h-4 w-4" /> : 
                                <EyeIcon className="h-4 w-4" />
                              }
                              <span className="sr-only">
                                {showPassword ? "Hide password" : "Show password"}
                              </span>
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isAddingStaff}>
                      {isAddingStaff ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Add Staff
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {staffMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No staff members found. Add staff using the button above.
            </div>
          ) : (
            <div className="space-y-4">
              {staffMembers.map((staff) => (
                <div key={staff.id} className="flex items-center justify-between p-3 rounded-md border">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={staff.profile_picture || ""} alt={staff.first_name} />
                      <AvatarFallback className="bg-primary/10">
                        {staff.first_name ? staff.first_name.charAt(0).toUpperCase() : "U"}
                        {staff.last_name ? staff.last_name.charAt(0).toUpperCase() : ""}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {staff.first_name} {staff.last_name || "(No name set)"}
                      </p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span>{staff.email}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-xs">
                      <Shield className="h-3 w-3" />
                      <span>{getRoleLabel(staff.role)}</span>
                    </div>
                    {isStaffPending(staff) && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-600">
                        Pending
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionInfo;
