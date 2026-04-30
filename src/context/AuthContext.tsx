import { createContext, useState, useEffect, type ReactNode } from 'react';
import type { AuthResponse, User } from '../types/auth.types';

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  login: (authData: AuthResponse) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // On load, check if we have a token in localStorage
    const storedToken = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setAccessToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center bg-gray-50"><div className="w-10 h-10 border-4 border-law-navy/20 border-t-law-navy rounded-full animate-spin"></div></div>;
  }

  const login = (authData: AuthResponse) => {
    const userData: User = {
      id: authData.id,
      email: authData.email,
      fullName: authData.fullName,
      userType: authData.userType
    };
    
    setUser(userData);
    setAccessToken(authData.accessToken);
    
    localStorage.setItem('accessToken', authData.accessToken);
    localStorage.setItem('refreshToken', authData.refreshToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, login, logout, isAuthenticated: !!accessToken }}>
      {children}
    </AuthContext.Provider>
  );
};
