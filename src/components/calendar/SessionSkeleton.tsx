
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const SessionSkeleton: React.FC = () => {
  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-start gap-4">
        {/* Time Section - Left Side */}
        <div className="flex-shrink-0 text-center min-w-[80px]">
          <Skeleton className="h-8 w-12 mb-1" />
          <Skeleton className="h-4 w-8 mb-1" />
          <Skeleton className="h-3 w-10" />
        </div>
        
        {/* Divider */}
        <div className="w-px h-16 bg-border"></div>
        
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-4 w-28 mb-4" />
              
              {/* Subscription Details */}
              <div className="rounded-md border p-3 mb-4 bg-blue-50">
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-18" />
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="grid grid-cols-4 gap-2">
                <Skeleton className="h-7 w-full" />
                <Skeleton className="h-7 w-full" />
                <Skeleton className="h-7 w-full" />
                <Skeleton className="h-7 w-full" />
              </div>
            </div>
            
            {/* Progress Counter - Right Side */}
            <div className="flex-shrink-0 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 min-w-[120px]">
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-3 w-12" />
              </div>
              
              <div className="text-center">
                <Skeleton className="h-8 w-12 mx-auto mb-1" />
                <Skeleton className="h-3 w-16 mx-auto mb-2" />
                <Skeleton className="h-5 w-14 mx-auto rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionSkeleton;
