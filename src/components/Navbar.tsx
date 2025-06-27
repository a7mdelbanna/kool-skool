
import React from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import UserProfile from './UserProfile';

const MobileNavbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-2 md:hidden fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-gray-800">TutorPro</h1>
        </div>
        <UserProfile />
      </div>
    </header>
  );
};

export default MobileNavbar;
