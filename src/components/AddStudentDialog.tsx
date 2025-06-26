import React, { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import StudentDialogContent from "./student/StudentDialogContent";
import { Student } from "./StudentCard";
import { PaymentProvider } from "@/contexts/PaymentContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
  const queryClient = useQueryClient();
  
  console.log('🔍 AddStudentDialog - Received student data:', student);
  console.log('🔍 AddStudentDialog - Edit mode:', isEditMode);
  
  useEffect(() => {
    // Invalidate query when dialog opens or closes to ensure fresh data
    if (!open) {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['students'] });
      }, 500);
    }
  }, [open, queryClient]);
  
  const handleCloseDialog = () => {
    onOpenChange(false);
    
    // Force invalidate queries after closing to refresh data
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    }, 300);
  };

  const handleStudentAdded = (student: Student) => {
    console.log("Student added in dialog:", student);
    
    // Force refresh student data
    queryClient.invalidateQueries({ queryKey: ['students'] });
    
    if (onStudentAdded) {
      onStudentAdded(student);
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
