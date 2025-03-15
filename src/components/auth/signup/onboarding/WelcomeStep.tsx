
import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PartyPopper } from "lucide-react";
import confetti from "canvas-confetti";

interface WelcomeStepProps {
  firstName: string;
  onFinish: () => void;
}

const WelcomeStep: React.FC<WelcomeStepProps> = ({ 
  firstName, 
  onFinish 
}) => {
  // Trigger confetti when component mounts
  useEffect(() => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      // since particles fall down, start a bit higher than random
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-center py-8 space-y-6 animate-fade-in">
      <PartyPopper className="h-16 w-16 mx-auto text-primary" />
      
      <h1 className="text-2xl font-bold">
        Welcome to the Platform, {firstName || "New User"}!
      </h1>
      
      <p className="text-muted-foreground max-w-md mx-auto">
        Your account has been successfully set up. You're all ready to start
        managing your school and students!
      </p>
      
      <div className="mt-8">
        <Button 
          onClick={onFinish} 
          className="px-8 py-6 text-lg"
        >
          Get Started
        </Button>
      </div>
    </div>
  );
};

export default WelcomeStep;
