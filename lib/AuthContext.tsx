"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { AuthUser, UserRole } from "@/lib/types";
import { authApi } from "@/lib/api-client";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage or validate token
  useEffect(() => {
    async function restoreSession() {
      try {
        const stored = localStorage.getItem("pitchprep_user");
        const token = localStorage.getItem("pitchprep_token");
        if (stored && token) {
          // Validate token with server
          try {
            const { user: serverUser } = await authApi.me();
            const authUser: AuthUser = {
              email: serverUser.email,
              name: serverUser.name,
              role: serverUser.role as UserRole,
            };
            setUser(authUser);
            localStorage.setItem("pitchprep_user", JSON.stringify(authUser));
          } catch {
            // Token expired or invalid — clear stale session
            localStorage.removeItem("pitchprep_user");
            localStorage.removeItem("pitchprep_token");
            setUser(null);
          }
        }
      } catch {
        // ignore
      }
      setIsLoading(false);
    }
    restoreSession();
  }, []);

  const login = useCallback(async (email: string, password: string, role: UserRole): Promise<boolean> => {
    try {
      const { user: serverUser } = await authApi.login(email, password, role);
      const authUser: AuthUser = {
        email: serverUser.email,
        name: serverUser.name,
        role: serverUser.role as UserRole,
      };
      setUser(authUser);
      localStorage.setItem("pitchprep_user", JSON.stringify(authUser));
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    authApi.logout();
    localStorage.removeItem("pitchprep_user");
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isAdmin: user?.role === "admin",
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
