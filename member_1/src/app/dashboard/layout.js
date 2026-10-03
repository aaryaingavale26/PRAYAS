"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useOnboardingStatus } from "@/lib/useOnboardingStatus";

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      // Allow seamless demo without hard blocking, but encourage authentication
      console.info("Unauthenticated visitor on dashboard");
    }
  }, [user, loading, router]);

  const { status: onboarding, loading: onboardingLoading, supported: onboardingSupported } = useOnboardingStatus(user);

  // First-time users must see the CV upload step BEFORE the dashboard
  useEffect(() => {
    if (!loading && user && !onboardingLoading && onboarding?.needs_onboarding) {
      router.replace("/onboarding");
    }
  }, [loading, user, onboardingLoading, onboarding, router]);

  if (loading || (user && (onboardingLoading || onboarding?.needs_onboarding))) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-[#FBFBEF]">
        <div className="flex flex-col items-center gap-3 p-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#1F5FBF]" aria-hidden="true" />
          <p className="text-sm font-semibold text-[#18191D]">Loading your applicant workspace...</p>
        </div>
      </div>
    );
  }

  // If user is completely unauthenticated, show a friendly accessible banner or quick demo prompt
  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-[calc(100vh-80px)] bg-[#FBFBEF]">
      {/* Sidebar navigation */}
      <DashboardSidebar
        userEmail={user?.email || "Guest Applicant (Demo Mode)"}
        onSignOut={user ? signOut : undefined}
      />

      {/* Main dashboard content area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#FBFBEF]">
        {!user && (
          <div className="bg-[#2F9BE0] text-white px-6 py-2.5 text-xs sm:text-sm font-bold flex items-center justify-between border-b border-[#1F5FBF]">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>You are exploring the dashboard in Guest Preview mode.</span>
            </div>
            <Link href="/auth/login?redirect=/dashboard">
              <span className="underline hover:text-white/90 ml-2 font-extrabold">Sign In to Save Data &rarr;</span>
            </Link>
          </div>
        )}
        {user && onboardingSupported && onboarding && !onboarding.has_cv && (
          <div
            role="region"
            aria-label="CV reminder"
            className="bg-[#18191D] text-[#FBFBEF] px-6 py-3 text-xs sm:text-sm font-semibold flex flex-wrap items-center justify-between gap-2 border-b border-[#2C2D35]"
          >
            <span>Add your CV so PRAYAS can fill your passport and answer from your real experience.</span>
            <Link href="/onboarding" className="underline underline-offset-4 font-extrabold text-[#2F9BE0] hover:text-white">
              Upload your CV &rarr;
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
