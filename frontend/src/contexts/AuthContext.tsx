import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import axios from 'axios';
import { setAccessToken } from '../api/client';
import * as authApi from '../api/auth';
import { getProfile } from '../api/users';
import type { User } from '../types/auth';

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    username: string,
    displayName: string,
    email: string,
    password: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateCurrentUser: (partial: Partial<User>) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initialized = useRef(false);

  const updateCurrentUser = useCallback((partial: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...partial } : prev));
  }, []);

  const fetchAndApplyProfile = useCallback(async (userId: string) => {
    try {
      const profile = await getProfile(userId);
      setUser((prev) =>
        prev ? { ...prev, avatarUrl: profile.avatarUrl, bio: profile.bio } : prev,
      );
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setAccessToken(null);
        setUser(null);
      } else {
        console.error('Failed to fetch user profile', err);
      }
    }
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    authApi
      .refresh()
      .then((data) => {
        setAccessToken(data.accessToken);
        const u: User = { ...data.user, avatarUrl: null, bio: null };
        setUser(u);
        void fetchAndApplyProfile(data.user.id);
      })
      .catch(() => {
        // guest state (no cookie)
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [fetchAndApplyProfile]);

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    setAccessToken(data.accessToken);
    const u: User = { ...data.user, avatarUrl: null, bio: null };
    setUser(u);
    void fetchAndApplyProfile(data.user.id);
  };

  const register = async (
    username: string,
    displayName: string,
    email: string,
    password: string,
  ) => {
    const data = await authApi.register(username, displayName, email, password);
    setAccessToken(data.accessToken);
    const u: User = { ...data.user, avatarUrl: null, bio: null };
    setUser(u);
    void fetchAndApplyProfile(data.user.id);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        login,
        register,
        logout,
        updateCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
