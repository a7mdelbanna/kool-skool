
import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  Users, 
  Calendar, 
  DollarSign, 
  Settings,
  LogOut,
  PlusCircle,
  GraduationCap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sidebar as SidebarComponent,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export function Sidebar() {
  return (
    <SidebarComponent className="hidden lg:flex">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">TutorPro</h1>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to="/"
                    className={({ isActive }) => 
                      cn("flex items-center gap-3 px-3 py-2 rounded-md", 
                         isActive ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                      )
                    }
                  >
                    <Home className="h-5 w-5" />
                    <span>Dashboard</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to="/students"
                    className={({ isActive }) => 
                      cn("flex items-center gap-3 px-3 py-2 rounded-md", 
                         isActive ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                      )
                    }
                  >
                    <Users className="h-5 w-5" />
                    <span>Students</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to="/calendar"
                    className={({ isActive }) => 
                      cn("flex items-center gap-3 px-3 py-2 rounded-md", 
                         isActive ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                      )
                    }
                  >
                    <Calendar className="h-5 w-5" />
                    <span>Calendar</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to="/payments"
                    className={({ isActive }) => 
                      cn("flex items-center gap-3 px-3 py-2 rounded-md", 
                         isActive ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                      )
                    }
                  >
                    <DollarSign className="h-5 w-5" />
                    <span>Payments</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to="/settings"
                    className={({ isActive }) => 
                      cn("flex items-center gap-3 px-3 py-2 rounded-md", 
                         isActive ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                      )
                    }
                  >
                    <Settings className="h-5 w-5" />
                    <span>Settings</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter>
        <div className="p-4 flex flex-col gap-4">
          <Button className="gap-2 w-full">
            <PlusCircle className="h-4 w-4" />
            <span>New Lesson</span>
          </Button>
          
          <div className="flex items-center justify-between p-2 rounded-md border">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>TP</AvatarFallback>
              </Avatar>
              <div className="text-sm">
                <div className="font-medium">Tutor Name</div>
                <div className="text-xs text-muted-foreground">tutor@example.com</div>
              </div>
            </div>
            <Button variant="ghost" size="icon">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </SidebarComponent>
  );
}
