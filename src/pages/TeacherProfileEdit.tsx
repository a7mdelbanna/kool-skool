import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Save,
  Camera,
  Plus,
  X,
  Globe,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { teachersService, Teacher, SocialLink, TeacherAvailability } from '@/services/firebase/teachers.service';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { TimezoneSelect } from '@/components/TimezoneSelect';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SOCIAL_PLATFORMS = ['LinkedIn', 'Twitter', 'Facebook', 'Instagram', 'Github', 'Youtube', 'Website'];

const TeacherProfileEdit = () => {
  const { teacherId } = useParams<{ teacherId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Get current user from localStorage
  const getCurrentUser = () => {
    const userData = localStorage.getItem('user');
    if (!userData) return null;
    return JSON.parse(userData);
  };

  const currentUser = getCurrentUser();
  const isOwnProfile = currentUser?.id === teacherId || currentUser?.uid === teacherId;
  const canEdit = isOwnProfile || currentUser?.role === 'admin' || currentUser?.role === 'superadmin';

  // Form state
  const [formData, setFormData] = useState<Partial<Teacher>>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    countryCode: '',
    bio: '',
    profilePicture: '',
    bannerImage: '',
    socialLinks: [],
    subjects: [],
    experience: '',
    qualifications: [],
    languages: [],
    timezone: '',
    zoomLink: '',
    availability: [],
    isActive: true
  });

  const [newSubject, setNewSubject] = useState('');
  const [newQualification, setNewQualification] = useState('');
  const [newLanguage, setNewLanguage] = useState('');

  // Fetch teacher data
  const {
    data: teacher,
    isLoading,
    error
  } = useQuery({
    queryKey: ['teacher-edit', teacherId],
    queryFn: async () => {
      if (!teacherId) throw new Error('Teacher ID is required');
      const teacherData = await teachersService.getById(teacherId);
      if (!teacherData) throw new Error('Teacher not found');
      return teacherData;
    },
    enabled: !!teacherId,
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Teacher>) => {
      if (!teacherId) throw new Error('Teacher ID is required');
      await teachersService.update(teacherId, data);
    },
    onSuccess: () => {
      toast.success('Profile updated successfully');
      queryClient.invalidateQueries({ queryKey: ['teacher-edit', teacherId] });
      queryClient.invalidateQueries({ queryKey: ['teacher-profile', teacherId] });
      navigate(`/teacher/${teacherId}`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update profile');
    }
  });

  // Initialize form data when teacher data is loaded
  useEffect(() => {
    if (teacher) {
      setFormData({
        ...teacher,
        availability: teacher.availability || DAYS_OF_WEEK.map(day => ({
          day,
          startTime: '09:00',
          endTime: '17:00',
          isAvailable: false
        }))
      });
    }
  }, [teacher]);

  // Redirect if user doesn't have permission
  useEffect(() => {
    if (!canEdit) {
      toast.error('You do not have permission to edit this profile');
      navigate(`/teacher/${teacherId}`);
    }
  }, [canEdit, teacherId, navigate]);

  const handleInputChange = (field: keyof Teacher, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddItem = (field: 'subjects' | 'qualifications' | 'languages', value: string) => {
    if (value.trim()) {
      setFormData(prev => ({
        ...prev,
        [field]: [...(prev[field] || []), value.trim()]
      }));

      // Clear the input
      if (field === 'subjects') setNewSubject('');
      else if (field === 'qualifications') setNewQualification('');
      else if (field === 'languages') setNewLanguage('');
    }
  };

  const handleRemoveItem = (field: 'subjects' | 'qualifications' | 'languages', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] || []).filter((_, i) => i !== index)
    }));
  };

  const handleSocialLinkChange = (index: number, field: 'platform' | 'url', value: string) => {
    setFormData(prev => {
      const socialLinks = [...(prev.socialLinks || [])];
      socialLinks[index] = { ...socialLinks[index], [field]: value };
      return { ...prev, socialLinks };
    });
  };

  const handleAddSocialLink = () => {
    setFormData(prev => ({
      ...prev,
      socialLinks: [...(prev.socialLinks || []), { platform: '', url: '' }]
    }));
  };

  const handleRemoveSocialLink = (index: number) => {
    setFormData(prev => ({
      ...prev,
      socialLinks: (prev.socialLinks || []).filter((_, i) => i !== index)
    }));
  };

  const handleAvailabilityChange = (dayIndex: number, field: string, value: any) => {
    setFormData(prev => {
      const availability = [...(prev.availability || [])];
      availability[dayIndex] = { ...availability[dayIndex], [field]: value };
      return { ...prev, availability };
    });
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <div className="space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error || !teacher) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <Card className="p-12 text-center">
          <h3 className="text-xl font-semibold mb-2">Teacher Not Found</h3>
          <p className="text-muted-foreground mb-4">
            The teacher profile you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate(-1)} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate(`/teacher/${teacherId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Profile
          </Button>
          <h1 className="text-2xl font-bold">Edit Profile</h1>
        </div>
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="professional">Professional</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="social">Social & Media</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your basic profile information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName || ''}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName || ''}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="countryCode">Country Code</Label>
                  <Input
                    id="countryCode"
                    placeholder="+1"
                    value={formData.countryCode || ''}
                    onChange={(e) => handleInputChange('countryCode', e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone || ''}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  rows={4}
                  placeholder="Tell students about yourself..."
                  value={formData.bio || ''}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <TimezoneSelect
                  value={formData.timezone || ''}
                  onChange={(value) => handleInputChange('timezone', value)}
                  placeholder="Select timezone"
                />
              </div>

              <div>
                <Label htmlFor="zoomLink">Zoom Meeting Link</Label>
                <Input
                  id="zoomLink"
                  type="url"
                  placeholder="https://zoom.us/j/..."
                  value={formData.zoomLink || ''}
                  onChange={(e) => handleInputChange('zoomLink', e.target.value)}
                />
              </div>

              {(currentUser?.role === 'admin' || currentUser?.role === 'superadmin') && (
                <div className="flex items-center justify-between">
                  <Label htmlFor="isActive">Account Status</Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive !== undefined ? formData.isActive : true}
                      onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                    />
                    <span className="text-sm">
                      {formData.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="professional" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Professional Information</CardTitle>
              <CardDescription>
                Manage your teaching subjects, experience, and qualifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Subjects */}
              <div>
                <Label>Subjects</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Add a subject"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddItem('subjects', newSubject);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => handleAddItem('subjects', newSubject)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.subjects?.map((subject, index) => (
                    <Badge key={index} variant="secondary" className="py-1 px-2">
                      {subject}
                      <button
                        onClick={() => handleRemoveItem('subjects', index)}
                        className="ml-2 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Experience */}
              <div>
                <Label htmlFor="experience">Teaching Experience</Label>
                <Textarea
                  id="experience"
                  rows={4}
                  placeholder="Describe your teaching experience..."
                  value={formData.experience || ''}
                  onChange={(e) => handleInputChange('experience', e.target.value)}
                />
              </div>

              {/* Qualifications */}
              <div>
                <Label>Qualifications</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Add a qualification"
                    value={newQualification}
                    onChange={(e) => setNewQualification(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddItem('qualifications', newQualification);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => handleAddItem('qualifications', newQualification)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2 mt-3">
                  {formData.qualifications?.map((qualification, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">{qualification}</span>
                      <button
                        onClick={() => handleRemoveItem('qualifications', index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Languages */}
              <div>
                <Label>Languages</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Add a language"
                    value={newLanguage}
                    onChange={(e) => setNewLanguage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddItem('languages', newLanguage);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => handleAddItem('languages', newLanguage)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.languages?.map((language, index) => (
                    <Badge key={index} variant="outline" className="py-1 px-2">
                      {language}
                      <button
                        onClick={() => handleRemoveItem('languages', index)}
                        className="ml-2 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="availability" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Availability</CardTitle>
              <CardDescription>
                Set your available hours for each day of the week
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.availability?.map((slot, index) => (
                <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="w-32">
                    <span className="font-medium">{slot.day}</span>
                  </div>
                  <Switch
                    checked={slot.isAvailable}
                    onCheckedChange={(checked) =>
                      handleAvailabilityChange(index, 'isAvailable', checked)
                    }
                  />
                  {slot.isAvailable && (
                    <>
                      <Input
                        type="time"
                        value={slot.startTime || '09:00'}
                        onChange={(e) =>
                          handleAvailabilityChange(index, 'startTime', e.target.value)
                        }
                        className="w-32"
                      />
                      <span>to</span>
                      <Input
                        type="time"
                        value={slot.endTime || '17:00'}
                        onChange={(e) =>
                          handleAvailabilityChange(index, 'endTime', e.target.value)
                        }
                        className="w-32"
                      />
                    </>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Images</CardTitle>
              <CardDescription>
                Update your profile picture and banner image
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="profilePicture">Profile Picture URL</Label>
                <Input
                  id="profilePicture"
                  type="url"
                  placeholder="https://example.com/profile.jpg"
                  value={formData.profilePicture || ''}
                  onChange={(e) => handleInputChange('profilePicture', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="bannerImage">Banner Image URL</Label>
                <Input
                  id="bannerImage"
                  type="url"
                  placeholder="https://example.com/banner.jpg"
                  value={formData.bannerImage || ''}
                  onChange={(e) => handleInputChange('bannerImage', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Social Links</CardTitle>
              <CardDescription>
                Add links to your social media profiles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.socialLinks?.map((link, index) => (
                <div key={index} className="flex gap-2">
                  <Select
                    value={link.platform}
                    onValueChange={(value) => handleSocialLinkChange(index, 'platform', value)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {SOCIAL_PLATFORMS.map(platform => (
                        <SelectItem key={platform} value={platform}>{platform}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="https://..."
                    value={link.url}
                    onChange={(e) => handleSocialLinkChange(index, 'url', e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveSocialLink(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={handleAddSocialLink}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Social Link
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TeacherProfileEdit;