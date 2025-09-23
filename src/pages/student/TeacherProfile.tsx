import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Globe, MapPin, Book, Languages, Clock, Star, Users, Calendar, Award, Briefcase, GraduationCap, Heart, MessageCircle, Video, CheckCircle, Sparkles, DollarSign, Linkedin, Twitter, Facebook, Instagram } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { teachersService } from '@/services/firebase/teachers.service';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  avatar?: string;
  subjects?: string[];
  languages?: string[];
  bio?: string;
  experience?: string;
  education?: string;
  hourlyRate?: number;
  currency?: string;
  timezone?: string;
  availability?: any;
  rating?: number;
  totalStudents?: number;
  yearsOfExperience?: number;
  specializations?: string[];
  certifications?: string[];
  website?: string;
  location?: string;
  status?: string;
  socialLinks?: Array<{ platform: string; url: string }>;
}

const TeacherProfile: React.FC = () => {
  const { teacherId } = useParams<{ teacherId: string }>();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('about');

  useEffect(() => {
    loadTeacher();
  }, [teacherId]);

  const loadTeacher = async () => {
    if (!teacherId) return;

    setLoading(true);
    try {
      const teacherData = await teachersService.getById(teacherId);
      if (teacherData) {
        setTeacher(teacherData);
      } else {
        toast.error('Teacher not found');
        navigate('/student-dashboard');
      }
    } catch (error) {
      console.error('Error loading teacher:', error);
      toast.error('Failed to load teacher profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          <p className="text-muted-foreground">Loading teacher profile...</p>
        </motion.div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-4">Teacher not found</h2>
            <Button onClick={() => navigate('/student-dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const getSocialIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'linkedin': return <Linkedin className="h-4 w-4" />;
      case 'twitter': return <Twitter className="h-4 w-4" />;
      case 'facebook': return <Facebook className="h-4 w-4" />;
      case 'instagram': return <Instagram className="h-4 w-4" />;
      default: return <Globe className="h-4 w-4" />;
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-950">
      {/* Hero Section with Cover Image */}
      <div className="relative h-64 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600">
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

        {/* Back Button */}
        <div className="absolute top-4 left-4 z-10">
          <Button
            variant="secondary"
            onClick={() => navigate('/student-dashboard/subscriptions')}
            className="backdrop-blur-sm bg-white/90 hover:bg-white shadow-lg"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Profile Avatar - Overlapping */}
        <div className="absolute -bottom-16 left-8 z-20">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <Avatar className="h-32 w-32 border-4 border-white shadow-2xl">
              <AvatarImage src={teacher.avatar} alt={`${teacher.firstName} ${teacher.lastName}`} />
              <AvatarFallback className="text-3xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                {getInitials(teacher.firstName, teacher.lastName)}
              </AvatarFallback>
            </Avatar>
            {teacher.status === 'active' && (
              <div className="absolute bottom-2 right-2 h-6 w-6 bg-green-500 border-2 border-white rounded-full animate-pulse" />
            )}
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 pt-20 pb-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-6xl mx-auto"
        >
          {/* Header Info */}
          <motion.div variants={itemVariants} className="mb-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  {teacher.firstName} {teacher.lastName}
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
                  Professional Educator
                </p>

                {/* Contact Info */}
                <div className="flex flex-wrap gap-4 text-sm">
                  {teacher.email && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Mail className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                      {teacher.email}
                    </div>
                  )}
                  {teacher.phone && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Phone className="h-4 w-4 text-green-500 dark:text-green-400" />
                      {teacher.phone}
                    </div>
                  )}
                  {teacher.location && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <MapPin className="h-4 w-4 text-red-500 dark:text-red-400" />
                      {teacher.location}
                    </div>
                  )}
                  {teacher.timezone && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Clock className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                      {teacher.timezone}
                    </div>
                  )}
                </div>

                {/* Social Links */}
                {teacher.socialLinks && teacher.socialLinks.length > 0 && (
                  <div className="flex gap-2 mt-4">
                    {teacher.socialLinks.map((link, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => window.open(link.url, '_blank')}
                      >
                        {getSocialIcon(link.platform)}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex gap-3">
                <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg text-white">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message
                </Button>
                <Button variant="outline" className="shadow-md dark:bg-gray-800 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white">
                  <Video className="h-4 w-4 mr-2" />
                  Schedule
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Heart className="h-5 w-5 text-gray-600 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400" />
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Stats Cards */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {teacher.rating && (
              <Card className="border-yellow-200 dark:border-yellow-800 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-500 dark:text-yellow-400 dark:fill-yellow-400" />
                    <span className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                      {teacher.rating.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Rating</p>
                  <div className="mt-2">
                    <Progress value={teacher.rating * 20} className="h-1.5" />
                  </div>
                </CardContent>
              </Card>
            )}

            {teacher.totalStudents && (
              <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                    <span className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                      {teacher.totalStudents}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Students</p>
                  <div className="mt-2 flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs dark:bg-gray-700 dark:text-gray-300">Active</Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {teacher.yearsOfExperience && (
              <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Briefcase className="h-5 w-5 text-purple-500 dark:text-purple-400" />
                    <span className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                      {teacher.yearsOfExperience}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Years Experience</p>
                  <div className="mt-2">
                    <Progress value={Math.min(teacher.yearsOfExperience * 10, 100)} className="h-1.5" />
                  </div>
                </CardContent>
              </Card>
            )}

            {teacher.hourlyRate && (
              <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <DollarSign className="h-5 w-5 text-green-500 dark:text-green-400" />
                    <span className="text-2xl font-bold text-green-700 dark:text-green-400">
                      {teacher.hourlyRate}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{teacher.currency || 'RUB'}/hour</p>
                  <div className="mt-2">
                    <Badge variant="secondary" className="text-xs dark:bg-gray-700 dark:text-gray-300">Available</Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>

          {/* Main Content Tabs */}
          <motion.div variants={itemVariants}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm shadow-lg">
                <TabsTrigger value="about" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 text-gray-700 dark:text-gray-300 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white">
                  <Book className="h-4 w-4 mr-2" />
                  About
                </TabsTrigger>
                <TabsTrigger value="expertise" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 text-gray-700 dark:text-gray-300 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white">
                  <Award className="h-4 w-4 mr-2" />
                  Expertise
                </TabsTrigger>
                <TabsTrigger value="availability" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 text-gray-700 dark:text-gray-300 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule
                </TabsTrigger>
              </TabsList>

              <AnimatePresence mode="wait">
                <TabsContent key="about" value="about" className="space-y-6 mt-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="grid gap-6"
                  >
                    {/* Biography Card */}
                    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 dark:bg-gray-800/50">
                      <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30">
                        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                          <Sparkles className="h-5 w-5 text-purple-500 dark:text-purple-400" />
                          Biography
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6 dark:bg-gray-800/30">
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                          {teacher.bio || 'No biography provided yet. Check back later for more information about this teacher.'}
                        </p>
                      </CardContent>
                    </Card>

                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Education Card */}
                      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 dark:bg-gray-800/50">
                        <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/30 dark:to-teal-900/30">
                          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                            <GraduationCap className="h-5 w-5 text-green-500 dark:text-green-400" />
                            Education
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 dark:bg-gray-800/30">
                          <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                            {teacher.education || 'Education details will be added soon.'}
                          </p>
                        </CardContent>
                      </Card>

                      {/* Experience Card */}
                      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 dark:bg-gray-800/50">
                        <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/30 dark:to-red-900/30">
                          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                            <Briefcase className="h-5 w-5 text-orange-500 dark:text-orange-400" />
                            Professional Experience
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 dark:bg-gray-800/30">
                          <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                            {teacher.experience || 'Professional experience details coming soon.'}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </motion.div>
                </TabsContent>

                <TabsContent key="expertise" value="expertise" className="space-y-6 mt-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="grid gap-6"
                  >
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Subjects Card */}
                      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 dark:bg-gray-800/50">
                        <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30">
                          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                            <Book className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
                            Subjects I Teach
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 dark:bg-gray-800/30">
                          <div className="flex flex-wrap gap-2">
                            {teacher.subjects && teacher.subjects.length > 0 ? (
                              teacher.subjects.map((subject, index) => (
                                <Badge
                                  key={index}
                                  className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-0 shadow-md hover:from-blue-600 hover:to-indigo-600"
                                >
                                  {subject}
                                </Badge>
                              ))
                            ) : (
                              <p className="text-gray-600 dark:text-gray-400 text-sm">No subjects specified</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Languages Card */}
                      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 dark:bg-gray-800/50">
                        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30">
                          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                            <Languages className="h-5 w-5 text-purple-500 dark:text-purple-400" />
                            Languages
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 dark:bg-gray-800/30">
                          <div className="flex flex-wrap gap-2">
                            {teacher.languages && teacher.languages.length > 0 ? (
                              teacher.languages.map((language, index) => (
                                <Badge
                                  key={index}
                                  variant="outline"
                                  className="px-3 py-1.5 border-purple-300 text-purple-700 dark:border-purple-500 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                                >
                                  {language}
                                </Badge>
                              ))
                            ) : (
                              <p className="text-gray-600 dark:text-gray-400 text-sm">No languages specified</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Specializations */}
                    {teacher.specializations && teacher.specializations.length > 0 && (
                      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 dark:bg-gray-800/50">
                        <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/30 dark:to-cyan-900/30">
                          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                            <Award className="h-5 w-5 text-teal-500 dark:text-teal-400" />
                            Areas of Specialization
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 dark:bg-gray-800/30">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {teacher.specializations.map((spec, index) => (
                              <div key={index} className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border border-teal-200 dark:border-teal-800">
                                <CheckCircle className="h-4 w-4 text-teal-500 dark:text-teal-400 flex-shrink-0" />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{spec}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Certifications */}
                    {teacher.certifications && teacher.certifications.length > 0 && (
                      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 dark:bg-gray-800/50">
                        <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/30">
                          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                            <Award className="h-5 w-5 text-amber-500 dark:text-amber-400" />
                            Certifications & Achievements
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 dark:bg-gray-800/30">
                          <div className="space-y-3">
                            {teacher.certifications.map((cert, index) => (
                              <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                                <div className="mt-0.5 h-8 w-8 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 flex items-center justify-center flex-shrink-0">
                                  <span className="text-white text-xs font-bold">{index + 1}</span>
                                </div>
                                <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{cert}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </motion.div>
                </TabsContent>

                <TabsContent key="availability" value="availability" className="space-y-6 mt-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="shadow-lg dark:bg-gray-800/50">
                      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30">
                        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                          <Calendar className="h-5 w-5 text-green-500 dark:text-green-400" />
                          Weekly Availability
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6 dark:bg-gray-800/30">
                        {teacher.availability ? (
                          <div className="grid gap-3">
                            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                              const dayData = teacher.availability?.[day];
                              const isAvailable = dayData?.enabled && dayData?.slots?.length > 0;

                              return (
                                <div
                                  key={day}
                                  className={cn(
                                    "flex justify-between items-center p-4 rounded-xl transition-all duration-300",
                                    isAvailable
                                      ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800"
                                      : "bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
                                  )}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={cn(
                                      "h-10 w-10 rounded-full flex items-center justify-center",
                                      isAvailable
                                        ? "bg-green-500 text-white"
                                        : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
                                    )}>
                                      {isAvailable ? <CheckCircle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                                    </div>
                                    <span className="font-semibold capitalize text-lg text-gray-900 dark:text-white">{day}</span>
                                  </div>
                                  <div className="text-right">
                                    {isAvailable ? (
                                      <div className="space-y-1">
                                        {dayData.slots.map((slot: any, idx: number) => (
                                          <Badge
                                            key={idx}
                                            className="ml-2 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                          >
                                            {slot.start} - {slot.end}
                                          </Badge>
                                        ))}
                                      </div>
                                    ) : (
                                      <Badge variant="secondary" className="bg-gray-200 dark:bg-gray-700">
                                        Not Available
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <Calendar className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
                            <p className="text-gray-600 dark:text-gray-400">No availability schedule has been set</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                </TabsContent>
              </AnimatePresence>
            </Tabs>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default TeacherProfile;