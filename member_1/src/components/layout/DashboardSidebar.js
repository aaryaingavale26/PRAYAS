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
      className="w-full md:w-64 bg-[#18191D] text-[#FBFBEF] flex flex-col shrink-0 border-r border-[#2C2D35]"
      aria-label="Dashboard Sidebar"
    >
      {/* Sidebar Header */}
      <div className="p-6 border-b border-[#2C2D35] flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-3 focus-visible:ring-2 focus-visible:ring-[#2F9BE0] rounded-xl p-1"
          aria-label="Return to PRAYAS Home"
        >
          <img
            src="/images/prayas-icon.png"
            alt="PRAYAS Logo"
            className="h-9 w-9 rounded-xl object-contain bg-[#E0F2FE] p-1.5 shadow-sm"
          />
          <div>
            <span className="font-display text-xl font-black text-white tracking-tight">PRAYAS</span>
            <span className="text-[11px] text-[#2F9BE0] block font-bold uppercase tracking-wider">Applicant Hub</span>
          </div>
        </Link>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto" aria-label="Dashboard Navigation">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-bold transition-all min-h-[44px]",
                isActive
                  ? "bg-[#2F9BE0] text-white shadow-md shadow-[#2F9BE0]/20"
                  : "text-[#A0A2AB] hover:text-white hover:bg-[#25272E]"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn("h-5 w-5", isActive ? "text-white" : "text-[#71737E]")} aria-hidden="true" />
                <span>{item.name}</span>
              </div>
              {isActive && <ChevronRight className="h-4 w-4 text-white" aria-hidden="true" />}
            </Link>
          );
        })}
      </nav>

      {/* User / Extension Info Box */}
      <div className="p-4 border-t border-[#2C2D35] bg-[#121316]">
        <div className="p-3.5 rounded-xl bg-[#1E1F24] border border-[#2C2D35] mb-4">
          <div className="flex items-center gap-2 text-[#2F9BE0] text-xs font-bold mb-1">
            <Zap className="h-3.5 w-3.5" />
            <span>Chrome Companion</span>
          </div>
          <p className="text-xs text-[#A0A2AB] leading-relaxed">
            PRAYAS Extension syncs your passport and autofill rules.
          </p>
        </div>

        {/* User profile preview & Sign out */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="h-8 w-8 rounded-full bg-[#25272E] border border-[#2C2D35] flex items-center justify-center text-[#2F9BE0] shrink-0 font-bold text-xs">
              <UserCheck className="h-4 w-4" />
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate">
                {userEmail || "Applicant Account"}
              </p>
              <span className="text-[10px] text-[#2F9BE0] font-bold">Active Session</span>
            </div>
          </div>

          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              suppressHydrationWarning
              className="p-2 text-[#A0A2AB] hover:text-rose-400 hover:bg-[#25272E] rounded-lg focus-visible:ring-2 focus-visible:ring-[#2F9BE0] transition-colors cursor-pointer"
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
