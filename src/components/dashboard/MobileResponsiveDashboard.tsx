import React, { useState, useContext, useEffect } from 'react';
import {
  LayoutGrid,
  TrendingUp,
  Users,
  Calendar,
  DollarSign,
  Bell,
  Activity,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Menu,
  Search,
  Command
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { UserContext } from '@/App';
import QuickActionsBar from './QuickActionsBar';
import BusinessHealthMonitor from './BusinessHealthMonitor';
import UrgentActionsWidget from './UrgentActionsWidget';
import TodaysFocusWidget from './TodaysFocusWidget';
import InsightsWidget from './InsightsWidget';
import LiveUpdatesIndicator from './LiveUpdatesIndicator';
import RevenueExpensesChart from '../RevenueExpensesChart';
import NewStudentsStats from '../NewStudentsStats';
import RecentStudents from './RecentStudents';
import UpcomingLessons, { Lesson } from '../UpcomingLessons';
import UpcomingPayments, { Payment } from '../UpcomingPayments';
import CashFlowWidget from './CashFlowWidget';
import ExpectedPaymentsWidget from './ExpectedPaymentsWidget';
import PastSessionsWidget from './PastSessionsWidget';
import OverduePaymentsWidget from './OverduePaymentsWidget';
import SubscriptionRenewalWidget from './SubscriptionRenewalWidget';

interface MobileWidget {
  id: string;
  title: string;
  icon: React.ElementType;
  component: React.ComponentType;
  priority: 'high' | 'medium' | 'low';
  defaultOpen?: boolean;
}

interface MobileResponsiveDashboardProps {
  lessons?: Lesson[];
  payments?: Payment[];
}

const MobileResponsiveDashboard: React.FC<MobileResponsiveDashboardProps> = ({
  lessons = [],
  payments = []
}) => {
  const { user } = useContext(UserContext);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [selectedView, setSelectedView] = useState<'overview' | 'analytics' | 'operations'>('overview');

  // Define mobile-optimized widget configurations
  const mobileWidgets: MobileWidget[] = [
    {
      id: 'live-updates',
      title: 'Live Updates',
      icon: Activity,
      component: LiveUpdatesIndicator,
      priority: 'high',
      defaultOpen: true
    },
    {
      id: 'quick-actions',
      title: 'Quick Actions',
      icon: LayoutGrid,
      component: QuickActionsBar,
      priority: 'high',
      defaultOpen: true
    },
    {
      id: 'business-health',
      title: 'Business Health',
      icon: TrendingUp,
      component: BusinessHealthMonitor,
      priority: 'high',
      defaultOpen: true
    },
    {
      id: 'urgent-actions',
      title: 'Urgent Actions',
      icon: Bell,
      component: UrgentActionsWidget,
      priority: 'high',
      defaultOpen: false
    },
    {
      id: 'todays-focus',
      title: "Today's Focus",
      icon: Calendar,
      component: TodaysFocusWidget,
      priority: 'medium',
      defaultOpen: false
    },
    {
      id: 'cash-flow',
      title: 'Cash Flow',
      icon: DollarSign,
      component: CashFlowWidget,
      priority: 'high',
      defaultOpen: false
    },
    {
      id: 'expected-payments',
      title: 'Expected Payments',
      icon: Calendar,
      component: ExpectedPaymentsWidget,
      priority: 'high',
      defaultOpen: false
    },
    {
      id: 'insights',
      title: 'AI Insights',
      icon: BarChart3,
      component: InsightsWidget,
      priority: 'medium',
      defaultOpen: false
    },
    {
      id: 'revenue',
      title: 'Revenue & Expenses',
      icon: DollarSign,
      component: RevenueExpensesChart,
      priority: 'medium',
      defaultOpen: false
    },
    {
      id: 'students',
      title: 'Recent Students',
      icon: Users,
      component: RecentStudents,
      priority: 'low',
      defaultOpen: false
    }
  ];

  useEffect(() => {
    // Initialize expanded cards based on default settings
    const defaultOpen = new Set(
      mobileWidgets
        .filter(w => w.defaultOpen)
        .map(w => w.id)
    );
    setExpandedCards(defaultOpen);
  }, []);

  const toggleCard = (cardId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const renderMobileWidget = (widget: MobileWidget) => {
    const Component = widget.component;
    const Icon = widget.icon;
    const isExpanded = expandedCards.has(widget.id);

    return (
      <Collapsible
        key={widget.id}
        open={isExpanded}
        onOpenChange={() => toggleCard(widget.id)}
      >
        <Card className={cn(
          "glass-card backdrop-blur-xl border-white/10 transition-all",
          isExpanded && "shadow-lg"
        )}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer select-none">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    widget.priority === 'high' ? "bg-red-500/10" :
                    widget.priority === 'medium' ? "bg-yellow-500/10" :
                    "bg-blue-500/10"
                  )}>
                    <Icon className={cn(
                      "h-4 w-4",
                      widget.priority === 'high' ? "text-red-500" :
                      widget.priority === 'medium' ? "text-yellow-500" :
                      "text-blue-500"
                    )} />
                  </div>
                  <CardTitle className="text-sm font-medium">
                    {widget.title}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {widget.priority === 'high' && (
                    <Badge variant="destructive" className="text-xs">
                      Priority
                    </Badge>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="max-h-[400px] overflow-y-auto">
                <Component />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  };

  // Desktop view (tablets and larger)
  const renderDesktopView = () => (
    <div className="space-y-6">
      {/* Top Priority Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="md:col-span-2 lg:col-span-3">
          <LiveUpdatesIndicator />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="md:col-span-2 lg:col-span-3">
          <QuickActionsBar />
        </div>
      </div>

      <BusinessHealthMonitor />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        <UrgentActionsWidget />
        <TodaysFocusWidget />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        <CashFlowWidget />
        <ExpectedPaymentsWidget />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RevenueExpensesChart />
        <PastSessionsWidget />
      </div>

      {/* Overdue Payments Widget */}
      <div className="grid grid-cols-1 gap-4">
        <OverduePaymentsWidget />
      </div>

      {/* Subscription Renewal Widget */}
      <div className="grid grid-cols-1 gap-4">
        <SubscriptionRenewalWidget />
      </div>
    </div>
  );

  // Open global command center
  const openGlobalSearch = () => {
    const event = new CustomEvent('openGlobalSearch');
    window.dispatchEvent(event);
  };

  // Mobile view (phones)
  const renderMobileView = () => (
    <div className="space-y-3 pb-20">
      {/* Mobile navigation tabs */}
      <Tabs value={selectedView} onValueChange={(value) => setSelectedView(value as any)}>
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs">Analytics</TabsTrigger>
          <TabsTrigger value="operations" className="text-xs">Operations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3">
          {mobileWidgets
            .filter(w => ['live-updates', 'quick-actions', 'business-health', 'urgent-actions', 'cash-flow', 'expected-payments'].includes(w.id))
            .map(renderMobileWidget)}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-3">
          {mobileWidgets
            .filter(w => ['insights', 'revenue', 'todays-focus', 'cash-flow'].includes(w.id))
            .map(renderMobileWidget)}
        </TabsContent>

        <TabsContent value="operations" className="space-y-3">
          {mobileWidgets
            .filter(w => ['students', 'todays-focus', 'urgent-actions'].includes(w.id))
            .map(renderMobileWidget)}
        </TabsContent>
      </Tabs>

      {/* Floating Action Button for mobile */}
      <div className="fixed bottom-4 right-4 z-50 md:hidden">
        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild>
            <Button
              size="lg"
              className="rounded-full shadow-lg h-14 w-14 bg-primary hover:bg-primary/90"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh]">
            <SheetHeader>
              <SheetTitle>Dashboard Options</SheetTitle>
              <SheetDescription>
                Customize your dashboard view
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="h-full py-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Quick Actions</h3>
                  <QuickActionsBar />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Widget Visibility</h3>
                  {mobileWidgets.map(widget => (
                    <div key={widget.id} className="flex items-center justify-between">
                      <span className="text-sm">{widget.title}</span>
                      <Button
                        variant={expandedCards.has(widget.id) ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          toggleCard(widget.id);
                          setIsMenuOpen(false);
                        }}
                      >
                        {expandedCards.has(widget.id) ? 'Hide' : 'Show'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );

  // Determine if mobile view should be used
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="w-full">
      {isMobile ? renderMobileView() : renderDesktopView()}
    </div>
  );
};

export default MobileResponsiveDashboard;