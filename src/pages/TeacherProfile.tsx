import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Mail,
  Phone,
  Globe,
  MapPin,
  Clock,
  BookOpen,
  Languages,
  Award,
  Calendar,
  Users,
  Video,
  Linkedin,
  Twitter,
  Facebook,
  Instagram,
  Github,
  Youtube,
  Link as LinkIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { teachersService, Teacher } from '@/services/firebase/teachers.service';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

const TeacherProfile = () => {
  const { teacherId } = useParams<{ teacherId: string }>();
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);

  // Get current user from localStorage
  const getCurrentUser = () => {
    const userData = localStorage.getItem('user');
    if (!userData) return null;
    return JSON.parse(userData);
  };

  const currentUser = getCurrentUser();
  const isOwnProfile = currentUser?.id === teacherId || currentUser?.uid === teacherId;
  const canEdit = isOwnProfile || currentUser?.role === 'admin' || currentUser?.role === 'superadmin';

  // Fetch teacher data
  const {
    data: teacher,
    isLoading,
    error
  } = useQuery({
    queryKey: ['teacher-profile', teacherId],
    queryFn: async () => {
      if (!teacherId) throw new Error('Teacher ID is required');
      const teacherData = await teachersService.getById(teacherId);
      if (!teacherData) throw new Error('Teacher not found');

      // Fetch stats
      const stats = await teachersService.getTeacherStats(teacherId);
      return {
        ...teacherData,
        ...stats
      };
    },
    enabled: !!teacherId,
  });

  const getSocialIcon = (platform: string) => {
    const platformLower = platform.toLowerCase();
    switch (platformLower) {
      case 'linkedin':
        return <Linkedin className="h-4 w-4" />;
      case 'twitter':
        return <Twitter className="h-4 w-4" />;
      case 'facebook':
        return <Facebook className="h-4 w-4" />;
      case 'instagram':
        return <Instagram className="h-4 w-4" />;
      case 'github':
        return <Github className="h-4 w-4" />;
      case 'youtube':
        return <Youtube className="h-4 w-4" />;
      default:
        return <LinkIcon className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-6xl mx-auto p-6">
        <div className="space-y-6">
          <Skeleton className="h-48 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-96" />
            <div className="md:col-span-2 space-y-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !teacher) {
    return (
      <div className="container max-w-6xl mx-auto p-6">
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

  const initials = `${teacher.firstName?.[0] || ''}${teacher.lastName?.[0] || ''}`.toUpperCase();

  return (
    <div className="container max-w-6xl mx-auto p-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      {/* Banner Section */}
      {teacher.bannerImage && (
        <div className="relative h-48 md:h-64 rounded-t-lg overflow-hidden mb-6">
          <img
            src={teacher.bannerImage}
            alt="Profile banner"
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Sidebar - Basic Info */}
        <div className="space-y-6">
          {/* Profile Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarImage
                    src={teacher.profilePicture}
                    alt={`${teacher.firstName} ${teacher.lastName}`}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-2xl font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <h1 className="text-2xl font-bold mb-1">
                  {teacher.firstName} {teacher.lastName}
                </h1>

                {teacher.subjects && teacher.subjects.length > 0 && (
                  <p className="text-muted-foreground mb-3">
                    {teacher.subjects.slice(0, 2).join(' • ')}
                  </p>
                )}

                <Badge
                  variant={teacher.isActive ? "success" : "secondary"}
                  className="mb-4"
                >
                  {teacher.isActive ? "Active" : "Inactive"}
                </Badge>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 w-full pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{teacher.studentCount || 0}</div>
                    <div className="text-xs text-muted-foreground">Students</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{teacher.activeSubscriptions || 0}</div>
                    <div className="text-xs text-muted-foreground">Active</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{teacher.completedLessons || 0}</div>
                    <div className="text-xs text-muted-foreground">Lessons</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {teacher.email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <a
                      href={`mailto:${teacher.email}`}
                      className="text-sm hover:text-blue-600 transition-colors"
                    >
                      {teacher.email}
                    </a>
                  </div>
                </div>
              )}

              {teacher.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <a
                      href={`tel:${teacher.countryCode || ''}${teacher.phone}`}
                      className="text-sm hover:text-blue-600 transition-colors"
                    >
                      {teacher.countryCode || ''} {teacher.phone}
                    </a>
                  </div>
                </div>
              )}

              {teacher.timezone && (
                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm">{teacher.timezone}</p>
                  </div>
                </div>
              )}

              {teacher.zoomLink && (
                <div className="flex items-start gap-3">
                  <Video className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <a
                      href={teacher.zoomLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      Join Zoom Meeting
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Social Links */}
          {teacher.socialLinks && teacher.socialLinks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Social Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {teacher.socialLinks.map((link, index) => (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    {getSocialIcon(link.platform)}
                    <span className="text-sm">{link.platform}</span>
                  </a>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Content - Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Action Buttons */}
          {canEdit && (
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => navigate(`/teacher/${teacherId}/edit`)}
              >
                Edit Profile
              </Button>
            </div>
          )}

          <Tabs defaultValue="about" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="about">About</TabsTrigger>
              <TabsTrigger value="qualifications">Qualifications</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
            </TabsList>

            <TabsContent value="about" className="space-y-6 mt-6">
              {/* Bio */}
              {teacher.bio && (
                <Card>
                  <CardHeader>
                    <CardTitle>About Me</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {teacher.bio}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Experience */}
              {teacher.experience && (
                <Card>
                  <CardHeader>
                    <CardTitle>Teaching Experience</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {teacher.experience}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Languages */}
              {teacher.languages && teacher.languages.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Languages className="h-5 w-5" />
                      Languages
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {teacher.languages.map((language, index) => (
                        <Badge key={index} variant="secondary">
                          {language}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="qualifications" className="space-y-6 mt-6">
              {/* Subjects */}
              {teacher.subjects && teacher.subjects.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Subjects
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {teacher.subjects.map((subject, index) => (
                        <Badge key={index} variant="outline">
                          {subject}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Qualifications */}
              {teacher.qualifications && teacher.qualifications.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Qualifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {teacher.qualifications.map((qualification, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="h-1.5 w-1.5 bg-blue-600 rounded-full mt-2" />
                          <span className="text-sm">{qualification}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="schedule" className="space-y-6 mt-6">
              {/* Availability */}
              {teacher.availability && teacher.availability.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Weekly Availability
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {teacher.availability.map((slot, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                          <span className="font-medium">{slot.day}</span>
                          {slot.isAvailable ? (
                            <span className="text-sm text-green-600">
                              {slot.startTime} - {slot.endTime}
                            </span>
                          ) : (
                            <Badge variant="secondary">Not Available</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default TeacherProfile;