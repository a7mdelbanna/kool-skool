import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import ProfileTab from "./student-tabs/ProfileTab";
import SubscriptionsTab from "./student-tabs/SubscriptionsTab";
import PaymentsTab from "./student-tabs/PaymentsTab";
import SessionsTab from "./student-tabs/SessionsTab";
import { Student } from "./StudentCard";
import { User, CreditCard, Calendar, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { PaymentProvider } from "@/contexts/PaymentContext";
import { 
  createStudent, 
  createCourse, 
  getSchoolCourses, 
  getSchoolTeachers, 
  CreateStudentResponse,
  Course
} from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface AddStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: Student | null;
  isEditMode?: boolean;
  onStudentAdded?: (student: Student) => void;
}

const AddStudentDialog: React.FC<AddStudentDialogProps> = ({ 
  open, 
  onOpenChange,
  student,
  isEditMode = false,
  onStudentAdded
}) => {
  const [activeTab, setActiveTab] = useState("profile");
  const [studentData, setStudentData] = useState<Partial<Student>>({
    firstName: "",
    lastName: "",
    email: "",
    lessonType: "individual",
    ageGroup: "adult",
    courseName: "",
    level: "beginner",
    paymentStatus: "pending"
  });
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState("");
  const [createPassword, setCreatePassword] = useState(false);
  
  const getUserData = () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  };

  const userData = getUserData();
  const schoolId = userData?.school_id;
  
  const { data: coursesData, isLoading: coursesLoading } = useQuery({
    queryKey: ['courses', schoolId],
    queryFn: () => getSchoolCourses(schoolId),
    enabled: !!schoolId && open,
  });

  const { data: teachersData, isLoading: teachersLoading } = useQuery({
    queryKey: ['teachers', schoolId],
    queryFn: () => getSchoolTeachers(schoolId),
    enabled: !!schoolId && open,
  });
  
  useEffect(() => {
    if (student) {
      setStudentData(student);
    } else {
      setStudentData({
        firstName: "",
        lastName: "",
        email: "",
        lessonType: "individual",
        ageGroup: "adult",
        courseName: "",
        level: "beginner",
        paymentStatus: "pending"
      });
      setPassword("");
      setCreatePassword(true);
    }
  }, [student, open]);

  const handleSave = async () => {
    if (!studentData.firstName || !studentData.lastName || !studentData.email || !studentData.courseName) {
      toast.error("Please fill in required fields");
      return;
    }
    
    if (!isEditMode && createPassword && !password) {
      toast.error("Please provide a password for the student");
      return;
    }
    
    try {
      setSaving(true);
      
      if (isEditMode) {
        toast.success(`${studentData.firstName} ${studentData.lastName} updated successfully`);
      } else {
        const course = coursesData?.data?.find(course => course.name === studentData.courseName);
        if (!course) {
          toast.error("Selected course not found");
          setSaving(false);
          return;
        }
        
        const teacher = teachersData?.data?.[0];
        if (!teacher) {
          toast.error("No teachers available. Please add a teacher first.");
          setSaving(false);
          return;
        }
        
        const { data, error } = await createStudent(
          studentData.email as string,
          password,
          studentData.firstName as string,
          studentData.lastName as string,
          teacher.id,
          course.id,
          studentData.ageGroup === 'adult' ? 'Adult' : 'Kid',
          studentData.level === 'beginner' ? 'Beginner' : 
            studentData.level === 'intermediate' ? 'Intermediate' : 'Advanced',
          studentData.phone
        );
        
        if (error || (data && !data.success)) {
          console.error("Error creating student:", error || (data && data.message));
          toast.error(data && data.message ? data.message : "Failed to create student");
          setSaving(false);
          return;
        }
        
        toast.success("Student added successfully");
        
        if (onStudentAdded && data && data.student_id) {
          const newStudent: Student = {
            id: data.student_id,
            firstName: studentData.firstName as string,
            lastName: studentData.lastName as string,
            email: studentData.email as string,
            lessonType: (studentData.lessonType as 'individual' | 'group') || 'individual',
            ageGroup: (studentData.ageGroup as 'adult' | 'kid') || 'adult',
            courseName: studentData.courseName as string,
            level: (studentData.level as 'beginner' | 'intermediate' | 'advanced' | 'fluent') || 'beginner',
            paymentStatus: "pending",
            teacherId: teacher.id,
            lessonsCompleted: 0,
            nextLesson: 'Not scheduled'
          };
          onStudentAdded(newStudent);
        }
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving student:", error);
      toast.error("An error occurred while saving the student");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {isEditMode ? 'Edit Student' : 'Add New Student'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode ? 
              "Edit student's details across multiple categories" :
              "Add a new student's details across multiple categories"
            }
          </DialogDescription>
        </DialogHeader>
        
        <PaymentProvider>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid grid-cols-4 mb-6">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>Profile</span>
              </TabsTrigger>
              <TabsTrigger value="subscriptions" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Subscriptions</span>
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span>Payments</span>
              </TabsTrigger>
              <TabsTrigger value="sessions" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                <span>Sessions</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile">
              <ProfileTab 
                studentData={studentData} 
                setStudentData={setStudentData} 
                isViewMode={false}
                password={password}
                setPassword={setPassword}
                createPassword={createPassword}
                setCreatePassword={setCreatePassword}
                isNewStudent={!isEditMode}
                courses={coursesData?.data as Course[] || []}
                teachers={teachersData?.data || []}
                isLoading={coursesLoading || teachersLoading}
              />
            </TabsContent>
            
            <TabsContent value="subscriptions">
              <SubscriptionsTab studentData={studentData} setStudentData={setStudentData} isViewMode={false} />
            </TabsContent>
            
            <TabsContent value="payments">
              <PaymentsTab studentData={studentData} setStudentData={setStudentData} isViewMode={false} />
            </TabsContent>
            
            <TabsContent value="sessions">
              <SessionsTab studentData={studentData} setStudentData={setStudentData} isViewMode={false} />
            </TabsContent>
          </Tabs>
        </PaymentProvider>
        
        <div className="flex justify-end mt-6 space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : isEditMode ? 'Update Student' : 'Save Student'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddStudentDialog;
