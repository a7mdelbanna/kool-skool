
import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  Users,
  UserPlus,
  Trash2,
  CheckCircle2,
  Loader2,
  Shield,
  Mail
} from 'lucide-react';
import { createTeamMember, deleteTeamMember, fetchTeamMembers } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

interface ProfileData {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  profile_picture: string | null;
}

interface TeamMemberData {
  id: string;
  email: string;
  role: "director" | "teacher" | "admin" | "staff";
  profile_id: string | null;
  invitation_accepted: boolean | null;
  invitation_sent: boolean | null;
  invited_by: string | null;
  school_id: string;
  created_at: string;
  updated_at: string;
  profiles?: ProfileData | null;
}

const createTeamMemberSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  firstName: z.string().min(1, { message: 'First name is required' }),
  lastName: z.string().min(1, { message: 'Last name is required' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  confirmPassword: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  role: z.enum(['teacher', 'admin', 'staff']),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type CreateTeamMemberFormValues = z.infer<typeof createTeamMemberSchema>;

const TeamAccess = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMemberData[]>([]);
  const [addingMember, setAddingMember] = useState(false);
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const form = useForm<CreateTeamMemberFormValues>({
    resolver: zodResolver(createTeamMemberSchema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      confirmPassword: '',
      role: 'teacher',
    },
  });

  useEffect(() => {
    loadTeamMembers();
  }, []);

  const loadTeamMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const teamMembersData = await fetchTeamMembers();
      setTeamMembers(teamMembersData);
    } catch (error: any) {
      console.error('Error loading team members:', error);
      setError(error.message || 'Failed to load team members. Please try again.');
      toast({
        title: 'Error',
        description: error.message || 'Failed to load team members',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeamMember = async (values: CreateTeamMemberFormValues) => {
    try {
      setAddingMember(true);
      setError(null);
      
      await createTeamMember({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        role: values.role
      });
      
      toast({
        title: 'Success',
        description: `Team member ${values.firstName} ${values.lastName} has been created successfully.`,
      });
      
      // Reset form and refetch team members
      form.reset();
      loadTeamMembers();
      
    } catch (error: any) {
      console.error('Error creating team member:', error);
      setError(error.message || 'Failed to create team member');
      toast({
        title: 'Error',
        description: error.message || 'Failed to create team member',
        variant: 'destructive'
      });
    } finally {
      setAddingMember(false);
    }
  };

  const handleDeleteTeamMember = async (id: string, email: string) => {
    // Show confirmation dialog
    if (!window.confirm(`Are you sure you want to delete team member ${email}?`)) {
      return;
    }
    
    try {
      setDeleting(prev => ({ ...prev, [id]: true }));
      setError(null);
      
      await deleteTeamMember(id);
      
      toast({
        title: 'Team member removed',
        description: `${email} has been removed from your team.`
      });
      
      // Refetch team members
      loadTeamMembers();
      
    } catch (error: any) {
      console.error('Error deleting team member:', error);
      setError(error.message || 'Failed to delete team member');
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete team member',
        variant: 'destructive'
      });
    } finally {
      setDeleting(prev => ({ ...prev, [id]: false }));
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 flex items-center justify-center h-[80vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-lg">Loading team members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Team Access Management</h1>
        </div>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                <span>Add New Team Member</span>
              </div>
            </CardTitle>
            <CardDescription>
              Create a new team member account with direct access to your school's platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateTeamMember)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="First name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Last name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="team.member@example.com" {...field} />
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
                      <FormControl>
                        <select
                          className="w-full rounded-md border border-input h-10 px-3 py-2 bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          {...field}
                        >
                          <option value="teacher">Teacher</option>
                          <option value="admin">Admin</option>
                          <option value="staff">Staff</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="h-4 w-4 text-primary" />
                    <h3 className="font-medium">Account Credentials</h3>
                  </div>
                
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Minimum 6 characters" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Confirm password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                <Button type="submit" className="w-full" disabled={addingMember}>
                  {addingMember ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Creating Account...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      <span>Create Team Member</span>
                    </div>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Team ({teamMembers.length})</CardTitle>
              <CardDescription>
                Manage your team members and their access levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              {teamMembers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">No team members added yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {teamMembers.map((member) => (
                    <div 
                      key={member.id} 
                      className="p-4 border rounded-lg flex flex-col gap-2"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">
                            {member.profiles?.first_name || ''} {member.profiles?.last_name || ''}
                            {!member.profiles && member.email.split('@')[0]}
                          </h3>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTeamMember(member.id, member.email)}
                          disabled={!!deleting[member.id]}
                          className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                        >
                          {deleting[member.id] ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary capitalize">
                          {member.role}
                        </div>
                        {member.invitation_accepted ? (
                          <div className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                          </div>
                        ) : (
                          <div className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                            Pending
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TeamAccess;
