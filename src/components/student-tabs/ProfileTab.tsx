
import React from "react";
import {
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Student } from "@/components/StudentCard";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { Course } from "@/integrations/supabase/client";

interface ProfileTabProps {
  studentData: Partial<Student>;
  setStudentData: React.Dispatch<React.SetStateAction<Partial<Student>>>;
  isViewMode?: boolean;
  password?: string;
  setPassword?: (password: string) => void;
  createPassword?: boolean;
  setCreatePassword?: (create: boolean) => void;
  isNewStudent?: boolean;
  courses?: Course[];
  teachers?: { id: string; first_name: string; last_name: string }[];
  isLoading?: boolean;
}

const ProfileTab: React.FC<ProfileTabProps> = ({ 
  studentData, 
  setStudentData, 
  isViewMode = false,
  password = "",
  setPassword = () => {},
  createPassword = false,
  setCreatePassword = () => {},
  isNewStudent = false,
  courses = [],
  teachers = [],
  isLoading = false
}) => {
  
  const handleChange = (field: string, value: string) => {
    setStudentData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <FormItem>
            <FormLabel>First Name</FormLabel>
            <Input
              placeholder="John"
              value={studentData.firstName || ""}
              onChange={(e) => handleChange("firstName", e.target.value)}
              readOnly={isViewMode}
              className={isViewMode ? "bg-muted" : ""}
            />
            <FormMessage />
          </FormItem>
        </div>
        
        <div>
          <FormItem>
            <FormLabel>Last Name</FormLabel>
            <Input
              placeholder="Doe"
              value={studentData.lastName || ""}
              onChange={(e) => handleChange("lastName", e.target.value)}
              readOnly={isViewMode}
              className={isViewMode ? "bg-muted" : ""}
            />
            <FormMessage />
          </FormItem>
        </div>
      </div>
      
      <div>
        <FormItem>
          <FormLabel>Email</FormLabel>
          <Input
            type="email"
            placeholder="student@example.com"
            value={studentData.email || ""}
            onChange={(e) => handleChange("email", e.target.value)}
            readOnly={isViewMode || !isNewStudent}
            className={isViewMode || !isNewStudent ? "bg-muted" : ""}
          />
          <FormMessage />
        </FormItem>
      </div>
      
      {isNewStudent && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="createPassword" 
              checked={createPassword}
              onCheckedChange={(checked) => setCreatePassword(checked as boolean)}
              disabled={isViewMode}
            />
            <label
              htmlFor="createPassword"
              className="text-sm font-medium leading-none cursor-pointer"
            >
              Set password for student
            </label>
          </div>
          
          {createPassword && (
            <div>
              <FormItem>
                <FormLabel>Password</FormLabel>
                <Input
                  type="password"
                  placeholder="Password for student"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isViewMode}
                  className={isViewMode ? "bg-muted" : ""}
                />
                <FormDescription>
                  This password will be used for the student to log in
                </FormDescription>
                <FormMessage />
              </FormItem>
            </div>
          )}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <FormItem>
            <FormLabel>Phone</FormLabel>
            <Input
              placeholder="+1 234 567 8900"
              value={studentData.phone || ""}
              onChange={(e) => handleChange("phone", e.target.value)}
              readOnly={isViewMode}
              className={isViewMode ? "bg-muted" : ""}
            />
            <FormMessage />
          </FormItem>
        </div>
        
        <div>
          <FormItem>
            <FormLabel>Course</FormLabel>
            <Select
              value={studentData.courseName}
              onValueChange={(value) => handleChange("courseName", value)}
              disabled={isViewMode || isLoading}
            >
              <SelectTrigger className={isViewMode ? "bg-muted" : ""}>
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
                {isLoading ? (
                  <div className="flex items-center justify-center p-2">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span>Loading courses...</span>
                  </div>
                ) : (
                  courses.map((course) => (
                    <SelectItem key={course.id} value={course.name}>
                      {course.name} ({course.lesson_type})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <FormItem>
            <FormLabel>Level</FormLabel>
            <Select
              value={studentData.level}
              onValueChange={(value) => handleChange("level", value)}
              disabled={isViewMode}
            >
              <SelectTrigger className={isViewMode ? "bg-muted" : ""}>
                <SelectValue placeholder="Select a level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
                <SelectItem value="fluent">Fluent</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        </div>
        
        <div>
          <FormItem className="space-y-3">
            <FormLabel>Age Group</FormLabel>
            <RadioGroup 
              value={studentData.ageGroup} 
              onValueChange={(value) => handleChange("ageGroup", value)}
              className="flex space-x-4"
              disabled={isViewMode}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="adult" id="adult" />
                <label htmlFor="adult" className="text-sm font-medium leading-none cursor-pointer">
                  Adult
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="kid" id="kid" />
                <label htmlFor="kid" className="text-sm font-medium leading-none cursor-pointer">
                  Kid
                </label>
              </div>
            </RadioGroup>
            <FormMessage />
          </FormItem>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <FormItem className="space-y-3">
            <FormLabel>Lesson Type</FormLabel>
            <RadioGroup 
              value={studentData.lessonType} 
              onValueChange={(value) => handleChange("lessonType", value)}
              className="flex space-x-4"
              disabled={isViewMode}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="individual" id="individual" />
                <label htmlFor="individual" className="text-sm font-medium leading-none cursor-pointer">
                  Individual
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="group" id="group" />
                <label htmlFor="group" className="text-sm font-medium leading-none cursor-pointer">
                  Group
                </label>
              </div>
            </RadioGroup>
            <FormMessage />
          </FormItem>
        </div>
        
        {teachers.length > 0 && (
          <div>
            <FormItem>
              <FormLabel>Teacher</FormLabel>
              <Select
                value={studentData.teacherId}
                onValueChange={(value) => handleChange("teacherId", value)}
                disabled={isViewMode || isLoading}
              >
                <SelectTrigger className={isViewMode ? "bg-muted" : ""}>
                  <SelectValue placeholder="Select a teacher" />
                </SelectTrigger>
                <SelectContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center p-2">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span>Loading teachers...</span>
                    </div>
                  ) : (
                    teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.first_name} {teacher.last_name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileTab;
