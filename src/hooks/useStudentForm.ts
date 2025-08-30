
import { useState, useEffect } from "react";
import { Student, ParentInfo } from "@/components/StudentCard";
import { toast } from "sonner";
import { 
  createStudent, 
  updateStudent,
  getSchoolCourses, 
  Course,
  CreateStudentResponse
} from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
    level: "",
    paymentStatus: "pending",
    teacherId: "",
    countryCode: "+1"
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
  const queryClient = useQueryClient();
  
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
      // If phone contains country code, separate them for the form
      let processedStudent = { ...student };
      
      // Keep the original level value (don't normalize to lowercase)
      // This preserves custom levels like A1, A2, B1, etc.
      console.log('Loading student with level:', student.level);
      
      // Process phone number if it exists
      if (student.phone) {
        const phoneStr = student.phone.toString();
        
        // If we have a stored country code, use it
        if (student.countryCode) {
          processedStudent.countryCode = student.countryCode;
          // Remove the country code from the phone if it's at the beginning
          if (phoneStr.startsWith(student.countryCode)) {
            processedStudent.phone = phoneStr.substring(student.countryCode.length).trim();
          } else if (phoneStr.startsWith('+')) {
            // Phone has a different country code than stored, extract it
            const match = phoneStr.match(/^(\+\d{1,4})/);
            if (match) {
              processedStudent.countryCode = match[1];
              processedStudent.phone = phoneStr.substring(match[1].length).trim();
            }
          } else {
            // Phone doesn't have country code, use as is
            processedStudent.phone = phoneStr;
          }
        } else if (phoneStr.startsWith('+')) {
          // No stored country code but phone has one, extract it
          const match = phoneStr.match(/^(\+\d{1,4})/);
          if (match) {
            processedStudent.countryCode = match[1];
            processedStudent.phone = phoneStr.substring(match[1].length).trim();
          } else {
            // Couldn't extract, use default
            processedStudent.countryCode = '+1';
            processedStudent.phone = phoneStr;
          }
        } else {
          // No country code anywhere, use default
          processedStudent.countryCode = '+1';
          processedStudent.phone = phoneStr;
        }
      } else {
        // No phone at all, just set default country code
        processedStudent.countryCode = processedStudent.countryCode || '+1';
      }
      
      setStudentData(processedStudent);
    } else {
      setStudentData({
        firstName: "",
        lastName: "",
        email: "",
        lessonType: "individual",
        ageGroup: "adult",
        courseName: "",
        level: "",
        paymentStatus: "pending",
        teacherId: "",
        countryCode: "+1",
        socialLinks: [],
        birthday: undefined,
        teacherPreference: "any",
        additionalNotes: "",
        interests: []
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
    
    // Validate parent information for kids
    if (studentData.ageGroup === "kid") {
      if (!studentData.parentInfo?.name || 
          !studentData.parentInfo?.phone || 
          !studentData.parentInfo?.email || 
          !studentData.parentInfo?.relationship) {
        toast.error("Parent information is required for kids");
        return;
      }
      
      // Validate parent email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(studentData.parentInfo.email)) {
        toast.error("Please enter a valid parent email address");
        return;
      }
    }
    
    const studentPassword = password || "defaultPassword123";
    
    try {
      setSaving(true);
      
      if (isEditMode) {
        if (!student?.id) {
          toast.error("Student ID is missing");
          setSaving(false);
          return;
        }
        
        // Build update payload
        const updatePayload: any = {
          first_name: studentData.firstName,
          last_name: studentData.lastName,
          email: studentData.email,
          course_name: studentData.courseName,
          lesson_type: studentData.lessonType,
          age_group: studentData.ageGroup === 'adult' ? 'Adult' : 'Kid',
          level: studentData.level || '', // Keep levels exactly as selected
          teacher_id: studentData.teacherId
        };
        
        // Add phone with country code if provided (combine them like in create)
        if (studentData.phone && studentData.phone.trim() !== '') {
          // Remove any existing plus sign from the phone number
          const cleanPhone = studentData.phone.replace(/^\+/, '').trim();
          // If the phone already includes country code, use as is, otherwise combine
          if (cleanPhone.startsWith(studentData.countryCode?.replace('+', ''))) {
            updatePayload.phone = `+${cleanPhone}`;
          } else {
            updatePayload.phone = `${studentData.countryCode || '+1'}${cleanPhone}`;
          }
        }
        // Store country code separately for UI display
        if (studentData.countryCode) {
          updatePayload.countryCode = studentData.countryCode;
        }
        
        // Add parent information if this is a kid
        if (studentData.ageGroup === 'kid' && studentData.parentInfo) {
          updatePayload.parent_info = studentData.parentInfo;
        }
        
        // Add additional info fields
        if (studentData.socialLinks) {
          updatePayload.social_links = studentData.socialLinks;
        }
        if (studentData.birthday) {
          updatePayload.birthday = studentData.birthday;
        }
        if (studentData.teacherPreference) {
          updatePayload.teacher_preference = studentData.teacherPreference;
        }
        if (studentData.additionalNotes) {
          updatePayload.additional_notes = studentData.additionalNotes;
        }
        if (studentData.interests) {
          updatePayload.interests = studentData.interests;
        }
        // Add image field
        if (studentData.image !== undefined) {
          updatePayload.image = studentData.image || null;
        }
        
        toast.loading("Updating student...");
        
        await updateStudent(student.id, updatePayload);
        
        toast.dismiss();
        toast.success(`${studentData.firstName} ${studentData.lastName} updated successfully`);
        
        // Invalidate queries to refresh the data
        await queryClient.invalidateQueries({ queryKey: ['students'] });
        await queryClient.invalidateQueries({ queryKey: ['students', schoolId] });
        await queryClient.invalidateQueries({ queryKey: ['student', student.id] });
        await queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
        await queryClient.invalidateQueries({ queryKey: ['sessions'] });
        
        // Call onStudentAdded with updated data to refresh the list
        if (onStudentAdded) {
          const updatedStudent: Student = {
            ...student,
            ...studentData,
            phone: updatePayload.phone, // Use the formatted phone from the payload
            countryCode: updatePayload.countryCode || studentData.countryCode
          };
          onStudentAdded(updatedStudent);
        }
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
          // Keep level exactly as selected from dropdown
          level: studentData.level || ''
        };
        
        // Add phone with country code if provided
        if (studentData.phone && studentData.phone.trim() !== '') {
          // Remove any existing plus sign from the phone number
          const cleanPhone = studentData.phone.replace(/^\+/, '').trim();
          // If the phone already includes country code, use as is, otherwise combine
          if (cleanPhone.startsWith(studentData.countryCode?.replace('+', ''))) {
            studentPayload.phone = `+${cleanPhone}`;
          } else {
            studentPayload.phone = `${studentData.countryCode || '+1'}${cleanPhone}`;
          }
        }
        // Store country code separately for UI display
        if (studentData.countryCode) {
          studentPayload.countryCode = studentData.countryCode;
        }
        
        // Add parent information if this is a kid
        if (studentData.ageGroup === 'kid' && studentData.parentInfo) {
          studentPayload.parent_info = {
            name: studentData.parentInfo.name,
            relationship: studentData.parentInfo.relationship,
            phone: `${studentData.parentInfo.countryCode}${studentData.parentInfo.phone.replace(/^\+?[0-9]*/, '')}`,
            email: studentData.parentInfo.email
          };
        }
        
        // Add additional info fields for new student
        if (studentData.socialLinks) {
          studentPayload.social_links = studentData.socialLinks;
        }
        if (studentData.birthday) {
          studentPayload.birthday = studentData.birthday;
        }
        if (studentData.teacherPreference) {
          studentPayload.teacher_preference = studentData.teacherPreference;
        }
        if (studentData.additionalNotes) {
          studentPayload.additional_notes = studentData.additionalNotes;
        }
        if (studentData.interests) {
          studentPayload.interests = studentData.interests;
        }
        // Add image field for new student
        if (studentData.image) {
          studentPayload.image = studentData.image;
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
            level: studentData.level || '',
            paymentStatus: "pending",
            teacherId: selectedTeacherId,
            lessonsCompleted: 0,
            nextLesson: 'Not scheduled',
            phone: studentData.phone,
            countryCode: studentData.countryCode,
            parentInfo: studentData.parentInfo
          };
          onStudentAdded(newStudent);
        }
      }
      
      // Wait a bit for queries to invalidate before closing
      setTimeout(() => {
        if (onClose) {
          onClose();
        }
      }, 100);
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
