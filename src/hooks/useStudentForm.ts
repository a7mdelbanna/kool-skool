import { useState, useEffect } from "react";
import { Student } from "@/components/StudentCard";
import { toast } from "sonner";
import { 
  createStudent, 
  getSchoolCourses, 
  getSchoolTeachers, 
  Course
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
  const [password, setPassword] = useState("");
  const [createPassword, setCreatePassword] = useState(false);
  
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
      
      const result = await getSchoolCourses(schoolId);
      console.log('Courses query result:', result);
      
      if (!result.data) {
        console.warn('No data returned from getSchoolCourses');
        return { data: [] as Course[] };
      }
      
      return result;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!schoolId && open,
    retry: 3,
  });

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
      
      const result = await getSchoolTeachers(schoolId);
      console.log('Teachers query result:', result);
      
      if (!result.data) {
        console.warn('No data returned from getSchoolTeachers');
        return { data: [] };
      }
      
      return result;
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
      setPassword("");
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
    
    if (!isEditMode && createPassword && !password) {
      toast.error("Please provide a password for the student");
      return;
    }
    
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
        
        const { data, error } = await createStudent(
          studentData.email as string,
          password,
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
        
        if (error || (data && !data.success)) {
          console.error("Error creating student:", error || (data && data.message));
          toast.error(data && data.message ? data.message : "Failed to create student");
          setSaving(false);
          return;
        }
        
        console.log("Student created successfully:", data);
        toast.success("Student added successfully");
        
        if (onStudentAdded && data && data.success) {
          if (!data.student_id) {
            console.error("No student_id in response:", data);
            toast.error("Created student but couldn't retrieve student ID");
            setSaving(false);
            if (onClose) onClose();
            return;
          }
          
          const newStudent: Student = {
            id: data.student_id,
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
