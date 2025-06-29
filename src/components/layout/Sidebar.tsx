
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  GraduationCap, 
  Calendar, 
  DollarSign, 
  Users,
  Settings,
  BookOpen,
  FileText,
  CreditCard,
  Target
} from 'lucide-react';

const navigation = [
  { 
    name: 'Dashboard', 
    href: '/dashboard', 
    icon: LayoutDashboard 
  },
  { 
    name: 'Students', 
    href: '/students', 
    icon: GraduationCap 
  },
  { 
    name: 'Groups', 
    href: '/groups', 
    icon: Users 
  },
  { 
    name: 'Calendar', 
    href: '/calendar', 
    icon: Calendar 
  },
  { 
    name: 'Courses', 
    href: '/courses', 
    icon: BookOpen 
  },
  { 
    name: 'Transactions', 
    href: '/transactions', 
    icon: CreditCard 
  },
  { 
    name: 'Reports', 
    href: '/reports', 
    icon: FileText 
  },
  { 
    name: 'Goals', 
    href: '/goals', 
    icon: Target 
  },
  { 
    name: 'Settings', 
    href: '/settings', 
    icon: Settings 
  },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <nav className="mt-8 flex-1 px-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-blue-50 border-r-2 border-blue-600 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon
                  className={cn(
                    'mr-3 flex-shrink-0 h-5 w-5',
                    isActive ? 'text-blue-600' : 'text-gray-400'
                  )}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
