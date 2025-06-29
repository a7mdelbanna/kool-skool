import React, { useState } from 'react';
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
import { X, Plus, Calendar, DollarSign, Clock, Users, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase, getSchoolTeachers, getStudentsWithDetails } from '@/integrations/supabase/client';
import { UserContext } from '@/App';
import { useContext } from 'react';
import { useToast } from '@/hooks/use-toast';

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
  session_count: number;
  schedule: ScheduleItem[];
  currency: string;
  price_mode: 'perSession' | 'total';
  price_per_session: number;
  total_price: number;
}

interface StudentPaymentDetails {
  start_date: string;
  initial_payment_amount: number;
  payment_method: string;
  account_id: string;
  payment_notes: string;
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
  const [activeTab, setActiveTab] = useState('details');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Group form data
  const [groupData, setGroupData] = useState<GroupFormData>({
    name: '',
    description: '',
    course_id: '',
    teacher_id: '',
    session_count: 8,
    schedule: [],
    currency: 'USD',
    price_mode: 'total',
    price_per_session: 0,
    total_price: 0
  });

  // Students tab data
  const [selectedStudents, setSelectedStudents] = useState<StudentSelection[]>([]);

  // Schedule form
  const [newScheduleDay, setNewScheduleDay] = useState('');
  const [newScheduleTime, setNewScheduleTime] = useState('');

  // Fetch Group courses
  const { data: groupCourses } = useQuery({
    queryKey: ['group-courses', user?.schoolId],
    queryFn: async () => {
      if (!user?.schoolId) return [];
      
      const { data, error } = await supabase
        .from('courses')
        .select('id, name, lesson_type, created_at')
        .eq('school_id', user.schoolId)
        .eq('lesson_type', 'group')
        .order('name');

      if (error) {
        console.error('Error fetching group courses:', error);
        throw error;
      }

      return data as Course[];
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

  // Fetch school currencies
  const { data: currencies } = useQuery({
    queryKey: ['currencies', user?.schoolId],
    queryFn: async () => {
      if (!user?.schoolId) return [];
      
      const { data, error } = await supabase.rpc('get_school_currencies', {
        p_school_id: user.schoolId
      });

      if (error) {
        console.error('Error fetching currencies:', error);
        throw error;
      }

      return data as Currency[];
    },
    enabled: !!user?.schoolId && open
  });

  // Fetch accounts filtered by group currency
  const { data: accounts } = useQuery({
    queryKey: ['accounts', user?.schoolId, groupData.currency],
    queryFn: async () => {
      if (!user?.schoolId || !groupData.currency) return [];
      
      const { data, error } = await supabase
        .from('accounts')
        .select(`
          id,
          name,
          type,
          currency_id,
          currencies!inner(code)
        `)
        .eq('school_id', user.schoolId)
        .eq('is_archived', false)
        .eq('currencies.code', groupData.currency);

      if (error) {
        console.error('Error fetching accounts:', error);
        throw error;
      }

      return data?.map(account => ({
        id: account.id,
        name: account.name,
        type: account.type,
        currency_id: account.currency_id
      })) || [];
    },
    enabled: !!user?.schoolId && !!groupData.currency && open
  });

  // Calculate total amount based on price mode
  const calculateTotalAmount = () => {
    if (groupData.price_mode === 'perSession') {
      return groupData.price_per_session * groupData.session_count;
    } else {
      return groupData.total_price;
    }
  };

  // Get selected currency symbol
  const getSelectedCurrencySymbol = () => {
    const selectedCurrency = currencies?.find(c => c.code === groupData.currency);
    return selectedCurrency?.symbol || '$';
  };

  const handleAddSchedule = () => {
    if (newScheduleDay && newScheduleTime) {
      setGroupData(prev => ({
        ...prev,
        schedule: [...prev.schedule, { day: newScheduleDay, time: newScheduleTime }]
      }));
      setNewScheduleDay('');
      setNewScheduleTime('');
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
          initial_payment_amount: 0,
          payment_method: 'Cash',
          account_id: '',
          payment_notes: ''
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

    setIsSubmitting(true);
    
    try {
      console.log('Creating group...');
      
      // Prepare the group data with proper price handling
      const groupInsertData = {
        school_id: user.schoolId,
        name: groupData.name,
        description: groupData.description,
        course_id: groupData.course_id,
        teacher_id: groupData.teacher_id,
        session_count: groupData.session_count,
        schedule: groupData.schedule as any,
        currency: groupData.currency,
        price_mode: groupData.price_mode,
        status: 'active',
        // Handle price fields based on price_mode
        ...(groupData.price_mode === 'perSession' 
          ? { 
              price_per_session: groupData.price_per_session,
              total_price: groupData.price_per_session * groupData.session_count
            }
          : { 
              price_per_session: null, // Set to null for total pricing mode
              total_price: groupData.total_price
            }
        )
      };

      console.log('Group insert data:', groupInsertData);
      
      // Create the group first with course_id included
      const { data: groupResult, error: groupError } = await supabase
        .from('groups')
        .insert(groupInsertData)
        .select()
        .single();

      if (groupError) {
        console.error('Group creation error:', groupError);
        throw new Error(`Failed to create group: ${groupError.message}`);
      }

      console.log('Group created successfully:', groupResult);

      // Create group subscriptions for selected students
      if (selectedStudents.length > 0 && groupResult) {
        console.log('Creating subscriptions for students...');
        
        for (const student of selectedStudents) {
          console.log(`Processing student: ${student.name} (${student.id})`);
          
          const { data: subscriptionResult, error: subscriptionError } = await supabase.rpc('create_group_subscription', {
            p_group_id: groupResult.id,
            p_student_ids: [student.id],
            p_start_date: student.paymentDetails.start_date || new Date().toISOString().split('T')[0],
            p_current_user_id: user.id,
            p_current_school_id: user.schoolId,
            p_initial_payment_amount: student.paymentDetails.initial_payment_amount || 0,
            p_payment_method: student.paymentDetails.payment_method || 'Cash',
            p_payment_account_id: student.paymentDetails.account_id || null,
            p_payment_notes: student.paymentDetails.payment_notes || '',
            p_subscription_notes: `Group subscription for ${student.name}`
          });

          if (subscriptionError) {
            console.error(`Subscription creation error for student ${student.name}:`, subscriptionError);
            throw new Error(`Failed to create subscription for ${student.name}: ${subscriptionError.message}`);
          }

          console.log(`Subscription created for ${student.name}:`, subscriptionResult);
        }
      }

      console.log('=== CREATE GROUP SUBMISSION COMPLETED SUCCESSFULLY ===');
      
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
        schedule: [],
        currency: 'USD',
        price_mode: 'total',
        price_per_session: 0,
        total_price: 0
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
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <BookOpen className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-blue-900">{selectedCourse.name}</p>
                          <p className="text-sm text-blue-700 mt-1">Course Type: {selectedCourse.lesson_type}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      onChange={(e) => setGroupData(prev => ({ ...prev, session_count: parseInt(e.target.value) || 0 }))}
                      min="1"
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
                    <Input
                      type="time"
                      value={newScheduleTime}
                      onChange={(e) => setNewScheduleTime(e.target.value)}
                    />
                  </div>

                  <div className="flex items-end">
                    <Button onClick={handleAddSchedule} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </div>

                {groupData.schedule.length > 0 && (
                  <div className="space-y-2">
                    <Label>Current Schedule</Label>
                    <div className="space-y-2">
                      {groupData.schedule.map((item, index) => (
                        <div key={index} className="flex items-center justify-between border rounded-lg p-3">
                          <span>{item.day} at {item.time}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveSchedule(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Currency</Label>
                    <Select value={groupData.currency} onValueChange={(value) => setGroupData(prev => ({ ...prev, currency: value }))}>
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
                    <Label>Price Mode</Label>
                    <Select value={groupData.price_mode} onValueChange={(value: 'perSession' | 'total') => setGroupData(prev => ({ ...prev, price_mode: value }))}>
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
                    <Label>
                      {groupData.price_mode === 'perSession' ? 'Price per Session' : 'Total Price'}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={groupData.price_mode === 'perSession' ? groupData.price_per_session : groupData.total_price}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        if (groupData.price_mode === 'perSession') {
                          setGroupData(prev => ({ ...prev, price_per_session: value }));
                        } else {
                          setGroupData(prev => ({ ...prev, total_price: value }));
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Total Amount Display */}
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-semibold">Total Amount</Label>
                      <p className="text-sm text-gray-600 mt-1">
                        {groupData.price_mode === 'perSession' 
                          ? `${groupData.session_count} sessions × ${getSelectedCurrencySymbol()}${groupData.price_per_session}`
                          : 'Fixed total price'
                        }
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {getSelectedCurrencySymbol()}{calculateTotalAmount().toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
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
                              <CardHeader className="cursor-pointer hover:bg-gray-50">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div>
                                      <CardTitle className="text-lg">{student.name}</CardTitle>
                                      <p className="text-sm text-gray-600">{student.email}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {student.paymentDetails.initial_payment_amount > 0 && (
                                      <Badge variant="outline">
                                        {getSelectedCurrencySymbol()}{student.paymentDetails.initial_payment_amount}
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
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <Label htmlFor={`start-date-${student.id}`}>Start Date</Label>
                                    <Input
                                      id={`start-date-${student.id}`}
                                      type="date"
                                      value={student.paymentDetails.start_date}
                                      onChange={(e) => handleStudentPaymentChange(student.id, 'start_date', e.target.value)}
                                    />
                                  </div>
                                  
                                  <div>
                                    <Label htmlFor={`payment-amount-${student.id}`}>Initial Payment Amount</Label>
                                    <Input
                                      id={`payment-amount-${student.id}`}
                                      type="number"
                                      step="0.01"
                                      value={student.paymentDetails.initial_payment_amount}
                                      onChange={(e) => handleStudentPaymentChange(student.id, 'initial_payment_amount', parseFloat(e.target.value) || 0)}
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
                                    <Label htmlFor={`account-${student.id}`}>Account ({groupData.currency})</Label>
                                    <Select 
                                      value={student.paymentDetails.account_id} 
                                      onValueChange={(value) => handleStudentPaymentChange(student.id, 'account_id', value)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select account" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {accounts?.map((account) => (
                                          <SelectItem key={account.id} value={account.id}>
                                            {account.name} ({account.type})
                                          </SelectItem>
                                        ))}
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

            {groupData.schedule.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Schedule Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {groupData.schedule.map((item, index) => (
                      <Badge key={index} variant="outline" className="mr-2">
                        {item.day} {item.time}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <div className="flex gap-2">
            {activeTab === 'details' && (
              <Button 
                onClick={() => setActiveTab('students')}
                disabled={!isFormValid}
              >
                Next: Add Students
              </Button>
            )}
            {activeTab === 'students' && (
              <>
                <Button variant="outline" onClick={() => setActiveTab('details')}>
                  Back to Details
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={!isFormValid || isSubmitting || selectedStudents.length === 0}
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
