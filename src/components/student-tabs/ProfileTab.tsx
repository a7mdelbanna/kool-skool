
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Student, ParentInfo } from "../StudentCard";
import { Course } from "@/integrations/supabase/client";
import { Users, UserCheck, Camera, X, DollarSign, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import CountryCodeSelector from "../CountryCodeSelector";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { storageService } from "@/services/firebase/storage.service";
import { databaseService } from "@/services/firebase/database.service";

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
  const [uploadingImage, setUploadingImage] = React.useState(false);
  
  // Get current user's school ID for fetching levels
  const userData = localStorage.getItem('user');
  const user = userData ? JSON.parse(userData) : null;
  const schoolId = user?.schoolId;

  // Fetch student levels from the database
  const { data: studentLevels = [], isLoading: levelsLoading } = useQuery({
    queryKey: ['student-levels', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      try {
        const { data, error } = await supabase
          .from('student_levels')
          .select('*')
          .eq('school_id', schoolId)
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (error) {
          console.error('Error fetching student levels:', error);
          return [];
        }
        
        // Return only database levels, no defaults
        const levels = data || [];
        
        console.log('Fetched levels from database:', levels);
        console.log('Current student level:', studentData.level);
        
        return levels;
      } catch (error) {
        console.error('Error fetching student levels:', error);
        return [];
      }
    },
    enabled: !!schoolId,
  });

  // Fetch income categories for student payment tracking
  const { data: incomeCategories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['income-categories', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      
      try {
        // Fetch from Firebase - simplified query to avoid composite index requirement
        const data = await databaseService.query('transaction_categories', {
          where: [
            { field: 'school_id', operator: '==', value: schoolId },
            { field: 'type', operator: '==', value: 'income' }
          ]
        });
        
        // Filter active categories in memory
        const activeCategories = (data || []).filter((cat: any) => cat.is_active !== false);
        
        return activeCategories.sort((a: any, b: any) => a.name.localeCompare(b.name));
      } catch (err) {
        console.error('Failed to fetch income categories:', err);
        return [];
      }
    },
    enabled: !!schoolId,
  });
  
  // Validate teachers data structure
  const validTeachers = Array.isArray(teachers) ? teachers : [];

  const handleInputChange = (field: keyof Student, value: string) => {
    setStudentData({ ...studentData, [field]: value });
  };

  const handleParentInfoChange = (field: keyof ParentInfo, value: string) => {
    const currentParentInfo = studentData.parentInfo || {
      name: '',
      relationship: 'mother' as const,
      phone: '',
      countryCode: '+7',
      email: ''
    };
    
    setStudentData({
      ...studentData,
      parentInfo: {
        ...currentParentInfo,
        [field]: value
      }
    });
  };

  const handleGoToTeamAccess = () => {
    window.location.href = '/team-access';
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    
    try {
      // Upload to Firebase Storage
      const fileName = `students/${studentData.id || Date.now()}_${file.name}`;
      const downloadUrl = await storageService.uploadFile(file, fileName);
      
      // Update student data with image URL
      setStudentData({ ...studentData, image: downloadUrl });
      toast.success('Profile picture uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setStudentData({ ...studentData, image: undefined });
    toast.success('Profile picture removed');
  };

  return (
    <div className="space-y-6">
      {/* Profile Picture Section */}
      <div className="flex flex-col items-center space-y-4">
        <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
          <AvatarImage src={studentData.image} alt={`${studentData.firstName} ${studentData.lastName}`} />
          <AvatarFallback className="bg-primary/10 text-primary text-3xl">
            {`${studentData.firstName?.[0] || ''}${studentData.lastName?.[0] || ''}`}
          </AvatarFallback>
        </Avatar>
        
        {!isViewMode && (
          <div className="flex gap-2">
            <div className="relative">
              <input
                type="file"
                id="image-upload"
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImage}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('image-upload')?.click()}
                disabled={uploadingImage}
                className="gap-2"
              >
                <Camera className="h-4 w-4" />
                {uploadingImage ? 'Uploading...' : studentData.image ? 'Change Photo' : 'Upload Photo'}
              </Button>
            </div>
            
            {studentData.image && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveImage}
                className="gap-2 text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4" />
                Remove
              </Button>
            )}
          </div>
        )}
      </div>

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
            <Label htmlFor="email">
              Email{studentData.ageGroup === "kid" ? " (Optional for kids)" : "*"}
            </Label>
            <Input
              id="email"
              type="email"
              value={studentData.email || ""}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder={studentData.ageGroup === "kid" ? "email@example.com (optional)" : "email@example.com"}
              disabled={isViewMode}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <div className="flex gap-2">
              <CountryCodeSelector
                value={studentData.countryCode || "+7"}
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
            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
              <button
                type="button"
                onClick={() => handleInputChange("lessonType", "individual")}
                disabled={isViewMode}
                className={`
                  flex-1 py-2 px-4 rounded-md font-medium transition-all duration-200
                  ${studentData.lessonType === "individual" 
                    ? "bg-white text-blue-600 shadow-sm" 
                    : "text-gray-600 hover:text-gray-900"
                  }
                  ${isViewMode ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
                `}
              >
                Individual
              </button>
              <button
                type="button"
                onClick={() => handleInputChange("lessonType", "group")}
                disabled={isViewMode}
                className={`
                  flex-1 py-2 px-4 rounded-md font-medium transition-all duration-200
                  ${studentData.lessonType === "group" 
                    ? "bg-white text-blue-600 shadow-sm" 
                    : "text-gray-600 hover:text-gray-900"
                  }
                  ${isViewMode ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
                `}
              >
                Group
              </button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Age Group*</Label>
            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
              <button
                type="button"
                onClick={() => handleInputChange("ageGroup", "adult")}
                disabled={isViewMode}
                className={`
                  flex-1 py-2 px-4 rounded-md font-medium transition-all duration-200
                  ${studentData.ageGroup === "adult" 
                    ? "bg-white text-blue-600 shadow-sm" 
                    : "text-gray-600 hover:text-gray-900"
                  }
                  ${isViewMode ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
                `}
              >
                Adult
              </button>
              <button
                type="button"
                onClick={() => {
                  handleInputChange("ageGroup", "kid");
                  // Initialize parent info when switching to kid
                  if (studentData.ageGroup !== "kid" && !studentData.parentInfo) {
                    handleParentInfoChange("relationship", "mother");
                  }
                }}
                disabled={isViewMode}
                className={`
                  flex-1 py-2 px-4 rounded-md font-medium transition-all duration-200
                  ${studentData.ageGroup === "kid" 
                    ? "bg-white text-blue-600 shadow-sm" 
                    : "text-gray-600 hover:text-gray-900"
                  }
                  ${isViewMode ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
                `}
              >
                Kid
              </button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="incomeCategory">Income Category*</Label>
            {categoriesLoading ? (
              <div className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
                Loading categories...
              </div>
            ) : incomeCategories.length > 0 ? (
              <Select
                value={studentData.income_category_id || ""}
                onValueChange={(value) => handleInputChange("income_category_id", value)}
                disabled={isViewMode}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select income category" />
                </SelectTrigger>
                <SelectContent>
                  {incomeCategories.map((category: any) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-3">
                <div className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
                  No income categories available
                </div>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
                  <div className="flex items-start space-x-3">
                    <DollarSign className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      <p className="font-medium">Income categories needed</p>
                      <p className="mt-1">Please add income categories in Academic Settings → Transaction Categories to track student payments properly.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="level">Level{studentLevels.length > 0 ? '*' : ''}</Label>
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
                  {studentLevels.map((level: any) => (
                    <SelectItem key={level.id} value={level.name}>
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
                        onClick={() => window.location.href = '/settings/academic'}
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
                  value={studentData.parentInfo?.countryCode || "+7"}
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
              <Label htmlFor="parentEmail">Parent Email (Optional)</Label>
              <Input
                id="parentEmail"
                type="email"
                value={studentData.parentInfo?.email || ""}
                onChange={(e) => handleParentInfoChange("email", e.target.value)}
                placeholder="parent@example.com (optional)"
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
