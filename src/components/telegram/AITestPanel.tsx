import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { collection, query as firestoreQuery, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, PlayCircle, AlertCircle, CheckCircle2, Database, CalendarClock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { databaseService } from '@/services/firebase/database.service';

interface AITestPanelProps {
  schoolId: string;
}

export function AITestPanel({ schoolId }: AITestPanelProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [testResults, setTestResults] = useState<any>(null);
  const [isTestingLoading, setIsTestingLoading] = useState(false);

  // Fetch students for the school
  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ['students-for-test', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const students = await databaseService.getBySchoolId('students', schoolId);
      return students.filter((s: any) => s.status === 'active');
    },
    enabled: !!schoolId
  });

  const runTest = async () => {
    if (!selectedStudentId) return;

    setIsTestingLoading(true);
    setTestResults(null);

    try {
      const now = new Date();
      const results: any = {
        timestamp: now.toISOString(),
        studentId: selectedStudentId,
        queries: {},
        calculations: {},
        errors: []
      };

      // 1. Fetch student document
      try {
        const studentDocRef = doc(db, 'students', selectedStudentId);
        const studentDoc = await getDoc(studentDocRef);

        if (studentDoc.exists()) {
          results.queries.student = {
            success: true,
            data: studentDoc.data(),
            query: `db.collection('students').doc('${selectedStudentId}').get()`
          };
        } else {
          results.queries.student = {
            success: false,
            error: 'Student document not found'
          };
          results.errors.push('Student not found');
        }
      } catch (error: any) {
        results.queries.student = {
          success: false,
          error: error.message
        };
        results.errors.push(`Student query error: ${error.message}`);
      }

      // 2. Fetch subscriptions
      try {
        const subsRef = collection(db, 'subscriptions');
        const subsQuery = firestoreQuery(
          subsRef,
          where('studentId', '==', selectedStudentId),
          where('status', '==', 'active')
        );
        const subsSnapshot = await getDocs(subsQuery);

        results.queries.subscriptions = {
          success: true,
          count: subsSnapshot.size,
          data: subsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
          query: `db.collection('subscriptions').where('studentId', '==', '${selectedStudentId}').where('status', '==', 'active').get()`
        };
      } catch (error: any) {
        results.queries.subscriptions = {
          success: false,
          error: error.message
        };
        results.errors.push(`Subscriptions query error: ${error.message}`);
      }

      // 3. Fetch all sessions - try both field name variants
      try {
        const sessionsRef = collection(db, 'sessions');

        // Try snake_case first
        let sessionsQuery = firestoreQuery(
          sessionsRef,
          where('student_id', '==', selectedStudentId)
        );
        let sessionsSnapshot = await getDocs(sessionsQuery);
        let queryUsed = 'student_id (snake_case)';

        // If no results, try camelCase
        if (sessionsSnapshot.empty) {
          sessionsQuery = firestoreQuery(
            sessionsRef,
            where('studentId', '==', selectedStudentId)
          );
          sessionsSnapshot = await getDocs(sessionsQuery);
          queryUsed = 'studentId (camelCase)';
        }

        // If still no results and we have subscriptions, try querying by subscription_id
        if (sessionsSnapshot.empty && results.queries.subscriptions?.data?.length > 0) {
          const subscriptionIds = results.queries.subscriptions.data.map((s: any) => s.id);
          const sessionsBySubscription: any[] = [];

          for (const subId of subscriptionIds) {
            const subQuery = firestoreQuery(
              sessionsRef,
              where('subscription_id', '==', subId)
            );
            const subSnapshot = await getDocs(subQuery);
            sessionsBySubscription.push(...subSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          }

          if (sessionsBySubscription.length > 0) {
            queryUsed = 'subscription_id (via subscriptions)';
            results.queries.sessions = {
              success: true,
              count: sessionsBySubscription.length,
              data: sessionsBySubscription,
              query: `db.collection('sessions').where('subscription_id', 'in', [${subscriptionIds.join(', ')}]).get()`,
              fieldUsed: queryUsed
            };
          } else {
            results.queries.sessions = {
              success: true,
              count: 0,
              data: [],
              query: `Tried student_id, studentId, and subscription_id - no sessions found`,
              fieldUsed: 'none - no sessions found'
            };
          }
        } else {
          const allSessions = sessionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          results.queries.sessions = {
            success: true,
            count: sessionsSnapshot.size,
            data: allSessions,
            query: `db.collection('sessions').where('${queryUsed === 'student_id (snake_case)' ? 'student_id' : 'studentId'}', '==', '${selectedStudentId}').get()`,
            fieldUsed: queryUsed
          };
        }

        // Get all sessions from the results
        const allSessions = results.queries.sessions?.data || [];

        // Separate sessions by status
        const attendedSessions = allSessions.filter((s: any) => s.status === 'attended');
        const scheduledSessions = allSessions.filter((s: any) => {
          if (s.status !== 'scheduled') return false;
          const sessionDate = s.scheduled_date?.toDate ? s.scheduled_date.toDate() : new Date(s.scheduled_date);
          return sessionDate >= now;
        }).sort((a: any, b: any) => {
          const dateA = a.scheduled_date?.toDate ? a.scheduled_date.toDate() : new Date(a.scheduled_date);
          const dateB = b.scheduled_date?.toDate ? b.scheduled_date.toDate() : new Date(b.scheduled_date);
          return dateA.getTime() - dateB.getTime();
        });

        results.calculations.sessionsCompleted = attendedSessions.length;
        results.calculations.upcomingSessions = scheduledSessions.length;
        results.calculations.nextSession = scheduledSessions[0] || null;
      } catch (error: any) {
        results.queries.sessions = {
          success: false,
          error: error.message
        };
        results.errors.push(`Sessions query error: ${error.message}`);
      }

      // 4. Calculate payment status for each subscription
      if (results.queries.subscriptions?.success && results.queries.subscriptions.data?.length > 0) {
        let totalPaidAllSubs = 0;
        let totalPriceAllSubs = 0;
        let hasOverdue = false;
        let hasPartial = false;

        results.calculations.subscriptionPayments = [];

        for (const subscription of results.queries.subscriptions.data) {
          const totalPrice = parseFloat(subscription.total_price || subscription.totalPrice || 0);

          if (totalPrice <= 0) continue;

          totalPriceAllSubs += totalPrice;

          // Fetch transactions for this subscription
          try {
            const transactionsRef = collection(db, 'transactions');
            const transactionsQuery = firestoreQuery(
              transactionsRef,
              where('subscription_id', '==', subscription.id),
              where('type', '==', 'income')
            );
            const transactionsSnapshot = await getDocs(transactionsQuery);

            let totalPaid = 0;
            const transactions = transactionsSnapshot.docs.map(doc => {
              const data = doc.data();
              const amount = parseFloat(data.amount || 0);
              if (amount > 0) totalPaid += amount;
              return { id: doc.id, ...data };
            });

            totalPaidAllSubs += totalPaid;

            const paymentPercentage = (totalPaid / totalPrice) * 100;
            let status = 'Fully Paid';

            if (paymentPercentage >= 99.9) {
              status = 'Fully Paid';
            } else if (paymentPercentage > 0.1) {
              status = 'Partially Paid';
              hasPartial = true;
            } else {
              status = 'Unpaid/Overdue';
              hasOverdue = true;
            }

            results.calculations.subscriptionPayments.push({
              subscriptionId: subscription.id,
              totalPrice,
              totalPaid,
              remaining: totalPrice - totalPaid,
              paymentPercentage: paymentPercentage.toFixed(1) + '%',
              status,
              transactionsCount: transactions.length,
              transactions
            });
          } catch (error: any) {
            results.errors.push(`Transactions query error for subscription ${subscription.id}: ${error.message}`);
          }
        }

        results.calculations.overallPayment = {
          totalPrice: totalPriceAllSubs,
          totalPaid: totalPaidAllSubs,
          remaining: totalPriceAllSubs - totalPaidAllSubs,
          status: hasOverdue ? 'Overdue' : hasPartial ? 'Partial' : 'Paid'
        };
      }

      setTestResults(results);
    } catch (error: any) {
      setTestResults({
        error: error.message,
        errors: [error.message]
      });
    } finally {
      setIsTestingLoading(false);
    }
  };

  if (studentsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <CardTitle>AI Context Test Panel</CardTitle>
          </div>
          <CardDescription>
            Test AI queries manually without consuming API credits. Select a student to see exactly what data the AI will receive.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Select Student</label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a student to test..." />
                </SelectTrigger>
                <SelectContent>
                  {students?.map((student: any) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.firstName || student.first_name} {student.lastName || student.last_name}
                      {student.courseName && ` - ${student.courseName}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={runTest}
              disabled={!selectedStudentId || isTestingLoading}
              size="lg"
              className="gap-2"
            >
              {isTestingLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running Test...
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4" />
                  Run Test
                </>
              )}
            </Button>
          </div>

          {testResults && (
            <div className="space-y-4 mt-6">
              {/* Errors Alert */}
              {testResults.errors && testResults.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-semibold mb-2">Errors encountered:</div>
                    <ul className="list-disc list-inside space-y-1">
                      {testResults.errors.map((error: string, i: number) => (
                        <li key={i} className="text-sm">{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Overall Payment Status */}
              {testResults.calculations?.overallPayment && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      Overall Payment Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Total Price</div>
                        <div className="font-semibold">{testResults.calculations.overallPayment.totalPrice.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Total Paid</div>
                        <div className="font-semibold text-success">{testResults.calculations.overallPayment.totalPaid.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Remaining</div>
                        <div className="font-semibold text-destructive">{testResults.calculations.overallPayment.remaining.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Status</div>
                        <Badge className={
                          testResults.calculations.overallPayment.status === 'Paid' ? 'bg-success' :
                          testResults.calculations.overallPayment.status === 'Partial' ? 'bg-warning' :
                          'bg-destructive'
                        }>
                          {testResults.calculations.overallPayment.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Next Session */}
              {testResults.calculations?.nextSession && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CalendarClock className="h-5 w-5 text-blue-600" />
                      Next Scheduled Session
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Date</div>
                        <div className="font-semibold">
                          {testResults.calculations.nextSession.scheduled_date?.toDate?.().toLocaleDateString() ||
                           new Date(testResults.calculations.nextSession.scheduled_date).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Time</div>
                        <div className="font-semibold">{testResults.calculations.nextSession.scheduled_time || 'Not set'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Duration</div>
                        <div className="font-semibold">{testResults.calculations.nextSession.duration_minutes || 60} minutes</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Session Stats */}
              {testResults.calculations && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Session Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Completed</div>
                        <div className="font-semibold text-2xl">{testResults.calculations.sessionsCompleted || 0}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Upcoming</div>
                        <div className="font-semibold text-2xl">{testResults.calculations.upcomingSessions || 0}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Total Sessions</div>
                        <div className="font-semibold text-2xl">{testResults.queries.sessions?.count || 0}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Detailed Query Results */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Raw Query Results</CardTitle>
                  <CardDescription className="text-xs">
                    Expand sections to see exact Firebase queries and their results
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <details className="mb-3">
                    <summary className="cursor-pointer font-medium mb-2 hover:text-primary">
                      Student Document {testResults.queries.student?.success ? '✓' : '✗'}
                    </summary>
                    <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-64">
                      {JSON.stringify(testResults.queries.student, null, 2)}
                    </pre>
                  </details>

                  <details className="mb-3">
                    <summary className="cursor-pointer font-medium mb-2 hover:text-primary">
                      Subscriptions ({testResults.queries.subscriptions?.count || 0}) {testResults.queries.subscriptions?.success ? '✓' : '✗'}
                    </summary>
                    <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-64">
                      {JSON.stringify(testResults.queries.subscriptions, null, 2)}
                    </pre>
                  </details>

                  <details className="mb-3">
                    <summary className="cursor-pointer font-medium mb-2 hover:text-primary">
                      Sessions ({testResults.queries.sessions?.count || 0}) {testResults.queries.sessions?.success ? '✓' : '✗'}
                    </summary>
                    <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-64">
                      {JSON.stringify(testResults.queries.sessions, null, 2)}
                    </pre>
                  </details>

                  {testResults.calculations?.subscriptionPayments && (
                    <details>
                      <summary className="cursor-pointer font-medium mb-2 hover:text-primary">
                        Payment Calculations per Subscription
                      </summary>
                      <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-64">
                        {JSON.stringify(testResults.calculations.subscriptionPayments, null, 2)}
                      </pre>
                    </details>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
