import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { setAccessToken } from '../api/client';
import * as authApi from '../api/auth';
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
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    authApi
      .refresh()
      .then((data) => {
        setAccessToken(data.accessToken);
        setUser(data.user);
      })
      .catch(() => {
        // ゲスト状態のまま（Cookie がない場合は正常パス）
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    setAccessToken(data.accessToken);
    setUser(data.user);
  };

  const register = async (
    username: string,
    displayName: string,
    email: string,
    password: string,
  ) => {
    const data = await authApi.register(username, displayName, email, password);
    setAccessToken(data.accessToken);
    setUser(data.user);
  };

  const logout = async () => {
    await authApi.logout();
    setAccessToken(null);
    setUser(null);
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
