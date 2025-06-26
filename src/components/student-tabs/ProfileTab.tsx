
import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Student } from "../StudentCard";
import { Course } from "@/integrations/supabase/client";

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string;
}

interface ProfileTabProps {
  studentData: Partial<Student>;
  setStudentData: (data: Partial<Student>) => void;
  isViewMode: boolean;
  password?: string;
  setPassword?: (password: string) => void;
  createPassword?: boolean;
  setCreatePassword?: (create: boolean) => void;
  isNewStudent?: boolean;
  courses?: Course[];
  teachers?: Teacher[];
  isLoading?: boolean;
}

const ProfileTab: React.FC<ProfileTabProps> = ({
  studentData,
  setStudentData,
  isViewMode,
  password = "",
  setPassword,
  createPassword,
  setCreatePassword,
  isNewStudent = false,
  courses = [],
  teachers = [],
  isLoading = false
}) => {
  console.log('ProfileTab render - teachers data:', teachers);
  console.log('ProfileTab render - courses data:', courses);
  console.log('ProfileTab render - studentData:', studentData);
  
  const handleInputChange = (field: keyof Student, value: string) => {
    setStudentData({ [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Personal Information</h3>
          
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name*</Label>
            <Input
              id="firstName"
              value={studentData.firstName || ""}
              onChange={(e) => handleInputChange("firstName", e.target.value)}
              placeholder="First"
              disabled={isViewMode}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name*</Label>
            <Input
              id="lastName"
              value={studentData.lastName || ""}
              onChange={(e) => handleInputChange("lastName", e.target.value)}
              placeholder="Student"
              disabled={isViewMode}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email*</Label>
            <Input
              id="email"
              type="email"
              value={studentData.email || ""}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="email@example.com"
              disabled={isViewMode}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={studentData.phone || ""}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              placeholder="Phone number"
              disabled={isViewMode}
            />
          </div>
          
          {isNewStudent && (
            <>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="createPassword"
                  checked={createPassword}
                  onCheckedChange={(checked) => setCreatePassword?.(checked as boolean)}
                  disabled={isViewMode}
                />
                <Label htmlFor="createPassword" className="text-sm">
                  Create account with password
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Student will be able to log in to their account
              </p>
              
              {createPassword && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password*</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword?.(e.target.value)}
                    placeholder="••••••••••••••••"
                    disabled={isViewMode}
                  />
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Course Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Course Information</h3>
          
          <div className="space-y-2">
            <Label htmlFor="course">Course*</Label>
            {isLoading ? (
              <div className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
                Loading courses...
              </div>
            ) : courses.length > 0 ? (
              <Select
                value={studentData.courseName || ""}
                onValueChange={(value) => handleInputChange("courseName", value)}
                disabled={isViewMode}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.name}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
                No courses available
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>Lesson Type*</Label>
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="individual"
                  name="lessonType"
                  value="individual"
                  checked={studentData.lessonType === "individual"}
                  onChange={(e) => handleInputChange("lessonType", e.target.value)}
                  disabled={isViewMode}
                />
                <Label htmlFor="individual">Individual</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="group"
                  name="lessonType"
                  value="group"
                  checked={studentData.lessonType === "group"}
                  onChange={(e) => handleInputChange("lessonType", e.target.value)}
                  disabled={isViewMode}
                />
                <Label htmlFor="group">Group</Label>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Age Group*</Label>
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="adult"
                  name="ageGroup"
                  value="adult"
                  checked={studentData.ageGroup === "adult"}
                  onChange={(e) => handleInputChange("ageGroup", e.target.value)}
                  disabled={isViewMode}
                />
                <Label htmlFor="adult">Adult</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="kid"
                  name="ageGroup"
                  value="kid"
                  checked={studentData.ageGroup === "kid"}
                  onChange={(e) => handleInputChange("ageGroup", e.target.value)}
                  disabled={isViewMode}
                />
                <Label htmlFor="kid">Kid</Label>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="level">Level*</Label>
            <Select
              value={studentData.level || ""}
              onValueChange={(value) => handleInputChange("level", value)}
              disabled={isViewMode}
            >
              <SelectTrigger>
                <SelectValue placeholder="Beginner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
                <SelectItem value="fluent">Fluent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="teacher">Teacher</Label>
            {isLoading ? (
              <div className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
                Loading teachers...
              </div>
            ) : teachers.length > 0 ? (
              <Select
                value={studentData.teacherId || ""}
                onValueChange={(value) => handleInputChange("teacherId", value)}
                disabled={isViewMode}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
                No teachers available
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              {teachers.length > 0 ? 
                `${teachers.length} teacher${teachers.length > 1 ? 's' : ''} available` : 
                'Please add teachers to your school first'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileTab;
