import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Video, 
  Save, 
  ExternalLink, 
  Copy, 
  Check,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface TeacherZoomSettingsProps {
  userId: string;
  userRole: string;
}

const TeacherZoomSettings: React.FC<TeacherZoomSettingsProps> = ({ 
  userId, 
  userRole 
}) => {
  const [zoomLink, setZoomLink] = useState('');
  const [originalZoomLink, setOriginalZoomLink] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Only show for teachers
  if (userRole !== 'teacher') {
    return null;
  }

  useEffect(() => {
    loadZoomLink();
  }, [userId]);

  const loadZoomLink = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const link = data.zoomLink || '';
        setZoomLink(link);
        setOriginalZoomLink(link);
      }
    } catch (error) {
      console.error('Error loading zoom link:', error);
      toast.error('Failed to load Zoom link');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    // Validate URL if provided
    if (zoomLink && !isValidZoomUrl(zoomLink)) {
      toast.error('Please enter a valid Zoom meeting URL');
      return;
    }

    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', userId), {
        zoomLink: zoomLink.trim(),
        updatedAt: new Date()
      });

      setOriginalZoomLink(zoomLink);
      toast.success('Zoom link saved successfully');
    } catch (error) {
      console.error('Error saving zoom link:', error);
      toast.error('Failed to save Zoom link');
    } finally {
      setIsSaving(false);
    }
  };

  const isValidZoomUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      // Check if it's a zoom domain
      const validDomains = ['zoom.us', 'zoom.com', 'zoomgov.com'];
      return validDomains.some(domain => 
        urlObj.hostname.includes(domain)
      );
    } catch {
      return false;
    }
  };

  const handleCopy = () => {
    if (zoomLink) {
      navigator.clipboard.writeText(zoomLink);
      setCopied(true);
      toast.success('Zoom link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTest = () => {
    if (zoomLink && isValidZoomUrl(zoomLink)) {
      window.open(zoomLink, '_blank');
    }
  };

  const hasChanges = zoomLink !== originalZoomLink;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          <CardTitle>Zoom Meeting Settings</CardTitle>
        </div>
        <CardDescription>
          Configure your Zoom meeting link for online lessons. This link will be automatically included in lesson reminder notifications.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="zoomLink">Zoom Meeting Link</Label>
          <div className="flex gap-2">
            <Input
              id="zoomLink"
              type="url"
              placeholder="https://zoom.us/j/1234567890"
              value={zoomLink}
              onChange={(e) => setZoomLink(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopy}
              disabled={!zoomLink}
              title="Copy link"
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleTest}
              disabled={!zoomLink || !isValidZoomUrl(zoomLink)}
              title="Test link"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter your personal Zoom meeting room URL. Students will receive this link in their lesson reminders.
          </p>
        </div>

        {zoomLink && !isValidZoomUrl(zoomLink) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please enter a valid Zoom URL (e.g., https://zoom.us/j/1234567890)
            </AlertDescription>
          </Alert>
        )}

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Pro tip:</strong> Use your Personal Meeting Room URL for a consistent link, 
            or update this with specific meeting links for scheduled sessions.
          </AlertDescription>
        </Alert>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setZoomLink(originalZoomLink)}
            disabled={!hasChanges || isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeacherZoomSettings;