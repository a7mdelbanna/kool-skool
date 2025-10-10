import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  CreditCard,
  Phone,
  Mail,
  User as UserIcon,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Copy,
  ExternalLink
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import type { OverduePayment } from '@/hooks/useOverduePayments';

interface PaymentCardProps {
  payment: OverduePayment;
}

const PaymentCard = React.forwardRef<HTMLDivElement, PaymentCardProps>(({ payment }, ref) => {
  const navigate = useNavigate();

  const handleCopyPhone = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('📞 Copy phone clicked:', payment.studentPhone);

    if (payment.studentPhone) {
      navigator.clipboard.writeText(payment.studentPhone)
        .then(() => {
          console.log('✅ Phone copied to clipboard');
          toast.success('Phone number copied!');
        })
        .catch((err) => {
          console.error('❌ Failed to copy phone:', err);
          toast.error('Failed to copy phone number');
        });
    } else {
      console.warn('⚠️ No phone number available');
      toast.error('No phone number available');
    }
  };

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('📧 Copy email clicked:', payment.studentEmail);

    if (payment.studentEmail) {
      navigator.clipboard.writeText(payment.studentEmail)
        .then(() => {
          console.log('✅ Email copied to clipboard');
          toast.success('Email copied!');
        })
        .catch((err) => {
          console.error('❌ Failed to copy email:', err);
          toast.error('Failed to copy email');
        });
    } else {
      console.warn('⚠️ No email available');
      toast.error('No email available');
    }
  };

  const handleViewStudent = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    console.log('👁️ View student clicked:', payment.studentId);
    navigate(`/student/${payment.studentId}`);
  };

  const getPriorityConfig = () => {
    switch (payment.priority) {
      case 'urgent':
        return {
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
          textColor: 'text-red-500',
          badgeVariant: 'destructive' as const,
          label: 'Urgent - No Payment'
        };
      case 'high':
        return {
          bgColor: 'bg-orange-500/10',
          borderColor: 'border-orange-500/30',
          textColor: 'text-orange-500',
          badgeVariant: 'default' as const,
          label: 'High Priority'
        };
      default:
        return {
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/30',
          textColor: 'text-yellow-600',
          badgeVariant: 'outline' as const,
          label: 'Normal'
        };
    }
  };

  const getStatusConfig = () => {
    switch (payment.subscriptionStatus) {
      case 'active':
        return { color: 'text-success border-success', label: 'Active' };
      case 'paused':
        return { color: 'text-warning border-warning', label: 'Paused' };
      case 'completed':
        return { color: 'text-primary border-primary', label: 'Completed' };
      case 'cancelled':
        return { color: 'text-destructive border-destructive', label: 'Cancelled' };
      default:
        return { color: 'text-muted-foreground border-muted-foreground', label: 'Unknown' };
    }
  };

  const priorityConfig = getPriorityConfig();
  const statusConfig = getStatusConfig();

  const initials = payment.studentName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <Card
        className={cn(
          'h-full flex flex-col overflow-hidden transition-all hover:shadow-lg cursor-pointer border-2',
          priorityConfig.borderColor,
          'bg-card'
        )}
        onClick={(e) => {
          console.log('🎯 Card clicked for student:', payment.studentName);
          handleViewStudent(e);
        }}
      >
        {/* Header with Student Info */}
        <div className="p-4 pb-3 border-b bg-muted/30 flex-shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <Avatar className="h-14 w-14 border-2 border-primary/20 flex-shrink-0">
              <AvatarImage src={payment.profileImage} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base text-foreground leading-tight mb-1">
                {payment.studentName}
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                {payment.courseName || 'No course'}
              </p>
            </div>
          </div>

          <Badge
            variant={priorityConfig.badgeVariant}
            className={cn(
              "w-full justify-center text-xs font-semibold py-1",
              payment.priority === 'urgent' && "bg-destructive/90 hover:bg-destructive"
            )}
          >
            {priorityConfig.label}
          </Badge>
        </div>

        {/* Amount Owed - Prominent Display */}
        <div className="px-4 py-4 border-b bg-card flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Amount Owed</span>
            <Badge variant="outline" className={cn("text-xs", statusConfig.color)}>
              {statusConfig.label}
            </Badge>
          </div>

          <div className={cn('text-2xl font-extrabold mb-2 leading-none', priorityConfig.textColor)}>
            {payment.currency} {payment.amountOwed.toFixed(2)}
          </div>

          <div className="text-xs text-muted-foreground mb-3 leading-relaxed">
            Paid <span className="font-semibold text-foreground">{payment.currency} {payment.totalPaid.toFixed(2)}</span> of <span className="font-semibold text-foreground">{payment.currency} {payment.totalPrice.toFixed(2)}</span>
          </div>

          {/* Payment Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Payment Progress</span>
              <span className="text-xs font-bold text-foreground">
                {payment.paymentPercentage.toFixed(0)}%
              </span>
            </div>
            <div className="bg-muted rounded-full h-2.5 overflow-hidden">
              <div
                className={cn(
                  'h-2.5 rounded-full transition-all duration-300',
                  payment.paymentPercentage === 0 ? 'bg-destructive' :
                  payment.paymentPercentage < 50 ? 'bg-orange-500' :
                  payment.paymentPercentage < 100 ? 'bg-amber-500' :
                  'bg-success'
                )}
                style={{ width: `${Math.max(payment.paymentPercentage, 2)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Subscription Details */}
        <div className="p-4 pb-3 space-y-2.5 text-xs border-b bg-muted/20 flex-grow">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 flex-shrink-0 text-primary" />
            <span className="font-medium">Started <span className="text-foreground">{payment.daysSinceStart} days ago</span></span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle className="h-4 w-4 flex-shrink-0 text-primary" />
            <span className="font-medium">
              <span className="text-foreground">{payment.sessionsCompleted}</span> of <span className="text-foreground">{payment.sessionCount}</span> sessions completed
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-3 bg-card flex gap-2 flex-shrink-0 border-t">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 text-xs font-medium"
            onClick={handleCopyPhone}
            disabled={!payment.studentPhone}
          >
            <Phone className="h-3.5 w-3.5" />
            <span>Phone</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 text-xs font-medium"
            onClick={handleCopyEmail}
            disabled={!payment.studentEmail}
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Email</span>
          </Button>
          <Button
            variant="default"
            size="sm"
            className="gap-1.5 px-3 text-xs font-medium"
            onClick={handleViewStudent}
          >
            <span>View</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      </Card>
    </motion.div>
  );
});

PaymentCard.displayName = 'PaymentCard';

export default PaymentCard;
