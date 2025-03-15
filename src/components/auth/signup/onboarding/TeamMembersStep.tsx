
import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, UserPlus, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

// Team member schema
const teamMemberSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email" }),
  role: z.string().min(1, { message: "Please select a role" }),
});

type TeamMemberFormValues = z.infer<typeof teamMemberSchema>;

interface TeamMember {
  email: string;
  role: string;
}

interface TeamMembersStepProps {
  data: {
    teamMembers: TeamMember[];
  };
  updateData: (data: { teamMembers: TeamMember[] }) => void;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  loading: boolean;
}

const TeamMembersStep: React.FC<TeamMembersStepProps> = ({ 
  data, 
  updateData, 
  onNext,
  onPrev,
  onSkip,
  loading 
}) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(data.teamMembers || []);
  
  const form = useForm<TeamMemberFormValues>({
    resolver: zodResolver(teamMemberSchema),
    defaultValues: {
      email: "",
      role: "",
    },
  });

  const addTeamMember = (values: TeamMemberFormValues) => {
    // Ensure we're adding a complete TeamMember object with required fields
    const newTeamMember: TeamMember = {
      email: values.email,
      role: values.role,
    };
    
    const updatedTeamMembers = [...teamMembers, newTeamMember];
    setTeamMembers(updatedTeamMembers);
    updateData({ teamMembers: updatedTeamMembers });
    form.reset();
  };

  const removeTeamMember = (index: number) => {
    const updatedTeamMembers = teamMembers.filter((_, i) => i !== index);
    setTeamMembers(updatedTeamMembers);
    updateData({ teamMembers: updatedTeamMembers });
  };

  const handleSubmit = () => {
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold">Add Team Members</h2>
        <p className="text-sm text-muted-foreground">
          Invite teachers and staff to join your school (optional)
        </p>
      </div>

      {/* Form to add team members */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(addTeamMember)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter team member's email" {...field} />
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
            variant="outline" 
            className="w-full"
            disabled={loading}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add Team Member
          </Button>
        </form>
      </Form>

      {/* List of added team members */}
      {teamMembers.length > 0 && (
        <div className="mt-6">
          <Separator className="mb-4" />
          <h3 className="text-sm font-medium mb-2">Added Team Members</h3>
          <ul className="space-y-2">
            {teamMembers.map((member, index) => (
              <li 
                key={index} 
                className="flex justify-between items-center p-3 bg-muted rounded-md"
              >
                <div>
                  <p className="font-medium">{member.email}</p>
                  <p className="text-sm text-muted-foreground capitalize">{member.role}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => removeTeamMember(index)}
                  disabled={loading}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Remove</span>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-between pt-4 space-x-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onPrev}
          disabled={loading}
        >
          Back
        </Button>
        
        <div className="flex space-x-2">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={onSkip}
            disabled={loading}
          >
            Skip
          </Button>
          
          <Button 
            type="button" 
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Next"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TeamMembersStep;
