import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Users } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  course_name: string;
  level: string;
}

interface ScheduleItem {
  day: string;
  time: string;
}

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

export function CreateGroupModal({ isOpen, onClose, onSuccess }: CreateGroupModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    teacher_id: '',
    session_count: 8,
    schedule: [] as ScheduleItem[],
    price_mode: 'fixed' as 'fixed' | 'perSession',
    price_per_session: 0,
    total_price: 0,
    currency: 'USD'
  });
  
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [newScheduleDay, setNewScheduleDay] = useState('');
  const [newScheduleTime, setNewScheduleTime] = useState('');

  // Fetch teachers
  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers', user?.school_id],
    queryFn: async () => {
      if (!user?.school_id) return [];
      
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('school_id', user.school_id)
        .eq('role', 'teacher');
      
      if (error) throw error;
      return data as Teacher[];
    },
    enabled: !!user?.school_id
  });

  // Fetch students
  const { data: students = [] } = useQuery({
    queryKey: ['students', user?.school_id],
    queryFn: async () => {
      if (!user?.school_id) return [];
      
      const { data, error } = await supabase.rpc('get_students_with_details', {
        p_school_id: user.school_id
      });
      
      if (error) throw error;
      return data as Student[];
    },
    enabled: !!user?.school_id
  });

  const createGroupMutation = useMutation({
    mutationFn: async () => {
      if (!user?.school_id) throw new Error('No school ID');
      
      // First create the group - cast schedule to Json type
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .insert({
          school_id: user.school_id,
          name: formData.name,
          description: formData.description,
          teacher_id: formData.teacher_id || null,
          session_count: formData.session_count,
          schedule: formData.schedule as any, // Cast to satisfy Json type
          currency: formData.currency,
          price_mode: formData.price_mode,
          price_per_session: formData.price_mode === 'perSession' ? formData.price_per_session : null,
          total_price: formData.total_price,
          status: 'active'
        })
        .select()
        .single();
      
      if (groupError) throw groupError;
      
      // Then create subscriptions for selected students
      if (selectedStudents.length > 0) {
        const { data: subscriptionData, error: subscriptionError } = await supabase.rpc(
          'create_group_subscription',
          {
            p_group_id: groupData.id,
            p_student_ids: selectedStudents,
            p_start_date: new Date().toISOString().split('T')[0], // Today's date
            p_current_user_id: user.id,
            p_current_school_id: user.school_id,
            p_initial_payment_amount: 0,
            p_payment_method: 'Cash',
            p_payment_account_id: null,
            p_payment_notes: '',
            p_subscription_notes: `Group subscription for ${formData.name}`
          }
        );
        
        if (subscriptionError) throw subscriptionError;
        return subscriptionData;
      }
      
      return groupData;
    },
    onSuccess: () => {
      toast.success('Group created successfully!');
      onSuccess();
      resetForm();
    },
    onError: (error) => {
      console.error('Error creating group:', error);
      toast.error('Failed to create group. Please try again.');
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      teacher_id: '',
      session_count: 8,
      schedule: [],
      price_mode: 'fixed',
      price_per_session: 0,
      total_price: 0,
      currency: 'USD'
    });
    setSelectedStudents([]);
    setStep(1);
  };

  const addScheduleItem = () => {
    if (newScheduleDay && newScheduleTime) {
      setFormData(prev => ({
        ...prev,
        schedule: [...prev.schedule, { day: newScheduleDay, time: newScheduleTime }]
      }));
      setNewScheduleDay('');
      setNewScheduleTime('');
    }
  };

  const removeScheduleItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      schedule: prev.schedule.filter((_, i) => i !== index)
    }));
  };

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const canProceedToStep2 = () => {
    return formData.name.trim() && 
           formData.session_count > 0 && 
           formData.schedule.length > 0 && 
           formData.total_price > 0;
  };

  const canCreateGroup = () => {
    return canProceedToStep2() && selectedStudents.length > 0;
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step indicator */}
          <div className="flex items-center space-x-4 mb-6">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
              1
            </div>
            <div className={`h-px flex-1 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
              2
            </div>
            <div className="ml-4 text-sm text-gray-600">
              {step === 1 ? 'Group Details' : 'Select Students'}
            </div>
          </div>

          {step === 1 && (
            <div className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name">Group Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Beginner English Group A"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Optional description of the group"
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="teacher">Teacher</Label>
                    <Select 
                      value={formData.teacher_id} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, teacher_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a teacher (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.first_name} {teacher.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Session Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle>Session Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="session_count">Number of Sessions *</Label>
                    <Input
                      id="session_count"
                      type="number"
                      min="1"
                      value={formData.session_count}
                      onChange={(e) => setFormData(prev => ({ ...prev, session_count: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  
                  <div>
                    <Label>Schedule *</Label>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Select value={newScheduleDay} onValueChange={setNewScheduleDay}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select day" />
                          </SelectTrigger>
                          <SelectContent>
                            {DAYS_OF_WEEK.map((day) => (
                              <SelectItem key={day} value={day}>
                                {day}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="time"
                          value={newScheduleTime}
                          onChange={(e) => setNewScheduleTime(e.target.value)}
                          className="flex-1"
                        />
                        <Button 
                          type="button" 
                          onClick={addScheduleItem}
                          disabled={!newScheduleDay || !newScheduleTime}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {formData.schedule.map((item, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                          <span>{item.day} at {item.time}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeScheduleItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pricing */}
              <Card>
                <CardHeader>
                  <CardTitle>Pricing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Pricing Mode</Label>
                    <Select 
                      value={formData.price_mode} 
                      onValueChange={(value: 'fixed' | 'perSession') => setFormData(prev => ({ ...prev, price_mode: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed Total Price</SelectItem>
                        <SelectItem value="perSession">Price Per Session</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {formData.price_mode === 'perSession' && (
                    <div>
                      <Label htmlFor="price_per_session">Price Per Session *</Label>
                      <Input
                        id="price_per_session"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.price_per_session}
                        onChange={(e) => {
                          const pricePerSession = parseFloat(e.target.value) || 0;
                          setFormData(prev => ({ 
                            ...prev, 
                            price_per_session: pricePerSession,
                            total_price: pricePerSession * prev.session_count
                          }));
                        }}
                      />
                    </div>
                  )}
                  
                  <div>
                    <Label htmlFor="total_price">Total Price *</Label>
                    <Input
                      id="total_price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.total_price}
                      onChange={(e) => setFormData(prev => ({ ...prev, total_price: parseFloat(e.target.value) || 0 }))}
                      disabled={formData.price_mode === 'perSession'}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Select 
                      value={formData.currency} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                    >
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
                </CardContent>
              </Card>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Select Students
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <Badge variant="outline">
                      {selectedStudents.length} students selected
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {students.map((student) => (
                      <div key={student.id} className="flex items-center space-x-3 p-3 border rounded hover:bg-gray-50">
                        <Checkbox
                          checked={selectedStudents.includes(student.id)}
                          onCheckedChange={() => handleStudentToggle(student.id)}
                        />
                        <div className="flex-1">
                          <div className="font-medium">
                            {student.first_name} {student.last_name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {student.email} • {student.course_name} • Level: {student.level}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between pt-6 border-t">
            <div>
              {step === 2 && (
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              
              {step === 1 ? (
                <Button 
                  onClick={() => setStep(2)}
                  disabled={!canProceedToStep2()}
                >
                  Next: Select Students
                </Button>
              ) : (
                <Button 
                  onClick={() => createGroupMutation.mutate()}
                  disabled={!canCreateGroup() || createGroupMutation.isPending}
                >
                  {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
