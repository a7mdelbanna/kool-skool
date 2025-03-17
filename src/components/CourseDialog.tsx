
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createCourse } from "@/integrations/supabase/client";

interface CourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCourseAdded?: () => void;
}

const CourseDialog: React.FC<CourseDialogProps> = ({ 
  open, 
  onOpenChange,
  onCourseAdded
}) => {
  const [courseName, setCourseName] = useState("");
  const [lessonType, setLessonType] = useState("individual");
  const [saving, setSaving] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!courseName.trim()) {
      toast.error("Please enter a course name");
      return;
    }
    
    try {
      setSaving(true);
      
      // Get the schoolId from local storage
      const userData = localStorage.getItem('user');
      const schoolId = userData ? JSON.parse(userData).schoolId : null;
      
      if (!schoolId) {
        toast.error("School ID not found. Please log in again.");
        setSaving(false);
        return;
      }
      
      const { data, error } = await createCourse(schoolId, courseName, lessonType);
      
      if (error || !data || !data.success) {
        const errorMessage = error?.message || (data && data.message) || "Failed to create course";
        toast.error(errorMessage);
        return;
      }
      
      toast.success(`Course "${courseName}" created successfully`);
      
      // Reset form and close dialog
      setCourseName("");
      setLessonType("individual");
      onOpenChange(false);
      
      // Refresh courses list
      if (onCourseAdded) {
        onCourseAdded();
      }
      
    } catch (error) {
      console.error("Error saving course:", error);
      toast.error("An error occurred while saving the course");
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Course</DialogTitle>
          <DialogDescription>
            Create a new course for your students
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="course-name">Course Name</Label>
            <Input 
              id="course-name"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="e.g., English Conversation"
              disabled={saving}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="lesson-type">Lesson Type</Label>
            <Select 
              value={lessonType} 
              onValueChange={setLessonType}
              disabled={saving}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select lesson type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="group">Group</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Course'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CourseDialog;
