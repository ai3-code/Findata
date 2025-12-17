'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import keycloak from '@/lib/keycloak';

interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const kc = keycloak;
    if (!kc) {
      setIsLoading(false);
      return;
    }

    const initKeycloak = async () => {
      try {
        const authenticated = await kc.init({
          onLoad: 'login-required',
          checkLoginIframe: false,
          pkceMethod: 'S256',
        });

        setIsAuthenticated(authenticated);

        if (authenticated && kc.tokenParsed) {
          setToken(kc.token || null);
          setUser({
            id: kc.tokenParsed.sub || '',
            username: kc.tokenParsed.preferred_username || '',
            email: kc.tokenParsed.email || '',
            firstName: kc.tokenParsed.given_name || '',
            lastName: kc.tokenParsed.family_name || '',
            fullName: kc.tokenParsed.name || kc.tokenParsed.preferred_username || '',
          });
        }

        // Set up token refresh
        kc.onTokenExpired = () => {
          kc.updateToken(30).then((refreshed) => {
            if (refreshed) {
              setToken(kc.token || null);
            }
          }).catch(() => {
            console.error('Failed to refresh token');
            kc.logout();
          });
        };

      } catch (error) {
        console.error('Keycloak init error:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initKeycloak();
  }, []);

  const login = useCallback(() => {
    if (keycloak) {
      keycloak.login();
    }
  }, []);

  const logout = useCallback(() => {
    if (keycloak) {
      keycloak.logout({
        redirectUri: window.location.origin,
      });
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Authenticating...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
