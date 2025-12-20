import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface User {
  email: string;
  displayName: string;
}

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: () => void;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const SKIP_AUTH = import.meta.env.VITE_SKIP_AUTH === 'true';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(SKIP_AUTH ? { email: 'beta@advm.lu', displayName: 'Beta User' } : null);
  const [isLoading, setIsLoading] = useState(!SKIP_AUTH);
  const [error, setError] = useState<string | null>(null);

  // Check for session token or errors in URL (from OAuth callback)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // Handle session token from callback
    const sessionToken = params.get('session');
    if (sessionToken) {
      localStorage.setItem('session', sessionToken);
      window.history.replaceState({}, '', window.location.pathname);
    }
    
    // Handle errors
    const urlError = params.get('error');
    if (urlError) {
      const errorMessages: Record<string, string> = {
        domain_not_allowed: 'Acesso restrito a usuários @advm.lu',
        invalid_state: 'Sessão expirada. Tente novamente.',
        auth_failed: 'Falha na autenticação. Tente novamente.',
        access_denied: 'Acesso negado pelo usuário.',
      };
      setError(errorMessages[urlError] || 'Erro de autenticação');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Check current session on mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const sessionId = localStorage.getItem('session');
      if (!sessionId) {
        setIsLoading(false);
        return;
      }
      
      const response = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${sessionId}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUser({ email: data.email, displayName: data.name });
      } else {
        localStorage.removeItem('session');
      }
    } catch (err) {
      // Not authenticated - that's ok
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        credentials: 'include',
      });
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError('Falha ao iniciar login');
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const sessionId = localStorage.getItem('session');
      if (sessionId) {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${sessionId}` },
        });
      }
    } catch (err) {
      // Ignore errors
    } finally {
      localStorage.removeItem('session');
      setUser(null);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    logout,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
