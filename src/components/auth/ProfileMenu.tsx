
import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, LogOut, User } from "lucide-react";
import { Link } from "react-router-dom";

const ProfileMenu = () => {
  const { user, signOut } = useAuth();

  if (!user) return null;

  const userInitials = user.email 
    ? user.email.charAt(0).toUpperCase() 
    : "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative rounded-full h-10 w-10 flex items-center justify-center bg-primary/10 hover:bg-primary/20 transition">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.user_metadata?.profile_picture || ""} />
            <AvatarFallback className="bg-primary/10">
              {userInitials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <span className="block text-sm">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <Link to="/settings">
          <DropdownMenuItem>
            <Settings className="h-4 w-4 mr-2" />
            <span>Settings</span>
          </DropdownMenuItem>
        </Link>
        <DropdownMenuItem onClick={signOut}>
          <LogOut className="h-4 w-4 mr-2" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileMenu;
