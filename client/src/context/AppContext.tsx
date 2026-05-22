import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import type { User } from '../types';

interface AppContextType {
  user: User | null;
  token: boolean; // derived: true when user is logged in
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  updateCredits: (credits: number) => void;
}

export const AppContext = createContext<AppContextType>({} as AppContextType);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Derived token: true when user is authenticated
  const token = !!user;

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/auth/me');
      if (data.success) {
        setUser(data.user);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check if user is logged in on mount (via httpOnly cookie)
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Handle OAuth redirect — tokens are now set as httpOnly cookies by server
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthSuccess = params.get('oauth') === 'success';
    const errorParam = params.get('error');

    if (oauthSuccess) {
      toast.success('Welcome! Logged in successfully');
      fetchUser();
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (errorParam) {
      const errorMsg = decodeURIComponent(errorParam);
      toast.error(`Authentication failed: ${errorMsg}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [fetchUser]);

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/login', { email, password });
      if (data.success) {
        setUser(data.user);
        toast.success('Welcome back!');
        return true;
      }
      return false;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/register', { name, email, password });
      if (data.success) {
        setUser(data.user);
        toast.success('Account created! You have free generation credits.');
        return true;
      }
      return false;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // silent
    } finally {
      setUser(null);
    }
  };

  const updateCredits = (credits: number) => {
    setUser((prev) => prev ? { ...prev, credits } : null);
  };

  return (
    <AppContext.Provider value={{ user, token, loading, login, register, logout, fetchUser, updateCredits }}>
      {children}
    </AppContext.Provider>
  );
};
