"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Sliders,
  FileText,
  ShieldCheck,
  Zap,
  LogOut,
  ChevronRight,
  Accessibility,
  UserCheck,
  Bot
} from "lucide-react";
import { cn } from "@/lib/utils";

export function DashboardSidebar({ userEmail, onSignOut }) {
  const pathname = usePathname();

  const navigation = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Accessibility Passport", href: "/passport", icon: Sliders },
    { name: "Document Hub", href: "/documents", icon: FileText },
    { name: "AI Assistant", href: "/assistant", icon: Bot },
    { name: "Accessibility Scorecard", href: "/scorecard", icon: ShieldCheck },
  ];

  return (
    <aside
      className="w-full md:w-64 bg-slate-900 text-slate-100 flex flex-col shrink-0 border-r border-slate-800"
      aria-label="Dashboard Sidebar"
    >
      {/* Sidebar Header */}
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2.5 focus-visible:ring-2 focus-visible:ring-teal-400 rounded-lg p-1"
          aria-label="Return to PRAYAS Home"
        >
          <div className="h-9 w-9 rounded-lg bg-teal-600 flex items-center justify-center text-white">
            <Accessibility className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <span className="text-lg font-bold text-white tracking-tight">PRAYAS</span>
            <span className="text-xs text-teal-400 block font-medium">Dashboard Hub</span>
          </div>
        </Link>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto" aria-label="Dashboard Navigation">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all min-h-[44px]",
                isActive
                  ? "bg-teal-700 text-white font-bold shadow-xs"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn("h-5 w-5", isActive ? "text-white" : "text-slate-400")} aria-hidden="true" />
                <span>{item.name}</span>
              </div>
              {isActive && <ChevronRight className="h-4 w-4 text-teal-200" aria-hidden="true" />}
            </Link>
          );
        })}
      </nav>

      {/* User / Extension Info Box */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 mb-4">
          <div className="flex items-center gap-2 text-teal-400 text-xs font-bold mb-1">
            <Zap className="h-3.5 w-3.5" />
            <span>Chrome Companion</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            PRAYAS Extension syncs your passport and autofill rules.
          </p>
        </div>

        {/* User profile preview & Sign out */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-teal-400 shrink-0">
              <UserCheck className="h-4 w-4" />
            </div>
            <div className="truncate">
              <p className="text-xs font-medium text-slate-200 truncate">
                {userEmail || "Applicant Account"}
              </p>
              <span className="text-[10px] text-teal-400 font-semibold">Active Session</span>
            </div>
          </div>

          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg focus-visible:ring-2 focus-visible:ring-teal-400 transition-colors"
              aria-label="Sign out of account"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
