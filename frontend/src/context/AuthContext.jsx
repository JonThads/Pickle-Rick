import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';

const TOKEN_KEY = 'pickleRickToken';

const AuthContext = createContext(null);

/**
 * Holds the logged-in user everywhere in the app (NavBar, ProfileSettings,
 * route guards). JWTs are stateless, so "logout" is entirely client-side:
 * drop the token and reset state - there is no server session to invalidate.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then(({ user: me }) => setUser(me))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback((nextUser, token) => {
    localStorage.setItem(TOKEN_KEY, token);
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
