import React, { useState } from 'react';
import { AlertTriangle, Clock, Database, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { runTimezoneMigration } from '@/scripts/migrateToCairoTimezone';
import { toast } from 'sonner';

interface TimezoneMigrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TimezoneMigrationDialog: React.FC<TimezoneMigrationDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'running' | 'complete' | 'error'>('idle');
  const [logs, setLogs] = useState<string[]>([]);

  const handleMigration = async () => {
    setIsRunning(true);
    setStatus('running');
    setProgress(0);
    setLogs([]);

    // Capture console logs
    const originalLog = console.log;
    const originalError = console.error;
    
    console.log = (message: string, ...args: any[]) => {
      originalLog(message, ...args);
      if (typeof message === 'string') {
        setLogs(prev => [...prev, message]);
        
        // Update progress based on log messages
        if (message.includes('Starting')) setProgress(10);
        if (message.includes('transaction migration complete')) setProgress(30);
        if (message.includes('session migration complete')) setProgress(50);
        if (message.includes('subscription migration complete')) setProgress(70);
        if (message.includes('Firebase')) setProgress(85);
        if (message.includes('Migration complete!')) setProgress(100);
      }
    };

    console.error = (message: string, ...args: any[]) => {
      originalError(message, ...args);
      if (typeof message === 'string') {
        setLogs(prev => [...prev, `ERROR: ${message}`]);
      }
    };

    try {
      await runTimezoneMigration();
      setStatus('complete');
      toast.success('Timezone migration completed successfully!');
      
      // Wait a bit before closing
      setTimeout(() => {
        onOpenChange(false);
        // Reload the page to show updated data
        window.location.reload();
      }, 2000);
    } catch (error) {
      setStatus('error');
      toast.error('Migration failed. Please check the logs.');
      console.error('Migration error:', error);
    } finally {
      // Restore original console methods
      console.log = originalLog;
      console.error = originalError;
      setIsRunning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timezone Data Migration
          </DialogTitle>
          <DialogDescription>
            Convert all existing dates from UTC to Cairo timezone
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-900">
              <strong>Important:</strong> This migration will update all dates in your database
              to use Africa/Cairo timezone. This action cannot be undone automatically.
              Please ensure you have a backup before proceeding.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">What will be migrated:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <Database className="h-3 w-3" />
                All transaction dates
              </li>
              <li className="flex items-center gap-2">
                <Database className="h-3 w-3" />
                All lesson session dates
              </li>
              <li className="flex items-center gap-2">
                <Database className="h-3 w-3" />
                All subscription start dates
              </li>
              <li className="flex items-center gap-2">
                <Database className="h-3 w-3" />
                Firebase session and subscription dates
              </li>
            </ul>
          </div>

          {status !== 'idle' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Migration Progress</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {logs.length > 0 && (
                <div className="bg-muted rounded-lg p-3 max-h-48 overflow-y-auto">
                  <div className="space-y-1">
                    {logs.slice(-10).map((log, index) => (
                      <div
                        key={index}
                        className={`text-xs font-mono ${
                          log.includes('ERROR') ? 'text-red-600' : 
                          log.includes('✅') ? 'text-green-600' : 
                          'text-muted-foreground'
                        }`}
                      >
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {status === 'complete' && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-900">
                    Migration completed successfully! The page will refresh shortly.
                  </AlertDescription>
                </Alert>
              )}

              {status === 'error' && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-900">
                    Migration failed. Please check the logs and try again.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRunning}
          >
            Cancel
          </Button>
          <Button
            onClick={handleMigration}
            disabled={isRunning || status === 'complete'}
            className="gap-2"
          >
            {isRunning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Running Migration...
              </>
            ) : status === 'complete' ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Completed
              </>
            ) : (
              <>
                <Database className="h-4 w-4" />
                Start Migration
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TimezoneMigrationDialog;