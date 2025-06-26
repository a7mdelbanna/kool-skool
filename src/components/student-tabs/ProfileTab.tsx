
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Student } from "@/components/StudentCard";
import { Course } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Calendar, User, MessageCircle, Phone, Instagram, Send, Hash, Mail } from "lucide-react";

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  email: string;
}

interface ProfileTabProps {
  studentData: Partial<Student>;
  setStudentData: (data: Partial<Student>) => void;
  isViewMode: boolean;
  password: string;
  setPassword: (password: string) => void;
  createPassword: boolean;
  setCreatePassword: (create: boolean) => void;
  isNewStudent: boolean;
  courses: Course[];
  teachers: Teacher[];
  isLoading: boolean;
}

const ProfileTab: React.FC<ProfileTabProps> = ({
  studentData,
  setStudentData,
  isViewMode,
  password,
  setPassword,
  createPassword,
  setCreatePassword,
  isNewStudent,
  courses,
  teachers,
  isLoading
}) => {
  const [additionalInfoOpen, setAdditionalInfoOpen] = useState(false);
  const [socialsOpen, setSocialsOpen] = useState(false);
  const [emailError, setEmailError] = useState("");

  // Debug logging for data population
  useEffect(() => {
    console.log('🔍 ProfileTab - studentData changed:', studentData);
    console.log('📅 Date of birth value:', studentData.dateOfBirth);
    console.log('📱 Social media values:', {
      telegram: studentData.telegram,
      whatsapp: studentData.whatsapp,
      instagram: studentData.instagram,
      viber: studentData.viber,
      facebook: studentData.facebook,
      skype: studentData.skype,
      zoom: studentData.zoom
    });
  }, [studentData]);

  // Auto-expand sections if they contain data
  useEffect(() => {
    // Check if Additional Information section has data
    const hasAdditionalInfo = studentData.dateOfBirth && studentData.dateOfBirth.trim() !== '';
    
    // Check if Social Media section has data
    const hasSocialData = !!(
      studentData.telegram || studentData.whatsapp || studentData.instagram || 
      studentData.viber || studentData.facebook || studentData.skype || studentData.zoom
    );

    console.log('📊 Data check results:', {
      hasAdditionalInfo,
      hasSocialData,
      dateOfBirth: studentData.dateOfBirth
    });

    // Auto-expand sections if they have data
    if (hasAdditionalInfo && !isNewStudent) {
      setAdditionalInfoOpen(true);
    }
    
    if (hasSocialData && !isNewStudent) {
      setSocialsOpen(true);
    }
  }, [studentData, isNewStudent]);

  console.log('ProfileTab render - teachers data:', teachers);
  console.log('ProfileTab render - courses data:', courses);
  console.log('ProfileTab render - studentData:', studentData);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError("Email is required");
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleEmailChange = (email: string) => {
    setStudentData({ email });
    validateEmail(email);
  };

  const handleSocialChange = (platform: string, value: string) => {
    console.log(`🔄 Updating ${platform} to:`, value);
    setStudentData({ [platform]: value.trim() === '' ? undefined : value });
  };

  const socialPlatforms = [
    { key: 'telegram', label: 'Telegram', icon: Send, placeholder: 'Telegram username', color: 'text-blue-500' },
    { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, placeholder: 'WhatsApp number or username', color: 'text-green-500' },
    { key: 'instagram', label: 'Instagram', icon: Instagram, placeholder: 'Instagram username', color: 'text-pink-500' },
    { key: 'viber', label: 'Viber', icon: Phone, placeholder: 'Viber username or number', color: 'text-purple-500' },
    { key: 'facebook', label: 'Facebook', icon: User, placeholder: 'Facebook username or profile', color: 'text-blue-600' },
    { key: 'skype', label: 'Skype', icon: User, placeholder: 'Skype username', color: 'text-blue-400' },
    { key: 'zoom', label: 'Zoom', icon: User, placeholder: 'Zoom username or ID', color: 'text-blue-500' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Personal Information Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">First Name*</Label>
            <Input
              id="firstName"
              value={studentData.firstName || ""}
              onChange={(e) => setStudentData({ firstName: e.target.value })}
              disabled={isViewMode}
              placeholder="Enter first name"
            />
          </div>
          
          <div>
            <Label htmlFor="lastName">Last Name*</Label>
            <Input
              id="lastName"
              value={studentData.lastName || ""}
              onChange={(e) => setStudentData({ lastName: e.target.value })}
              disabled={isViewMode}
              placeholder="Enter last name"
            />
          </div>
          
          <div className="md:col-span-2">
            <Label htmlFor="email">Email*</Label>
            <Input
              id="email"
              type="email"
              value={studentData.email || ""}
              onChange={(e) => handleEmailChange(e.target.value)}
              disabled={isViewMode}
              placeholder="Enter email address"
              className={emailError ? "border-red-500" : ""}
            />
            {emailError && (
              <p className="text-sm text-red-500 mt-1">{emailError}</p>
            )}
            {!isViewMode && (
              <p className="text-sm text-gray-500 mt-1">
                This email must be unique and will be used for the student's login account.
              </p>
            )}
          </div>
          
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={studentData.phone || ""}
              onChange={(e) => setStudentData({ phone: e.target.value })}
              disabled={isViewMode}
              placeholder="Enter phone number"
            />
          </div>
        </div>
      </div>

      {/* Course Information Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Course Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="course">Course*</Label>
            <Select 
              value={studentData.courseName || ""} 
              onValueChange={(value) => setStudentData({ courseName: value })}
              disabled={isViewMode}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
                {courses && courses.length > 0 ? (
                  courses.map((course) => (
                    <SelectItem key={course.id} value={course.name}>
                      {course.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="" disabled>No courses available</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Lesson Type*</Label>
            <RadioGroup
              value={studentData.lessonType || "individual"}
              onValueChange={(value) => setStudentData({ lessonType: value as 'individual' | 'group' })}
              className="flex flex-row space-x-4 mt-2"
              disabled={isViewMode}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="individual" id="individual" />
                <Label htmlFor="individual">Individual</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="group" id="group" />
                <Label htmlFor="group">Group</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label>Age Group*</Label>
            <RadioGroup
              value={studentData.ageGroup || "adult"}
              onValueChange={(value) => setStudentData({ ageGroup: value as 'adult' | 'kid' })}
              className="flex flex-row space-x-4 mt-2"
              disabled={isViewMode}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="adult" id="adult" />
                <Label htmlFor="adult">Adult</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="kid" id="kid" />
                <Label htmlFor="kid">Kid</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="level">Level*</Label>
            <Select 
              value={studentData.level || "beginner"} 
              onValueChange={(value) => setStudentData({ level: value as 'beginner' | 'intermediate' | 'advanced' | 'fluent' })}
              disabled={isViewMode}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
                <SelectItem value="fluent">Fluent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="teacher">Teacher</Label>
            <Select 
              value={studentData.teacherId || ""} 
              onValueChange={(value) => setStudentData({ teacherId: value })}
              disabled={isViewMode}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a teacher" />
              </SelectTrigger>
              <SelectContent>
                {teachers && teachers.length > 0 ? (
                  teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.display_name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="" disabled>
                    {teachers === undefined ? "Loading teachers..." : "No teachers available"}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {teachers && teachers.length > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                {teachers.length} teacher{teachers.length !== 1 ? 's' : ''} available
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Additional Information Collapsible */}
      <Collapsible open={additionalInfoOpen} onOpenChange={setAdditionalInfoOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Additional Information
              {studentData.dateOfBirth && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  Has data
                </span>
              )}
            </span>
            {additionalInfoOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 mt-4">
          <div>
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input
              id="dateOfBirth"
              type="date"
              value={studentData.dateOfBirth || ""}
              onChange={(e) => {
                console.log('📅 Date of birth changed to:', e.target.value);
                setStudentData({ dateOfBirth: e.target.value });
              }}
              disabled={isViewMode}
            />
            {studentData.dateOfBirth && (
              <p className="text-xs text-green-600 mt-1">
                Current value: {studentData.dateOfBirth}
              </p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Social Media & Contacts Collapsible */}
      <Collapsible open={socialsOpen} onOpenChange={setSocialsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Social Media & Contacts
              {(studentData.telegram || studentData.whatsapp || studentData.instagram || 
                studentData.viber || studentData.facebook || studentData.skype || studentData.zoom) && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  Has data
                </span>
              )}
            </span>
            {socialsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 mt-4">
          {socialPlatforms.map((platform) => {
            const Icon = platform.icon;
            const currentValue = studentData[platform.key as keyof Student] as string || "";
            
            return (
              <div key={platform.key} className="space-y-2">
                <Label htmlFor={platform.key} className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${platform.color}`} />
                  {platform.label}
                  {currentValue && (
                    <span className="text-xs bg-green-100 text-green-700 px-1 py-0.5 rounded">
                      ✓
                    </span>
                  )}
                </Label>
                <Input
                  id={platform.key}
                  value={currentValue}
                  onChange={(e) => handleSocialChange(platform.key, e.target.value)}
                  disabled={isViewMode}
                  placeholder={platform.placeholder}
                />
                {currentValue && (
                  <p className="text-xs text-green-600">
                    Current: {currentValue}
                  </p>
                )}
              </div>
            );
          })}
        </CollapsibleContent>
      </Collapsible>

      {/* Password Section for New Students */}
      {isNewStudent && !isViewMode && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Account Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="createPassword"
                checked={createPassword}
                onChange={(e) => setCreatePassword(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="createPassword" className="text-sm">
                Create account with password
              </Label>
            </div>
            
            {createPassword && (
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password for student account"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Student will be able to log in to their account
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileTab;
