import React, { useContext } from 'react';
import { 
  Briefcase, 
  Globe,
  Save,
  Palette
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import SchoolTimezoneManagement from '@/components/SchoolTimezoneManagement';
import SchoolLogoUpload from '@/components/SchoolLogoUpload';
import { UserContext } from '@/App';

const SchoolSettings = () => {
  const { user } = useContext(UserContext);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">School Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your business information and school configuration</p>
      </div>
      
      <Tabs defaultValue="branding" className="w-full">
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="branding" className="gap-2">
            <Palette className="h-4 w-4" />
            <span>Branding</span>
          </TabsTrigger>
          <TabsTrigger value="business" className="gap-2">
            <Briefcase className="h-4 w-4" />
            <span>Business</span>
          </TabsTrigger>
          <TabsTrigger value="school-timezone" className="gap-2">
            <Globe className="h-4 w-4" />
            <span>School Timezone</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="branding" className="mt-0 space-y-6">
          <SchoolLogoUpload />
          
          <Card className="glass glass-hover">
            <CardHeader>
              <CardTitle>School Branding</CardTitle>
              <CardDescription>Customize your school's brand identity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="schoolName">School Name</Label>
                  <Input 
                    id="schoolName" 
                    placeholder="Kool-Skool Academy" 
                    defaultValue="Kool-Skool"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input 
                    id="tagline" 
                    placeholder="Excellence in Education" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="primaryColor" 
                      type="color" 
                      defaultValue="#4CAF50"
                      className="w-20 h-10"
                    />
                    <Input 
                      placeholder="#4CAF50" 
                      defaultValue="#4CAF50"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="secondaryColor" 
                      type="color" 
                      defaultValue="#2E7D32"
                      className="w-20 h-10"
                    />
                    <Input 
                      placeholder="#2E7D32" 
                      defaultValue="#2E7D32"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Branding
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

        <TabsContent value="school-timezone" className="mt-0 space-y-6">
          {user?.schoolId && <SchoolTimezoneManagement schoolId={user.schoolId} />}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SchoolSettings;