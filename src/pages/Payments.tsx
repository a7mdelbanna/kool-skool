import React, { useState } from 'react';
import { 
  DollarSign, 
  Search, 
  Filter, 
  Download,
  ArrowUpDown,
  CheckCircle,
  AlertCircle,
  Clock,
  Calendar,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Payment } from '@/contexts/PaymentContext';

// Sample data for demonstration
const payments: Payment[] = [
  {
    id: '1',
    amount: 120,
    date: new Date(2024, 5, 10), // June 10, 2024
    status: 'completed',
    method: 'Credit Card',
    notes: 'Payment for 4 lessons (1 month) for Alex Johnson'
  },
  {
    id: '2',
    amount: 90,
    date: new Date(2024, 5, 8), // June 8, 2024
    status: 'completed',
    method: 'Bank Transfer',
    notes: 'Payment for 3 lessons (1 month) for Sophia Chen'
  },
  {
    id: '3',
    amount: 150,
    date: new Date(2024, 5, 15), // June 15, 2024
    status: 'pending',
    method: 'PayPal',
    notes: 'Payment for 5 lessons (1 month) for Michael Davis'
  },
  {
    id: '4',
    amount: 60,
    date: new Date(2024, 5, 5), // June 5, 2024
    status: 'completed',
    method: 'Cash',
    notes: 'Payment for 2 lessons (1 month) for Emma Wilson'
  },
  {
    id: '5',
    amount: 180,
    date: new Date(2024, 5, 20), // June 20, 2024
    status: 'failed',
    method: 'Credit Card',
    notes: 'Payment for 6 lessons (1 month) for Noah Martinez'
  },
  {
    id: '6',
    amount: 90,
    date: new Date(2024, 5, 12), // June 12, 2024
    status: 'completed',
    method: 'Bank Transfer',
    notes: 'Payment for 3 lessons (1 month) for Olivia Brown'
  },
  {
    id: '7',
    amount: 120,
    date: new Date(2024, 5, 18), // June 18, 2024
    status: 'pending',
    method: 'PayPal',
    notes: 'Payment for 4 lessons (1 month) for William Taylor'
  },
  {
    id: '8',
    amount: 150,
    date: new Date(2024, 4, 30), // May 30, 2024
    status: 'failed',
    method: 'Credit Card',
    notes: 'Payment for 5 lessons (1 month) for Ava Anderson'
  },
];

const Payments = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  const calculateTotal = (status: string) => {
    return payments
      .filter(payment => payment.status === status)
      .reduce((sum, payment) => sum + payment.amount, 0);
  };
  
  const totalPaid = calculateTotal('completed');
  const totalPending = calculateTotal('pending');
  const totalOverdue = calculateTotal('failed');
  const totalAll = payments.reduce((sum, payment) => sum + payment.amount, 0);
  
  const handleSort = (column: string) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 gap-1">
            <CheckCircle className="h-3 w-3" />
            <span>Paid</span>
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200 gap-1">
            <Clock className="h-3 w-3" />
            <span>Pending</span>
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 gap-1">
            <AlertCircle className="h-3 w-3" />
            <span>Overdue</span>
          </Badge>
        );
      default:
        return null;
    }
  };
  
  const filteredPayments = payments
    .filter(payment => 
      payment.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.method.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortColumn === 'date') {
        return sortDirection === 'asc' 
          ? a.date.getTime() - b.date.getTime()
          : b.date.getTime() - a.date.getTime();
      } else if (sortColumn === 'amount') {
        return sortDirection === 'asc' 
          ? a.amount - b.amount
          : b.amount - a.amount;
      } else if (sortColumn === 'notes') {
        return sortDirection === 'asc'
          ? a.notes.localeCompare(b.notes)
          : b.notes.localeCompare(a.notes);
      }
      return 0;
    });
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Payments</h1>
          <p className="text-muted-foreground mt-1">Track and manage your payment history</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
          <Button className="gap-2">
            <DollarSign className="h-4 w-4" />
            <span>Record Payment</span>
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 element-transition">
        <Card className="glass glass-hover">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalAll.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">From all payments</p>
          </CardContent>
        </Card>
        
        <Card className="glass glass-hover">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${totalPaid.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Successfully received</p>
          </CardContent>
        </Card>
        
        <Card className="glass glass-hover">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">${totalPending.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting payment</p>
          </CardContent>
        </Card>
        
        <Card className="glass glass-hover">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${totalOverdue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Past payment deadline</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search payments..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          <span>Filter</span>
        </Button>
      </div>
      
      <div className="rounded-lg border glass glass-hover overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">
                <Button 
                  variant="ghost" 
                  onClick={() => handleSort('notes')}
                  className="gap-1 font-medium"
                >
                  Student
                  <ArrowUpDown className="h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  onClick={() => handleSort('amount')}
                  className="gap-1 font-medium"
                >
                  Amount
                  <ArrowUpDown className="h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  onClick={() => handleSort('date')}
                  className="gap-1 font-medium"
                >
                  Date
                  <ArrowUpDown className="h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayments.map((payment) => (
              <TableRow key={payment.id} className="cursor-pointer hover:bg-accent/30">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" alt={payment.notes} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {payment.notes.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{payment.notes}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(payment.status)}</TableCell>
                <TableCell className="font-medium">
                  ${payment.amount.toFixed(2)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{format(payment.date, 'MMM d, yyyy')}</span>
                  </div>
                </TableCell>
                <TableCell>{payment.method}</TableCell>
                <TableCell>{payment.notes}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Payments;
