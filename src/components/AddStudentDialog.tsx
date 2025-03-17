
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import StudentDialogContent from "./student/StudentDialogContent";
import { Student } from "./StudentCard";
import { PaymentProvider } from "@/contexts/PaymentContext";

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
  const handleCloseDialog = () => {
    onOpenChange(false);
  };

  const handleStudentAdded = (student: Student) => {
    console.log("Student added in dialog:", student);
    if (onStudentAdded) {
      onStudentAdded(student);
    }
    // Don't auto-close, let the parent handle that
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
          <StudentDialogContent 
            student={student}
            isEditMode={isEditMode}
            onStudentAdded={handleStudentAdded}
            onClose={handleCloseDialog}
            open={open}
          />
        </PaymentProvider>
      </DialogContent>
    </Dialog>
  );
};

export default AddStudentDialog;
