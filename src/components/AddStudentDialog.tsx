
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import ProfileTab from "./student-tabs/ProfileTab";
import SubscriptionsTab from "./student-tabs/SubscriptionsTab";
import PaymentsTab from "./student-tabs/PaymentsTab";
import SessionsTab from "./student-tabs/SessionsTab";
import { Student } from "./StudentCard";
import { User, CreditCard, Calendar, BookOpen } from "lucide-react";
import { toast } from "sonner";

interface AddStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AddStudentDialog: React.FC<AddStudentDialogProps> = ({ 
  open, 
  onOpenChange 
}) => {
  const [activeTab, setActiveTab] = useState("profile");
  const [studentData, setStudentData] = useState<Partial<Student>>({
    name: "",
    email: "",
    subject: "",
    paymentStatus: "pending"
  });

  const handleSave = () => {
    // Here you would typically save the student data to your database
    if (!studentData.name || !studentData.email) {
      toast.error("Please fill in required fields");
      return;
    }
    
    toast.success("Student added successfully");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Add New Student</DialogTitle>
        </DialogHeader>
        
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
        
        <div className="flex justify-end mt-6 space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Student
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddStudentDialog;
