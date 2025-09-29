import { databaseService } from '@/services/firebase/database.service';
import {
  differenceInDays,
  subDays,
  subMonths,
  startOfMonth,
  endOfMonth,
  addMonths,
  format
} from 'date-fns';

export interface ChurnRiskStudent {
  studentId: string;
  studentName: string;
  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  lastAttendance?: Date;
  missedSessions: number;
  paymentDelays: number;
  engagementScore: number;
  recommendedAction: string;
}

export interface RevenueForecast {
  month: string;
  projected: number;
  optimistic: number;
  pessimistic: number;
  confidence: number; // 0-100
  factors: {
    baseRevenue: number;
    growthTrend: number;
    seasonality: number;
    churnImpact: number;
  };
}

export interface BusinessInsights {
  churnRisk: {
    atRiskStudents: ChurnRiskStudent[];
    totalAtRisk: number;
    projectedRevenueLoss: number;
  };
  revenueForecast: RevenueForecast[];
  recommendations: string[];
  opportunities: {
    upsellCandidates: string[];
    reactivationCandidates: string[];
    expansionPotential: number;
  };
}

class PredictiveAnalyticsService {
  /**
   * Analyze student churn risk
   */
  async analyzeChurnRisk(schoolId: string): Promise<ChurnRiskStudent[]> {
    const students = await databaseService.query('students', {
      where: [{ field: 'schoolId', operator: '==', value: schoolId }]
    });

    if (!students || students.length === 0) {
      return [];
    }

    const atRiskStudents: ChurnRiskStudent[] = [];
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);

    for (const student of students) {
      let riskScore = 0;
      const factors: string[] = [];

      // Get student's sessions
      const sessions = await databaseService.query('sessions', {
        where: [
          { field: 'student_id', operator: '==', value: student.id },
          { field: 'scheduled_date', operator: '>=', value: thirtyDaysAgo.toISOString() }
        ]
      });

      // 1. Attendance Analysis (40% weight)
      const scheduledSessions = sessions?.filter((s: any) =>
        new Date(s.scheduled_date) < now
      ) || [];
      const attendedSessions = scheduledSessions.filter((s: any) =>
        s.status === 'completed'
      );
      const missedSessions = scheduledSessions.length - attendedSessions.length;
      const attendanceRate = scheduledSessions.length > 0
        ? (attendedSessions.length / scheduledSessions.length) * 100
        : 100;

      if (attendanceRate < 50) {
        riskScore += 40;
        factors.push(`Low attendance: ${Math.round(attendanceRate)}%`);
      } else if (attendanceRate < 70) {
        riskScore += 25;
        factors.push(`Declining attendance: ${Math.round(attendanceRate)}%`);
      } else if (attendanceRate < 85) {
        riskScore += 10;
      }

      // 2. Payment Behavior (30% weight)
      const payments = await databaseService.query('payments', {
        where: [
          { field: 'student_id', operator: '==', value: student.id }
        ]
      });

      let paymentDelays = 0;
      if (payments && payments.length > 0) {
        payments.forEach((payment: any) => {
          const dueDate = new Date(payment.due_date || payment.payment_date);
          const paidDate = payment.paid_date ? new Date(payment.paid_date) : null;

          if (paidDate && differenceInDays(paidDate, dueDate) > 7) {
            paymentDelays++;
          } else if (!paidDate && dueDate < now) {
            paymentDelays += 2;
          }
        });
      }

      if (paymentDelays > 3) {
        riskScore += 30;
        factors.push(`Multiple payment delays: ${paymentDelays}`);
      } else if (paymentDelays > 1) {
        riskScore += 15;
        factors.push(`Some payment delays: ${paymentDelays}`);
      }

      // 3. Engagement Analysis (20% weight)
      const recentSessions = sessions?.filter((s: any) => {
        const sessionDate = new Date(s.scheduled_date);
        return differenceInDays(now, sessionDate) <= 14;
      }) || [];

      if (recentSessions.length === 0) {
        riskScore += 20;
        factors.push('No recent sessions');
      } else if (recentSessions.length < 2) {
        riskScore += 10;
        factors.push('Low session frequency');
      }

      // 4. Subscription Status (10% weight)
      const subscription = await databaseService.query('subscriptions', {
        where: [
          { field: 'student_id', operator: '==', value: student.id },
          { field: 'status', operator: '==', value: 'active' }
        ]
      });

      if (!subscription || subscription.length === 0) {
        riskScore += 10;
        factors.push('No active subscription');
      } else if (subscription[0].end_date) {
        const endDate = new Date(subscription[0].end_date);
        const daysUntilExpiry = differenceInDays(endDate, now);

        if (daysUntilExpiry <= 7) {
          riskScore += 8;
          factors.push(`Subscription expiring in ${daysUntilExpiry} days`);
        }
      }

      // Calculate final risk level
      let riskLevel: ChurnRiskStudent['riskLevel'] = 'low';
      let recommendedAction = 'Continue monitoring';

      if (riskScore >= 70) {
        riskLevel = 'critical';
        recommendedAction = 'Immediate intervention required - Call student/parent';
      } else if (riskScore >= 50) {
        riskLevel = 'high';
        recommendedAction = 'Schedule meeting to address concerns';
      } else if (riskScore >= 30) {
        riskLevel = 'medium';
        recommendedAction = 'Send engagement email and offer support';
      }

      if (riskScore >= 30) {
        // Get student user details
        const user = await databaseService.getById('users', student.userId || student.user_id);
        const studentName = user
          ? `${user.firstName || user.first_name} ${user.lastName || user.last_name}`
          : 'Unknown Student';

        atRiskStudents.push({
          studentId: student.id,
          studentName,
          riskScore,
          riskLevel,
          factors,
          lastAttendance: attendedSessions.length > 0
            ? new Date(attendedSessions[attendedSessions.length - 1].scheduled_date)
            : undefined,
          missedSessions,
          paymentDelays,
          engagementScore: 100 - riskScore,
          recommendedAction
        });
      }
    }

    // Sort by risk score
    return atRiskStudents.sort((a, b) => b.riskScore - a.riskScore);
  }

  /**
   * Generate revenue forecast
   */
  async generateRevenueForecast(schoolId: string, months: number = 6): Promise<RevenueForecast[]> {
    const forecast: RevenueForecast[] = [];
    const now = new Date();

    // Get historical revenue data (last 6 months)
    const historicalData = await this.getHistoricalRevenue(schoolId, 6);

    // Calculate growth trend
    const growthRate = this.calculateGrowthTrend(historicalData);

    // Get active subscriptions for base revenue
    const subscriptions = await databaseService.query('subscriptions', {
      where: [
        { field: 'schoolId', operator: '==', value: schoolId },
        { field: 'status', operator: '==', value: 'active' }
      ]
    });

    let baseMonthlyRevenue = 0;
    if (subscriptions && subscriptions.length > 0) {
      subscriptions.forEach((sub: any) => {
        if (sub.price_mode === 'perSession' && sub.price_per_session > 0) {
          // Estimate 4 sessions per month
          baseMonthlyRevenue += (sub.price_per_session * 4);
        } else if (sub.total_price > 0 && sub.session_count > 0) {
          // Calculate monthly rate
          baseMonthlyRevenue += (sub.total_price / sub.session_count) * 4;
        }
      });
    }

    // Get churn risk for impact calculation
    const atRiskStudents = await this.analyzeChurnRisk(schoolId);
    const churnImpact = atRiskStudents.reduce((total, student) => {
      if (student.riskLevel === 'critical' || student.riskLevel === 'high') {
        return total + (baseMonthlyRevenue * 0.05); // 5% impact per high-risk student
      }
      return total;
    }, 0);

    // Generate forecast for each month
    for (let i = 1; i <= months; i++) {
      const forecastMonth = addMonths(now, i);
      const monthName = format(forecastMonth, 'MMM yyyy');

      // Calculate seasonality factor
      const seasonalityFactor = this.getSeasonalityFactor(forecastMonth.getMonth());

      // Base projection
      const baseProjection = baseMonthlyRevenue * (1 + (growthRate * i));

      // Apply factors
      const projected = Math.round(
        baseProjection * seasonalityFactor - (churnImpact * (i * 0.1))
      );

      // Calculate confidence based on how far in the future
      const confidence = Math.max(30, 100 - (i * 10));

      // Calculate optimistic and pessimistic scenarios
      const variancePercent = 0.15 + (i * 0.02); // Increase variance for future months
      const optimistic = Math.round(projected * (1 + variancePercent));
      const pessimistic = Math.round(projected * (1 - variancePercent));

      forecast.push({
        month: monthName,
        projected,
        optimistic,
        pessimistic,
        confidence,
        factors: {
          baseRevenue: baseMonthlyRevenue,
          growthTrend: growthRate,
          seasonality: seasonalityFactor,
          churnImpact: churnImpact * (i * 0.1)
        }
      });
    }

    return forecast;
  }

  /**
   * Get comprehensive business insights
   */
  async getBusinessInsights(schoolId: string): Promise<BusinessInsights> {
    // Analyze churn risk
    const atRiskStudents = await this.analyzeChurnRisk(schoolId);
    const criticalRiskStudents = atRiskStudents.filter(s =>
      s.riskLevel === 'critical' || s.riskLevel === 'high'
    );

    // Calculate potential revenue loss
    const avgRevenuePerStudent = await this.getAverageRevenuePerStudent(schoolId);
    const projectedRevenueLoss = criticalRiskStudents.length * avgRevenuePerStudent;

    // Generate revenue forecast
    const revenueForecast = await this.generateRevenueForecast(schoolId);

    // Identify opportunities
    const opportunities = await this.identifyGrowthOpportunities(schoolId);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      atRiskStudents,
      revenueForecast,
      opportunities
    );

    return {
      churnRisk: {
        atRiskStudents: atRiskStudents.slice(0, 10), // Top 10 at-risk students
        totalAtRisk: atRiskStudents.length,
        projectedRevenueLoss
      },
      revenueForecast,
      recommendations,
      opportunities
    };
  }

  /**
   * Helper: Get historical revenue data
   */
  private async getHistoricalRevenue(schoolId: string, months: number): Promise<number[]> {
    const revenue: number[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));

      const transactions = await databaseService.query('transactions', {
        where: [
          { field: 'school_id', operator: '==', value: schoolId },
          { field: 'type', operator: '==', value: 'income' }
        ]
      });

      let monthRevenue = 0;
      if (transactions) {
        transactions.forEach((transaction: any) => {
          const transactionDate = new Date(transaction.date);
          if (transactionDate >= monthStart && transactionDate <= monthEnd) {
            monthRevenue += Number(transaction.amount) || 0;
          }
        });
      }

      revenue.push(monthRevenue);
    }

    return revenue;
  }

  /**
   * Helper: Calculate growth trend
   */
  private calculateGrowthTrend(historicalData: number[]): number {
    if (historicalData.length < 2) return 0;

    let totalGrowth = 0;
    let validMonths = 0;

    for (let i = 1; i < historicalData.length; i++) {
      if (historicalData[i - 1] > 0) {
        const monthlyGrowth = (historicalData[i] - historicalData[i - 1]) / historicalData[i - 1];
        totalGrowth += monthlyGrowth;
        validMonths++;
      }
    }

    return validMonths > 0 ? totalGrowth / validMonths : 0;
  }

  /**
   * Helper: Get seasonality factor
   */
  private getSeasonalityFactor(month: number): number {
    // Educational seasonality patterns (0 = January)
    const seasonalFactors = [
      0.9,  // January - Post-holiday slowdown
      1.1,  // February - Spring enrollment
      1.15, // March - Peak season
      1.1,  // April
      1.0,  // May
      0.8,  // June - Summer slowdown
      0.7,  // July - Summer vacation
      0.75, // August - Summer vacation
      1.2,  // September - Back to school
      1.15, // October - Peak season
      1.1,  // November
      0.85  // December - Holiday season
    ];

    return seasonalFactors[month] || 1.0;
  }

  /**
   * Helper: Get average revenue per student
   */
  private async getAverageRevenuePerStudent(schoolId: string): Promise<number> {
    const students = await databaseService.query('students', {
      where: [{ field: 'schoolId', operator: '==', value: schoolId }]
    });

    const subscriptions = await databaseService.query('subscriptions', {
      where: [
        { field: 'schoolId', operator: '==', value: schoolId },
        { field: 'status', operator: '==', value: 'active' }
      ]
    });

    if (!students || students.length === 0 || !subscriptions || subscriptions.length === 0) {
      return 0;
    }

    let totalRevenue = 0;
    subscriptions.forEach((sub: any) => {
      if (sub.price_mode === 'perSession' && sub.price_per_session > 0) {
        totalRevenue += (sub.price_per_session * 4); // 4 sessions per month estimate
      } else if (sub.total_price > 0 && sub.session_count > 0) {
        totalRevenue += (sub.total_price / sub.session_count) * 4;
      }
    });

    return totalRevenue / students.length;
  }

  /**
   * Helper: Identify growth opportunities
   */
  private async identifyGrowthOpportunities(schoolId: string): Promise<any> {
    // Identify upsell candidates (students with high engagement)
    const students = await databaseService.query('students', {
      where: [{ field: 'schoolId', operator: '==', value: schoolId }]
    });

    const upsellCandidates: string[] = [];
    const reactivationCandidates: string[] = [];

    // This is simplified - in production, you'd have more sophisticated analysis
    if (students) {
      for (const student of students.slice(0, 5)) {
        const user = await databaseService.getById('users', student.userId || student.user_id);
        if (user) {
          const name = `${user.firstName || user.first_name} ${user.lastName || user.last_name}`;

          // Check if student is inactive
          const subscription = await databaseService.query('subscriptions', {
            where: [
              { field: 'student_id', operator: '==', value: student.id },
              { field: 'status', operator: '==', value: 'active' }
            ]
          });

          if (!subscription || subscription.length === 0) {
            reactivationCandidates.push(name);
          } else {
            upsellCandidates.push(name);
          }
        }
      }
    }

    const expansionPotential = (upsellCandidates.length * 500) +
                              (reactivationCandidates.length * 1000);

    return {
      upsellCandidates: upsellCandidates.slice(0, 3),
      reactivationCandidates: reactivationCandidates.slice(0, 3),
      expansionPotential
    };
  }

  /**
   * Helper: Generate actionable recommendations
   */
  private generateRecommendations(
    atRiskStudents: ChurnRiskStudent[],
    forecast: RevenueForecast[],
    opportunities: any
  ): string[] {
    const recommendations: string[] = [];

    // Churn prevention recommendations
    if (atRiskStudents.length > 0) {
      const criticalCount = atRiskStudents.filter(s => s.riskLevel === 'critical').length;
      if (criticalCount > 0) {
        recommendations.push(
          `⚠️ Contact ${criticalCount} critical-risk students immediately to prevent churn`
        );
      }

      const highRiskCount = atRiskStudents.filter(s => s.riskLevel === 'high').length;
      if (highRiskCount > 0) {
        recommendations.push(
          `📞 Schedule check-ins with ${highRiskCount} high-risk students this week`
        );
      }
    }

    // Revenue optimization recommendations
    if (forecast.length > 0 && forecast[0].factors.growthTrend < 0) {
      recommendations.push(
        '📉 Revenue trend is declining - consider promotional campaigns'
      );
    }

    // Growth opportunity recommendations
    if (opportunities.upsellCandidates.length > 0) {
      recommendations.push(
        `💰 Upsell opportunity: ${opportunities.upsellCandidates.length} students ready for advanced courses`
      );
    }

    if (opportunities.reactivationCandidates.length > 0) {
      recommendations.push(
        `🔄 Win-back campaign: ${opportunities.reactivationCandidates.length} inactive students to re-engage`
      );
    }

    // Seasonal recommendations
    const currentMonth = new Date().getMonth();
    if (currentMonth === 8) { // September
      recommendations.push(
        '🎓 Back-to-school season: Launch enrollment campaign for maximum impact'
      );
    } else if (currentMonth === 11 || currentMonth === 0) { // December or January
      recommendations.push(
        '🎁 Holiday/New Year promotions could boost enrollment'
      );
    }

    return recommendations.slice(0, 5); // Return top 5 recommendations
  }
}

// Export singleton instance
export const predictiveAnalyticsService = new PredictiveAnalyticsService();