"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

const AuthContext = createContext({
  user: null,
  session: null,
  loading: true,
  isConfigured: false,
  signUp: async () => {},
  signIn: async () => {},
  signInAsDemo: () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. If Supabase is configured, use real auth
    if (isSupabaseConfigured && supabase) {
      // Get initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      });

      // Listen for auth state changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    } else {
      // 2. Check for local mock session in storage if Supabase is not configured
      const savedMockUser = typeof window !== "undefined" ? localStorage.getItem("prayas_mock_user") : null;
      if (savedMockUser) {
        try {
          const parsed = JSON.parse(savedMockUser);
          setUser(parsed);
          setSession({ user: parsed, access_token: "mock-token" });
        } catch (e) {
          console.error("Error restoring mock user", e);
        }
      }
      setLoading(false);
    }
  }, []);

  // Sign Up method
  const signUp = async (email, password, fullName = "") => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      if (error) throw error;
      return data;
    } else {
      // Local fallback
      const mockUser = {
        id: `mock-user-${Date.now()}`,
        email,
        user_metadata: { full_name: fullName || email.split("@")[0] },
      };
      setUser(mockUser);
      setSession({ user: mockUser, access_token: "mock-token" });
      localStorage.setItem("prayas_mock_user", JSON.stringify(mockUser));
      return { user: mockUser };
    }
  };

  // Sign In method
  const signIn = async (email, password) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return data;
    } else {
      // Local fallback
      const mockUser = {
        id: "mock-user-123",
        email,
        user_metadata: { full_name: email.split("@")[0] },
      };
      setUser(mockUser);
      setSession({ user: mockUser, access_token: "mock-token" });
      localStorage.setItem("prayas_mock_user", JSON.stringify(mockUser));
      return { user: mockUser };
    }
  };

  // Demo Sign In for instant Hackathon presentations & testing
  const signInAsDemo = () => {
    const demoUser = {
      id: "demo-applicant-001",
      email: "rahul.sharma@applicant.in",
      user_metadata: {
        full_name: "Rahul Sharma",
        disability_mode: "Screen Reader & Voice Nav",
      },
    };
    setUser(demoUser);
    setSession({ user: demoUser, access_token: "demo-token" });
    if (typeof window !== "undefined") {
      localStorage.setItem("prayas_mock_user", JSON.stringify(demoUser));
    }
    return demoUser;
  };

  // Sign Out method
  const signOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("prayas_mock_user");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConfigured: isSupabaseConfigured,
        signUp,
        signIn,
        signInAsDemo,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
