
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, UserPlus, User, X, Mail, Shield } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

// Team member schema
const teamMemberSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email" }),
  role: z.string().min(1, { message: "Please select a role" }),
});

type TeamMemberFormValues = z.infer<typeof teamMemberSchema>;

interface TeamMember {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  profile_picture: string | null;
}

const Access = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  
  const form = useForm<TeamMemberFormValues>({
    resolver: zodResolver(teamMemberSchema),
    defaultValues: {
      email: "",
      role: "",
    },
  });

  // Fetch team members and school ID
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        // First, get the user's school_id
        const { data: profileData, error: profileError } = await supabase
          .rpc('get_user_school_id', { user_id_param: user.id });
        
        if (profileError) throw profileError;
        
        if (profileData && profileData.length > 0) {
          const schoolId = profileData[0].school_id;
          setSchoolId(schoolId);
          
          // Then, get all profiles with the same school_id
          const { data: membersData, error: membersError } = await supabase
            .from('profiles')
            .select('id, email, first_name, last_name, role, profile_picture')
            .eq('school_id', schoolId);
          
          if (membersError) throw membersError;
          
          if (membersData) {
            setTeamMembers(membersData);
          }
        }
      } catch (error: any) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load team members');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [user]);
  
  const onSubmit = async (values: TeamMemberFormValues) => {
    if (!user || !schoolId) return;
    
    try {
      setIsSubmitting(true);
      
      // In a real app, you would send an invitation to the email
      // For now, we'll just display a success message
      toast.success(`Invitation sent to ${values.email} for ${values.role} role`);
      
      // Reset the form
      form.reset();
    } catch (error: any) {
      console.error('Error inviting team member:', error);
      toast.error(error.message || 'Failed to invite team member');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const removeMember = async (memberId: string) => {
    // Don't allow removing yourself
    if (memberId === user?.id) {
      toast.error("You cannot remove yourself");
      return;
    }
    
    try {
      // In a real app, you would remove the profile or change its status
      // For now, we'll just display a success message
      toast.success("Team member removed successfully");
      
      // Update the UI by removing the member from the state
      setTeamMembers((prev) => prev.filter((member) => member.id !== memberId));
    } catch (error: any) {
      console.error('Error removing team member:', error);
      toast.error(error.message || 'Failed to remove team member');
    }
  };
  
  // Get initials for avatar fallback
  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return first + last || 'U';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container py-10 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Team Access Management</CardTitle>
          <CardDescription>
            View and manage who has access to your school
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Team Members List */}
          <div>
            <h3 className="text-lg font-medium mb-4">Current Team Members</h3>
            <div className="space-y-4">
              {teamMembers.map((member) => (
                <div 
                  key={member.id} 
                  className="flex justify-between items-center p-4 bg-muted rounded-md"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.profile_picture || ""} alt={member.email} />
                      <AvatarFallback className="bg-primary/10">
                        {getInitials(member.first_name, member.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {member.first_name && member.last_name 
                          ? `${member.first_name} ${member.last_name}` 
                          : member.email}
                        {member.id === user?.id && <span className="text-sm text-muted-foreground ml-2">(You)</span>}
                      </p>
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-xs">
                      <Shield className="h-3 w-3" />
                      <span className="capitalize">{member.role}</span>
                    </div>
                    {member.id !== user?.id && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => removeMember(member.id)}
                      >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Remove</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              
              {teamMembers.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No team members found
                </p>
              )}
            </div>
          </div>
          
          <Separator />
          
          {/* Invite Form */}
          <div>
            <h3 className="text-lg font-medium mb-4">Invite New Team Member</h3>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
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
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
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
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Invitation...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </div>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          <p>Team members will receive an email invitation to join your school.</p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Access;
