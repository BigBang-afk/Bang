import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { AppUser } from '../api/types';
import * as api from '../api/client';

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  login: (
    identifier: string,
    password: string,
    totpCode?: string,
  ) => Promise<{ mfaRequired: boolean }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (code: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .refreshSession()
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (identifier: string, password: string, totpCode?: string) => {
    const result = await api.login(identifier, password, totpCode);
    if (!result.mfaRequired) {
      setUser(result.user);
    }
    return { mfaRequired: result.mfaRequired };
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const fresh = await api.apiJson<AppUser>('/users/me');
    setUser((prev) => (prev ? { ...fresh, roleNames: prev.roleNames, permissions: prev.permissions } : fresh));
  }, []);

  const hasPermission = useCallback((code: string) => api.hasPermission(code), []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
