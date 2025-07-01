
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
    teacherId: "",
    phone: "",
    birthday: "",
    whatsapp: "",
    telegram: "",
    instagram: ""
  });
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState("defaultPassword123");
  const [createPassword, setCreatePassword] = useState(true);
  
  const getUserData = () => {
    try {
      const user = localStorage.getItem('user');
      console.log("=== getUserData DEBUG ===");
      console.log("Raw localStorage user:", user);
      if (!user) {
        console.warn("No user found in localStorage");
        return null;
      }
      
      const userData = JSON.parse(user);
      console.log("Parsed user data:", userData);
      console.log("User schoolId:", userData?.schoolId);
      console.log("User schoolId type:", typeof userData?.schoolId);
      
      // Additional debug: let's check all properties
      console.log("All user properties:", Object.keys(userData));
      for (const [key, value] of Object.entries(userData)) {
        console.log(`  ${key}:`, value, `(${typeof value})`);
      }
      
      return userData;
    } catch (error) {
      console.error("Error parsing user data:", error);
      return null;
    }
  };

  const userData = getUserData();
  const schoolId = userData?.schoolId || null;
  console.log("=== useStudentForm SCHOOL ID DEBUG ===");
  console.log("Final schoolId for queries:", schoolId);
  console.log("SchoolId type:", typeof schoolId);
  console.log("SchoolId is truthy:", !!schoolId);
  console.log("Open state:", open);
  console.log("Teachers query enabled:", !!schoolId && open);
  console.log("userData object:", userData);
  
  // Let's also check what happens if we manually check the database user records
  console.log("=== MANUAL DATABASE CHECK DEBUG ===");
  console.log("About to call useTeachers with schoolId:", schoolId);
  
  // Use the dedicated teachers hook
  const { teachers, isLoading: teachersLoading, error: teachersError, refetch: refetchTeachers } = useTeachers(schoolId, open);
  
  console.log("=== useStudentForm TEACHERS RESULT ===");
  console.log("Teachers from hook:", teachers);
  console.log("Teachers loading:", teachersLoading);
  console.log("Teachers error:", teachersError);
  
  const { 
    data: coursesData, 
    isLoading: coursesLoading,
    error: coursesError,
    refetch: refetchCourses 
  } = useQuery({
    queryKey: ['courses', schoolId, 'student-form'],
    queryFn: async () => {
      console.log('Executing courses query with schoolId:', schoolId);
      
      if (!schoolId) {
        console.warn('No school ID available for fetching courses');
        return { data: [] as Course[] };
      }
      
      try {
        console.log('Fetching courses using getSchoolCourses RPC function');
        const coursesData = await getSchoolCourses(schoolId);
        
        console.log('RPC getSchoolCourses response:', coursesData);
        
        if (!coursesData || coursesData.length === 0) {
          console.warn('No courses found for school:', schoolId);
          return { data: [] as Course[] };
        }
        
        console.log('Successfully fetched courses (count):', coursesData.length);
        console.log('First course:', coursesData[0]);
        
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
      console.log("Dialog opened - triggering data refetch");
      console.log("Refetching for schoolId:", schoolId);
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
        teacherId: "",
        phone: "",
        birthday: "",
        whatsapp: "",
        telegram: "",
        instagram: ""
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
          console.log("No teacher selected, using first available teacher:", selectedTeacherId);
        }
        
        if (!selectedTeacherId) {
          toast.error("No teachers available. Please add a teacher first.");
          setSaving(false);
          return;
        }
        
        const selectedTeacher = teachers?.find(t => t.id === selectedTeacherId);
        
        console.log("Creating student with admin credentials:", { 
          userId: userData.id,
          schoolId: userData.schoolId,
          role: userData.role
        });
        
        console.log("Using course:", course);
        console.log("Using teacher:", selectedTeacher);
        
        toast.loading("Creating student...");

        console.log("Using password for student:", studentPassword);
        console.log("Age group value being sent:", studentData.ageGroup);
        
        const response = await createStudent({
          student_email: studentData.email as string,
          student_password: studentPassword,
          first_name: studentData.firstName as string,
          last_name: studentData.lastName as string,
          teacher_id: selectedTeacherId,
          course_id: course.id,
          // Fix: Send capitalized age group values to match database constraint
          age_group: studentData.ageGroup === 'adult' ? 'Adult' : 'Kid',
          // Fix: Send capitalized level values to match database constraint
          level: studentData.level === 'beginner' ? 'Beginner' : 
            studentData.level === 'intermediate' ? 'Intermediate' : 
            studentData.level === 'advanced' ? 'Advanced' : 'Beginner',
          phone: studentData.phone,
          birthday: studentData.birthday,
          whatsapp: studentData.whatsapp,
          telegram: studentData.telegram,
          instagram: studentData.instagram
        });
        
        toast.dismiss();
        
        if (!response || !response.success) {
          console.error("Error creating student:", response?.message);
          toast.error(response?.message || "Failed to create student");
          setSaving(false);
          return;
        }
        
        console.log("Student created successfully:", response);
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
            nextLesson: 'Not scheduled',
            phone: studentData.phone,
            birthday: studentData.birthday,
            whatsapp: studentData.whatsapp,
            telegram: studentData.telegram,
            instagram: studentData.instagram
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

  console.log('=== useStudentForm FINAL DEBUG ===');
  console.log('Returning coursesData:', coursesData);
  console.log('Returning teachers:', teachers);
  console.log('Teachers final check - is array?:', Array.isArray(teachers));
  console.log('Teachers final check - length:', teachers?.length);
  if (coursesData?.data) {
    console.log('Courses count to return:', coursesData.data.length);
  }
  if (teachers) {
    console.log('Teachers count to return:', teachers.length);
    console.log('Teachers to return:', teachers);
  }

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
