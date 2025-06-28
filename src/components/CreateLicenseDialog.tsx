
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Key } from 'lucide-react';

interface CreateLicenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLicenseCreated: () => void;
}

interface CreateLicenseResponse {
  success: boolean;
  message: string;
  license_id?: string;
}

const CreateLicenseDialog: React.FC<CreateLicenseDialogProps> = ({
  open,
  onOpenChange,
  onLicenseCreated
}) => {
  const [licenseKey, setLicenseKey] = useState('');
  const [durationDays, setDurationDays] = useState('365');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  const generateLicenseKey = () => {
    // Generate a license key in format: XXXX-XXXX-XXXX-XXXX
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const segments = [];
    
    for (let i = 0; i < 4; i++) {
      let segment = '';
      for (let j = 0; j < 4; j++) {
        segment += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      segments.push(segment);
    }
    
    setLicenseKey(segments.join('-'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!licenseKey.trim()) {
      toast.error('Please enter a license key');
      return;
    }
    
    if (!durationDays || parseInt(durationDays) <= 0) {
      toast.error('Please enter a valid duration');
      return;
    }
    
    try {
      setLoading(true);
      
      console.log('Creating license:', {
        license_key: licenseKey.trim(),
        duration_days: parseInt(durationDays),
        is_active: isActive
      });
      
      const { data, error } = await supabase.rpc('create_license', {
        p_license_key: licenseKey.trim(),
        p_duration_days: parseInt(durationDays),
        p_is_active: isActive
      });
      
      if (error) {
        console.error('Error creating license:', error);
        toast.error('Failed to create license');
        return;
      }
      
      console.log('License creation result:', data);
      
      // Type assertion for the response - first cast to unknown, then to our interface
      const result = data as unknown as CreateLicenseResponse;
      
      if (result?.success) {
        toast.success('License created successfully');
        setLicenseKey('');
        setDurationDays('365');
        setIsActive(true);
        onLicenseCreated();
      } else {
        toast.error(result?.message || 'Failed to create license');
      }
      
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      toast.error('Failed to create license');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setLicenseKey('');
    setDurationDays('365');
    setIsActive(true);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New License</DialogTitle>
          <DialogDescription>
            Generate a new license for school access
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="licenseKey">License Key</Label>
            <div className="flex gap-2">
              <Input
                id="licenseKey"
                placeholder="XXXX-XXXX-XXXX-XXXX"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                className="font-mono"
                required
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={generateLicenseKey}
                title="Generate random license key"
              >
                <Key className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="duration">Duration</Label>
            <Select value={durationDays} onValueChange={setDurationDays}>
              <SelectTrigger>
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 days (1 month)</SelectItem>
                <SelectItem value="90">90 days (3 months)</SelectItem>
                <SelectItem value="180">180 days (6 months)</SelectItem>
                <SelectItem value="365">365 days (1 year)</SelectItem>
                <SelectItem value="730">730 days (2 years)</SelectItem>
                <SelectItem value="1095">1095 days (3 years)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="isActive">License is active</Label>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-red-600 hover:bg-red-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create License'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateLicenseDialog;
