import React, { useState, useEffect, useContext } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Target,
  DollarSign,
  Users,
  ChevronRight,
  Brain,
  BarChart3,
  UserMinus,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { UserContext } from '@/App';
import {
  predictiveAnalyticsService,
  BusinessInsights,
  ChurnRiskStudent,
  RevenueForecast
} from '@/services/predictiveAnalytics.service';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const InsightsWidget: React.FC = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [insights, setInsights] = useState<BusinessInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    if (user?.schoolId) {
      fetchInsights();
    }
  }, [user?.schoolId]);

  const fetchInsights = async () => {
    if (!user?.schoolId) return;

    setLoading(true);
    try {
      const businessInsights = await predictiveAnalyticsService.getBusinessInsights(user.schoolId);
      setInsights(businessInsights);
    } catch (error) {
      console.error('Error fetching insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'high':
        return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'medium':
        return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      default:
        return 'text-green-500 bg-green-500/10 border-green-500/20';
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  if (loading) {
    return (
      <Card className="glass-card backdrop-blur-xl border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return null;
  }

  const forecastData = insights.revenueForecast.map(f => ({
    month: f.month.split(' ')[0], // Show just month name
    projected: f.projected,
    optimistic: f.optimistic,
    pessimistic: f.pessimistic
  }));

  return (
    <Card className="glass-card backdrop-blur-xl border-white/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Brain className="h-4 w-4 text-purple-500" />
            </div>
            <span className="text-base">AI-Powered Insights</span>
          </CardTitle>
          <Badge variant="secondary" className="bg-purple-500/10 text-purple-500">
            <Sparkles className="h-3 w-3 mr-1" />
            Predictive
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full bg-white/5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="churn">Churn Risk</TabsTrigger>
            <TabsTrigger value="forecast">Forecast</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">At Risk</p>
                    <p className="text-xl font-bold text-foreground">
                      {insights.churnRisk.totalAtRisk}
                    </p>
                    <p className="text-xs text-red-500 mt-1">
                      {formatCurrency(insights.churnRisk.projectedRevenueLoss)} at risk
                    </p>
                  </div>
                  <UserMinus className="h-5 w-5 text-red-500" />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Growth Potential</p>
                    <p className="text-xl font-bold text-foreground">
                      {formatCurrency(insights.opportunities.expansionPotential)}
                    </p>
                    <p className="text-xs text-green-500 mt-1">
                      {insights.opportunities.upsellCandidates.length +
                       insights.opportunities.reactivationCandidates.length} opportunities
                    </p>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-green-500" />
                </div>
              </div>
            </div>

            {/* AI Recommendations */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                AI Recommendations
              </h4>
              {insights.recommendations.map((rec, index) => (
                <div
                  key={index}
                  className="p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors cursor-pointer"
                  onClick={() => {
                    if (rec.includes('risk students')) navigate('/students');
                    else if (rec.includes('revenue')) navigate('/finances');
                  }}
                >
                  <p className="text-sm text-foreground">{rec}</p>
                </div>
              ))}
            </div>

            {/* Opportunities */}
            {(insights.opportunities.upsellCandidates.length > 0 ||
              insights.opportunities.reactivationCandidates.length > 0) && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                  Growth Opportunities
                </h4>
                {insights.opportunities.upsellCandidates.length > 0 && (
                  <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-xs font-medium text-green-500 mb-1">Upsell Candidates</p>
                    <p className="text-xs text-muted-foreground">
                      {insights.opportunities.upsellCandidates.join(', ')}
                    </p>
                  </div>
                )}
                {insights.opportunities.reactivationCandidates.length > 0 && (
                  <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-xs font-medium text-blue-500 mb-1">Win-Back Targets</p>
                    <p className="text-xs text-muted-foreground">
                      {insights.opportunities.reactivationCandidates.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Churn Risk Tab */}
          <TabsContent value="churn" className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">
                {insights.churnRisk.totalAtRisk} students at risk
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/students')}
                className="text-xs"
              >
                View All
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>

            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {insights.churnRisk.atRiskStudents.map((student) => (
                  <div
                    key={student.studentId}
                    className="p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors cursor-pointer"
                    onClick={() => navigate(`/student/${student.studentId}`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {student.studentName}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn("text-xs mt-1", getRiskLevelColor(student.riskLevel))}
                        >
                          {student.riskLevel.toUpperCase()} RISK
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-foreground">
                          {student.riskScore}%
                        </p>
                        <p className="text-xs text-muted-foreground">Risk Score</p>
                      </div>
                    </div>

                    <Progress value={student.riskScore} className="h-1 mb-2" />

                    <div className="space-y-1">
                      {student.factors.slice(0, 2).map((factor, i) => (
                        <p key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {factor}
                        </p>
                      ))}
                    </div>

                    <div className="mt-2 p-2 rounded bg-white/[0.02]">
                      <p className="text-xs font-medium text-primary">
                        Action: {student.recommendedAction}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Revenue Forecast Tab */}
          <TabsContent value="forecast" className="space-y-3">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastData}>
                  <defs>
                    <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis
                    dataKey="month"
                    stroke="#9ca3af"
                    fontSize={10}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    fontSize={10}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#f3f4f6' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Area
                    type="monotone"
                    dataKey="optimistic"
                    stroke="#10b981"
                    strokeWidth={1}
                    fill="transparent"
                    strokeDasharray="3 3"
                    opacity={0.5}
                  />
                  <Area
                    type="monotone"
                    dataKey="projected"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#colorProjected)"
                  />
                  <Area
                    type="monotone"
                    dataKey="pessimistic"
                    stroke="#ef4444"
                    strokeWidth={1}
                    fill="transparent"
                    strokeDasharray="3 3"
                    opacity={0.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Pessimistic</p>
                <p className="text-sm font-bold text-red-500">
                  {formatCurrency(forecastData[0]?.pessimistic || 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Projected</p>
                <p className="text-sm font-bold text-blue-500">
                  {formatCurrency(forecastData[0]?.projected || 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Optimistic</p>
                <p className="text-sm font-bold text-green-500">
                  {formatCurrency(forecastData[0]?.optimistic || 0)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {insights.revenueForecast.slice(0, 3).map((forecast) => (
                <div
                  key={forecast.month}
                  className="p-2 rounded-lg bg-white/[0.02] flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{forecast.month}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {forecast.confidence}% confidence
                      </Badge>
                      {forecast.factors.growthTrend > 0 ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                    </div>
                  </div>
                  <p className="text-lg font-bold text-foreground">
                    {formatCurrency(forecast.projected)}
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default InsightsWidget;