import React, { useState } from 'react';
import {
  Plus,
  Calendar,
  DollarSign,
  MessageSquare,
  CheckSquare,
  Users,
  ClipboardList,
  Send,
  BookOpen,
  UserPlus,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import AddStudentDialog from '@/components/AddStudentDialog';
import PaymentDialog from '@/components/PaymentDialog';
import { PaymentProvider } from '@/contexts/PaymentContext';
import { toast } from 'sonner';

interface QuickAction {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ElementType;
  color: string;
  action: () => void;
  shortcut?: string;
}

const QuickActionsBar: React.FC = () => {
  const navigate = useNavigate();
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const primaryActions: QuickAction[] = [
    {
      id: 'add-student',
      label: 'New Student',
      sublabel: 'Add student',
      icon: UserPlus,
      color: 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-500',
      action: () => setIsAddStudentOpen(true),
      shortcut: 'Cmd+N'
    },
    {
      id: 'schedule-lesson',
      label: 'Schedule Lesson',
      sublabel: 'Book session',
      icon: Calendar,
      color: 'bg-green-500/10 hover:bg-green-500/20 text-green-500',
      action: () => navigate('/calendar'),
      shortcut: 'Cmd+L'
    },
    {
      id: 'record-payment',
      label: 'Record Payment',
      sublabel: 'Add transaction',
      icon: CreditCard,
      color: 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-500',
      action: () => setIsPaymentOpen(true),
      shortcut: 'Cmd+P'
    },
    {
      id: 'mark-attendance',
      label: 'Mark Attendance',
      sublabel: "Today's sessions",
      icon: CheckSquare,
      color: 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-500',
      action: () => navigate('/attendance'),
      shortcut: 'Cmd+A'
    }
  ];

  const secondaryActions: QuickAction[] = [
    {
      id: 'send-message',
      label: 'Send Message',
      sublabel: 'Bulk SMS/Email',
      icon: Send,
      color: 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-500',
      action: () => {
        toast.info('Messaging feature coming soon!');
      }
    },
    {
      id: 'add-todo',
      label: 'Add TODO',
      sublabel: 'Team task',
      icon: ClipboardList,
      color: 'bg-pink-500/10 hover:bg-pink-500/20 text-pink-500',
      action: () => navigate('/todos')
    },
    {
      id: 'create-group',
      label: 'Create Group',
      sublabel: 'New class',
      icon: Users,
      color: 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500',
      action: () => navigate('/groups')
    },
    {
      id: 'add-course',
      label: 'Add Course',
      sublabel: 'New program',
      icon: BookOpen,
      color: 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500',
      action: () => navigate('/courses')
    }
  ];

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'n':
            e.preventDefault();
            setIsAddStudentOpen(true);
            break;
          case 'l':
            e.preventDefault();
            navigate('/calendar');
            break;
          case 'p':
            e.preventDefault();
            setIsPaymentOpen(true);
            break;
          case 'a':
            e.preventDefault();
            navigate('/attendance');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [navigate]);

  const allActions = isExpanded ? [...primaryActions, ...secondaryActions] : primaryActions;

  return (
    <>
      <Card className="glass-card backdrop-blur-xl border-white/10 mb-6">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Quick Actions</h3>
                <p className="text-xs text-muted-foreground">Frequently used operations</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {isExpanded ? 'Show Less' : 'Show More'}
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
            <TooltipProvider>
              {allActions.map((action) => (
                <Tooltip key={action.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={action.action}
                      className={cn(
                        "group relative flex flex-col items-center justify-center p-4 rounded-xl transition-all duration-200",
                        "border border-white/5 hover:border-white/10",
                        "bg-gradient-to-br from-white/[0.02] to-white/[0.05]",
                        "hover:from-white/[0.05] hover:to-white/[0.08]",
                        "hover:scale-[1.02] hover:shadow-xl",
                        "active:scale-[0.98]"
                      )}
                    >
                      <div className={cn(
                        "p-3 rounded-lg transition-all duration-200 mb-2",
                        action.color
                      )}>
                        <action.icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-medium text-foreground">
                        {action.label}
                      </span>
                      {action.sublabel && (
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                          {action.sublabel}
                        </span>
                      )}
                      {action.shortcut && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <kbd className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-muted-foreground">
                            {action.shortcut}
                          </kbd>
                        </div>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{action.label}</p>
                    {action.shortcut && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Shortcut: {action.shortcut}
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </div>
        </div>
      </Card>

      {/* Dialogs */}
      <PaymentProvider>
        <AddStudentDialog
          open={isAddStudentOpen}
          onOpenChange={setIsAddStudentOpen}
          onStudentAdded={(student) => {
            setIsAddStudentOpen(false);
            toast.success(`Student ${student.firstName} ${student.lastName} added successfully`);
          }}
        />
      </PaymentProvider>

      {isPaymentOpen && (
        <PaymentDialog
          open={isPaymentOpen}
          onOpenChange={setIsPaymentOpen}
          onSuccess={() => {
            setIsPaymentOpen(false);
            toast.success('Payment recorded successfully');
          }}
        />
      )}
    </>
  );
};

export default QuickActionsBar;