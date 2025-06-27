
import React, { useState } from 'react';
import { Plus, Search, Filter, Download, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import PaymentDialog from '@/components/PaymentDialog';
import { usePayments } from '@/contexts/PaymentContext';
import { format } from 'date-fns';

const PaymentsPage = () => {
  const { sessions, loading } = usePayments();
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(undefined);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [searchTerm, setSearchTerm] = useState('');

  // Calculate payment statistics from sessions
  const paidSessions = sessions.filter(session => session.paymentStatus === 'paid');
  const pendingSessions = sessions.filter(session => session.paymentStatus === 'pending');
  
  const totalRevenue = paidSessions.reduce((sum, session) => sum + session.cost, 0);
  const netIncome = totalRevenue; // Assuming no expenses for now
  const totalExpenses = 0; // No expenses data available
  const pendingAmount = pendingSessions.reduce((sum, session) => sum + session.cost, 0);

  // Filter sessions based on search term
  const filteredSessions = sessions.filter(session =>
    session.studentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddPayment = () => {
    setSelectedPayment(undefined);
    setDialogMode('add');
    setPaymentDialogOpen(true);
  };

  const handleEditPayment = (session: any) => {
    setSelectedPayment({
      id: session.id,
      amount: session.cost,
      date: session.date,
      method: 'Cash',
      notes: session.notes || '',
      status: session.paymentStatus === 'paid' ? 'completed' : 'pending',
      studentName: session.studentName
    });
    setDialogMode('edit');
    setPaymentDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Payments</h1>
            <p className="text-muted-foreground">Track and manage your payment history</p>
          </div>
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-muted-foreground">Track and manage your payment history</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleAddPayment}>
            <Plus className="h-4 w-4 mr-2" />
            Record New
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Net Income</CardTitle>
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${netIncome.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Revenue minus expenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">From all payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Total Expenses</CardTitle>
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${totalExpenses.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">All business expenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-600">Pending/Overdue</CardTitle>
            <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">${pendingAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Payments not yet received</p>
          </CardContent>
        </Card>
      </div>

      {/* Tags Section */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Tags</CardTitle>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Create Tag
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Badge variant="secondary" className="bg-pink-100 text-pink-800 border-pink-200">
              <div className="w-2 h-2 bg-pink-500 rounded-full mr-2"></div>
              tag1 ×
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <Button variant="outline" size="sm" className="text-blue-600 border-blue-200">
                Payments (6)
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                Expenses (0)
              </Button>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search payments..."
                  className="pl-10 w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                        {session.studentName.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </div>
                      <span>{session.studentName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={session.paymentStatus === 'paid' ? 'default' : 'secondary'}
                      className={session.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : ''}
                    >
                      {session.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                    </Badge>
                  </TableCell>
                  <TableCell>₽{session.cost.toFixed(2)}</TableCell>
                  <TableCell>{format(session.date, 'MMM dd, yyyy')}</TableCell>
                  <TableCell>Cash</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="text-muted-foreground">
                      + Add Tag
                    </Button>
                  </TableCell>
                  <TableCell className="text-muted-foreground">-</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleEditPayment(session)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        payment={selectedPayment}
        mode={dialogMode}
      />
    </div>
  );
};

export default PaymentsPage;
