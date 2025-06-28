
import React, { useContext } from 'react';
import { LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { UserContext } from '@/App';
import { cn } from '@/lib/utils';

interface UserProfileProps {
  isCollapsed: boolean;
  onLogout: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ isCollapsed, onLogout }) => {
  const { user } = useContext(UserContext);

  // Get user initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get user display name
  const displayName = user?.name || user?.email?.split('@')[0] || 'User';
  const userEmail = user?.email || '';

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center space-y-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src={user?.avatar} alt={displayName} />
          <AvatarFallback className="bg-blue-500 text-white text-xs">
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
        <Button
          onClick={onLogout}
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-700 hover:bg-red-50 hover:text-red-600"
          title="Logout"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* User Info Section */}
      <div className="flex items-center gap-3 px-3 py-2 bg-white rounded-lg border border-gray-200">
        <Avatar className="h-10 w-10">
          <AvatarImage src={user?.avatar} alt={displayName} />
          <AvatarFallback className="bg-blue-500 text-white text-sm">
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {displayName}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {userEmail}
          </p>
        </div>
      </div>

      {/* Logout Button */}
      <Button
        onClick={onLogout}
        variant="ghost"
        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-gray-700 hover:bg-red-50 hover:text-red-600 hover:shadow-sm border border-transparent hover:border-red-200"
      >
        <LogOut className="h-4 w-4" />
        <span>Sign Out</span>
      </Button>
    </div>
  );
};

export default UserProfile;
