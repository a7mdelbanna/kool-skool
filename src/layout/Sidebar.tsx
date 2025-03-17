
import React, { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { Home, Users, BookOpen, Calendar, CreditCard, Settings, LogOut, Layers, Users2 } from 'lucide-react';
import { UserContext } from '@/App';
import { Button } from '@/components/ui/button';

const SidebarLink = ({
  to,
  icon: Icon,
  label,
  active,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
}) => {
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 transition-all',
        active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
      )}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );
};

const Sidebar = () => {
  const { open } = useSidebar(); // Use 'open' property from SidebarContext
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setUser } = useContext(UserContext);
  
  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };
  
  const links = [
    { to: '/', icon: Home, label: 'Dashboard' },
    { to: '/students', icon: Users, label: 'Students' },
    { to: '/courses', icon: BookOpen, label: 'Courses' },
    { to: '/calendar', icon: Calendar, label: 'Calendar' },
    { to: '/payments', icon: CreditCard, label: 'Payments' },
    { to: '/team-access', icon: Users2, label: 'Team Access' },
    { to: '/reports', icon: Layers, label: 'Reports' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];
  
  return (
    <div className={cn(
      "border-r bg-background h-screen fixed top-0 left-0 z-40 transition-all duration-300",
      open ? "w-64" : "w-[70px]"
    )}>
      <div className="h-full px-3 py-4 flex flex-col">
        <div className="mb-4 flex items-center justify-between">
          {open ? (
            <div className="font-bold text-xl">EduManage</div>
          ) : (
            <div className="font-bold text-xl mx-auto">EM</div>
          )}
        </div>
        
        <div className="space-y-1 flex-1">
          {links.map((link) => (
            <SidebarLink
              key={link.to}
              to={link.to}
              icon={link.icon}
              label={link.label}
              active={location.pathname === link.to}
            />
          ))}
        </div>
        
        <div className="pt-2">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-3 text-red-500" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
            <span className={cn(!open && "hidden")}>Log out</span>
          </Button>

          <Button variant="ghost" size="sm" className="w-full justify-start gap-3 mt-2">
            <span className={cn(!open && "hidden")}>v1.0.0</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
