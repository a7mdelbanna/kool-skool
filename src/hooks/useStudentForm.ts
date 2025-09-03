
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
    countryCode: "+7"
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
      console.log('[useStudentForm] Loading student data:', student);
      // If phone contains country code, separate them for the form
      let processedStudent = { ...student };
      
      // Keep the original level value (don't normalize to lowercase)
      // This preserves custom levels like A1, A2, B1, etc.
      console.log('Loading student with level:', student.level);
      
      // Handle parent info - check both field names and parse the phone if needed
      console.log('[useStudentForm] Checking for parent info...');
      console.log('[useStudentForm] student.parent_info:', student.parent_info);
      console.log('[useStudentForm] student.parentInfo:', student.parentInfo);
      
      if (student.parent_info || student.parentInfo) {
        const parentInfo = student.parentInfo || student.parent_info;
        console.log('[useStudentForm] Found parent info:', parentInfo);
        
        // If parent info exists and has phone, parse the country code similar to main phone
        if (parentInfo && parentInfo.phone) {
          const processedParentInfo = { ...parentInfo };
          const phoneStr = parentInfo.phone.toString();
          
          // Check if the phone already has a country code
          if (phoneStr.startsWith('+')) {
            // Extract country code from the phone - be more specific for common codes
            // Check for specific country codes first (ordered by length to avoid conflicts)
            if (phoneStr.startsWith('+998')) {
              // Uzbekistan
              processedParentInfo.countryCode = '+998';
              processedParentInfo.phone = phoneStr.substring(4).trim();
            } else if (phoneStr.startsWith('+996')) {
              // Kyrgyzstan
              processedParentInfo.countryCode = '+996';
              processedParentInfo.phone = phoneStr.substring(4).trim();
            } else if (phoneStr.startsWith('+995')) {
              // Georgia
              processedParentInfo.countryCode = '+995';
              processedParentInfo.phone = phoneStr.substring(4).trim();
            } else if (phoneStr.startsWith('+994')) {
              // Azerbaijan
              processedParentInfo.countryCode = '+994';
              processedParentInfo.phone = phoneStr.substring(4).trim();
            } else if (phoneStr.startsWith('+993')) {
              // Turkmenistan
              processedParentInfo.countryCode = '+993';
              processedParentInfo.phone = phoneStr.substring(4).trim();
            } else if (phoneStr.startsWith('+992')) {
              // Tajikistan
              processedParentInfo.countryCode = '+992';
              processedParentInfo.phone = phoneStr.substring(4).trim();
            } else if (phoneStr.startsWith('+380')) {
              // Ukraine
              processedParentInfo.countryCode = '+380';
              processedParentInfo.phone = phoneStr.substring(4).trim();
            } else if (phoneStr.startsWith('+375')) {
              // Belarus
              processedParentInfo.countryCode = '+375';
              processedParentInfo.phone = phoneStr.substring(4).trim();
            } else if (phoneStr.startsWith('+374')) {
              // Armenia
              processedParentInfo.countryCode = '+374';
              processedParentInfo.phone = phoneStr.substring(4).trim();
            } else if (phoneStr.startsWith('+373')) {
              // Moldova
              processedParentInfo.countryCode = '+373';
              processedParentInfo.phone = phoneStr.substring(4).trim();
            } else if (phoneStr.startsWith('+90')) {
              // Turkey
              processedParentInfo.countryCode = '+90';
              processedParentInfo.phone = phoneStr.substring(3).trim();
            } else if (phoneStr.startsWith('+86')) {
              // China
              processedParentInfo.countryCode = '+86';
              processedParentInfo.phone = phoneStr.substring(3).trim();
            } else if (phoneStr.startsWith('+84')) {
              // Vietnam
              processedParentInfo.countryCode = '+84';
              processedParentInfo.phone = phoneStr.substring(3).trim();
            } else if (phoneStr.startsWith('+82')) {
              // South Korea
              processedParentInfo.countryCode = '+82';
              processedParentInfo.phone = phoneStr.substring(3).trim();
            } else if (phoneStr.startsWith('+81')) {
              // Japan
              processedParentInfo.countryCode = '+81';
              processedParentInfo.phone = phoneStr.substring(3).trim();
            } else if (phoneStr.startsWith('+66')) {
              // Thailand
              processedParentInfo.countryCode = '+66';
              processedParentInfo.phone = phoneStr.substring(3).trim();
            } else if (phoneStr.startsWith('+65')) {
              // Singapore
              processedParentInfo.countryCode = '+65';
              processedParentInfo.phone = phoneStr.substring(3).trim();
            } else if (phoneStr.startsWith('+63')) {
              // Philippines
              processedParentInfo.countryCode = '+63';
              processedParentInfo.phone = phoneStr.substring(3).trim();
            } else if (phoneStr.startsWith('+62')) {
              // Indonesia
              processedParentInfo.countryCode = '+62';
              processedParentInfo.phone = phoneStr.substring(3).trim();
            } else if (phoneStr.startsWith('+60')) {
              // Malaysia
              processedParentInfo.countryCode = '+60';
              processedParentInfo.phone = phoneStr.substring(3).trim();
            } else if (phoneStr.startsWith('+49')) {
              // Germany
              processedParentInfo.countryCode = '+49';
              processedParentInfo.phone = phoneStr.substring(3).trim();
            } else if (phoneStr.startsWith('+48')) {
              // Poland
              processedParentInfo.countryCode = '+48';
              processedParentInfo.phone = phoneStr.substring(3).trim();
            } else if (phoneStr.startsWith('+47')) {
              // Norway
              processedParentInfo.countryCode = '+47';
              processedParentInfo.phone = phoneStr.substring(3).trim();
            } else if (phoneStr.startsWith('+46')) {
              // Sweden
              processedParentInfo.countryCode = '+46';
              processedParentInfo.phone = phoneStr.substring(3).trim();
            } else if (phoneStr.startsWith('+45')) {
              // Denmark
              processedParentInfo.countryCode = '+45';
              processedParentInfo.phone = phoneStr.substring(3).trim();
            } else if (phoneStr.startsWith('+44')) {
              // United Kingdom
              processedParentInfo.countryCode = '+44';
              processedParentInfo.phone = phoneStr.substring(3).trim();
            } else if (phoneStr.startsWith('+43')) {
              // Austria
              processedParentInfo.countryCode = '+43';
              processedParentInfo.phone = phoneStr.substring(3).trim();
            } else if (phoneStr.startsWith('+41')) {
              // Switzerland
              processedParentInfo.countryCode = '+41';
              processedParentInfo.phone = phoneStr.substring(3).trim();
            } else if (phoneStr.startsWith('+40')) {
              // Romania
              processedParentInfo.countryCode = '+40';
              processedParentInfo.phone = phoneStr.substring(3).trim();
            } else if (phoneStr.startsWith('+39')) {
              // Italy
              processedParentInfo.countryCode = '+39';
              processedParentInfo.phone = phoneStr.substring(3).trim();
            } else if (phoneStr.startsWith('+34')) {
              // Spain
              processedParentInfo.countryCode = '+34';
              processedParentInfo.phone = phoneStr.substring(3).trim();
            } else if (phoneStr.startsWith('+33')) {
              // France
              processedParentInfo.countryCode = '+33';
              processedParentInfo.phone = phoneStr.substring(3).trim();
            } else if (phoneStr.startsWith('+32')) {
              // Belgium
              processedParentInfo.countryCode = '+32';
              processedParentInfo.phone = phoneStr.substring(3).trim();
            } else if (phoneStr.startsWith('+31')) {
              // Netherlands
              processedParentInfo.countryCode = '+31';
              processedParentInfo.phone = phoneStr.substring(3).trim();
            } else if (phoneStr.startsWith('+30')) {
              // Greece
              processedParentInfo.countryCode = '+30';
              processedParentInfo.phone = phoneStr.substring(3).trim();
            } else if (phoneStr.startsWith('+27')) {
              // South Africa
              processedParentInfo.countryCode = '+27';
              processedParentInfo.phone = phoneStr.substring(3).trim();
            } else if (phoneStr.startsWith('+20')) {
              // Egypt
              processedParentInfo.countryCode = '+20';
              processedParentInfo.phone = phoneStr.substring(3).trim();
            } else if (phoneStr.startsWith('+7')) {
              // Russia/Kazakhstan
              processedParentInfo.countryCode = '+7';
              processedParentInfo.phone = phoneStr.substring(2).trim();
            } else if (phoneStr.startsWith('+1')) {
              // USA/Canada
              processedParentInfo.countryCode = '+1';
              processedParentInfo.phone = phoneStr.substring(2).trim();
            } else {
              // For other countries, try to extract based on standard patterns
              const match = phoneStr.match(/^(\+\d{1,3})/);
              if (match) {
                processedParentInfo.countryCode = match[1];
                processedParentInfo.phone = phoneStr.substring(match[1].length).trim();
            } else {
              // Couldn't extract, use default
              processedParentInfo.countryCode = '+7';
              processedParentInfo.phone = phoneStr;
            }
          } else if (parentInfo.countryCode) {
            // Country code is stored separately, use it
            processedParentInfo.countryCode = parentInfo.countryCode;
            processedParentInfo.phone = phoneStr;
          } else {
            // No country code anywhere, use default
            processedParentInfo.countryCode = '+7';
            processedParentInfo.phone = phoneStr;
          }
          
          processedStudent.parentInfo = processedParentInfo;
        } else {
          processedStudent.parentInfo = parentInfo;
        }
        
        console.log('[useStudentForm] Processed parent info:', processedStudent.parentInfo);
      } else {
        console.log('[useStudentForm] NO parent info found in student data');
      }
      
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
            processedStudent.countryCode = '+7';
            processedStudent.phone = phoneStr;
          }
        } else {
          // No country code anywhere, use default
          processedStudent.countryCode = '+7';
          processedStudent.phone = phoneStr;
        }
      } else {
        // No phone at all, just set default country code
        processedStudent.countryCode = processedStudent.countryCode || '+7';
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
        countryCode: "+7",
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
    setStudentData(prevData => {
      const newData = {
        ...prevData,
        ...data
      };
      // Special handling for parentInfo to ensure it's properly merged
      if (data.parentInfo) {
        newData.parentInfo = data.parentInfo;
      }
      return newData;
    });
  };

  const handleSave = async () => {
    console.log('[useStudentForm] handleSave called');
    console.log('[useStudentForm] isEditMode:', isEditMode);
    console.log('[useStudentForm] Current studentData:', studentData);
    console.log('[useStudentForm] Age Group:', studentData.ageGroup);
    console.log('[useStudentForm] Parent Info:', studentData.parentInfo);
    
    // Only require first name and last name for updates
    // This allows updating bulk-uploaded students with incomplete data
    if (!studentData.firstName || !studentData.lastName) {
      toast.error("Please fill in required fields: First Name and Last Name");
      return;
    }
    
    // For new students, require course
    if (!isEditMode) {
      // Course is always required
      if (!studentData.courseName) {
        toast.error("Please select a course for the new student");
        return;
      }
      
      // For adults, email is required
      if (studentData.ageGroup === "adult" && !studentData.email) {
        toast.error("Email is required for adult students");
        return;
      }
      
      // For kids, we just need parent contact info (phone is sufficient)
      // Parent validation will be handled below
    }
    
    // Validate parent information for kids
    if (studentData.ageGroup === "kid") {
      console.log('[useStudentForm] Validating parent info for kid');
      if (!studentData.parentInfo?.name || 
          !studentData.parentInfo?.phone || 
          !studentData.parentInfo?.relationship) {
        console.log('[useStudentForm] Missing parent info:', {
          name: studentData.parentInfo?.name,
          phone: studentData.parentInfo?.phone,
          email: studentData.parentInfo?.email,
          relationship: studentData.parentInfo?.relationship
        });
        toast.error("Parent name, phone, and relationship are required for kids");
        return;
      }
      
      // Validate parent email format only if email is provided
      if (studentData.parentInfo.email && studentData.parentInfo.email.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(studentData.parentInfo.email)) {
          toast.error("Please enter a valid parent email address");
          return;
        }
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
          // User fields (will be updated in users collection)
          first_name: studentData.firstName,
          last_name: studentData.lastName,
          // Student fields (will be updated in students collection)
          lessonType: studentData.lessonType || 'individual',
          ageGroup: studentData.ageGroup === 'adult' ? 'Adult' : 'Kid',
        };
        
        // Only add these fields if they have values (for bulk-uploaded students they might be empty)
        if (studentData.email) {
          updatePayload.email = studentData.email;
        }
        if (studentData.courseName) {
          updatePayload.courseName = studentData.courseName;
        }
        if (studentData.level) {
          updatePayload.level = studentData.level;
        }
        if (studentData.teacherId) {
          updatePayload.teacherId = studentData.teacherId;
        }
        
        console.log('[useStudentForm] Initial update payload:', updatePayload);
        
        // Add phone with country code if provided (combine them like in create)
        if (studentData.phone && studentData.phone.trim() !== '') {
          // Remove any existing plus sign from the phone number
          const cleanPhone = studentData.phone.replace(/^\+/, '').trim();
          // If the phone already includes country code, use as is, otherwise combine
          if (cleanPhone.startsWith(studentData.countryCode?.replace('+', ''))) {
            updatePayload.phone = `+${cleanPhone}`;
          } else {
            updatePayload.phone = `${studentData.countryCode || '+7'}${cleanPhone}`;
          }
          console.log('[useStudentForm] Phone added to payload:', updatePayload.phone);
        } else {
          console.log('[useStudentForm] No phone number provided');
        }
        // Store country code separately for UI display
        if (studentData.countryCode) {
          updatePayload.countryCode = studentData.countryCode;
        }
        
        console.log('[useStudentForm] Final update payload before sending:', updatePayload);
        
        // Add parent information if this is a kid (check both lowercase and the value we're setting)
        if ((studentData.ageGroup === 'kid' || updatePayload.ageGroup === 'Kid') && studentData.parentInfo) {
          // Process parent phone similar to student phone - combine country code with phone
          const processedParentInfo = { ...studentData.parentInfo };
          
          if (processedParentInfo.phone && processedParentInfo.phone.trim() !== '') {
            const cleanParentPhone = processedParentInfo.phone.replace(/^\+/, '').trim();
            const parentCountryCode = processedParentInfo.countryCode || '+7';
            
            // If the phone already includes country code, use as is, otherwise combine
            if (cleanParentPhone.startsWith(parentCountryCode.replace('+', ''))) {
              processedParentInfo.phone = `+${cleanParentPhone}`;
            } else {
              processedParentInfo.phone = `${parentCountryCode}${cleanParentPhone}`;
            }
          }
          
          updatePayload.parentInfo = processedParentInfo;
          console.log('[useStudentForm] Adding parent info to payload:', processedParentInfo);
        }
        
        // Add additional info fields using camelCase
        if (studentData.socialLinks) {
          updatePayload.socialLinks = studentData.socialLinks;
        }
        if (studentData.birthday) {
          updatePayload.birthday = studentData.birthday;
        }
        if (studentData.teacherPreference) {
          updatePayload.teacherPreference = studentData.teacherPreference;
        }
        if (studentData.additionalNotes) {
          updatePayload.additionalNotes = studentData.additionalNotes;
        }
        if (studentData.interests) {
          updatePayload.interests = studentData.interests;
        }
        // Add image field
        if (studentData.image !== undefined) {
          updatePayload.image = studentData.image || null;
        }
        // Add income category for payment tracking
        if (studentData.income_category_id) {
          updatePayload.income_category_id = studentData.income_category_id;
        }
        
        toast.loading("Updating student...");
        
        try {
          const result = await updateStudent(student.id, updatePayload);
          console.log('Update result:', result);
        } catch (updateError) {
          console.error('Failed to update student:', updateError);
          toast.dismiss();
          toast.error(`Failed to update student: ${(updateError as Error).message}`);
          setSaving(false);
          return;
        }
        
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
        
        // Only add email and password if email is provided (required for adults, optional for kids)
        if (studentData.email && studentData.email.trim() !== '') {
          studentPayload.student_email = studentData.email;
          studentPayload.student_password = studentPassword;
        }
        
        // Add phone with country code if provided
        if (studentData.phone && studentData.phone.trim() !== '') {
          // Remove any existing plus sign from the phone number
          const cleanPhone = studentData.phone.replace(/^\+/, '').trim();
          // If the phone already includes country code, use as is, otherwise combine
          if (cleanPhone.startsWith(studentData.countryCode?.replace('+', ''))) {
            studentPayload.phone = `+${cleanPhone}`;
          } else {
            studentPayload.phone = `${studentData.countryCode || '+7'}${cleanPhone}`;
          }
        }
        // Store country code separately for UI display
        if (studentData.countryCode) {
          studentPayload.countryCode = studentData.countryCode;
        }
        
        // Add parent information if this is a kid
        if (studentData.ageGroup === 'kid' && studentData.parentInfo) {
          // Process parent phone similar to student phone - combine country code with phone
          const processedParentInfo = { ...studentData.parentInfo };
          
          if (processedParentInfo.phone && processedParentInfo.phone.trim() !== '') {
            const cleanParentPhone = processedParentInfo.phone.replace(/^\+/, '').trim();
            const parentCountryCode = processedParentInfo.countryCode || '+7';
            
            // If the phone already includes country code, use as is, otherwise combine
            if (cleanParentPhone.startsWith(parentCountryCode.replace('+', ''))) {
              processedParentInfo.phone = `+${cleanParentPhone}`;
            } else {
              processedParentInfo.phone = `${parentCountryCode}${cleanParentPhone}`;
            }
          }
          
          studentPayload.parent_info = processedParentInfo;
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
        // Add income category for payment tracking
        if (studentData.income_category_id) {
          studentPayload.income_category_id = studentData.income_category_id;
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
            parentInfo: studentData.parentInfo,
            income_category_id: studentData.income_category_id
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
