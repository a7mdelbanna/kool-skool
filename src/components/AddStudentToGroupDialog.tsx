
import React, { useState, useContext } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, DollarSign } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase, getStudentsWithDetails } from '@/integrations/supabase/client';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form data
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [initialPaymentAmount, setInitialPaymentAmount] = useState(0);
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

  // Fetch accounts filtered by group currency using RPC function
  const { data: accounts } = useQuery({
    queryKey: ['accounts', user?.schoolId, group?.currency],
    queryFn: async () => {
      if (!user?.schoolId || !group?.currency) return [];
      
      const { data, error } = await supabase.rpc('get_school_accounts', {
        p_school_id: user.schoolId
      });

      if (error) {
        console.error('Error fetching accounts:', error);
        throw error;
      }

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

    if (initialPaymentAmount > 0 && !accountId) {
      toast({
        title: "Validation Error",
        description: "Please select an account for the initial payment.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase.rpc('add_student_to_group', {
        p_group_id: group.id,
        p_student_id: selectedStudentId,
        p_start_date: startDate,
        p_current_user_id: user.id,
        p_current_school_id: user.schoolId,
        p_initial_payment_amount: initialPaymentAmount,
        p_payment_method: paymentMethod,
        p_payment_account_id: accountId || null,
        p_payment_notes: paymentNotes,
        p_subscription_notes: subscriptionNotes
      });

      if (error) {
        console.error('Error adding student to group:', error);
        throw new Error(`Failed to add student to group: ${error.message}`);
      }

      // Type cast the response with proper unknown first
      const result = data as unknown as RpcResponse;

      if (!result?.success) {
        throw new Error(result?.message || 'Failed to add student to group');
      }

      toast({
        title: "Success!",
        description: "Student added to group successfully.",
      });

      // Reset form
      setSelectedStudentId('');
      setStartDate('');
      setInitialPaymentAmount(0);
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
                    onChange={(e) => setInitialPaymentAmount(parseFloat(e.target.value) || 0)}
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

              {initialPaymentAmount > 0 && (
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
                  {initialPaymentAmount > 0 && (
                    <p><strong>Initial Payment:</strong> {getSelectedCurrencySymbol()}{initialPaymentAmount.toFixed(2)}</p>
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
