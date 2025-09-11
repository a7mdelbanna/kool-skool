import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Heart,
  Globe,
  Instagram,
  Linkedin,
  Facebook,
  AlertCircle,
  Camera,
  Save,
  Edit2,
  Check,
  X,
  Shield,
  Bell,
  Languages,
  BookOpen,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface ProfileData {
  bio: string;
  city: string;
  date_of_birth: string | null;
  emergency_contact: {
    name: string;
    phone: string;
    relationship: string;
  };
  social_links: {
    linkedin: string;
    instagram: string;
    facebook: string;
  };
  preferences: {
    learning_style: string;
    preferred_session_time: string;
    language: string;
    notification_preferences: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
  };
  medical_info: string;
  profile_photo_url: string;
}

interface ProfileEditorProps {
  studentId: string;
  initialData?: Partial<ProfileData>;
  onSave?: () => void;
}

const ProfileEditor: React.FC<ProfileEditorProps> = ({ 
  studentId, 
  initialData,
  onSave 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    bio: '',
    city: '',
    date_of_birth: null,
    emergency_contact: {
      name: '',
      phone: '',
      relationship: ''
    },
    social_links: {
      linkedin: '',
      instagram: '',
      facebook: ''
    },
    preferences: {
      learning_style: '',
      preferred_session_time: '',
      language: 'en',
      notification_preferences: {
        email: true,
        sms: false,
        push: true
      }
    },
    medical_info: '',
    profile_photo_url: '',
    ...initialData
  });

  const [editedData, setEditedData] = useState<ProfileData>(profileData);

  const learningStyles = [
    { value: 'visual', label: 'Visual (Pictures, diagrams)' },
    { value: 'auditory', label: 'Auditory (Listening, discussing)' },
    { value: 'kinesthetic', label: 'Kinesthetic (Hands-on, practice)' },
    { value: 'reading', label: 'Reading/Writing' },
    { value: 'mixed', label: 'Mixed approach' }
  ];

  const preferredTimes = [
    { value: 'morning', label: 'Morning (6 AM - 12 PM)' },
    { value: 'afternoon', label: 'Afternoon (12 PM - 6 PM)' },
    { value: 'evening', label: 'Evening (6 PM - 10 PM)' },
    { value: 'flexible', label: 'Flexible' }
  ];

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'ar', label: 'Arabic' },
    { value: 'fr', label: 'French' },
    { value: 'es', label: 'Spanish' }
  ];

  const relationships = [
    { value: 'parent', label: 'Parent' },
    { value: 'guardian', label: 'Guardian' },
    { value: 'spouse', label: 'Spouse' },
    { value: 'sibling', label: 'Sibling' },
    { value: 'friend', label: 'Friend' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    setEditedData(profileData);
  }, [profileData]);

  const handleSave = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('update_student_profile', {
        p_profile_data: editedData
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setProfileData(editedData);
      setIsEditing(false);
      toast.success('Profile updated successfully');
      onSave?.();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditedData(profileData);
    setIsEditing(false);
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${studentId}-${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(fileName);

      setEditedData(prev => ({
        ...prev,
        profile_photo_url: publicUrl
      }));

      toast.success('Photo uploaded successfully');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (firstName: string = '', lastName: string = '') => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={editedData.profile_photo_url} />
                  <AvatarFallback>{getInitials()}</AvatarFallback>
                </Avatar>
                {isEditing && (
                  <label className="absolute bottom-0 right-0 bg-primary rounded-full p-1 cursor-pointer">
                    <Camera className="h-4 w-4 text-white" />
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      disabled={loading}
                    />
                  </label>
                )}
              </div>
              <div>
                <CardTitle>Student Profile</CardTitle>
                <CardDescription>
                  Manage your personal information and preferences
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)} variant="outline">
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    disabled={loading}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={loading}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Profile Content */}
      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="contact">Contact & Social</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="emergency">Emergency</TabsTrigger>
        </TabsList>

        {/* Personal Information Tab */}
        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bio">Bio / About Me</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about yourself..."
                  value={editedData.bio}
                  onChange={(e) => setEditedData(prev => ({ ...prev, bio: e.target.value }))}
                  disabled={!isEditing}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="city"
                      placeholder="Your city"
                      value={editedData.city}
                      onChange={(e) => setEditedData(prev => ({ ...prev, city: e.target.value }))}
                      disabled={!isEditing}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="dob"
                      type="date"
                      value={editedData.date_of_birth || ''}
                      onChange={(e) => setEditedData(prev => ({ 
                        ...prev, 
                        date_of_birth: e.target.value 
                      }))}
                      disabled={!isEditing}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="medical">Medical Information / Special Needs</Label>
                <Textarea
                  id="medical"
                  placeholder="Any medical conditions or special requirements..."
                  value={editedData.medical_info}
                  onChange={(e) => setEditedData(prev => ({ 
                    ...prev, 
                    medical_info: e.target.value 
                  }))}
                  disabled={!isEditing}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  This information will be kept confidential and shared only with your teacher
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact & Social Tab */}
        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Contact & Social Media
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="linkedin">LinkedIn Profile</Label>
                  <div className="relative">
                    <Linkedin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="linkedin"
                      placeholder="https://linkedin.com/in/yourprofile"
                      value={editedData.social_links.linkedin}
                      onChange={(e) => setEditedData(prev => ({
                        ...prev,
                        social_links: { ...prev.social_links, linkedin: e.target.value }
                      }))}
                      disabled={!isEditing}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram Handle</Label>
                  <div className="relative">
                    <Instagram className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="instagram"
                      placeholder="@yourusername"
                      value={editedData.social_links.instagram}
                      onChange={(e) => setEditedData(prev => ({
                        ...prev,
                        social_links: { ...prev.social_links, instagram: e.target.value }
                      }))}
                      disabled={!isEditing}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="facebook">Facebook Profile</Label>
                  <div className="relative">
                    <Facebook className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="facebook"
                      placeholder="https://facebook.com/yourprofile"
                      value={editedData.social_links.facebook}
                      onChange={(e) => setEditedData(prev => ({
                        ...prev,
                        social_links: { ...prev.social_links, facebook: e.target.value }
                      }))}
                      disabled={!isEditing}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Learning Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="learning-style">Learning Style</Label>
                  <Select
                    value={editedData.preferences.learning_style}
                    onValueChange={(value) => setEditedData(prev => ({
                      ...prev,
                      preferences: { ...prev.preferences, learning_style: value }
                    }))}
                    disabled={!isEditing}
                  >
                    <SelectTrigger id="learning-style">
                      <SelectValue placeholder="Select your learning style" />
                    </SelectTrigger>
                    <SelectContent>
                      {learningStyles.map(style => (
                        <SelectItem key={style.value} value={style.value}>
                          {style.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="session-time">Preferred Session Time</Label>
                  <Select
                    value={editedData.preferences.preferred_session_time}
                    onValueChange={(value) => setEditedData(prev => ({
                      ...prev,
                      preferences: { ...prev.preferences, preferred_session_time: value }
                    }))}
                    disabled={!isEditing}
                  >
                    <SelectTrigger id="session-time">
                      <SelectValue placeholder="Select preferred time" />
                    </SelectTrigger>
                    <SelectContent>
                      {preferredTimes.map(time => (
                        <SelectItem key={time.value} value={time.value}>
                          {time.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Preferred Language</Label>
                <Select
                  value={editedData.preferences.language}
                  onValueChange={(value) => setEditedData(prev => ({
                    ...prev,
                    preferences: { ...prev.preferences, language: value }
                  }))}
                  disabled={!isEditing}
                >
                  <SelectTrigger id="language">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map(lang => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label>Notification Preferences</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Email Notifications</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={editedData.preferences.notification_preferences.email}
                      onChange={(e) => setEditedData(prev => ({
                        ...prev,
                        preferences: {
                          ...prev.preferences,
                          notification_preferences: {
                            ...prev.preferences.notification_preferences,
                            email: e.target.checked
                          }
                        }
                      }))}
                      disabled={!isEditing}
                      className="h-4 w-4"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">SMS Notifications</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={editedData.preferences.notification_preferences.sms}
                      onChange={(e) => setEditedData(prev => ({
                        ...prev,
                        preferences: {
                          ...prev.preferences,
                          notification_preferences: {
                            ...prev.preferences.notification_preferences,
                            sms: e.target.checked
                          }
                        }
                      }))}
                      disabled={!isEditing}
                      className="h-4 w-4"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Push Notifications</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={editedData.preferences.notification_preferences.push}
                      onChange={(e) => setEditedData(prev => ({
                        ...prev,
                        preferences: {
                          ...prev.preferences,
                          notification_preferences: {
                            ...prev.preferences.notification_preferences,
                            push: e.target.checked
                          }
                        }
                      }))}
                      disabled={!isEditing}
                      className="h-4 w-4"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Emergency Contact Tab */}
        <TabsContent value="emergency">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Emergency Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This information will only be used in case of emergencies
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="emergency-name">Contact Name</Label>
                  <Input
                    id="emergency-name"
                    placeholder="Emergency contact name"
                    value={editedData.emergency_contact.name}
                    onChange={(e) => setEditedData(prev => ({
                      ...prev,
                      emergency_contact: { 
                        ...prev.emergency_contact, 
                        name: e.target.value 
                      }
                    }))}
                    disabled={!isEditing}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergency-phone">Phone Number</Label>
                    <Input
                      id="emergency-phone"
                      placeholder="Emergency phone"
                      value={editedData.emergency_contact.phone}
                      onChange={(e) => setEditedData(prev => ({
                        ...prev,
                        emergency_contact: { 
                          ...prev.emergency_contact, 
                          phone: e.target.value 
                        }
                      }))}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emergency-relationship">Relationship</Label>
                    <Select
                      value={editedData.emergency_contact.relationship}
                      onValueChange={(value) => setEditedData(prev => ({
                        ...prev,
                        emergency_contact: { 
                          ...prev.emergency_contact, 
                          relationship: value 
                        }
                      }))}
                      disabled={!isEditing}
                    >
                      <SelectTrigger id="emergency-relationship">
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                      <SelectContent>
                        {relationships.map(rel => (
                          <SelectItem key={rel.value} value={rel.value}>
                            {rel.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfileEditor;