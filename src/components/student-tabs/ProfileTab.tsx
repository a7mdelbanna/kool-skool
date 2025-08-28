
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Student, ParentInfo } from "../StudentCard";
import { Course } from "@/integrations/supabase/client";
import { Users, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import CountryCodeSelector from "../CountryCodeSelector";

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string;
}

interface StudentLevel {
  id: string;
  name: string;
  color: string;
  is_active: boolean;
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
  
  // Get current user's school ID for fetching levels
  const userData = localStorage.getItem('user');
  const user = userData ? JSON.parse(userData) : null;
  const schoolId = user?.schoolId;

  // Fetch student levels from the database
  const { data: studentLevels = [], isLoading: levelsLoading } = useQuery({
    queryKey: ['student-levels', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      const { data, error } = await supabase
        .from('student_levels')
        .select('*')
        .eq('school_id', schoolId)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching student levels:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!schoolId,
  });
  
  // Validate teachers data structure
  const validTeachers = Array.isArray(teachers) ? teachers : [];

  const handleInputChange = (field: keyof Student, value: string) => {
    setStudentData({ [field]: value });
  };

  const handleParentInfoChange = (field: keyof ParentInfo, value: string) => {
    const currentParentInfo = studentData.parentInfo || {
      name: '',
      relationship: 'mother' as const,
      phone: '',
      countryCode: '+1',
      email: ''
    };
    
    setStudentData({
      parentInfo: {
        ...currentParentInfo,
        [field]: value
      }
    });
  };

  const handleGoToTeamAccess = () => {
    window.location.href = '/team-access';
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
            <div className="flex gap-2">
              <CountryCodeSelector
                value={studentData.countryCode || "+1"}
                onSelect={(code) => handleInputChange("countryCode", code)}
                disabled={isViewMode}
              />
              <Input
                id="phone"
                value={studentData.phone || ""}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="Phone number"
                disabled={isViewMode}
                className="flex-1"
              />
            </div>
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
            {levelsLoading ? (
              <div className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
                Loading levels...
              </div>
            ) : studentLevels.length > 0 ? (
              <Select
                value={studentData.level || ""}
                onValueChange={(value) => handleInputChange("level", value)}
                disabled={isViewMode}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a level" />
                </SelectTrigger>
                <SelectContent>
                  {studentLevels.map((level: StudentLevel) => (
                    <SelectItem key={level.id} value={level.name.toLowerCase()}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: level.color }}
                        />
                        {level.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-3">
                <div className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
                  No levels available
                </div>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
                  <div className="flex items-start space-x-3">
                    <Users className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-800">
                        No Student Levels Found
                      </p>
                      <p className="text-sm text-amber-700 mt-1">
                        You need to add student levels in Settings before you can assign them.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 border-amber-300 text-amber-700 hover:bg-amber-100"
                        onClick={() => window.location.href = '/settings?tab=levels'}
                      >
                        Add Levels
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="teacher">Teacher</Label>
            {isLoading ? (
              <div className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
                Loading teachers...
              </div>
            ) : validTeachers.length > 0 ? (
              <Select
                value={studentData.teacherId || ""}
                onValueChange={(value) => handleInputChange("teacherId", value)}
                disabled={isViewMode}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a teacher" />
                </SelectTrigger>
                <SelectContent>
                  {validTeachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-3">
                <div className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
                  No teachers available
                </div>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
                  <div className="flex items-start space-x-3">
                    <Users className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-800">
                        No Teachers Found
                      </p>
                      <p className="text-sm text-amber-700 mt-1">
                        You need to add teachers to your school before you can assign them to students.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 border-amber-300 text-amber-700 hover:bg-amber-100"
                        onClick={handleGoToTeamAccess}
                      >
                        Add Teachers
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Parent Information Section - Only show for kids */}
      {studentData.ageGroup === "kid" && (
        <div className="mt-8 p-6 border rounded-lg bg-blue-50/50">
          <div className="flex items-center gap-2 mb-4">
            <UserCheck className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-900">Parent/Guardian Information</h3>
            <span className="text-sm text-blue-600">(Required for kids)</span>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="parentName">Parent/Guardian Name*</Label>
              <Input
                id="parentName"
                value={studentData.parentInfo?.name || ""}
                onChange={(e) => handleParentInfoChange("name", e.target.value)}
                placeholder="Full name"
                disabled={isViewMode}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="relationship">Relationship*</Label>
              <Select
                value={studentData.parentInfo?.relationship || "mother"}
                onValueChange={(value: "mother" | "father" | "guardian") => handleParentInfoChange("relationship", value)}
                disabled={isViewMode}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mother">Mother</SelectItem>
                  <SelectItem value="father">Father</SelectItem>
                  <SelectItem value="guardian">Guardian</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="parentPhone">Parent Phone*</Label>
              <div className="flex gap-2">
                <CountryCodeSelector
                  value={studentData.parentInfo?.countryCode || "+1"}
                  onSelect={(code) => handleParentInfoChange("countryCode", code)}
                  disabled={isViewMode}
                />
                <Input
                  id="parentPhone"
                  value={studentData.parentInfo?.phone || ""}
                  onChange={(e) => handleParentInfoChange("phone", e.target.value)}
                  placeholder="Phone number"
                  disabled={isViewMode}
                  className="flex-1"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="parentEmail">Parent Email*</Label>
              <Input
                id="parentEmail"
                type="email"
                value={studentData.parentInfo?.email || ""}
                onChange={(e) => handleParentInfoChange("email", e.target.value)}
                placeholder="parent@example.com"
                disabled={isViewMode}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileTab;
