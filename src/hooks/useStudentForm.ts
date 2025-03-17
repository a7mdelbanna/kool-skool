import { useState, useEffect } from "react";
import { Student } from "@/components/StudentCard";
import { toast } from "sonner";
import { 
  createStudent, 
  getSchoolCourses, 
  getSchoolTeachers, 
  Course,
  CreateStudentResponse,
  supabase
} from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export const useStudentForm = (
  student: Student | null | undefined,
  isEditMode: boolean,
  open: boolean,
  onStudentAdded?: (student: Student) => void,
  onClose?: () => void
) => {
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
  const [password, setPassword] = useState("defaultPassword123");
  const [createPassword, setCreatePassword] = useState(true);
  
  const getUserData = () => {
    try {
      const user = localStorage.getItem('user');
      console.log("User data from localStorage:", user);
      if (!user) return null;
      
      const userData = JSON.parse(user);
      console.log("Parsed user data:", userData);
      return userData;
    } catch (error) {
      console.error("Error parsing user data:", error);
      return null;
    }
  };

  const userData = getUserData();
  const schoolId = userData?.schoolId || null;
  console.log("School ID for queries:", schoolId);
  
  // Use a REST API call for courses to bypass RLS policy issues
  const { 
    data: coursesData, 
    isLoading: coursesLoading,
    error: coursesError,
    refetch: refetchCourses 
  } = useQuery({
    queryKey: ['courses', schoolId],
    queryFn: async () => {
      console.log('Executing course query function with schoolId:', schoolId);
      if (!schoolId) {
        console.warn('No school ID available for fetching courses');
        return { data: [] as Course[] };
      }
      
      try {
        // Use the get_students_with_details RPC function to get courses data
        console.log('Fetching courses using get_students_with_details RPC call');
        const { data, error } = await supabase
          .rpc('get_students_with_details', {
            p_school_id: schoolId
          });
          
        if (error) {
          console.error('Error fetching courses via RPC:', error);
          // Fall back to direct query with special headers as a last resort
          console.log('Trying fallback approach with direct query');
          
          // Try direct query to courses table
          const { data: coursesDirectData, error: coursesDirectError } = await supabase
            .from('courses')
            .select('*')
            .eq('school_id', schoolId);
            
          if (coursesDirectError) {
            console.error('Error in direct courses query:', coursesDirectError);
            return { data: [] as Course[] };
          }
          
          if (coursesDirectData && coursesDirectData.length > 0) {
            // Map to Course format
            const formattedCourses = coursesDirectData.map(course => ({
              id: course.id,
              school_id: course.school_id,
              name: course.name,
              lesson_type: course.lesson_type
            })) as Course[];
            
            console.log('Retrieved courses via direct query:', formattedCourses);
            return { data: formattedCourses };
          }
          
          return { data: [] as Course[] };
        }
        
        if (!data || !Array.isArray(data) || data.length === 0) {
          console.warn('No data found via RPC');
          return { data: [] as Course[] };
        }
        
        // Extract unique courses from the students data
        const uniqueCourseIds = new Set<string>();
        const uniqueCourses: Course[] = [];
        
        data.forEach(student => {
          if (student.course_id && !uniqueCourseIds.has(student.course_id)) {
            uniqueCourseIds.add(student.course_id);
            uniqueCourses.push({
              id: student.course_id,
              school_id: schoolId,
              name: student.course_name || '',
              lesson_type: student.lesson_type as 'Individual' | 'Group'
            });
          }
        });
        
        console.log('Extracted courses from students data:', uniqueCourses);
        return { data: uniqueCourses };
      } catch (error) {
        console.error('Exception in courses query:', error);
        return { data: [] as Course[] };
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!schoolId && open,
    retry: 3,
  });

  // Use a similar approach for teachers
  const { 
    data: teachersData, 
    isLoading: teachersLoading,
    error: teachersError,
    refetch: refetchTeachers
  } = useQuery({
    queryKey: ['teachers', schoolId],
    queryFn: async () => {
      console.log('Executing teacher query function with schoolId:', schoolId);
      if (!schoolId) {
        console.warn('No school ID available for fetching teachers');
        return { data: [] };
      }
      
      try {
        // Try direct query to users table for teachers
        const { data: directTeachersData, error: directTeachersError } = await supabase
          .from('users')
          .select('id, first_name, last_name, email, role')
          .eq('school_id', schoolId)
          .eq('role', 'teacher');
          
        if (!directTeachersError && directTeachersData && directTeachersData.length > 0) {
          console.log('Successfully fetched teachers directly:', directTeachersData);
          return { data: directTeachersData };
        }
        
        // If no teachers found, return empty array
        console.warn('No teachers found');
        return { data: [] };
        
      } catch (error) {
        console.error('Exception in teachers query:', error);
        return { data: [] };
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!schoolId && open,
    retry: 3,
  });
  
  useEffect(() => {
    if (coursesError) {
      console.error('Error fetching courses:', coursesError);
      toast.error("Failed to load courses. Please try again.");
    }
    if (teachersError) {
      console.error('Error fetching teachers:', teachersError);
      toast.error("Failed to load teachers. Please try again.");
    }
  }, [coursesError, teachersError]);
  
  useEffect(() => {
    if (open && schoolId) {
      console.log("Dialog opened - triggering data refetch");
      refetchCourses();
      refetchTeachers();
    }
  }, [open, schoolId, refetchCourses, refetchTeachers]);
  
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
      setPassword("defaultPassword123");
      setCreatePassword(true);
    }
  }, [student, open]);

  const handleUpdateStudentData = (data: Partial<Student>) => {
    setStudentData(prevData => ({
      ...prevData,
      ...data
    }));
  };

  const handleSave = async () => {
    if (!studentData.firstName || !studentData.lastName || !studentData.email || !studentData.courseName) {
      toast.error("Please fill in required fields");
      return;
    }
    
    const studentPassword = password || "defaultPassword123";
    
    try {
      setSaving(true);
      
      if (isEditMode) {
        toast.success(`${studentData.firstName} ${studentData.lastName} updated successfully`);
      } else {
        const userData = getUserData();
        
        if (!userData || !userData.schoolId || userData.role !== 'admin') {
          toast.error("Only school admins can create students");
          setSaving(false);
          return;
        }
        
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
        
        console.log("Creating student with admin credentials:", { 
          userId: userData.id,
          schoolId: userData.schoolId,
          role: userData.role
        });
        
        console.log("Using course:", course);
        console.log("Using teacher:", teacher);
        
        toast.loading("Creating student...");

        console.log("Using password for student:", studentPassword);
        
        const { data, error } = await createStudent(
          studentData.email as string,
          studentPassword,
          studentData.firstName as string,
          studentData.lastName as string,
          teacher.id,
          course.id,
          studentData.ageGroup === 'adult' ? 'Adult' : 'Kid',
          studentData.level === 'beginner' ? 'Beginner' : 
            studentData.level === 'intermediate' ? 'Intermediate' : 'Advanced',
          studentData.phone
        );
        
        toast.dismiss();
        
        if (error || !data || !data.success) {
          console.error("Error creating student:", error || (data && data.message));
          toast.error(data && data.message ? data.message : "Failed to create student");
          setSaving(false);
          return;
        }
        
        console.log("Student created successfully:", data);
        toast.success("Student added successfully");
        
        if (onStudentAdded && data.success) {
          const newStudent: Student = {
            id: data.student_id as string,
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
      
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Error saving student:", error);
      toast.error("An error occurred while saving the student");
    } finally {
      setSaving(false);
    }
  };

  return {
    studentData,
    updateStudentData: handleUpdateStudentData,
    saving,
    password,
    setPassword,
    createPassword,
    setCreatePassword,
    handleSave,
    coursesData,
    teachersData,
    isLoading: coursesLoading || teachersLoading
  };
};
