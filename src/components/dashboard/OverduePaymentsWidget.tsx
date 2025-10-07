/**
 * OverduePaymentsWidget - Dashboard component showing students with overdue payments
 *
 * Fetches students with paymentStatus === 'overdue' and displays them in a card format
 */
import React, { useContext, useEffect, useState } from 'react';
import {
  DollarSign,
  AlertCircle,
  User,
  Calendar,
  ChevronRight,
  Send,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { UserContext } from '@/App';
import { databaseService } from '@/services/firebase/database.service';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface OverdueStudent {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  courseName?: string;
  paymentStatus: string;
  nextPaymentDate?: string;
  amountDue?: number;
}

const OverduePaymentsWidget: React.FC = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [overdueStudents, setOverdueStudents] = useState<OverdueStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.schoolId) {
      fetchOverdueStudents();
    }
  }, [user?.schoolId]);

  const fetchOverdueStudents = async () => {
    if (!user?.schoolId) return;

    setLoading(true);
    try {
      // Fetch all students for the school
      const students = await databaseService.query('students', {
        where: [
          { field: 'schoolId', operator: '==', value: user.schoolId }
        ]
      });

      if (!students) {
        setOverdueStudents([]);
        setLoading(false);
        return;
      }

      // Filter for overdue payment status and exclude students with no names (likely deleted)
      const overdueList = students
        .filter((student: any) => {
          const status = student.paymentStatus || student.payment_status;
          const firstName = student.firstName || student.first_name || '';
          const lastName = student.lastName || student.last_name || '';

          // Only include if overdue AND has at least a first or last name
          return status === 'overdue' && (firstName.trim() !== '' || lastName.trim() !== '');
        })
        .map((student: any) => ({
          id: student.id,
          firstName: student.firstName || student.first_name || '',
          lastName: student.lastName || student.last_name || '',
          email: student.email,
          courseName: student.courseName || student.course_name,
          paymentStatus: 'overdue',
          nextPaymentDate: student.nextPaymentDate || student.next_payment_date,
          amountDue: student.amountDue || student.amount_due,
        }))
        .slice(0, 10); // Limit to 10 students

      setOverdueStudents(overdueList);
      console.log(`📊 Overdue students count: ${overdueList.length}`);
    } catch (error) {
      console.error('Error fetching overdue students:', error);
      setOverdueStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = async (student: OverdueStudent, e: React.MouseEvent) => {
    e.stopPropagation();
    toast.info(`Sending payment reminder to ${student.firstName} ${student.lastName}...`);
    // TODO: Implement actual reminder sending logic
  };

  const handleViewStudent = (studentId: string) => {
    navigate(`/students/${studentId}`);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  if (loading) {
    return (
      <Card className="glass-card backdrop-blur-xl border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Overdue Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card backdrop-blur-xl border-white/10 h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-red-500/10">
              <AlertCircle className="h-4 w-4 text-red-500" />
            </div>
            <span className="text-base">Overdue Payments</span>
          </CardTitle>
          <Badge variant="destructive" className="bg-red-500/10 text-red-500">
            {overdueStudents.length} students
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {overdueStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <DollarSign className="h-12 w-12 text-green-500/50 mb-3" />
            <p className="text-sm text-muted-foreground">All payments up to date!</p>
            <p className="text-xs text-muted-foreground mt-1">No overdue payments</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-3">
            <div className="space-y-3">
              {overdueStudents.map((student) => (
                <div
                  key={student.id}
                  className={cn(
                    "group p-3 rounded-lg border transition-all duration-200",
                    "bg-white/[0.02] border-white/5",
                    "hover:bg-white/[0.05] hover:border-red-500/20",
                    "cursor-pointer"
                  )}
                  onClick={() => handleViewStudent(student.id)}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="bg-red-500/10 text-red-500">
                        {getInitials(student.firstName, student.lastName)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Student Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground line-clamp-1">
                            {student.firstName} {student.lastName}
                          </p>
                          {student.courseName && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {student.courseName}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[10px] shrink-0 bg-red-500/10 text-red-500 border-red-500/20"
                        >
                          Overdue
                        </Badge>
                      </div>

                      {/* Payment Info */}
                      <div className="flex items-center gap-4 mt-2">
                        {student.nextPaymentDate && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>Due: {format(new Date(student.nextPaymentDate), 'MMM d')}</span>
                          </div>
                        )}
                        {student.amountDue && (
                          <span className="text-xs font-semibold text-red-500">
                            ${student.amountDue}
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs gap-1 group-hover:bg-white/10"
                          onClick={(e) => handleSendReminder(student, e)}
                        >
                          <Send className="h-3 w-3" />
                          Send Reminder
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs ml-auto group-hover:bg-white/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewStudent(student.id);
                          }}
                        >
                          View Details
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* View All Button */}
        {overdueStudents.length > 0 && (
          <div className="mt-4 pt-3 border-t border-white/5">
            <Button
              variant="ghost"
              className="w-full justify-center text-sm"
              onClick={() => navigate('/students?filter=overdue')}
            >
              View All Overdue Payments
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OverduePaymentsWidget;
