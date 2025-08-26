
import { useState, useEffect } from "react";
import { Student } from "@/components/StudentCard";
import { toast } from "sonner";
import { 
  createStudent, 
  getSchoolCourses, 
  Course,
  CreateStudentResponse
} from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useTeachers } from "./useTeachers";

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
    paymentStatus: "pending",
    teacherId: ""
  });
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState("defaultPassword123");
  const [createPassword, setCreatePassword] = useState(true);
  
  const getUserData = () => {
    try {
      const user = localStorage.getItem('user');
      if (!user) {
        return null;
      }
      return JSON.parse(user);
    } catch (error) {
      console.error("Error parsing user data:", error);
      return null;
    }
  };

  const userData = getUserData();
  const schoolId = userData?.schoolId || null;
  
  // Use the dedicated teachers hook
  const { teachers, isLoading: teachersLoading, error: teachersError, refetch: refetchTeachers } = useTeachers(schoolId, open);
  
  const { 
    data: coursesData, 
    isLoading: coursesLoading,
    error: coursesError,
    refetch: refetchCourses 
  } = useQuery({
    queryKey: ['courses', schoolId, 'student-form'],
    queryFn: async () => {
      if (!schoolId) {
        return { data: [] as Course[] };
      }
      
      try {
        const coursesData = await getSchoolCourses(schoolId);
        
        if (!coursesData || coursesData.length === 0) {
          return { data: [] as Course[] };
        }
        
        return { data: coursesData };
      } catch (error) {
        console.error('Exception in courses query:', error);
        toast.error("Failed to load courses: " + (error as Error).message);
        return { data: [] as Course[] };
      }
    },
    staleTime: 0,
    enabled: !!schoolId && open,
    retry: 1,
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
        paymentStatus: "pending",
        teacherId: ""
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
        
        // Use the selected teacher ID or fall back to the first available teacher
        let selectedTeacherId = studentData.teacherId;
        
        if (!selectedTeacherId && teachers && teachers.length > 0) {
          selectedTeacherId = teachers[0].id;
        }
        
        if (!selectedTeacherId) {
          toast.error("No teachers available. Please add a teacher first.");
          setSaving(false);
          return;
        }
        
        const selectedTeacher = teachers?.find(t => t.id === selectedTeacherId);
        
        
        toast.loading("Creating student...");

        
        const studentPayload: any = {
          student_email: studentData.email as string,
          student_password: studentPassword,
          first_name: studentData.firstName as string,
          last_name: studentData.lastName as string,
          teacher_id: selectedTeacherId,
          course_id: course.id,
          course_name: studentData.courseName,
          lesson_type: studentData.lessonType || 'individual',
          // Fix: Send capitalized age group values to match database constraint
          age_group: studentData.ageGroup === 'adult' ? 'Adult' : 'Kid',
          // Fix: Send capitalized level values to match database constraint
          level: studentData.level === 'beginner' ? 'Beginner' : 
            studentData.level === 'intermediate' ? 'Intermediate' : 
            studentData.level === 'advanced' ? 'Advanced' : 'Beginner'
        };
        
        // Only add phone if it has a value
        if (studentData.phone && studentData.phone.trim() !== '') {
          studentPayload.phone = studentData.phone;
        }
        
        const response = await createStudent(studentPayload);
        
        toast.dismiss();
        
        if (!response || !response.success) {
          console.error('Error creating student:', response?.message);
          toast.error(response?.message || 'Failed to create student');
          setSaving(false);
          return;
        }
        toast.success("Student added successfully");
        
        if (onStudentAdded && response.success) {
          const newStudent: Student = {
            id: response.student_id as string,
            firstName: studentData.firstName as string,
            lastName: studentData.lastName as string,
            email: studentData.email as string,
            lessonType: (studentData.lessonType as 'individual' | 'group') || 'individual',
            ageGroup: (studentData.ageGroup as 'adult' | 'kid') || 'adult',
            courseName: studentData.courseName as string,
            level: (studentData.level as 'beginner' | 'intermediate' | 'advanced' | 'fluent') || 'beginner',
            paymentStatus: "pending",
            teacherId: selectedTeacherId,
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
    teachersData: { data: teachers }, // Wrap in data property for compatibility
    isLoading: coursesLoading || teachersLoading
  };
};
