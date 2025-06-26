
import React, { useState, useEffect, useContext } from 'react';
import { PlusCircle, Edit, Trash2, Search, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { UserContext } from '@/App';
import { getSchoolCourses, createCourse, Course, supabase } from '@/integrations/supabase/client';

const Courses = () => {
  const { user } = useContext(UserContext);
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [editingCourse, setEditingCourse] = useState<string | null>(null);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseType, setNewCourseType] = useState<'individual' | 'group'>('individual');
  const [editCourseName, setEditCourseName] = useState('');
  const [editCourseType, setEditCourseType] = useState<'individual' | 'group'>('individual');
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; course: Course | null }>({
    isOpen: false,
    course: null
  });

  // Fetch courses when user is ready
  useEffect(() => {
    if (user?.schoolId) {
      fetchCourses();
    }
  }, [user?.schoolId]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      console.log('Fetching courses for school:', user.schoolId);
      
      const data = await getSchoolCourses(user.schoolId);
      console.log('Fetched courses:', data);
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast({
        title: "Error",
        description: "Failed to load courses",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCourse = async () => {
    if (!newCourseName.trim()) {
      toast({
        title: "Error",
        description: "Course name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Creating course:', { name: newCourseName, type: newCourseType });
      
      await createCourse({
        school_id: user.schoolId,
        course_name: newCourseName.trim(),
        lesson_type: newCourseType
      });

      toast({
        title: "Success",
        description: "Course created successfully"
      });

      setNewCourseName('');
      setNewCourseType('individual');
      setIsAddingCourse(false);
      fetchCourses(); // Refresh the courses list
    } catch (error) {
      console.error('Error creating course:', error);
      toast({
        title: "Error",
        description: "Failed to create course",
        variant: "destructive"
      });
    }
  };

  const handleEditCourse = async (courseId: string) => {
    if (!editCourseName.trim()) {
      toast({
        title: "Error",
        description: "Course name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Updating course:', { id: courseId, name: editCourseName, type: editCourseType });
      
      // Use RPC function to bypass RLS for updates - using type assertion to work around TypeScript
      const { error } = await (supabase.rpc as any)('update_course', {
        p_course_id: courseId,
        p_name: editCourseName.trim(),
        p_lesson_type: editCourseType
      });

      if (error) {
        console.error('RPC update_course error:', error);
        throw error;
      }

      console.log('Course updated successfully via RPC');

      toast({
        title: "Success",
        description: "Course updated successfully"
      });

      setEditingCourse(null);
      fetchCourses(); // Refresh the courses list
    } catch (error) {
      console.error('Error updating course:', error);
      toast({
        title: "Error",
        description: "Failed to update course",
        variant: "destructive"
      });
    }
  };

  const openDeleteDialog = (course: Course) => {
    setDeleteDialog({ isOpen: true, course });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({ isOpen: false, course: null });
  };

  const handleDeleteCourse = async () => {
    if (!deleteDialog.course) return;

    try {
      console.log('Deleting course:', deleteDialog.course.id);
      
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', deleteDialog.course.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Course deleted successfully"
      });

      closeDeleteDialog();
      fetchCourses(); // Refresh the courses list
    } catch (error) {
      console.error('Error deleting course:', error);
      toast({
        title: "Error",
        description: "Failed to delete course",
        variant: "destructive"
      });
    }
  };

  const startEdit = (course: Course) => {
    setEditingCourse(course.id);
    setEditCourseName(course.name);
    setEditCourseType(course.lesson_type as 'individual' | 'group');
  };

  const cancelEdit = () => {
    setEditingCourse(null);
    setEditCourseName('');
    setEditCourseType('individual');
  };

  const filteredCourses = courses.filter(course =>
    course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.lesson_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Courses</h1>
          <p className="text-muted-foreground">Manage your school's courses</p>
        </div>
        <Button onClick={() => setIsAddingCourse(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Course
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Add Course Form */}
      {isAddingCourse && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Add New Course
              <Button variant="ghost" size="sm" onClick={() => setIsAddingCourse(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Course Name</label>
              <Input
                value={newCourseName}
                onChange={(e) => setNewCourseName(e.target.value)}
                placeholder="Enter course name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Lesson Type</label>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="add-individual"
                    value="individual"
                    checked={newCourseType === 'individual'}
                    onChange={() => setNewCourseType('individual')}
                    className="form-radio h-4 w-4"
                  />
                  <label htmlFor="add-individual" className="text-sm">Individual</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="add-group"
                    value="group"
                    checked={newCourseType === 'group'}
                    onChange={() => setNewCourseType('group')}
                    className="form-radio h-4 w-4"
                  />
                  <label htmlFor="add-group" className="text-sm">Group</label>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddCourse}>
                <Save className="h-4 w-4 mr-2" />
                Save Course
              </Button>
              <Button variant="outline" onClick={() => setIsAddingCourse(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCourses.map((course) => (
          <Card key={course.id}>
            <CardContent className="p-4">
              {editingCourse === course.id ? (
                <div className="space-y-4">
                  <Input
                    value={editCourseName}
                    onChange={(e) => setEditCourseName(e.target.value)}
                    placeholder="Course name"
                  />
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id={`edit-individual-${course.id}`}
                        value="individual"
                        checked={editCourseType === 'individual'}
                        onChange={() => setEditCourseType('individual')}
                        className="form-radio h-4 w-4"
                      />
                      <label htmlFor={`edit-individual-${course.id}`} className="text-sm">Individual</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id={`edit-group-${course.id}`}
                        value="group"
                        checked={editCourseType === 'group'}
                        onChange={() => setEditCourseType('group')}
                        className="form-radio h-4 w-4"
                      />
                      <label htmlFor={`edit-group-${course.id}`} className="text-sm">Group</label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleEditCourse(course.id)}>
                      <Save className="h-3 w-3 mr-1" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-lg">{course.name}</h3>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(course)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openDeleteDialog(course)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <Badge variant={course.lesson_type === 'individual' ? 'default' : 'secondary'}>
                    {course.lesson_type === 'individual' ? 'Individual' : 'Group'}
                  </Badge>
                  <div className="text-xs text-muted-foreground">
                    Created: {new Date(course.created_at).toLocaleDateString()}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCourses.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {courses.length === 0 ? 'No courses found. Create your first course!' : 'No courses match your search.'}
          </p>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.isOpen} onOpenChange={closeDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialog.course?.name}"? This action cannot be undone and may affect students enrolled in this course.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDeleteDialog}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCourse} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Course
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Courses;
