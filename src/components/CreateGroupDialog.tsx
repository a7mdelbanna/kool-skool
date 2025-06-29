
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
import { X, Plus, Calendar, DollarSign, Clock, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase, getSchoolTeachers, getStudentsWithDetails } from '@/integrations/supabase/client';
import { UserContext } from '@/App';
import { useContext } from 'react';

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ScheduleItem {
  day: string;
  time: string;
}

interface GroupFormData {
  name: string;
  description: string;
  teacher_id: string;
  session_count: number;
  schedule: ScheduleItem[];
  currency: string;
  price_mode: 'perSession' | 'total';
  price_per_session: number;
  total_price: number;
}

interface StudentSelection {
  id: string;
  name: string;
  email: string;
}

const CreateGroupDialog = ({ open, onOpenChange, onSuccess }: CreateGroupDialogProps) => {
  const { user } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState('details');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Group form data
  const [groupData, setGroupData] = useState<GroupFormData>({
    name: '',
    description: '',
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
  const [startDate, setStartDate] = useState('');
  const [initialPayment, setInitialPayment] = useState({
    amount: 0,
    method: 'Cash',
    notes: ''
  });

  // Schedule form
  const [newScheduleDay, setNewScheduleDay] = useState('');
  const [newScheduleTime, setNewScheduleTime] = useState('');

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
        email: student.email
      }]);
    }
  };

  const handleRemoveStudent = (studentId: string) => {
    setSelectedStudents(prev => prev.filter(s => s.id !== studentId));
  };

  const handleSubmit = async () => {
    if (!user?.schoolId) return;

    setIsSubmitting(true);
    try {
      // Create the group first
      const { data: groupResult, error: groupError } = await supabase
        .from('groups')
        .insert({
          school_id: user.schoolId,
          name: groupData.name,
          description: groupData.description,
          teacher_id: groupData.teacher_id,
          session_count: groupData.session_count,
          schedule: groupData.schedule,
          currency: groupData.currency,
          price_mode: groupData.price_mode,
          price_per_session: groupData.price_per_session,
          total_price: groupData.total_price,
          status: 'active'
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Create group subscriptions for selected students
      if (selectedStudents.length > 0 && groupResult) {
        const { error: subscriptionError } = await supabase.rpc('create_group_subscription', {
          p_group_id: groupResult.id,
          p_student_ids: selectedStudents.map(s => s.id),
          p_start_date: startDate,
          p_current_user_id: user.id,
          p_current_school_id: user.schoolId,
          p_initial_payment_amount: initialPayment.amount,
          p_payment_method: initialPayment.method,
          p_payment_notes: initialPayment.notes
        });

        if (subscriptionError) throw subscriptionError;
      }

      onSuccess?.();
      onOpenChange(false);
      
      // Reset form
      setGroupData({
        name: '',
        description: '',
        teacher_id: '',
        session_count: 8,
        schedule: [],
        currency: 'USD',
        price_mode: 'total',
        price_per_session: 0,
        total_price: 0
      });
      setSelectedStudents([]);
      setStartDate('');
      setInitialPayment({ amount: 0, method: 'Cash', notes: '' });
      setActiveTab('details');
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = groupData.name && groupData.teacher_id && groupData.schedule.length > 0;

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
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
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
                  <div className="space-y-2">
                    <Label>Selected Students ({selectedStudents.length})</Label>
                    <div className="space-y-2">
                      {selectedStudents.map((student) => (
                        <div key={student.id} className="flex items-center justify-between border rounded-lg p-3">
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-sm text-gray-600">{student.email}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveStudent(student.id)}
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
                <CardTitle>Group Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <Separator />

                <div>
                  <Label className="text-base font-semibold">Initial Payment (Optional)</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                    <div>
                      <Label htmlFor="payment-amount">Amount</Label>
                      <Input
                        id="payment-amount"
                        type="number"
                        step="0.01"
                        value={initialPayment.amount}
                        onChange={(e) => setInitialPayment(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>

                    <div>
                      <Label htmlFor="payment-method">Payment Method</Label>
                      <Select value={initialPayment.method} onValueChange={(value) => setInitialPayment(prev => ({ ...prev, method: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="Card">Card</SelectItem>
                          <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="payment-notes">Notes</Label>
                      <Input
                        id="payment-notes"
                        value={initialPayment.notes}
                        onChange={(e) => setInitialPayment(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Payment notes"
                      />
                    </div>
                  </div>
                </div>
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
                  disabled={!isFormValid || isSubmitting}
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
