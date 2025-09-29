import React, { useContext, useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { UserContext } from '@/App';
import { dashboardService, CashFlowData, ExpenseCategory } from '@/services/dashboard.service';
import { useNavigate } from 'react-router-dom';

const CashFlowWidget: React.FC = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [cashFlowData, setCashFlowData] = useState<CashFlowData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('month');

  useEffect(() => {
    const fetchCashFlowData = async () => {
      if (!user?.schoolId) return;

      setLoading(true);
      try {
        const data = await dashboardService.getCashFlowData(user.schoolId, selectedPeriod);
        setCashFlowData(data);
      } catch (error) {
        console.error('Error fetching cash flow data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCashFlowData();
  }, [user?.schoolId, selectedPeriod]);

  const getCashFlowStatus = () => {
    if (!cashFlowData) return { status: 'neutral', message: 'Loading...' };

    const { netCashFlow } = cashFlowData;
    if (netCashFlow > 0) {
      return {
        status: 'positive',
        message: 'Cash Positive',
        icon: TrendingUp,
        color: 'text-green-500'
      };
    } else if (netCashFlow < 0) {
      return {
        status: 'negative',
        message: 'Cash Negative',
        icon: TrendingDown,
        color: 'text-red-500'
      };
    }
    return {
      status: 'neutral',
      message: 'Break Even',
      icon: Activity,
      color: 'text-yellow-500'
    };
  };

  const cashStatus = getCashFlowStatus();
  const CashIcon = cashStatus.icon || Activity;

  // Calculate percentage for visual representation
  const getPercentage = () => {
    if (!cashFlowData || cashFlowData.totalIncome === 0) return 0;
    return Math.min(100, (cashFlowData.totalExpenses / cashFlowData.totalIncome) * 100);
  };

  const expensePercentage = getPercentage();

  // Get category colors
  const getCategoryColor = (index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-purple-500',
      'bg-green-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-yellow-500',
      'bg-indigo-500',
      'bg-red-500'
    ];
    return colors[index % colors.length];
  };

  return (
    <Card className="glass-card glass-card-hover h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/10 to-blue-500/10">
              <Wallet className="h-5 w-5 text-green-500" />
            </div>
            <CardTitle className="text-lg font-semibold">Cash Flow</CardTitle>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={selectedPeriod === 'week' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setSelectedPeriod('week')}
            >
              Week
            </Button>
            <Button
              variant={selectedPeriod === 'month' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setSelectedPeriod('month')}
            >
              Month
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            <div className="h-20 bg-white/5 rounded-lg animate-pulse" />
            <div className="h-32 bg-white/5 rounded-lg animate-pulse" />
          </div>
        ) : cashFlowData ? (
          <>
            {/* Cash Flow Status */}
            <div className="relative p-4 rounded-lg bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CashIcon className={cn("h-4 w-4", cashStatus.color)} />
                  <span className="text-sm font-medium">{cashStatus.message}</span>
                </div>
                <Badge variant={cashFlowData.netCashFlow >= 0 ? 'default' : 'destructive'}>
                  {cashFlowData.currency}{Math.abs(cashFlowData.netCashFlow).toLocaleString()}
                </Badge>
              </div>

              {/* Income vs Expense Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Income vs Expenses</span>
                  <span>{expensePercentage.toFixed(0)}%</span>
                </div>
                <div className="relative h-8 bg-white/5 rounded-full overflow-hidden">
                  <div className="absolute inset-0 flex">
                    <div
                      className="bg-green-500/80 transition-all duration-500"
                      style={{ width: '100%' }}
                    />
                    <div
                      className="absolute inset-0 bg-red-500/80 transition-all duration-500"
                      style={{ width: `${expensePercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3 text-green-500" />
                    <span className="text-[10px] text-muted-foreground uppercase">Income</span>
                  </div>
                  <p className="text-sm font-semibold text-green-500">
                    {cashFlowData.currency}{cashFlowData.totalIncome.toLocaleString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <ArrowDownRight className="h-3 w-3 text-red-500" />
                    <span className="text-[10px] text-muted-foreground uppercase">Expenses</span>
                  </div>
                  <p className="text-sm font-semibold text-red-500">
                    {cashFlowData.currency}{cashFlowData.totalExpenses.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Top Expense Categories */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-medium text-muted-foreground uppercase">
                  Top Expenses
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => navigate('/finances')}
                >
                  View All
                </Button>
              </div>

              <div className="space-y-2">
                {cashFlowData.topCategories.length > 0 ? (
                  cashFlowData.topCategories.slice(0, 5).map((category, index) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", getCategoryColor(index))} />
                        <span className="text-xs text-foreground truncate max-w-[120px]">
                          {category.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">
                          {cashFlowData.currency}{category.amount.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {category.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-xs text-muted-foreground">
                    No expenses recorded
                  </div>
                )}
              </div>
            </div>

            {/* Cash Flow Trend */}
            {cashFlowData.trend !== 0 && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                <span className="text-xs text-muted-foreground">
                  vs Last {selectedPeriod}
                </span>
                <div className={cn(
                  "flex items-center gap-1",
                  cashFlowData.trend > 0 ? "text-green-500" : "text-red-500"
                )}>
                  {cashFlowData.trend > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span className="text-xs font-medium">
                    {Math.abs(cashFlowData.trend)}%
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No cash flow data available
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CashFlowWidget;