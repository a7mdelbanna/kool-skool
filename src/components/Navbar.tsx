
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  Users, 
  Calendar, 
  DollarSign, 
  Settings,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick?: () => void;
}

const NavItem = ({ to, icon, label, isActive, onClick }: NavItemProps) => {
  return (
    <NavLink
      to={to}
      className={cn(
        "flex items-center justify-center flex-col gap-1 p-2 rounded-lg transition-all duration-300",
        isActive 
          ? "text-primary" 
          : "text-muted-foreground hover:text-foreground"
      )}
      onClick={onClick}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </NavLink>
  );
};

const MobileNavbar = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = React.useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <>
      <div className="fixed top-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-md z-40 flex items-center justify-between px-4 border-b">
        <div className="flex items-center">
          <SidebarTrigger />
          <h1 className="text-xl font-semibold ml-3">TutorPro</h1>
        </div>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={toggleMenu}
          className="lg:hidden"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
      </div>

      {/* Mobile menu */}
      <div 
        className={cn(
          "fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md border-t z-40 transition-transform duration-300 lg:hidden",
          isOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="p-4 grid grid-cols-1 gap-2 animate-slide-up">
          <NavItem 
            to="/" 
            icon={<Home size={20} />} 
            label="Dashboard" 
            isActive={location.pathname === "/"} 
            onClick={closeMenu}
          />
          <NavItem 
            to="/students" 
            icon={<Users size={20} />} 
            label="Students" 
            isActive={location.pathname === "/students"} 
            onClick={closeMenu}
          />
          <NavItem 
            to="/calendar" 
            icon={<Calendar size={20} />} 
            label="Calendar" 
            isActive={location.pathname === "/calendar"} 
            onClick={closeMenu}
          />
          <NavItem 
            to="/payments" 
            icon={<DollarSign size={20} />} 
            label="Payments" 
            isActive={location.pathname === "/payments"} 
            onClick={closeMenu}
          />
          <NavItem 
            to="/settings" 
            icon={<Settings size={20} />} 
            label="Settings" 
            isActive={location.pathname === "/settings"} 
            onClick={closeMenu}
          />
        </div>
      </div>

      {/* Bottom tab bar (always visible on mobile) */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-md border-t z-30 grid grid-cols-5 items-center lg:hidden">
        <NavItem 
          to="/" 
          icon={<Home size={20} />} 
          label="Home" 
          isActive={location.pathname === "/"} 
        />
        <NavItem 
          to="/students" 
          icon={<Users size={20} />} 
          label="Students" 
          isActive={location.pathname === "/students"} 
        />
        <NavItem 
          to="/calendar" 
          icon={<Calendar size={20} />} 
          label="Calendar" 
          isActive={location.pathname === "/calendar"} 
        />
        <NavItem 
          to="/payments" 
          icon={<DollarSign size={20} />} 
          label="Payments" 
          isActive={location.pathname === "/payments"} 
        />
        <NavItem 
          to="/settings" 
          icon={<Settings size={20} />} 
          label="Settings" 
          isActive={location.pathname === "/settings"} 
        />
      </div>
    </>
  );
};

export default MobileNavbar;
