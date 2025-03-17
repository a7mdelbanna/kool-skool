
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, BookOpen, Loader2, Group, UserRound, ListFilter } from "lucide-react";
import { toast } from "sonner";
import { Course, getSchoolCourses } from "@/integrations/supabase/client";
import CourseDialog from "@/components/CourseDialog";

const Courses = () => {
  const [addCourseOpen, setAddCourseOpen] = useState(false);
  
  // Get user data from localStorage
  const getUserData = () => {
    try {
      const user = localStorage.getItem('user');
      if (!user) return null;
      return JSON.parse(user);
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  };

  const userData = getUserData();
  const schoolId = userData?.schoolId || null;
  
  const { 
    data: coursesData, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['courses', schoolId],
    queryFn: async () => {
      if (!schoolId) {
        return { data: [] as Course[] };
      }
      return await getSchoolCourses(schoolId);
    },
    enabled: !!schoolId
  });
  
  if (error) {
    toast.error("Failed to load courses");
    console.error("Error loading courses:", error);
  }
  
  const handleCourseAdded = () => {
    refetch();
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Courses</h1>
        </div>
        
        <Button onClick={() => setAddCourseOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Course
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !coursesData?.data || coursesData.data.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Courses Yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Courses help you organize your teaching programs. Add your first course to get started.
            </p>
            <Button onClick={() => setAddCourseOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Course
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coursesData.data.map((course) => (
            <Card key={course.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  {course.lesson_type === 'individual' ? (
                    <UserRound className="h-5 w-5 text-primary" />
                  ) : (
                    <Group className="h-5 w-5 text-primary" />
                  )}
                  {course.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ListFilter className="h-4 w-4" />
                  <span className="capitalize">{course.lesson_type} lessons</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      <CourseDialog 
        open={addCourseOpen} 
        onOpenChange={setAddCourseOpen} 
        onCourseAdded={handleCourseAdded} 
      />
    </div>
  );
};

export default Courses;
