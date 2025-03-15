
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

interface AddStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: Student | null;
  isEditMode?: boolean;
}

const AddStudentDialog: React.FC<AddStudentDialogProps> = ({ 
  open, 
  onOpenChange,
  student,
  isEditMode = false
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
  
  const isViewMode = student && !isEditMode;
  
  // Load student data when viewing or editing
  useEffect(() => {
    if (student) {
      setStudentData(student);
    } else {
      // Reset to default values when adding a new student
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
    }
  }, [student, open]);

  const handleSave = () => {
    // Here you would typically save the student data to your database
    if (!studentData.firstName || !studentData.lastName || !studentData.email || !studentData.courseName) {
      toast.error("Please fill in required fields");
      return;
    }
    
    if (isEditMode) {
      toast.success(`${studentData.firstName} ${studentData.lastName} updated successfully`);
    } else if (!student) {
      toast.success("Student added successfully");
    }
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {isViewMode ? 'Student Details' : isEditMode ? 'Edit Student' : 'Add New Student'}
          </DialogTitle>
          <DialogDescription>
            {isViewMode ? 
              "View student's details across multiple categories" : 
              isEditMode ? 
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
              <ProfileTab studentData={studentData} setStudentData={setStudentData} />
            </TabsContent>
            
            <TabsContent value="subscriptions">
              <SubscriptionsTab studentData={studentData} setStudentData={setStudentData} />
            </TabsContent>
            
            <TabsContent value="payments">
              <PaymentsTab studentData={studentData} setStudentData={setStudentData} />
            </TabsContent>
            
            <TabsContent value="sessions">
              <SessionsTab studentData={studentData} setStudentData={setStudentData} />
            </TabsContent>
          </Tabs>
        </PaymentProvider>
        
        <div className="flex justify-end mt-6 space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isViewMode ? 'Close' : 'Cancel'}
          </Button>
          {!isViewMode && (
            <Button onClick={handleSave}>
              {isEditMode ? 'Update Student' : 'Save Student'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddStudentDialog;
