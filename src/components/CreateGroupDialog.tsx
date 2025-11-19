
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { X, Plus, Calendar, DollarSign, Clock, Users, ChevronDown, ChevronUp, BookOpen, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, getSchoolTeachers, getStudentsWithDetails } from '@/integrations/supabase/client';
import { databaseService } from '@/services/firebase/database.service';
import { UserContext } from '@/App';
import { useContext } from 'react';
import { useToast } from '@/hooks/use-toast';
import { validateTeacherScheduleOverlap } from '@/utils/teacherScheduleValidation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import SchedulePreview from '@/components/student-tabs/SchedulePreview';
import TimePicker from '@/components/ui/time-picker';

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ScheduleItem {
  day: string;
  time: string;
}

interface Course {
  id: string;
  name: string;
  lesson_type: string;
  created_at: string;
}

interface GroupFormData {
  name: string;
  description: string;
  course_id: string;
  teacher_id: string;
  session_count: string | number;
  session_duration_minutes: string | number;
  schedule: ScheduleItem[];
  currency: string;
  price_mode: 'perSession' | 'total';
  price_per_session: string | number;
  total_price: string | number;
  // Multi-currency pricing: store prices for each currency
  prices_by_currency: { [currencyCode: string]: { per_session: string | number; total: string | number } };
}

interface StudentPaymentDetails {
  start_date: string;
  initial_payment_amount: string | number;
  payment_method: string;
  account_id: string;
  payment_notes: string;
  // Pricing override fields
  override_pricing: boolean;
  custom_currency?: string;
  custom_price_mode?: 'perSession' | 'total';
  custom_price_per_session?: string | number;
  custom_total_price?: string | number;
}

interface StudentSelection {
  id: string;
  name: string;
  email: string;
  paymentDetails: StudentPaymentDetails;
  isExpanded: boolean;
}

interface Currency {
  id: string;
  name: string;
  symbol: string;
  code: string;
  exchange_rate: number;
  is_default: boolean;
  created_at: string;
}

interface Account {
  id: string;
  name: string;
  type: string;
  currency_id: string;
}

const CreateGroupDialog = ({ open, onOpenChange, onSuccess }: CreateGroupDialogProps) => {
  const { user } = useContext(UserContext);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('details');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scheduleValidationError, setScheduleValidationError] = useState<string>('');
  const [isValidatingSchedule, setIsValidatingSchedule] = useState(false);
  
  // Group form data
  const [groupData, setGroupData] = useState<GroupFormData>({
    name: '',
    description: '',
    course_id: '',
    teacher_id: '',
    session_count: '',
    session_duration_minutes: '',
    schedule: [],
    currency: 'RUB', // Default to RUB for now
    price_mode: 'total',
    price_per_session: '',
    total_price: '',
    prices_by_currency: {}
  });

  // Students tab data
  const [selectedStudents, setSelectedStudents] = useState<StudentSelection[]>([]);

  // Schedule form
  const [newScheduleDay, setNewScheduleDay] = useState('');
  const [newScheduleTime, setNewScheduleTime] = useState('');

  // Fetch Group courses from Firebase
  const { data: groupCourses } = useQuery({
    queryKey: ['group-courses', user?.schoolId],
    queryFn: async () => {
      if (!user?.schoolId) return [];
      
      try {
        console.log('Fetching all courses for school:', user.schoolId);
        
        // First, fetch all courses for the school
        let allCourses = await databaseService.query('courses', {
          where: [{ field: 'schoolId', operator: '==', value: user.schoolId }]
        });
        
        // If no courses with camelCase, try snake_case
        if (!allCourses || allCourses.length === 0) {
          allCourses = await databaseService.query('courses', {
            where: [{ field: 'school_id', operator: '==', value: user.schoolId }]
          });
        }
        
        console.log('All courses fetched:', allCourses);
        
        // Filter for group courses - check multiple field variations
        const groupCourses = allCourses.filter((course: any) => {
          const lessonType = course.lesson_type || course.lessonType || course.type;
          console.log(`Course ${course.name} has lesson_type:`, lessonType);
          return lessonType === 'group' || lessonType === 'Group';
        });
        
        console.log('Filtered group courses:', groupCourses);

        // Map to expected format
        return groupCourses.map((course: any) => ({
          id: course.id,
          name: course.name,
          lesson_type: course.lesson_type || course.lessonType || course.type || 'group',
          created_at: course.created_at || course.createdAt || course.created_at
        })) as Course[];
      } catch (error) {
        console.error('Error fetching group courses:', error);
        return [];
      }
    },
    enabled: !!user?.schoolId && open
  });

  // Get selected course details
  const selectedCourse = groupCourses?.find(course => course.id === groupData.course_id);

  // Fetch teachers
  const { data: teachers } = useQuery({
    queryKey: ['teachers', user?.schoolId],
    queryFn: () => getSchoolTeachers(user?.schoolId || ''),
    enabled: !!user?.schoolId && open
  });

  // Fetch students
  const { data: students } = useQuery({
    queryKey: ['students', user?.schoolId],
    queryFn: () => getStudentsWithDetails(user?.schoolId || ''),
    enabled: !!user?.schoolId && open
  });

  // Fetch school currencies from Firebase
  const { data: currencies } = useQuery({
    queryKey: ['currencies', user?.schoolId],
    queryFn: async () => {
      if (!user?.schoolId) return [];
      
      try {
        const data = await databaseService.query('currencies', {
          where: [{ field: 'school_id', operator: '==', value: user.schoolId }]
        });
        
        return data || [];
      } catch (error) {
        console.error('Error fetching currencies:', error);
        return [];
      }
    },
    enabled: !!user?.schoolId && open
  });

  // Fetch school accounts using RPC function (same as AddSubscriptionDialog)
  const { data: accounts = [] } = useQuery({
    queryKey: ['school-accounts', user?.schoolId],
    queryFn: async () => {
      if (!user?.schoolId) return [];
      const { data, error } = await supabase.rpc('get_school_accounts', {
        p_school_id: user.schoolId
      });
      if (error) throw error;
      // Filter out archived accounts
      return (data || []).filter((account: any) => !account.is_archived);
    },
    enabled: !!user?.schoolId && open
  });

  // Calculate total amount based on price mode
  const calculateTotalAmount = () => {
    if (groupData.price_mode === 'perSession') {
      const pricePerSession = parseFloat(groupData.price_per_session) || 0;
      const sessionCount = parseFloat(groupData.session_count) || 0;
      return pricePerSession * sessionCount;
    } else {
      return parseFloat(groupData.total_price) || 0;
    }
  };

  // Get selected currency symbol
  const getSelectedCurrencySymbol = () => {
    const selectedCurrency = currencies?.find(c => c.code === groupData.currency);
    return selectedCurrency?.symbol || '$';
  };

  // Get available currencies (currencies with prices entered)
  const getAvailableCurrencies = () => {
    if (!currencies) return [];
    return currencies.filter(curr => {
      const priceData = groupData.prices_by_currency[curr.code];
      if (!priceData) return false;
      const price = groupData.price_mode === 'perSession' ? priceData.per_session : priceData.total;
      return price && parseFloat(String(price)) > 0;
    });
  };

  // Get price for a specific currency
  const getPriceForCurrency = (currencyCode: string) => {
    const priceData = groupData.prices_by_currency[currencyCode];
    if (!priceData) return 0;
    const price = groupData.price_mode === 'perSession' ? priceData.per_session : priceData.total;
    return parseFloat(String(price)) || 0;
  };

  // Validate teacher availability for all schedule items
  const validateTeacherAvailability = async () => {
    if (!groupData.teacher_id || groupData.schedule.length === 0) {
      setScheduleValidationError('');
      return true;
    }

    setIsValidatingSchedule(true);
    setScheduleValidationError('');

    try {
      // Get the first occurrence of each scheduled day in the future
      const today = new Date();
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const sessionDuration = parseInt(String(groupData.session_duration_minutes)) || 60;

      for (const scheduleItem of groupData.schedule) {
        const dayIndex = daysOfWeek.indexOf(scheduleItem.day);
        if (dayIndex === -1) continue;

        // Find the next occurrence of this day
        let checkDate = new Date(today);
        let daysToAdd = (dayIndex - checkDate.getDay() + 7) % 7;
        if (daysToAdd === 0 && checkDate.getHours() >= parseInt(scheduleItem.time.split(':')[0])) {
          daysToAdd = 7; // If today but time has passed, check next week
        }
        checkDate.setDate(checkDate.getDate() + daysToAdd);

        const dateStr = checkDate.toISOString().split('T')[0];

        // Validate this time slot
        const result = await validateTeacherScheduleOverlap({
          teacherId: groupData.teacher_id,
          date: dateStr,
          startTime: scheduleItem.time,
          durationMinutes: sessionDuration
        }, user?.role === 'admin');

        if (result.hasConflict && result.conflictMessage) {
          setScheduleValidationError(result.conflictMessage);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error validating teacher schedule:', error);
      // Don't block on validation errors
      return true;
    } finally {
      setIsValidatingSchedule(false);
    }
  };

  // Auto-validate teacher availability when schedule or teacher changes
  useEffect(() => {
    // Only validate if we have both teacher and at least one schedule item
    if (groupData.teacher_id && groupData.schedule.length > 0) {
      // Small delay to avoid excessive API calls during rapid changes
      const timeoutId = setTimeout(() => {
        validateTeacherAvailability();
      }, 300);

      return () => clearTimeout(timeoutId);
    } else {
      // Clear any validation errors if no teacher or schedule
      setScheduleValidationError('');
    }
  }, [groupData.teacher_id, groupData.schedule, groupData.session_duration_minutes]);

  const handleAddSchedule = () => {
    if (newScheduleDay && newScheduleTime) {
      setGroupData(prev => ({
        ...prev,
        schedule: [...prev.schedule, { day: newScheduleDay, time: newScheduleTime }]
      }));
      setNewScheduleDay('');
      setNewScheduleTime('');
      // Validation will be triggered automatically by useEffect
    }
  };

  const handleRemoveSchedule = (index: number) => {
    setGroupData(prev => ({
      ...prev,
      schedule: prev.schedule.filter((_, i) => i !== index)
    }));
  };

  const handleAddStudent = (studentId: string) => {
    const student = students?.find(s => s.id === studentId);
    if (student && !selectedStudents.find(s => s.id === studentId)) {
      setSelectedStudents(prev => [...prev, {
        id: student.id,
        name: `${student.first_name} ${student.last_name}`,
        email: student.email,
        paymentDetails: {
          start_date: '',
          initial_payment_amount: '',
          payment_method: 'Cash',
          account_id: '',
          payment_notes: '',
          // Initialize pricing override fields
          override_pricing: false,
          custom_currency: groupData.currency,
          custom_price_mode: groupData.price_mode,
          custom_price_per_session: '',
          custom_total_price: ''
        },
        isExpanded: true
      }]);
    }
  };

  const handleRemoveStudent = (studentId: string) => {
    setSelectedStudents(prev => prev.filter(s => s.id !== studentId));
  };

  const handleToggleStudentExpansion = (studentId: string) => {
    setSelectedStudents(prev => prev.map(student => 
      student.id === studentId 
        ? { ...student, isExpanded: !student.isExpanded }
        : student
    ));
  };

  const handleStudentPaymentChange = (studentId: string, field: keyof StudentPaymentDetails, value: string | number) => {
    setSelectedStudents(prev => prev.map(student => 
      student.id === studentId 
        ? { 
            ...student, 
            paymentDetails: { 
              ...student.paymentDetails, 
              [field]: value 
            }
          }
        : student
    ));
  };

  const handleSubmit = async () => {
    console.log('=== CREATE GROUP SUBMISSION STARTED ===');
    console.log('User:', user);
    console.log('Group Data:', groupData);
    console.log('Selected Students:', selectedStudents);

    if (!user?.schoolId) {
      console.error('No school ID found');
      toast({
        title: "Error",
        description: "No school ID found. Please try logging in again.",
        variant: "destructive",
      });
      return;
    }

    // Validate form data
    if (!isFormValid) {
      console.error('Form validation failed');
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields: group name, course, teacher, and schedule.",
        variant: "destructive",
      });
      return;
    }

    if (selectedStudents.length === 0) {
      console.error('No students selected');
      toast({
        title: "No Students Selected",
        description: "Please add at least one student to the group.",
        variant: "destructive",
      });
      return;
    }

    // Validate teacher availability before creating group
    const isAvailable = await validateTeacherAvailability();
    if (!isAvailable) {
      toast({
        title: "Teacher Schedule Conflict",
        description: "Please resolve the schedule conflict before creating the group.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      console.log('Creating group...');
      
      // Prepare the group data with proper price handling
      const sessionCount = parseInt(String(groupData.session_count)) || 0;
      const sessionDuration = parseInt(String(groupData.session_duration_minutes)) || 60;
      const pricePerSession = parseFloat(String(groupData.price_per_session)) || 0;
      const totalPrice = parseFloat(String(groupData.total_price)) || 0;
      
      const groupInsertData = {
        school_id: user.schoolId,
        name: groupData.name,
        description: groupData.description,
        course_id: groupData.course_id,
        teacher_id: groupData.teacher_id,
        session_count: sessionCount,
        session_duration_minutes: sessionDuration,
        schedule: groupData.schedule as any,
        currency: groupData.currency,
        price_mode: groupData.price_mode,
        status: 'active',
        // Include multi-currency pricing data
        prices_by_currency: groupData.prices_by_currency || {},
        // Handle price fields based on price_mode
        ...(groupData.price_mode === 'perSession'
          ? {
              price_per_session: pricePerSession,
              total_price: pricePerSession * sessionCount
            }
          : {
              price_per_session: null, // Set to null for total pricing mode
              total_price: totalPrice
            }
        )
      };

      console.log('Group insert data:', groupInsertData);
      
      // Create the group in Firebase
      const groupId = await databaseService.create('groups', {
        ...groupInsertData,
        schoolId: user.schoolId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      if (!groupId) {
        throw new Error('Failed to create group');
      }

      console.log('Group created successfully with ID:', groupId);
      const groupResult = { id: groupId, ...groupInsertData };

      // Create group subscriptions for selected students
      if (selectedStudents.length > 0 && groupResult) {
        console.log('Creating subscriptions and sessions for students...');
        
        // Get teacher name for subscription
        const selectedTeacher = teachers?.find(t => t.id === groupData.teacher_id);
        
        for (const student of selectedStudents) {
          console.log(`Processing student: ${student.name} (${student.id})`);
          
          // Create group subscription in Firebase subcollection
          await databaseService.create(`groups/${groupResult.id}/students`, {
            studentId: student.id,
            studentName: student.name,
            startDate: student.paymentDetails.start_date || new Date().toISOString().split('T')[0],
            status: 'active',
            createdAt: new Date().toISOString()
          });
          
          // Determine pricing for this student
          const useCustomPricing = student.paymentDetails.override_pricing;

          // Get student's currency (from selection or first available)
          const availableCurrencies = getAvailableCurrencies();
          const studentCurrency = useCustomPricing
            ? (student.paymentDetails.custom_currency || (availableCurrencies[0]?.code || groupData.currency))
            : (student.paymentDetails.custom_currency || (availableCurrencies[0]?.code || groupData.currency));

          let studentPricePerSession = 0;
          let studentTotalPrice = 0;

          if (useCustomPricing) {
            // Use custom pricing from override fields
            const studentPriceMode = student.paymentDetails.custom_price_mode || groupData.price_mode;
            studentPricePerSession = parseFloat(String(student.paymentDetails.custom_price_per_session)) || 0;
            studentTotalPrice = studentPriceMode === 'perSession'
              ? studentPricePerSession * sessionCount
              : parseFloat(String(student.paymentDetails.custom_total_price)) || 0;
          } else {
            // Use group pricing for the selected currency
            const priceData = groupData.prices_by_currency[studentCurrency];
            if (priceData) {
              if (groupData.price_mode === 'perSession') {
                studentPricePerSession = parseFloat(String(priceData.per_session)) || 0;
                studentTotalPrice = studentPricePerSession * sessionCount;
              } else {
                studentTotalPrice = parseFloat(String(priceData.total)) || 0;
                studentPricePerSession = 0;
              }
            }
          }

          // Determine price mode for subscription
          const subscriptionPriceMode = useCustomPricing
            ? (student.paymentDetails.custom_price_mode || groupData.price_mode)
            : groupData.price_mode;

          // Create actual subscription in main subscriptions collection
          const subscriptionData = {
            school_id: user.schoolId,
            student_id: student.id,
            teacher_id: groupData.teacher_id,
            teacher_name: selectedTeacher?.display_name || 'Unknown',
            course_id: groupData.course_id,
            course_name: selectedCourse?.name || 'Unknown',
            group_id: groupResult.id,
            group_name: groupData.name,
            session_count: sessionCount,
            session_duration: sessionDuration,
            schedule: groupData.schedule,
            currency: studentCurrency,
            price_mode: subscriptionPriceMode,
            price_per_session: subscriptionPriceMode === 'perSession' ? studentPricePerSession : null,
            total_price: studentTotalPrice,
            status: 'active',
            start_date: student.paymentDetails.start_date || new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          const subscriptionId = await databaseService.create('subscriptions', subscriptionData);
          console.log('Created subscription:', subscriptionId);
          
          // Generate sessions based on schedule with chronological distribution
          if (groupData.schedule.length > 0 && sessionCount > 0) {
            console.log('Generating sessions for subscription:', subscriptionId);

            const startDate = new Date(student.paymentDetails.start_date || new Date());
            const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

            // Build all possible session dates across all schedule days
            const allSessionDates: Array<{ date: Date; time: string; day: string }> = [];
            const maxWeeks = Math.ceil(sessionCount / groupData.schedule.length) + 4;

            // Generate sessions week by week across all schedule days
            for (let week = 0; week < maxWeeks && allSessionDates.length < sessionCount; week++) {
              for (const scheduleItem of groupData.schedule) {
                if (allSessionDates.length >= sessionCount) break;

                const dayIndex = daysOfWeek.indexOf(scheduleItem.day);
                if (dayIndex === -1) continue;

                // Calculate the date for this schedule day in this week
                const sessionDate = new Date(startDate);

                // Find first occurrence of this day
                let daysToAdd = (dayIndex - startDate.getDay() + 7) % 7;
                if (daysToAdd === 0 && week === 0) {
                  // If it's the same day as start date, use it
                  daysToAdd = 0;
                }

                // Add the week offset
                daysToAdd += (week * 7);
                sessionDate.setDate(sessionDate.getDate() + daysToAdd);

                // Only add if on or after start date
                if (sessionDate >= startDate) {
                  allSessionDates.push({
                    date: sessionDate,
                    time: scheduleItem.time,
                    day: scheduleItem.day
                  });
                }
              }
            }

            // Sort chronologically and take only the required number
            const sortedSessions = allSessionDates
              .sort((a, b) => a.date.getTime() - b.date.getTime())
              .slice(0, sessionCount);

            // Create sessions in database
            for (let i = 0; i < sortedSessions.length; i++) {
              const session = sortedSessions[i];
              const sessionData = {
                subscription_id: subscriptionId,
                student_id: student.id,
                school_id: user.schoolId,
                teacher_id: groupData.teacher_id,
                course_id: groupData.course_id,
                group_id: groupResult.id,
                scheduled_date: session.date.toISOString().split('T')[0],
                scheduled_time: session.time,
                duration_minutes: groupData.session_duration_minutes,
                status: 'scheduled',
                index_in_sub: i + 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };

              await databaseService.create('sessions', sessionData);
            }

            console.log(`Created ${sortedSessions.length} sessions for ${student.name} (requested ${sessionCount})`);
          }
          
          // Create initial payment if amount provided
          const paymentAmount = parseFloat(String(student.paymentDetails.initial_payment_amount)) || 0;
          if (paymentAmount > 0) {
            await databaseService.create('transactions', {
              school_id: user.schoolId,
              type: 'income',
              student_id: student.id,
              group_id: groupResult.id,
              subscription_id: subscriptionId,
              amount: paymentAmount,
              currency: studentCurrency, // Use student's currency (custom or group default)
              transaction_date: new Date().toISOString().split('T')[0],
              payment_method: student.paymentDetails.payment_method || 'Cash',
              from_account_id: student.paymentDetails.account_id || null,
              description: `Initial payment for group ${groupData.name}`,
              notes: student.paymentDetails.payment_notes || '',
              status: 'completed',
              created_at: new Date().toISOString()
            });
          }

          console.log(`Subscription and sessions created for ${student.name} in group ${groupResult.id}`);
        }
      }

      console.log('=== CREATE GROUP SUBMISSION COMPLETED SUCCESSFULLY ===');

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['groups', user.schoolId] });
      queryClient.invalidateQueries({ queryKey: ['group-student-payments', groupResult.id] });
      queryClient.invalidateQueries({ queryKey: ['school-transactions', user.schoolId] });
      queryClient.invalidateQueries({ queryKey: ['group-subscriptions', groupResult.id] });
      queryClient.invalidateQueries({ queryKey: ['group-students', groupResult.id] });

      toast({
        title: "Success!",
        description: `Group "${groupData.name}" created with ${selectedStudents.length} student(s).`,
      });

      // Reset form and close dialog
      setGroupData({
        name: '',
        description: '',
        course_id: '',
        teacher_id: '',
        session_count: 8,
        session_duration_minutes: 60,
        schedule: [],
        currency: 'USD',
        price_mode: 'total',
        price_per_session: 0,
        total_price: 0,
        prices_by_currency: {} // Initialize empty prices
      });
      setSelectedStudents([]);
      setActiveTab('details');
      
      onSuccess?.();
      onOpenChange(false);
      
    } catch (error) {
      console.error('=== CREATE GROUP SUBMISSION FAILED ===');
      console.error('Error details:', error);
      
      toast({
        title: "Error Creating Group",
        description: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = groupData.name && groupData.course_id && groupData.teacher_id && groupData.schedule.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-8 w-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Users className="h-4 w-4 text-white" />
            </div>
            Create New Group
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Group Details</TabsTrigger>
            <TabsTrigger value="students">Add Students</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="group-name">Group Name *</Label>
                  <Input
                    id="group-name"
                    value={groupData.name}
                    onChange={(e) => setGroupData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter group name"
                  />
                </div>

                <div>
                  <Label htmlFor="group-description">Description</Label>
                  <Textarea
                    id="group-description"
                    value={groupData.description}
                    onChange={(e) => setGroupData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter group description"
                  />
                </div>

                <div>
                  <Label htmlFor="course">Course *</Label>
                  <Select value={groupData.course_id} onValueChange={(value) => setGroupData(prev => ({ ...prev, course_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a group course" />
                    </SelectTrigger>
                    <SelectContent>
                      {groupCourses?.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            {course.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCourse && (
                    <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <div className="flex items-start gap-2">
                        <BookOpen className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">{selectedCourse.name}</p>
                          <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">Course Type: {selectedCourse.lesson_type}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="teacher">Teacher *</Label>
                    <Select value={groupData.teacher_id} onValueChange={(value) => setGroupData(prev => ({ ...prev, teacher_id: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers?.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="session-count">Session Count</Label>
                    <Input
                      id="session-count"
                      type="number"
                      value={groupData.session_count}
                      onChange={(e) => setGroupData(prev => ({ ...prev, session_count: e.target.value }))}
                      placeholder="8"
                      min="1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="session-duration">Session Duration (minutes)</Label>
                    <Input
                      id="session-duration"
                      type="number"
                      value={groupData.session_duration_minutes}
                      onChange={(e) => setGroupData(prev => ({ ...prev, session_duration_minutes: e.target.value }))}
                      placeholder="60"
                      min="15"
                      max="480"
                      step="15"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Schedule *
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Day</Label>
                    <Select value={newScheduleDay} onValueChange={setNewScheduleDay}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Monday">Monday</SelectItem>
                        <SelectItem value="Tuesday">Tuesday</SelectItem>
                        <SelectItem value="Wednesday">Wednesday</SelectItem>
                        <SelectItem value="Thursday">Thursday</SelectItem>
                        <SelectItem value="Friday">Friday</SelectItem>
                        <SelectItem value="Saturday">Saturday</SelectItem>
                        <SelectItem value="Sunday">Sunday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Time</Label>
                    <TimePicker
                      value={newScheduleTime}
                      onChange={(value) => setNewScheduleTime(value)}
                      placeholder="Select time"
                    />
                  </div>

                  <div className="flex items-end">
                    <Button 
                      type="button"
                      onClick={handleAddSchedule} 
                      className="w-full"
                      disabled={!newScheduleDay || !newScheduleTime}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Schedule
                    </Button>
                  </div>
                </div>

                {groupData.schedule.length > 0 ? (
                  <div className="space-y-3">
                    <Label>Current Schedule</Label>
                    <div className="space-y-2">
                      {groupData.schedule.map((item, index) => (
                        <div key={index} className="flex items-center justify-between border rounded-lg p-3">
                          <span>{item.day} at {item.time}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            onClick={() => handleRemoveSchedule(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {/* Teacher Availability Validation */}
                    {isValidatingSchedule && (
                      <Alert className="border-blue-500/20 bg-blue-500/10">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        <AlertDescription className="text-blue-700 dark:text-blue-300">
                          Checking teacher availability...
                        </AlertDescription>
                      </Alert>
                    )}

                    {scheduleValidationError && !isValidatingSchedule && (
                      <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-red-700 dark:text-red-300">
                          {scheduleValidationError}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                    ⚠️ Please add at least one schedule item by clicking "Add to Schedule" button above
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Pricing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Price Mode Selection */}
                <div>
                  <Label className="text-base font-medium mb-2 block">Price Mode</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Choose how you want to price this group - either per session or total price for all sessions.
                  </p>
                  <Select value={groupData.price_mode} onValueChange={(value: 'perSession' | 'total') => setGroupData(prev => ({ ...prev, price_mode: value }))}>
                    <SelectTrigger className="w-full md:w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="perSession">Per Session</SelectItem>
                      <SelectItem value="total">Total Price (Fixed)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Multi-Currency Pricing Input */}
                {currencies && currencies.length > 0 && (
                  <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <Label className="text-base font-medium mb-2 block">Set Prices for Each Currency</Label>
                    <p className="text-sm text-muted-foreground mb-4">
                      Enter the {groupData.price_mode === 'perSession' ? 'price per session' : 'total price'} in each currency you want to accept.
                      Students will choose which currency to pay in. Leave empty for currencies you don't want to offer.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {currencies?.map((currency) => {
                        const priceData = groupData.prices_by_currency?.[currency.code];
                        const enteredValue = groupData.price_mode === 'perSession'
                          ? (priceData?.per_session || '')
                          : (priceData?.total || '');
                        const numericValue = parseFloat(String(enteredValue)) || 0;
                        const sessionCount = parseFloat(String(groupData.session_count)) || 0;

                        // Calculate total based on mode
                        const totalAmount = groupData.price_mode === 'perSession'
                          ? numericValue * sessionCount
                          : numericValue;

                        return (
                          <div key={currency.code} className="p-3 bg-muted/50 rounded-lg border">
                            <Label className="text-xs font-medium mb-2 flex items-center gap-2">
                              {currency.name} ({currency.symbol})
                              {currency.is_default && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0">Default</Badge>
                              )}
                            </Label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder={groupData.price_mode === 'perSession' ? 'Per session' : 'Total price'}
                              value={enteredValue}
                              onChange={(e) => {
                                const value = e.target.value;
                                setGroupData(prev => ({
                                  ...prev,
                                  prices_by_currency: {
                                    ...prev.prices_by_currency,
                                    [currency.code]: {
                                      per_session: groupData.price_mode === 'perSession' ? value : (prev.prices_by_currency[currency.code]?.per_session || ''),
                                      total: groupData.price_mode === 'total' ? value : (prev.prices_by_currency[currency.code]?.total || '')
                                    }
                                  }
                                }));
                              }}
                              className="h-8 text-sm"
                            />
                            {/* Show total */}
                            {enteredValue && (
                              <div className="text-xs mt-1.5 font-medium text-blue-600 dark:text-blue-400">
                                Total: {currency.symbol}{totalAmount.toFixed(2)}
                                {groupData.price_mode === 'perSession' && sessionCount > 0 && (
                                  <span className="text-muted-foreground ml-1">
                                    ({sessionCount} sessions)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Add Students to Group</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Select Students</Label>
                  <Select onValueChange={handleAddStudent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a student to add" />
                    </SelectTrigger>
                    <SelectContent>
                      {students?.filter(student => 
                        !selectedStudents.find(s => s.id === student.id)
                      ).map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.first_name} {student.last_name} ({student.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedStudents.length > 0 && (
                  <div className="space-y-4">
                    <Label>Selected Students ({selectedStudents.length})</Label>
                    <div className="space-y-4">
                      {selectedStudents.map((student) => (
                        <Card key={student.id} className="border-l-4 border-l-blue-500">
                          <Collapsible 
                            open={student.isExpanded} 
                            onOpenChange={() => handleToggleStudentExpansion(student.id)}
                          >
                            <CollapsibleTrigger asChild>
                              <CardHeader className="cursor-pointer hover:bg-muted/50">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div>
                                      <CardTitle className="text-lg">{student.name}</CardTitle>
                                      <p className="text-sm text-muted-foreground">{student.email}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {parseFloat(String(student.paymentDetails.initial_payment_amount)) > 0 && (
                                      <Badge variant="outline">
                                        {getSelectedCurrencySymbol()}{parseFloat(String(student.paymentDetails.initial_payment_amount)).toFixed(2)}
                                      </Badge>
                                    )}
                                    {student.isExpanded ? (
                                      <ChevronUp className="h-4 w-4" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveStudent(student.id);
                                      }}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </CardHeader>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <CardContent className="space-y-4 pt-0">
                                <Separator />

                                {/* Currency Selection - MUST BE FIRST */}
                                <div className="space-y-4">
                                  {getAvailableCurrencies().length > 0 ? (
                                    <div>
                                      <Label className="text-sm font-medium mb-2 block">Currency <span className="text-destructive">*</span></Label>
                                      <p className="text-xs text-muted-foreground mb-3">
                                        Choose which currency this student will pay in from the available group prices.
                                      </p>
                                      <Select
                                        value={student.paymentDetails.custom_currency || getAvailableCurrencies()[0]?.code || ''}
                                        onValueChange={(value) => {
                                          handleStudentPaymentChange(student.id, 'custom_currency', value);
                                          // Also set override flag if choosing different currency
                                          const availableCurrs = getAvailableCurrencies();
                                          if (availableCurrs.length > 0 && value !== availableCurrs[0]?.code) {
                                            handleStudentPaymentChange(student.id, 'override_pricing', false);
                                          }
                                        }}
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {getAvailableCurrencies().map((currency) => {
                                            const price = getPriceForCurrency(currency.code);
                                            const total = groupData.price_mode === 'perSession'
                                              ? price * (parseFloat(String(groupData.session_count)) || 0)
                                              : price;
                                            return (
                                              <SelectItem key={currency.code} value={currency.code}>
                                                {currency.name} - {currency.symbol}{total.toFixed(2)}
                                                {currency.is_default && ' (Default)'}
                                              </SelectItem>
                                            );
                                          })}
                                        </SelectContent>
                                      </Select>
                                      <div className="mt-2 p-2 bg-muted/50 rounded-lg">
                                        <div className="text-xs text-muted-foreground">Total subscription price:</div>
                                        <div className="text-sm font-semibold">
                                          {(() => {
                                            const selectedCurr = student.paymentDetails.custom_currency || getAvailableCurrencies()[0]?.code;
                                            const currency = currencies?.find(c => c.code === selectedCurr);
                                            const price = getPriceForCurrency(selectedCurr || '');
                                            const total = groupData.price_mode === 'perSession'
                                              ? price * (parseFloat(String(groupData.session_count)) || 0)
                                              : price;
                                            return `${currency?.symbol}${total.toFixed(2)}`;
                                          })()}
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                      <p className="text-sm text-amber-700 dark:text-amber-400">
                                        ⚠️ No prices set for this group yet. Please go to the "Group Details" tab and enter prices in at least one currency.
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {/* Only show payment fields if currency is selected */}
                                {getAvailableCurrencies().length > 0 && (
                                  <>
                                    <Separator className="my-4" />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <Label htmlFor={`start-date-${student.id}`}>Start Date</Label>
                                        <Popover>
                                          <PopoverTrigger asChild>
                                            <Button
                                              variant="outline"
                                              className={cn(
                                                "w-full justify-start text-left font-normal mt-1",
                                                !student.paymentDetails.start_date && "text-muted-foreground"
                                              )}
                                            >
                                              <Calendar className="mr-2 h-4 w-4" />
                                              {student.paymentDetails.start_date
                                                ? format(new Date(student.paymentDetails.start_date), "PPP")
                                                : <span>Pick a date</span>
                                              }
                                            </Button>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-auto p-0" align="start">
                                            <CalendarComponent
                                              mode="single"
                                              selected={student.paymentDetails.start_date ? new Date(student.paymentDetails.start_date) : undefined}
                                              onSelect={(date) => {
                                                if (date) {
                                                  handleStudentPaymentChange(
                                                    student.id,
                                                    'start_date',
                                                    format(date, 'yyyy-MM-dd')
                                                  );
                                                }
                                              }}
                                              initialFocus
                                              className="pointer-events-auto"
                                            />
                                          </PopoverContent>
                                        </Popover>
                                      </div>

                                      <div>
                                        <Label htmlFor={`payment-amount-${student.id}`}>
                                          Initial Payment Amount ({(() => {
                                            const selectedCurr = student.paymentDetails.custom_currency || getAvailableCurrencies()[0]?.code;
                                            const currency = currencies?.find(c => c.code === selectedCurr);
                                            return currency?.symbol || '';
                                          })()})
                                        </Label>
                                        <Input
                                          id={`payment-amount-${student.id}`}
                                          type="number"
                                          step="0.01"
                                          value={student.paymentDetails.initial_payment_amount}
                                          onChange={(e) => handleStudentPaymentChange(student.id, 'initial_payment_amount', e.target.value)}
                                          placeholder="0.00"
                                        />
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <Label htmlFor={`payment-method-${student.id}`}>Payment Method</Label>
                                        <Select
                                          value={student.paymentDetails.payment_method}
                                          onValueChange={(value) => handleStudentPaymentChange(student.id, 'payment_method', value)}
                                        >
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="Cash">Cash</SelectItem>
                                            <SelectItem value="Card">Card</SelectItem>
                                            <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                            <SelectItem value="Check">Check</SelectItem>
                                            <SelectItem value="Online">Online</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      <div>
                                        <Label htmlFor={`account-${student.id}`}>
                                          Account ({(() => {
                                            const selectedCurr = student.paymentDetails.custom_currency || getAvailableCurrencies()[0]?.code;
                                            return selectedCurr || '';
                                          })()})
                                        </Label>
                                        <Select
                                          value={student.paymentDetails.account_id}
                                          onValueChange={(value) => handleStudentPaymentChange(student.id, 'account_id', value)}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select account" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {(() => {
                                              const selectedCurr = student.paymentDetails.custom_currency || getAvailableCurrencies()[0]?.code;
                                              const filteredAccounts = accounts?.filter(account => account.currency_code === selectedCurr) || [];

                                              return filteredAccounts.length > 0 ? (
                                                filteredAccounts.map((account) => (
                                                  <SelectItem key={account.id} value={account.id}>
                                                    {account.name} ({account.currency_symbol})
                                                  </SelectItem>
                                                ))
                                              ) : (
                                                <SelectItem value="no-account" disabled>
                                                  No accounts available for {selectedCurr}
                                                </SelectItem>
                                              );
                                            })()}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>

                                    <div>
                                      <Label htmlFor={`payment-notes-${student.id}`}>Payment Notes</Label>
                                      <Textarea
                                        id={`payment-notes-${student.id}`}
                                        value={student.paymentDetails.payment_notes}
                                        onChange={(e) => handleStudentPaymentChange(student.id, 'payment_notes', e.target.value)}
                                        placeholder="Additional payment notes..."
                                        rows={2}
                                      />
                                    </div>
                                  </>
                                )}

                                {/* Pricing Override Section */}
                                <Separator className="my-4" />

                                <div className="space-y-4">

                                  {/* Advanced: Custom Price Override */}
                                  {getAvailableCurrencies().length > 0 && (
                                    <div className="mt-4">
                                      <div className="flex items-start space-x-3">
                                        <Checkbox
                                          id={`override-pricing-${student.id}`}
                                          checked={student.paymentDetails.override_pricing}
                                          onCheckedChange={(checked) =>
                                            handleStudentPaymentChange(student.id, 'override_pricing', checked as boolean)
                                          }
                                        />
                                        <div className="flex-1">
                                          <Label htmlFor={`override-pricing-${student.id}`} className="font-semibold cursor-pointer">
                                            Override with Custom Price
                                          </Label>
                                          <p className="text-xs text-muted-foreground mt-1">
                                            Enable this to set a completely custom price for this student (e.g., discounts, scholarships)
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Custom Pricing Inputs (shown only if override is enabled) */}
                                  {student.paymentDetails.override_pricing && (
                                    <div className="ml-7 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-4">
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                          <Label htmlFor={`custom-currency-${student.id}`}>Currency</Label>
                                          <Select
                                            value={student.paymentDetails.custom_currency || groupData.currency}
                                            onValueChange={(value) => handleStudentPaymentChange(student.id, 'custom_currency', value)}
                                          >
                                            <SelectTrigger>
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {currencies?.map((currency) => (
                                                <SelectItem key={currency.id} value={currency.code}>
                                                  {currency.name} ({currency.symbol})
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>

                                        <div>
                                          <Label htmlFor={`custom-price-mode-${student.id}`}>Price Mode</Label>
                                          <Select
                                            value={student.paymentDetails.custom_price_mode || groupData.price_mode}
                                            onValueChange={(value: 'perSession' | 'total') =>
                                              handleStudentPaymentChange(student.id, 'custom_price_mode', value)
                                            }
                                          >
                                            <SelectTrigger>
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="perSession">Per Session</SelectItem>
                                              <SelectItem value="total">Total Price</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>

                                        <div>
                                          <Label htmlFor={`custom-price-${student.id}`}>
                                            {(student.paymentDetails.custom_price_mode || groupData.price_mode) === 'perSession'
                                              ? 'Price per Session'
                                              : 'Total Price'
                                            }
                                          </Label>
                                          <Input
                                            id={`custom-price-${student.id}`}
                                            type="number"
                                            step="0.01"
                                            value={
                                              (student.paymentDetails.custom_price_mode || groupData.price_mode) === 'perSession'
                                                ? student.paymentDetails.custom_price_per_session
                                                : student.paymentDetails.custom_total_price
                                            }
                                            onChange={(e) => {
                                              const field =
                                                (student.paymentDetails.custom_price_mode || groupData.price_mode) === 'perSession'
                                                  ? 'custom_price_per_session'
                                                  : 'custom_total_price';
                                              handleStudentPaymentChange(student.id, field, e.target.value);
                                            }}
                                            placeholder="0.00"
                                          />
                                        </div>
                                      </div>

                                      {/* Show calculated total if per session mode */}
                                      {(student.paymentDetails.custom_price_mode || groupData.price_mode) === 'perSession' &&
                                        student.paymentDetails.custom_price_per_session && (
                                          <div className="p-3 bg-muted/50 rounded-lg">
                                            <div className="text-sm text-muted-foreground">Custom Total</div>
                                            <div className="text-lg font-semibold">
                                              {currencies?.find(c => c.code === (student.paymentDetails.custom_currency || groupData.currency))?.symbol || '$'}
                                              {(parseFloat(String(student.paymentDetails.custom_price_per_session)) * (groupData.session_count || 0)).toFixed(2)}
                                            </div>
                                          </div>
                                        )}
                                    </div>
                                  )}
                                </div>

                                {/* Schedule Preview for this student */}
                                {student.paymentDetails.start_date && groupData.schedule.length > 0 && (
                                  <>
                                    <Separator className="my-4" />
                                    <SchedulePreview
                                      schedule={groupData.schedule}
                                      startDate={new Date(student.paymentDetails.start_date)}
                                      sessionCount={parseInt(String(groupData.session_count)) || 0}
                                      durationMonths={Math.ceil((parseInt(String(groupData.session_count)) || 0) / (groupData.schedule.length || 1))}
                                      sessionDuration={String(groupData.session_duration_minutes || 60)}
                                    />
                                  </>
                                )}
                              </CardContent>
                            </CollapsibleContent>
                          </Collapsible>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

          </TabsContent>
        </Tabs>

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <div className="flex gap-2">
            {activeTab === 'details' && (
              <Button 
                type="button"
                onClick={() => setActiveTab('students')}
                disabled={!isFormValid}
                title={!isFormValid ? 'Please fill all required fields and add at least one schedule' : ''}
              >
                Next: Add Students
              </Button>
            )}
            {activeTab === 'students' && (
              <>
                <Button type="button" variant="outline" onClick={() => setActiveTab('details')}>
                  Back to Details
                </Button>
                <Button 
                  type="button"
                  onClick={handleSubmit}
                  disabled={!isFormValid || isSubmitting || selectedStudents.length === 0}
                  title={!isFormValid ? 'Please ensure all required fields are filled and schedule is added' : selectedStudents.length === 0 ? 'Please add at least one student' : ''}
                >
                  {isSubmitting ? 'Creating...' : 'Create Group'}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupDialog;
