import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  UserMinus,
  Users
} from 'lucide-react';
import { cleanupTeacherAssignments, checkTeacherAssignments } from '@/services/migration/cleanupTeacherAssignments';
import { toast } from 'sonner';

const MigrationTools = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [checkResults, setCheckResults] = useState<any>(null);
  const [migrationResults, setMigrationResults] = useState<any>(null);

  // Check if user is admin
  const getUserData = () => {
    const userData = localStorage.getItem('user');
    if (!userData) return null;
    return JSON.parse(userData);
  };

  const user = getUserData();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  if (!isAdmin) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <ShieldCheck className="h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Only administrators can access migration tools.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCheck = async () => {
    setIsChecking(true);
    setCheckResults(null);

    try {
      const results = await checkTeacherAssignments();
      setCheckResults(results);
      toast.success('Check completed successfully');
    } catch (error: any) {
      toast.error('Check failed: ' + error.message);
      console.error('Check error:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleMigration = async () => {
    const confirm = window.confirm(
      'This will move all teacher assignments from students to subscriptions. ' +
      'This action cannot be undone. Are you sure you want to continue?'
    );

    if (!confirm) return;

    setIsMigrating(true);
    setMigrationResults(null);

    try {
      const results = await cleanupTeacherAssignments();
      setMigrationResults(results);

      if (results.success) {
        toast.success('Migration completed successfully!');
      } else {
        toast.error('Migration completed with errors');
      }
    } catch (error: any) {
      toast.error('Migration failed: ' + error.message);
      console.error('Migration error:', error);
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Migration Tools</h1>
        <p className="text-muted-foreground mt-2">
          Database migration and cleanup utilities
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserMinus className="h-5 w-5" />
            Teacher Assignment Cleanup
          </CardTitle>
          <CardDescription>
            Move teacher assignments from student records to individual subscriptions.
            This allows students to have different teachers for different courses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>What this migration does:</strong>
              <ul className="mt-2 ml-4 list-disc space-y-1">
                <li>Removes teacher assignments from student profiles</li>
                <li>Moves teacher assignments to individual subscriptions</li>
                <li>Identifies admin users incorrectly assigned as teachers</li>
                <li>Preserves all existing data relationships</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="flex gap-3">
            <Button
              onClick={handleCheck}
              disabled={isChecking || isMigrating}
              variant="outline"
            >
              {isChecking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Check Status
                </>
              )}
            </Button>

            <Button
              onClick={handleMigration}
              disabled={isChecking || isMigrating}
              variant="default"
            >
              {isMigrating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Migrating...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Run Migration
                </>
              )}
            </Button>
          </div>

          {/* Check Results */}
          {checkResults && (
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Check Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-800">
                  <span className="text-sm">Students with teacher assignments:</span>
                  <Badge variant={checkResults.studentsWithTeachers > 0 ? "destructive" : "success"}>
                    {checkResults.studentsWithTeachers}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-800">
                  <span className="text-sm">Subscriptions needing teacher:</span>
                  <Badge variant={checkResults.subscriptionsNeedingTeacher > 0 ? "warning" : "success"}>
                    {checkResults.subscriptionsNeedingTeacher}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-800">
                  <span className="text-sm">Admins assigned as teachers:</span>
                  <Badge variant={checkResults.adminsAsTeachers > 0 ? "destructive" : "success"}>
                    {checkResults.adminsAsTeachers}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Migration Results */}
          {migrationResults && (
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {migrationResults.success ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Migration Complete
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      Migration Completed with Issues
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-800">
                  <span className="text-sm">Successfully processed:</span>
                  <Badge variant="success">{migrationResults.processed}</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-800">
                  <span className="text-sm">Errors encountered:</span>
                  <Badge variant={migrationResults.errors > 0 ? "destructive" : "success"}>
                    {migrationResults.errors}
                  </Badge>
                </div>

                {migrationResults.errorDetails && migrationResults.errorDetails.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold mb-2">Error Details:</p>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {migrationResults.errorDetails.map((error: string, index: number) => (
                        <div key={index} className="text-xs text-red-600 p-2 bg-red-50 dark:bg-red-950/20 rounded">
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MigrationTools;

// Helper component for badges
const Badge: React.FC<{
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'destructive'
}> = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-900',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    destructive: 'bg-red-100 text-red-800'
  };

  return (
    <span className={`px-2 py-1 rounded-md text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
};