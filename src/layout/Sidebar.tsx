
import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  BarChart3,
  Users,
  Calendar,
  BookOpen,
  CreditCard,
  UserCheck,
  TrendingUp,
  Key,
  Settings,
} from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    { icon: BarChart3, label: 'Dashboard', path: '/' },
    { icon: Users, label: 'Students', path: '/students' },
    { icon: Calendar, label: 'Calendar', path: '/calendar' },
    { icon: BookOpen, label: 'Courses', path: '/courses' },
    { icon: CreditCard, label: 'Payments', path: '/payments' },
    { icon: UserCheck, label: 'Contacts', path: '/contacts' },
    { icon: Users, label: 'Team Access', path: '/team-access' },
    { icon: TrendingUp, label: 'Reports', path: '/states-reports' },
    { icon: Key, label: 'License', path: '/license-management' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="w-64 bg-gray-50 border-r min-h-screen py-4 hidden md:block">
      <div className="px-6 py-2">
        <h1 className="text-2xl font-bold text-gray-800">TutorPro</h1>
      </div>
      <nav className="mt-6">
        {menuItems.map((item) => (
          <Link
            to={item.path}
            key={item.label}
            className={`flex items-center px-6 py-3 text-gray-700 hover:bg-gray-200 hover:text-gray-900 transition-colors ${
              location.pathname === item.path ? 'bg-gray-200 font-medium text-gray-900' : ''
            }`}
          >
            <item.icon className="h-5 w-5 mr-3" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
