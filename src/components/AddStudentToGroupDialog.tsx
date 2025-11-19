
import React, { useState, useContext } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, DollarSign } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, getStudentsWithDetails } from '@/integrations/supabase/client';
import { databaseService } from '@/services/firebase/database.service';
import { UserContext } from '@/App';
import { useToast } from '@/hooks/use-toast';

interface Group {
  id: string;
  name: string;
  currency: string;
  price_mode: string;
  price_per_session: number;
  total_price: number;
  session_count: number;
  schedule: Array<{ day: string; time: string }>;
  teacher_id: string;
  course_id?: string;
  session_duration_minutes?: number;
}

interface AddStudentToGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: Group | null;
  onSuccess?: () => void;
}

interface Currency {
  id: string;
  name: string;
  symbol: string;
  code: string;
}

interface Account {
  id: string;
  name: string;
  type: string;
  currency_id: string;
}

interface RpcResponse {
  success: boolean;
  message: string;
  subscription_id?: string;
}

const AddStudentToGroupDialog = ({ open, onOpenChange, group, onSuccess }: AddStudentToGroupDialogProps) => {
  const { user } = useContext(UserContext);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form data
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [initialPaymentAmount, setInitialPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [accountId, setAccountId] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [subscriptionNotes, setSubscriptionNotes] = useState('');

  // Fetch available students (not already in this group)
  const { data: availableStudents } = useQuery({
    queryKey: ['available-students', user?.schoolId, group?.id],
    queryFn: async () => {
      if (!user?.schoolId || !group?.id) return [];
      
      // Get all students
      const allStudents = await getStudentsWithDetails(user.schoolId);
      
      // Get students already in this group
      const { data: groupStudents, error } = await supabase
        .from('group_students')
        .select('student_id')
        .eq('group_id', group.id)
        .eq('status', 'active');

      if (error) {
        console.error('Error fetching group students:', error);
        throw error;
      }

      const groupStudentIds = groupStudents?.map(gs => gs.student_id) || [];
      
      // Filter out students already in the group
      return allStudents?.filter(student => !groupStudentIds.includes(student.id)) || [];
    },
    enabled: !!user?.schoolId && !!group?.id && open
  });

  // Fetch school currencies
  const { data: currencies } = useQuery({
    queryKey: ['currencies', user?.schoolId],
    queryFn: async () => {
      if (!user?.schoolId) return [];
      
      try {
        const data = await databaseService.query('currencies', {
          where: [{ field: 'school_id', operator: '==', value: user.schoolId }]
        });
        
        return (data || []) as Currency[];
      } catch (error) {
        console.error('Error fetching currencies:', error);
        return [];
      }
    },
    enabled: !!user?.schoolId && open
  });

  // Fetch accounts filtered by group currency using RPC function
  const { data: accounts } = useQuery({
    queryKey: ['accounts', user?.schoolId, group?.currency],
    queryFn: async () => {
      if (!user?.schoolId || !group?.currency) return [];
      
      try {
        const data = await databaseService.query('accounts', {
          where: [
            { field: 'school_id', operator: '==', value: user.schoolId },
            { field: 'is_active', operator: '==', value: true }
          ]
        });

        // Filter accounts by currency code and archived status
        const filteredAccounts = (data || [])
        .filter((account: any) => 
          !account.is_archived && 
          account.currency_code === group.currency
        )
        .map((account: any) => ({
          id: account.id,
          name: account.name,
          type: account.type,
          currency_id: account.currency_id
        }));

        return filteredAccounts;
      } catch (error) {
        console.error('Error fetching accounts:', error);
        return [];
      }
    },
    enabled: !!user?.schoolId && !!group?.currency && open
  });

  // Get selected currency symbol
  const getSelectedCurrencySymbol = () => {
    const selectedCurrency = currencies?.find(c => c.code === group?.currency);
    return selectedCurrency?.symbol || '$';
  };

  const calculateTotalAmount = () => {
    if (!group) return 0;
    if (group.price_mode === 'perSession') {
      return group.price_per_session * group.session_count;
    } else {
      return group.total_price;
    }
  };

  const handleSubmit = async () => {
    if (!user?.schoolId || !group || !selectedStudentId) {
      toast({
        title: "Validation Error",
        description: "Please select a student and provide a start date.",
        variant: "destructive",
      });
      return;
    }

    if (!startDate) {
      toast({
        title: "Validation Error",
        description: "Please provide a start date for the student.",
        variant: "destructive",
      });
      return;
    }

    const paymentAmount = parseFloat(initialPaymentAmount);
    if (paymentAmount > 0 && !accountId) {
      toast({
        title: "Validation Error",
        description: "Please select an account for the initial payment.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Add student to group in Firebase
      const selectedStudent = availableStudents?.find(s => s.id === selectedStudentId);

      await databaseService.create(`groups/${group.id}/students`, {
        studentId: selectedStudentId,
        studentName: selectedStudent ? `${selectedStudent.first_name} ${selectedStudent.last_name}` : 'Unknown',
        startDate: startDate || new Date().toISOString().split('T')[0],
        status: 'active',
        createdAt: new Date().toISOString()
      });

      // Create subscription for this student in the group
      const subscriptionData = {
        school_id: user.schoolId,
        student_id: selectedStudentId,
        group_id: group.id, // Link subscription to group
        session_count: group.session_count,
        schedule: group.schedule, // Use group schedule
        currency: group.currency,
        price_mode: group.price_mode,
        price_per_session: group.price_mode === 'perSession' ? group.price_per_session : null,
        total_price: group.price_mode === 'perSession' ? (group.price_per_session * group.session_count) : group.total_price,
        status: 'active',
        start_date: startDate || new Date().toISOString().split('T')[0],
        notes: subscriptionNotes || `Subscription for group: ${group.name}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const subscriptionId = await databaseService.create('subscriptions', subscriptionData);
      console.log('Created subscription for student in group:', subscriptionId);

      // Generate sessions based on schedule with chronological distribution
      if (group.schedule.length > 0 && group.session_count > 0) {
        console.log('Generating sessions for subscription:', subscriptionId);

        const sessionStartDate = new Date(startDate || new Date());
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        // Build all possible session dates across all schedule days
        const allSessionDates: Array<{ date: Date; time: string; day: string }> = [];
        const maxWeeks = Math.ceil(group.session_count / group.schedule.length) + 4;

        // Generate sessions week by week across all schedule days
        for (let week = 0; week < maxWeeks && allSessionDates.length < group.session_count; week++) {
          for (const scheduleItem of group.schedule) {
            if (allSessionDates.length >= group.session_count) break;

            const dayIndex = daysOfWeek.indexOf(scheduleItem.day);
            if (dayIndex === -1) continue;

            // Calculate the date for this schedule day in this week
            const sessionDate = new Date(sessionStartDate);

            // Find first occurrence of this day
            let daysToAdd = (dayIndex - sessionStartDate.getDay() + 7) % 7;
            if (daysToAdd === 0 && week === 0) {
              // If it's the same day as start date, use it
              daysToAdd = 0;
            }

            // Add the week offset
            daysToAdd += (week * 7);
            sessionDate.setDate(sessionDate.getDate() + daysToAdd);

            // Only add if on or after start date
            if (sessionDate >= sessionStartDate) {
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
          .slice(0, group.session_count);

        // Create sessions in database
        for (let i = 0; i < sortedSessions.length; i++) {
          const session = sortedSessions[i];
          const sessionData = {
            subscription_id: subscriptionId,
            student_id: selectedStudentId,
            school_id: user.schoolId,
            teacher_id: group.teacher_id,
            course_id: group.course_id || null,
            group_id: group.id,
            scheduled_date: session.date.toISOString().split('T')[0],
            scheduled_time: session.time,
            duration_minutes: group.session_duration_minutes || 60,
            status: 'scheduled',
            index_in_sub: i + 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          await databaseService.create('sessions', sessionData);
        }

        console.log(`Created ${sortedSessions.length} sessions for student (requested ${group.session_count})`);
      }

      // Create initial payment if amount provided (link to subscription)
      if (paymentAmount > 0) {
        await databaseService.create('transactions', {
          school_id: user.schoolId,
          student_id: selectedStudentId,
          subscription_id: subscriptionId, // Link payment to subscription
          group_id: group.id,
          type: 'income',
          amount: paymentAmount,
          currency: group.currency,
          transaction_date: new Date().toISOString().split('T')[0],
          payment_method: paymentMethod,
          from_account_id: accountId || null,
          description: `Initial payment for group ${group.name}`,
          notes: paymentNotes || '',
          status: 'completed',
          created_at: new Date().toISOString()
        });
      }

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['group-student-payments', group.id] });
      queryClient.invalidateQueries({ queryKey: ['school-transactions', user.schoolId] });
      queryClient.invalidateQueries({ queryKey: ['group-subscriptions', group.id] });
      queryClient.invalidateQueries({ queryKey: ['group-students', group.id] });

      toast({
        title: "Success!",
        description: "Student added to group successfully.",
      });

      // Reset form
      setSelectedStudentId('');
      setStartDate('');
      setInitialPaymentAmount('');
      setPaymentMethod('Cash');
      setAccountId('');
      setPaymentNotes('');
      setSubscriptionNotes('');
      
      onSuccess?.();
      onOpenChange(false);
      
    } catch (error) {
      console.error('Error adding student to group:', error);
      
      toast({
        title: "Error Adding Student",
        description: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedStudent = availableStudents?.find(student => student.id === selectedStudentId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-8 w-8 bg-green-500 rounded-lg flex items-center justify-center">
              <Plus className="h-4 w-4 text-white" />
            </div>
            Add Student to {group?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Student Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Student</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="student">Available Students</Label>
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a student to add" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStudents?.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.first_name} {student.last_name} ({student.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableStudents?.length === 0 && (
                  <p className="text-sm text-gray-600 mt-2">
                    All students are already in this group or no students available.
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Total Amount Display */}
              <div className="p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">Total Group Price</Label>
                    <p className="text-sm text-gray-600 mt-1">
                      {group?.price_mode === 'perSession' 
                        ? `${group.session_count} sessions × ${getSelectedCurrencySymbol()}${group.price_per_session}`
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="payment-amount">Initial Payment Amount</Label>
                  <Input
                    id="payment-amount"
                    type="number"
                    step="0.01"
                    value={initialPaymentAmount}
                    onChange={(e) => setInitialPaymentAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="payment-method">Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
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
              </div>

              {parseFloat(initialPaymentAmount) > 0 && (
                <div>
                  <Label htmlFor="account">Account ({group?.currency})</Label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account for payment" />
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
              )}

              <div>
                <Label htmlFor="payment-notes">Payment Notes</Label>
                <Textarea
                  id="payment-notes"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Additional payment notes..."
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="subscription-notes">Subscription Notes</Label>
                <Textarea
                  id="subscription-notes"
                  value={subscriptionNotes}
                  onChange={(e) => setSubscriptionNotes(e.target.value)}
                  placeholder="Additional subscription notes..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Selected Student Summary */}
          {selectedStudent && (
            <Card className="border-l-4 border-l-green-500">
              <CardHeader>
                <CardTitle className="text-lg">Student Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p><strong>Name:</strong> {selectedStudent.first_name} {selectedStudent.last_name}</p>
                  <p><strong>Email:</strong> {selectedStudent.email}</p>
                  {selectedStudent.phone && <p><strong>Phone:</strong> {selectedStudent.phone}</p>}
                  <p><strong>Start Date:</strong> {startDate || 'Not set'}</p>
                  {parseFloat(initialPaymentAmount) > 0 && (
                    <p><strong>Initial Payment:</strong> {getSelectedCurrencySymbol()}{parseFloat(initialPaymentAmount).toFixed(2)}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!selectedStudentId || !startDate || isSubmitting}
          >
            {isSubmitting ? 'Adding Student...' : 'Add Student to Group'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddStudentToGroupDialog;
