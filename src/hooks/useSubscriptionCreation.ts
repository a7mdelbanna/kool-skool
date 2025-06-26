
import { useState, useRef } from 'react';

export const useSubscriptionCreation = () => {
  const [isCreating, setIsCreating] = useState(false);
  const lastCreationAttempt = useRef<number>(0);
  const creationTimeoutRef = useRef<NodeJS.Timeout>();

  const preventRapidCalls = (callback: () => Promise<void>) => {
    return async () => {
      const now = Date.now();
      const timeSinceLastAttempt = now - lastCreationAttempt.current;
      
      // Prevent calls within 2 seconds of each other
      if (timeSinceLastAttempt < 2000) {
        console.warn('🚫 RAPID CALL PREVENTED: Too soon since last subscription creation attempt');
        return;
      }
      
      // Prevent multiple simultaneous calls
      if (isCreating) {
        console.warn('🚫 DUPLICATE CALL PREVENTED: Subscription creation already in progress');
        return;
      }
      
      try {
        setIsCreating(true);
        lastCreationAttempt.current = now;
        
        // Clear any existing timeout
        if (creationTimeoutRef.current) {
          clearTimeout(creationTimeoutRef.current);
        }
        
        // Set a timeout to reset the creating state
        creationTimeoutRef.current = setTimeout(() => {
          setIsCreating(false);
        }, 10000); // Reset after 10 seconds max
        
        await callback();
      } catch (error) {
        console.error('Error in subscription creation:', error);
        throw error;
      } finally {
        setIsCreating(false);
        if (creationTimeoutRef.current) {
          clearTimeout(creationTimeoutRef.current);
        }
      }
    };
  };

  return {
    isCreating,
    preventRapidCalls
  };
};
