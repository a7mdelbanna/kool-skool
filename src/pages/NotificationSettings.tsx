import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  MessageSquare, 
  Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const NotificationSettings = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notification Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your notification preferences and communication settings</p>
      </div>
      
      <Card className="glass glass-hover">
        <CardHeader>
          <CardTitle>SMS & WhatsApp Notifications</CardTitle>
          <CardDescription>Configure automated SMS and WhatsApp notifications via Twilio</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium">Twilio Integration</h4>
                <p className="text-sm text-muted-foreground">
                  Set up automated SMS and WhatsApp notifications for lesson reminders, payment alerts, and more.
                </p>
              </div>
              <Button 
                variant="outline"
                onClick={() => navigate('/settings/communications')}
              >
                Configure
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass glass-hover">
        <CardHeader>
          <CardTitle>Email Notification Preferences</CardTitle>
          <CardDescription>Control what email notifications you receive</CardDescription>
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
    </div>
  );
};

export default NotificationSettings;