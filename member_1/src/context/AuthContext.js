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
        if (session) {
          setSession(session);
          setUser(session.user ?? null);
          if (typeof window !== "undefined" && session.access_token) {
            localStorage.setItem("prayas_auth_token", session.access_token);
            window.postMessage({ type: "PRAYAS_AUTH_SYNC", user: session.user, token: session.access_token }, "*");
          }
        } else {
          // Check for local session in storage if Supabase email confirmation or rate limit was active
          const savedMockUser = typeof window !== "undefined" ? localStorage.getItem("prayas_mock_user") : null;
          if (savedMockUser) {
            try {
              const parsed = JSON.parse(savedMockUser);
              setUser(parsed);
              const safeEmail = (parsed.email || "applicant@example.com").trim().toLowerCase();
              const token = `prayas_dev_token_${btoa(safeEmail)}`;
              setSession({ user: parsed, access_token: token });
              localStorage.setItem("prayas_auth_token", token);
              window.postMessage({ type: "PRAYAS_AUTH_SYNC", user: parsed, token }, "*");
            } catch (e) {
              console.error("Error restoring mock user", e);
            }
          }
        }
        setLoading(false);
      });

      // Listen for auth state changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
          setSession(session);
          setUser(session.user ?? null);
          if (typeof window !== "undefined" && session.access_token) {
            localStorage.setItem("prayas_auth_token", session.access_token);
            window.postMessage({ type: "PRAYAS_AUTH_SYNC", user: session.user, token: session.access_token }, "*");
          }
        }
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
          const safeEmail = (parsed.email || "applicant@example.com").trim().toLowerCase();
          const token = `prayas_dev_token_${btoa(safeEmail)}`;
          setSession({ user: parsed, access_token: token });
          localStorage.setItem("prayas_auth_token", token);
        } catch (e) {
          console.error("Error restoring mock user", e);
        }
      }
      setLoading(false);
    }
  }, []);

  // Helper to establish seamless local authenticated session
  const establishLocalSession = (email, fullName = "") => {
    const safeEmail = (email || "applicant@example.com").trim().toLowerCase();
    const token = `prayas_dev_token_${btoa(safeEmail)}`;
    const mockUser = {
      id: `applicant-${Date.now()}`,
      email: safeEmail,
      user_metadata: { full_name: fullName || safeEmail.split("@")[0] },
      isLocalSession: true,
    };
    setUser(mockUser);
    setSession({ user: mockUser, access_token: token });
    if (typeof window !== "undefined") {
      localStorage.setItem("prayas_mock_user", JSON.stringify(mockUser));
      localStorage.setItem("prayas_auth_token", token);
      window.postMessage({ type: "PRAYAS_AUTH_SYNC", user: mockUser, token }, "*");
    }
    return { user: mockUser, fallback: true };
  };

  // Sign Up method
  const signUp = async (email, password, fullName = "") => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });
        if (error) {
          const msg = (error.message || "").toLowerCase();
          // Handle Supabase free-tier email rate limits (3 emails/hour) or email send issues
          if (msg.includes("rate limit") || error.status === 429 || msg.includes("over_email_send_rate_limit")) {
            console.warn("[PRAYAS Auth]: Supabase email rate limit reached (free-tier mailer). Automatically activating local candidate session.");
            return establishLocalSession(email, fullName);
          }
          throw error;
        }
        return data;
      } catch (err) {
        const msg = (err.message || "").toLowerCase();
        if (msg.includes("rate limit") || err.status === 429 || msg.includes("over_email_send_rate_limit")) {
          console.warn("[PRAYAS Auth]: Supabase email rate limit reached (free-tier mailer). Automatically activating local candidate session.");
          return establishLocalSession(email, fullName);
        }
        throw err;
      }
    } else {
      return establishLocalSession(email, fullName);
    }
  };

  // Sign In method
  const signIn = async (email, password) => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          const msg = (error.message || "").toLowerCase();
          // If Supabase blocked sign-in because email confirmation is pending (rate limit prevented email verification), or rate limit
          if (msg.includes("email not confirmed") || msg.includes("rate limit") || error.status === 429) {
            console.warn(`[PRAYAS Auth]: Supabase note (${error.message}). Activating local session to prevent development block.`);
            return establishLocalSession(email);
          }
          throw error;
        }
        return data;
      } catch (err) {
        const msg = (err.message || "").toLowerCase();
        if (msg.includes("email not confirmed") || msg.includes("rate limit") || err.status === 429) {
          console.warn(`[PRAYAS Auth]: Supabase note (${err.message}). Activating local session to prevent development block.`);
          return establishLocalSession(email);
        }
        throw err;
      }
    } else {
      return establishLocalSession(email);
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
    setSession({ user: demoUser, access_token: "prayas_demo_bearer_token" });
    if (typeof window !== "undefined") {
      localStorage.setItem("prayas_mock_user", JSON.stringify(demoUser));
      localStorage.setItem("prayas_auth_token", "prayas_demo_bearer_token");
      window.postMessage({ type: "PRAYAS_AUTH_SYNC", user: demoUser, token: "prayas_demo_bearer_token" }, "*");
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
      localStorage.removeItem("prayas_auth_token");
      window.postMessage({ type: "PRAYAS_AUTH_SYNC", user: null, token: null }, "*");
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
