import React, { useContext } from 'react';
import { 
  Briefcase, 
  Globe,
  Save,
  Palette,
  Clock,
  Shield
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
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { databaseService } from '@/services/firebase/database.service';
import { useState, useEffect } from 'react';

const SchoolSettings = () => {
  const { user } = useContext(UserContext);
  const [cancellationHours, setCancellationHours] = useState(48);
  const [allowStudentCancellation, setAllowStudentCancellation] = useState(true);
  const [maxCancellationsPerSubscription, setMaxCancellationsPerSubscription] = useState(2);
  const [savingPolicies, setSavingPolicies] = useState(false);
  const [loadingPolicies, setLoadingPolicies] = useState(true);
  
  useEffect(() => {
    if (user?.schoolId) {
      loadCancellationPolicies();
    }
  }, [user?.schoolId]);
  
  const loadCancellationPolicies = async () => {
    if (!user?.schoolId) return;
    
    try {
      setLoadingPolicies(true);
      const schoolData = await databaseService.getById('schools', user.schoolId);
      
      if (schoolData?.cancellationPolicy) {
        setCancellationHours(schoolData.cancellationPolicy.hoursNotice || 48);
        setAllowStudentCancellation(schoolData.cancellationPolicy.allowStudentCancellation !== false);
        setMaxCancellationsPerSubscription(schoolData.cancellationPolicy.maxCancellations || 2);
      }
    } catch (error) {
      console.error('Error loading cancellation policies:', error);
    } finally {
      setLoadingPolicies(false);
    }
  };
  
  const saveCancellationPolicies = async () => {
    if (!user?.schoolId) return;
    
    try {
      setSavingPolicies(true);
      
      await databaseService.update('schools', user.schoolId, {
        cancellationPolicy: {
          hoursNotice: cancellationHours,
          allowStudentCancellation,
          maxCancellations: maxCancellationsPerSubscription,
          updatedAt: new Date().toISOString()
        }
      });
      
      toast.success('Cancellation policies saved successfully');
    } catch (error) {
      console.error('Error saving cancellation policies:', error);
      toast.error('Failed to save cancellation policies');
    } finally {
      setSavingPolicies(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">School Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your business information and school configuration</p>
      </div>
      
      <Tabs defaultValue="branding" className="w-full">
        <TabsList className="grid grid-cols-4 mb-6">
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
          <TabsTrigger value="policies" className="gap-2">
            <Shield className="h-4 w-4" />
            <span>Policies</span>
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
        
        <TabsContent value="policies" className="mt-0 space-y-6">
          <Card className="glass glass-hover">
            <CardHeader>
              <CardTitle>Cancellation Policies</CardTitle>
              <CardDescription>Configure how students can cancel their sessions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loadingPolicies ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="allowCancellation">Allow Student Cancellations</Label>
                        <p className="text-sm text-muted-foreground">
                          Enable students to request session cancellations
                        </p>
                      </div>
                      <Switch
                        id="allowCancellation"
                        checked={allowStudentCancellation}
                        onCheckedChange={setAllowStudentCancellation}
                      />
                    </div>
                    
                    {allowStudentCancellation && (
                      <>
                        <Separator />
                        
                        <div className="space-y-2">
                          <Label htmlFor="cancellationHours">
                            Cancellation Notice Period (hours)
                          </Label>
                          <Input
                            id="cancellationHours"
                            type="number"
                            min="1"
                            max="168"
                            value={cancellationHours}
                            onChange={(e) => setCancellationHours(parseInt(e.target.value) || 48)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Students must cancel at least {cancellationHours} hours before the session
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="maxCancellations">
                            Maximum Cancellations per Subscription
                          </Label>
                          <Input
                            id="maxCancellations"
                            type="number"
                            min="0"
                            max="10"
                            value={maxCancellationsPerSubscription}
                            onChange={(e) => setMaxCancellationsPerSubscription(parseInt(e.target.value) || 2)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Limit the number of cancellations allowed per subscription (0 = unlimited)
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-amber-600 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-amber-900">Policy Summary</p>
                        <p className="text-xs text-amber-800">
                          {allowStudentCancellation
                            ? `Students can cancel sessions with ${cancellationHours} hours notice. ${maxCancellationsPerSubscription > 0 ? `Maximum ${maxCancellationsPerSubscription} cancellations per subscription.` : 'Unlimited cancellations allowed.'}`
                            : 'Students cannot cancel sessions. Only teachers and admins can manage cancellations.'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      onClick={saveCancellationPolicies}
                      disabled={savingPolicies}
                      className="gap-2"
                    >
                      {savingPolicies ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Save Policies
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SchoolSettings;