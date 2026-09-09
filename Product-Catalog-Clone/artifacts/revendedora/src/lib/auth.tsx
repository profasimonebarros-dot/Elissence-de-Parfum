import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { setAuthTokenGetter } from '@workspace/api-client-react';

type User = { id: number; name: string; email: string; role: string };

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'elisssence_session_token';

function apiBase(): string {
  return (import.meta.env.VITE_API_URL as string | undefined) ?? '';
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function authHeader(): Record<string, string> {
  const token = getStoredToken();
  return token ? { authorization: 'Bearer ' + token } : {};
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setAuthTokenGetter(() => getStoredToken());

    (async () => {
      const token = getStoredToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(apiBase() + '/api/auth/me', { headers: authHeader() });
        if (res.ok) {
          setUser(await res.json());
        } else {
          localStorage.removeItem(TOKEN_KEY);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch(apiBase() + '/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error ?? 'Falha no login');
    }
    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.token);
    setAuthTokenGetter(() => data.token);
    setUser({ id: data.id, name: data.name, email: data.email, role: data.role });
  };

  const logout = async () => {
    localStorage.removeItem(TOKEN_KEY);
    setAuthTokenGetter(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}