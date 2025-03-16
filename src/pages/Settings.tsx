import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  DollarSign, 
  Bell, 
  Shield, 
  HelpCircle, 
  Save,
  UploadCloud,
  Trash2
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
import { cn } from '@/lib/utils';
import { fetchUserProfile, updateUserProfile } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

const Settings = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    bio: '',
    profile_picture: null as string | null
  });

  // Fetch user profile data
  const loadUserProfile = async () => {
    try {
      setIsLoading(true);
      const { profile } = await fetchUserProfile();
      
      setProfileData({
        firstName: profile?.first_name || '',
        lastName: profile?.last_name || '',
        email: profile?.email || '',
        phone: profile?.phone || '',
        location: '', // Location is not in the schema, but keeping it for UI consistency
        bio: '', // Bio is not in the schema, but keeping it for UI consistency
        profile_picture: profile?.profile_picture
      });
      
      console.log("Profile data loaded:", profile);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update profile data
  const updateProfile = async () => {
    try {
      setIsLoading(true);
      
      await updateUserProfile({
        first_name: profileData.firstName,
        last_name: profileData.lastName,
        phone: profileData.phone,
        profile_picture: profileData.profile_picture
      });
      
      toast({
        title: "Success",
        description: "Your profile has been updated successfully"
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle profile picture upload
  const handleImageUpload = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    
    fileInput.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select an image smaller than 5MB',
          variant: 'destructive'
        });
        return;
      }
      
      try {
        setIsLoading(true);
        // Convert file to base64 for preview and storage
        const reader = new FileReader();
        reader.onload = async (event) => {
          const base64String = event.target?.result as string;
          
          setProfileData(prev => ({
            ...prev,
            profile_picture: base64String
          }));
          
          await updateUserProfile({
            profile_picture: base64String
          });
          
          toast({
            title: "Profile picture updated",
            description: "Your profile picture has been updated successfully"
          });
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('Error uploading image:', error);
        toast({
          title: 'Upload failed',
          description: 'Failed to upload the image',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fileInput.click();
  };

  // Remove profile picture
  const handleRemoveImage = async () => {
    try {
      setIsLoading(true);
      
      await updateUserProfile({
        profile_picture: null
      });
      
      setProfileData(prev => ({
        ...prev,
        profile_picture: null
      }));
      
      toast({
        title: "Profile picture removed",
        description: "Your profile picture has been removed"
      });
    } catch (error) {
      console.error('Error removing image:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove profile picture',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load profile data when component mounts
  useEffect(() => {
    loadUserProfile();
  }, []);

  // Get initials for avatar fallback
  const getInitials = () => {
    const firstInitial = profileData.firstName ? profileData.firstName[0] : '';
    const lastInitial = profileData.lastName ? profileData.lastName[0] : '';
    return (firstInitial + lastInitial).toUpperCase();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and application preferences</p>
      </div>
      
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid grid-cols-4 mb-6">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="business" className="gap-2">
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">Business</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="mt-0 space-y-6">
          <Card className="glass glass-hover">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information and contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <Avatar className="h-20 w-20 border-2 border-white shadow-sm">
                  {profileData.profile_picture ? (
                    <AvatarImage src={profileData.profile_picture} alt="Profile" />
                  ) : null}
                  <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium mb-2">Profile Photo</h3>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleImageUpload}
                      disabled={isLoading}
                    >
                      <UploadCloud className="h-4 w-4 mr-1" />
                      Upload new photo
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleRemoveImage}
                      disabled={isLoading || !profileData.profile_picture}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input 
                    id="firstName" 
                    placeholder="John" 
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input 
                    id="lastName" 
                    placeholder="Smith" 
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="example@email.com" 
                    value={profileData.email}
                    disabled={true} // Email should not be editable
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    placeholder="+1 (555) 123-4567" 
                    value={profileData.phone}
                    onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input 
                    id="location" 
                    placeholder="City, Country" 
                    value={profileData.location}
                    onChange={(e) => setProfileData({...profileData, location: e.target.value})}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea 
                    id="bio" 
                    placeholder="Tell us about yourself and your tutoring experience" 
                    value={profileData.bio}
                    onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                    disabled={isLoading}
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  className="gap-2"
                  onClick={updateProfile}
                  disabled={isLoading}
                >
                  <Save className="h-4 w-4" />
                  <span>Save Changes</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="business" className="mt-0 space-y-6">
          <Card className="glass glass-hover">
            <CardHeader>
              <CardTitle>Business Settings</CardTitle>
              <CardDescription>Configure your tutoring business details and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input id="businessName" placeholder="Your Tutoring Business" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessEmail">Business Email</Label>
                  <Input id="businessEmail" type="email" placeholder="business@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultRate">Default Hourly Rate ($)</Label>
                  <Input id="defaultRate" type="number" placeholder="30" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultDuration">Default Lesson Duration (min)</Label>
                  <Input id="defaultDuration" type="number" placeholder="60" />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="font-medium text-lg">Working Hours</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Monday</Label>
                    <div className="flex gap-2">
                      <Input placeholder="9:00 AM" />
                      <Input placeholder="5:00 PM" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Tuesday</Label>
                    <div className="flex gap-2">
                      <Input placeholder="9:00 AM" />
                      <Input placeholder="5:00 PM" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Wednesday</Label>
                    <div className="flex gap-2">
                      <Input placeholder="9:00 AM" />
                      <Input placeholder="5:00 PM" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Thursday</Label>
                    <div className="flex gap-2">
                      <Input placeholder="9:00 AM" />
                      <Input placeholder="5:00 PM" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Friday</Label>
                    <div className="flex gap-2">
                      <Input placeholder="9:00 AM" />
                      <Input placeholder="5:00 PM" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Saturday</Label>
                    <div className="flex gap-2">
                      <Input placeholder="Not Available" disabled />
                      <Input placeholder="Not Available" disabled />
                    </div>
                  </div>
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
        
        <TabsContent value="notifications" className="mt-0 space-y-6">
          <Card className="glass glass-hover">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Control what notifications you receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="font-medium">Lesson Reminders</h4>
                    <p className="text-sm text-muted-foreground">Receive notifications before scheduled lessons</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="font-medium">Payment Notifications</h4>
                    <p className="text-sm text-muted-foreground">Receive notifications for payments and invoices</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="font-medium">Student Updates</h4>
                    <p className="text-sm text-muted-foreground">Notifications when students update their information</p>
                  </div>
                  <Switch />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="font-medium">Marketing Emails</h4>
                    <p className="text-sm text-muted-foreground">Receive updates about new features and promotions</p>
                  </div>
                  <Switch defaultChecked />
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

export default Settings;
