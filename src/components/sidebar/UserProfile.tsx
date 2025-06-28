
import React, { useContext, useState } from 'react';
import { LogOut, Settings } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { UserContext } from '@/App';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import TimezoneSelector from '@/components/TimezoneSelector';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getEffectiveTimezone } from '@/utils/timezone';

interface UserProfileProps {
  isCollapsed: boolean;
  onLogout: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ isCollapsed, onLogout }) => {
  const { user, setUser } = useContext(UserContext);
  const { toast } = useToast();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

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
  const currentTimezone = getEffectiveTimezone(user?.timezone);

  const handleTimezoneChange = async (newTimezone: string) => {
    if (!user?.id) return;

    try {
      setUpdating(true);
      
      const { error } = await supabase
        .from('users')
        .update({ timezone: newTimezone })
        .eq('id', user.id);

      if (error) throw error;

      // Update user context
      setUser(prev => prev ? { ...prev, timezone: newTimezone } : prev);

      // Update localStorage
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsedData = JSON.parse(userData);
        parsedData.timezone = newTimezone;
        localStorage.setItem('user', JSON.stringify(parsedData));
      }

      toast({
        title: "Timezone updated",
        description: `Your timezone has been changed to ${newTimezone}`,
      });

      setSettingsOpen(false);
    } catch (error: any) {
      console.error('Error updating timezone:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update timezone",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center space-y-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src={user?.avatar} alt={displayName} />
          <AvatarFallback className="bg-blue-500 text-white text-xs">
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>

        <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-700 hover:bg-blue-50 hover:text-blue-600"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" side="right">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
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
              
              <TimezoneSelector
                value={currentTimezone}
                onValueChange={handleTimezoneChange}
                disabled={updating}
              />
            </div>
          </PopoverContent>
        </Popover>

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
        
        <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-700 hover:bg-blue-50 hover:text-blue-600"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" side="top">
            <div className="space-y-4">
              <h3 className="font-medium">User Settings</h3>
              
              <TimezoneSelector
                value={currentTimezone}
                onValueChange={handleTimezoneChange}
                disabled={updating}
              />
            </div>
          </PopoverContent>
        </Popover>
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
