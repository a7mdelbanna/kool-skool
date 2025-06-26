import { useState, useEffect } from "react";
import { Student } from "@/components/StudentCard";
import { toast } from "sonner";
import { 
  createStudent, 
  getSchoolCourses, 
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
    paymentStatus: "pending",
    teacherId: ""
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

  const { 
    data: teachersData, 
    isLoading: teachersLoading,
    error: teachersError,
    refetch: refetchTeachers
  } = useQuery({
    queryKey: ['teachers', schoolId, 'student-form'],
    queryFn: async () => {
      console.log('Executing teacher query function with schoolId:', schoolId);
      if (!schoolId) {
        console.warn('No school ID available for fetching teachers');
        return { data: [] };
      }
      
      try {
        console.log('Fetching teachers directly from users table for student form');
        const { data: directTeachersData, error: directTeachersError } = await supabase
          .from('users')
          .select('id, first_name, last_name, email')
          .eq('school_id', schoolId)
          .eq('role', 'teacher');
          
        if (directTeachersError) {
          console.error('Error fetching teachers directly:', directTeachersError);
          throw directTeachersError;
        }
        
        if (directTeachersData && directTeachersData.length > 0) {
          console.log('Successfully fetched teachers directly:', directTeachersData);
          
          const formattedTeachers = directTeachersData.map(teacher => {
            const displayName = teacher.first_name && teacher.last_name 
              ? `${teacher.first_name} ${teacher.last_name}`
              : teacher.email || `ID: ${teacher.id.substring(0, 8)}`;
            
            console.log(`Teacher ${teacher.id} display name: ${displayName}`);
            
            return {
              id: teacher.id,
              first_name: teacher.first_name || '',
              last_name: teacher.last_name || '',
              display_name: displayName
            };
          });
          
          console.log('Formatted teachers data for student form:', formattedTeachers);
          return { data: formattedTeachers };
        }
        
        console.log('No teachers found for student form');
        return { data: [] };
      } catch (error) {
        console.error('Exception in teachers query for student form:', error);
        toast.error("Failed to load teachers: " + (error as Error).message);
        return { data: [] };
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
        
        if (!selectedTeacherId && teachersData?.data && teachersData.data.length > 0) {
          selectedTeacherId = teachersData.data[0].id;
          console.log("No teacher selected, using first available teacher:", selectedTeacherId);
        }
        
        if (!selectedTeacherId) {
          toast.error("No teachers available. Please add a teacher first.");
          setSaving(false);
          return;
        }
        
        const selectedTeacher = teachersData?.data?.find(t => t.id === selectedTeacherId);
        
        console.log("Creating student with admin credentials:", { 
          userId: userData.id,
          schoolId: userData.schoolId,
          role: userData.role
        });
        
        console.log("Using course:", course);
        console.log("Using teacher:", selectedTeacher);
        
        toast.loading("Creating student...");

        console.log("Using password for student:", studentPassword);
        
        const response = await createStudent({
          student_email: studentData.email as string,
          student_password: studentPassword,
          first_name: studentData.firstName as string,
          last_name: studentData.lastName as string,
          teacher_id: selectedTeacherId,
          course_id: course.id,
          age_group: studentData.ageGroup === 'adult' ? 'Adult' : 'Kid',
          level: studentData.level === 'beginner' ? 'Beginner' : 
            studentData.level === 'intermediate' ? 'Intermediate' : 'Advanced',
          phone: studentData.phone
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

  console.log('useStudentForm returning coursesData:', coursesData);
  console.log('useStudentForm returning teachersData:', teachersData);
  if (coursesData?.data) {
    console.log('Courses count to return:', coursesData.data.length);
  }
  if (teachersData?.data) {
    console.log('Teachers count to return:', teachersData.data.length);
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
    teachersData,
    isLoading: coursesLoading || teachersLoading
  };
};
