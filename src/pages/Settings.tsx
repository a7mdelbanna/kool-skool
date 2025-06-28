import React from 'react';
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
  Wallet,
  Tags,
  GraduationCap
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
import CurrencyManagement from '@/components/CurrencyManagement';
import AccountsManagement from '@/components/AccountsManagement';
import TransactionCategoriesManagement from '@/components/TransactionCategoriesManagement';
import TagManager from '@/components/TagManager';
import StudentLevelsManagement from '@/components/StudentLevelsManagement';

const Settings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and application preferences</p>
      </div>
      
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid grid-cols-9 mb-6">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="business" className="gap-2">
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">Business</span>
          </TabsTrigger>
          <TabsTrigger value="levels" className="gap-2">
            <GraduationCap className="h-4 w-4" />
            <span className="hidden sm:inline">Levels</span>
          </TabsTrigger>
          <TabsTrigger value="accounts" className="gap-2">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">Accounts</span>
          </TabsTrigger>
          <TabsTrigger value="currencies" className="gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Currencies</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <Tags className="h-4 w-4" />
            <span className="hidden sm:inline">Categories</span>
          </TabsTrigger>
          <TabsTrigger value="tags" className="gap-2">
            <Tags className="h-4 w-4" />
            <span className="hidden sm:inline">Tags</span>
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

        <TabsContent value="levels" className="mt-0 space-y-6">
          <StudentLevelsManagement />
        </TabsContent>

        <TabsContent value="accounts" className="mt-0 space-y-6">
          <AccountsManagement />
        </TabsContent>

        <TabsContent value="currencies" className="mt-0 space-y-6">
          <CurrencyManagement />
        </TabsContent>

        <TabsContent value="categories" className="mt-0 space-y-6">
          <TransactionCategoriesManagement />
        </TabsContent>

        <TabsContent value="tags" className="mt-0 space-y-6">
          <TagManager showUsageCount={true} />
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
