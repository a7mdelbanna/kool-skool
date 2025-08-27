import React, { useContext, useState } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Save,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import TimezoneSelector from '@/components/TimezoneSelector';
import { getEffectiveTimezone } from '@/utils/timezone';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UserContext } from '@/App';

const PersonalSettings = () => {
  const { user, setUser } = useContext(UserContext);
  const { toast } = useToast();
  const [updating, setUpdating] = useState(false);
  const currentTimezone = getEffectiveTimezone(user?.timezone);

  const handleTimezoneUpdate = async (newTimezone: string) => {
    if (!user?.id) return;

    try {
      setUpdating(true);
      
      const { error } = await supabase
        .from('users')
        .update({ timezone: newTimezone })
        .eq('id', user.id);

      if (error) throw error;

      // Update user context
      setUser(prev => prev ? { ...prev, timezone: newTimezone } : prev);

      // Update localStorage
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsedData = JSON.parse(userData);
        parsedData.timezone = newTimezone;
        localStorage.setItem('user', JSON.stringify(parsedData));
      }

      toast({
        title: "Success",
        description: "Your personal timezone has been updated successfully. All session times will now display in this timezone across the application.",
      });

      // Force a page reload to ensure all components use the new timezone
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      console.error('Error updating timezone:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update timezone",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Personal Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your personal information and security preferences</p>
      </div>
      
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid grid-cols-2 mb-6">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            <span>Profile</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            <span>Security</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="mt-0 space-y-6">
          <Card className="glass glass-hover">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal information, contact details, and timezone preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <Avatar className="h-20 w-20 border-2 border-white shadow-sm">
                  <AvatarFallback className="text-2xl">TP</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium mb-2">Profile Photo</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">Upload new photo</Button>
                    <Button variant="ghost" size="sm">Remove</Button>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" placeholder="John Smith" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="example@email.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" placeholder="+1 (555) 123-4567" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" placeholder="City, Country" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
                    <h4 className="font-medium text-blue-900 mb-2">Personal Timezone Preference</h4>
                    <p className="text-sm text-blue-800 mb-2">
                      This is your personal viewing preference. All session times will be displayed in this timezone across all screens (Calendar, Attendance, Student profiles, etc.), 
                      regardless of the school's default timezone setting.
                    </p>
                    <div className="bg-blue-100 p-2 rounded text-xs text-blue-800">
                      <strong>Note:</strong> Changing your timezone will refresh the application to ensure all times display correctly.
                    </div>
                  </div>
                  <TimezoneSelector
                    value={currentTimezone}
                    onValueChange={handleTimezoneUpdate}
                    disabled={updating}
                    label="Your Personal Timezone"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea id="bio" placeholder="Tell us about yourself and your tutoring experience" />
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button className="gap-2">
                  <Save className="h-4 w-4" />
                  <span>Save Changes</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="security" className="mt-0 space-y-6">
          <Card className="glass glass-hover">
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your account security and privacy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium text-lg">Change Password</h3>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input id="currentPassword" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input id="newPassword" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input id="confirmPassword" type="password" />
                  </div>
                </div>
                
                <Button className="mt-2">Update Password</Button>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="font-medium text-lg">Two-Factor Authentication</h3>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="font-medium">Enable 2FA</h4>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                  </div>
                  <Switch />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="font-medium text-lg">Data Privacy</h3>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="font-medium">Data Sharing</h4>
                    <p className="text-sm text-muted-foreground">Allow anonymous usage data to improve the app</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
              
              <div className="mt-6">
                <Button variant="destructive">Delete Account</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PersonalSettings;