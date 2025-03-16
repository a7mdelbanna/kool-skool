import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Users, UserPlus, Mail, Key, User, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase, TeamMemberResponse } from "@/integrations/supabase/client";

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  createdAt: Date;
}

const TeamAccess = () => {
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'teacher',
    password: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  useEffect(() => {
    fetchTeamMembers();
  }, []);
  
  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, role, created_at');
      
      if (error) {
        throw error;
      }
      
      const formattedMembers = data.map(member => ({
        id: member.id,
        firstName: member.first_name,
        lastName: member.last_name,
        email: member.email,
        role: member.role,
        createdAt: new Date(member.created_at)
      }));
      
      setTeamMembers(formattedMembers);
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast({
        title: "Error fetching team members",
        description: error.message || "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (name in errors) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  
  const validate = () => {
    const newErrors = {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: ''
    };
    let isValid = true;
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
      isValid = false;
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
      isValid = false;
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
      isValid = false;
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
      isValid = false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }
    
    try {
      setFormLoading(true);
      
      const currentUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null;
      
      if (!currentUser || !currentUser.id) {
        throw new Error("You must be logged in to add team members");
      }
      
      const { data, error } = await supabase
        .rpc('add_team_member', {
          member_first_name: formData.firstName,
          member_last_name: formData.lastName,
          member_email: formData.email,
          member_role: formData.role,
          member_password: formData.password
        });
      
      if (error) {
        throw error;
      }
      
      const response = (data as unknown) as TeamMemberResponse;
      
      if (!response.success) {
        throw new Error(response.message || "Failed to add team member");
      }
      
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        role: 'teacher',
        password: '',
        confirmPassword: ''
      });
      
      toast({
        title: "Team member added",
        description: `${formData.firstName} ${formData.lastName} has been added successfully.`,
      });
      
      fetchTeamMembers();
      
    } catch (error) {
      console.error('Error adding team member:', error);
      toast({
        title: "Error adding team member",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setFormLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center gap-2 mb-6">
        <Users className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Team Access</h1>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              <span>Add New Team Member</span>
            </CardTitle>
            <CardDescription>
              Add access for teachers, managers, or administrators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Enter first name"
                    className={errors.firstName ? "border-red-500" : ""}
                    disabled={formLoading}
                  />
                  {errors.firstName && (
                    <p className="text-red-500 text-sm flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {errors.firstName}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Enter last name"
                    className={errors.lastName ? "border-red-500" : ""}
                    disabled={formLoading}
                  />
                  {errors.lastName && (
                    <p className="text-red-500 text-sm flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {errors.lastName}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="email@example.com"
                    className={errors.email ? "border-red-500" : ""}
                    disabled={formLoading}
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {errors.email}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full rounded-md border border-input h-10 px-3 py-2 bg-background text-sm"
                  disabled={formLoading}
                >
                  <option value="teacher">Teacher</option>
                  <option value="admin">Administrator</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="flex items-center">
                  <Key className="h-4 w-4 mr-2 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create password"
                    className={errors.password ? "border-red-500" : ""}
                    disabled={formLoading}
                  />
                </div>
                {errors.password && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {errors.password}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="flex items-center">
                  <Key className="h-4 w-4 mr-2 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm password"
                    className={errors.confirmPassword ? "border-red-500" : ""}
                    disabled={formLoading}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {errors.confirmPassword}
                  </p>
                )}
              </div>
              
              <Button type="submit" className="w-full mt-4" disabled={formLoading}>
                {formLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Team Member
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span>Team Members</span>
              </CardTitle>
              <CardDescription>
                People with access to your school management system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : teamMembers.length > 0 ? (
                <div className="space-y-4">
                  {teamMembers.map(member => (
                    <div 
                      key={member.id} 
                      className="flex items-center gap-3 p-3 border rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{member.firstName} {member.lastName}</h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{member.email}</span>
                          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">
                            {member.role}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  No team members found
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
