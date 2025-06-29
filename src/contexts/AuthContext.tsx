
import React, { createContext, useContext, useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  school_id?: string;
  schoolId?: string; // Add for compatibility
  name?: string; // Add for UserProfile compatibility
  avatar?: string; // Add for UserProfile compatibility
  timezone?: string;
}

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  isLoading: true,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored user data
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        // Ensure compatibility between school_id and schoolId
        if (parsedUser.school_id && !parsedUser.schoolId) {
          parsedUser.schoolId = parsedUser.school_id;
        }
        // Create name from first_name and last_name if not provided
        if (!parsedUser.name && (parsedUser.first_name || parsedUser.last_name)) {
          parsedUser.name = `${parsedUser.first_name || ''} ${parsedUser.last_name || ''}`.trim();
        }
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const handleSetUser = (newUser: User | null) => {
    if (newUser) {
      // Ensure compatibility between school_id and schoolId
      if (newUser.school_id && !newUser.schoolId) {
        newUser.schoolId = newUser.school_id;
      }
      // Create name from first_name and last_name if not provided
      if (!newUser.name && (newUser.first_name || newUser.last_name)) {
        newUser.name = `${newUser.first_name || ''} ${newUser.last_name || ''}`.trim();
      }
    }
    
    setUser(newUser);
    if (newUser) {
      localStorage.setItem('user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('user');
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser: handleSetUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
