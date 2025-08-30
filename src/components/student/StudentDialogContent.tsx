
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import ProfileTab from "../student-tabs/ProfileTab";
import SubscriptionsTab from "../student-tabs/SubscriptionsTab";
import PaymentsTab from "../student-tabs/PaymentsTab";
import SessionsTab from "../student-tabs/SessionsTab";
import AdditionalInfoTab from "../student-tabs/AdditionalInfoTab";
import { Student } from "../StudentCard";
import { User, CreditCard, Calendar, BookOpen, Info } from "lucide-react";
import { useStudentForm } from "@/hooks/useStudentForm";
import { toast } from "sonner";

interface StudentDialogContentProps {
  student?: Student | null;
  isEditMode?: boolean;
  onStudentAdded?: (student: Student) => void;
  onClose: () => void;
  open: boolean;
}

const StudentDialogContent: React.FC<StudentDialogContentProps> = ({
  student,
  isEditMode = false,
  onStudentAdded,
  onClose,
  open
}) => {
  const [activeTab, setActiveTab] = useState("profile");
  
  const {
    studentData,
    updateStudentData,
    saving,
    password,
    setPassword,
    createPassword,
    setCreatePassword,
    handleSave,
    coursesData,
    teachersData,
    isLoading
  } = useStudentForm(student, isEditMode, open, onStudentAdded, onClose);


  // Show error toast if courses should exist but don't
  useEffect(() => {
    if (open && (!coursesData?.data || coursesData.data.length === 0)) {
      // If still no courses after a moment, show an error
      const timer = setTimeout(() => {
        if (!coursesData?.data || coursesData.data.length === 0) {
          toast.error("No courses available. Please add courses first.");
        }
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [open, coursesData]);
  

  // Handle tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-4">
        <TabsList className="grid grid-cols-5 mb-6">
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
          <TabsTrigger value="additional" className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            <span>Additional</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile">
          <ProfileTab 
            studentData={studentData} 
            setStudentData={updateStudentData} 
            isViewMode={false}
            password={password}
            setPassword={setPassword}
            createPassword={createPassword}
            setCreatePassword={setCreatePassword}
            isNewStudent={!isEditMode}
            courses={coursesData?.data || []}
            teachers={teachersData?.data || []}
            isLoading={isLoading}
          />
        </TabsContent>
        
        <TabsContent value="subscriptions">
          <SubscriptionsTab 
            studentId={student?.id || ''}
            isLoading={false}
          />
        </TabsContent>
        
        <TabsContent value="payments">
          <PaymentsTab studentData={studentData} setStudentData={updateStudentData} isViewMode={false} />
        </TabsContent>
        
        <TabsContent value="sessions">
          <SessionsTab studentData={studentData} setStudentData={updateStudentData} isViewMode={false} />
        </TabsContent>
        
        <TabsContent value="additional">
          <AdditionalInfoTab 
            studentData={studentData} 
            setStudentData={updateStudentData} 
            isViewMode={false}
          />
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-end mt-6 space-x-2">
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : isEditMode ? 'Update Student' : 'Save Student'}
        </Button>
      </div>
    </>
  );
};

export default StudentDialogContent;
