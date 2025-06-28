
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { Globe, Save } from 'lucide-react';
import TimezoneSelector from '@/components/TimezoneSelector';
import { getEffectiveTimezone } from '@/utils/timezone';

interface SchoolTimezoneManagementProps {
  schoolId: string;
}

const SchoolTimezoneManagement: React.FC<SchoolTimezoneManagementProps> = ({ schoolId }) => {
  const { toast } = useToast();
  const [schoolTimezone, setSchoolTimezone] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchSchoolTimezone();
  }, [schoolId]);

  const fetchSchoolTimezone = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('schools')
        .select('timezone')
        .eq('id', schoolId)
        .single();

      if (error) throw error;

      setSchoolTimezone(getEffectiveTimezone(data?.timezone));
    } catch (error: any) {
      console.error('Error fetching school timezone:', error);
      toast({
        title: "Error",
        description: "Failed to load school timezone settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTimezoneUpdate = async (newTimezone: string) => {
    try {
      setUpdating(true);
      
      const { error } = await supabase
        .from('schools')
        .update({ 
          timezone: newTimezone,
          updated_at: new Date().toISOString()
        })
        .eq('id', schoolId);

      if (error) throw error;

      setSchoolTimezone(newTimezone);
      
      toast({
        title: "Success",
        description: "School timezone updated successfully. This will be the default timezone for new sessions.",
      });
    } catch (error: any) {
      console.error('Error updating school timezone:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update school timezone",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass glass-hover">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          School Timezone Settings
        </CardTitle>
        <CardDescription>
          Set the default timezone for your school. This timezone will be used when creating new sessions and schedules. 
          Individual users can still view times in their preferred timezone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">How School Timezone Works</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• New sessions and schedules default to this timezone</li>
              <li>• All times are stored in UTC for consistency</li>
              <li>• Users see times in their personal timezone preference</li>
              <li>• This setting affects the entire school</li>
            </ul>
          </div>
          
          <TimezoneSelector
            value={schoolTimezone}
            onValueChange={handleTimezoneUpdate}
            disabled={updating}
            label="School Default Timezone"
            placeholder="Select school timezone"
          />
          
          <div className="text-sm text-muted-foreground">
            <p>
              <strong>Current school timezone:</strong> {schoolTimezone || 'Not set'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SchoolTimezoneManagement;
