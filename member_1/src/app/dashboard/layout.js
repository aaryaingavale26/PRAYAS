"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      // Allow seamless demo without hard blocking, but encourage authentication
      console.info("Unauthenticated visitor on dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 p-8">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" aria-hidden="true" />
          <p className="text-sm font-semibold text-slate-700">Loading your applicant workspace...</p>
        </div>
      </div>
    );
  }

  // If user is completely unauthenticated, show a friendly accessible banner or quick demo prompt
  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-[calc(100vh-80px)] bg-slate-100">
      {/* Sidebar navigation */}
      <DashboardSidebar
        userEmail={user?.email || "Guest Applicant (Demo Mode)"}
        onSignOut={user ? signOut : undefined}
      />

      {/* Main dashboard content area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        {!user && (
          <div className="bg-amber-500 text-slate-950 px-6 py-2.5 text-xs sm:text-sm font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>You are exploring the dashboard in Guest Preview mode.</span>
            </div>
            <Link href="/auth/login?redirect=/dashboard">
              <span className="underline hover:text-slate-900 ml-2">Sign In to Save Data &rarr;</span>
            </Link>
          </div>
        )}
        <DashboardHeader />
        <div className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
