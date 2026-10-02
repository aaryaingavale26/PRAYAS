"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, Sliders, ShieldCheck, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export function DashboardHeader({ title = "Applicant Dashboard", subtitle = "Manage your accessibility preferences, application docs, and scorecard insights." }) {
  return (
    <header className="bg-[#FBFBEF] border-b border-[#E2E2D4] px-6 py-5 sm:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#18191D] tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-[#4B4D56]">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="blue" className="px-3 py-1.5 text-xs font-bold bg-[#CEEEFD] text-[#0284C7] border-[#BAE6FD]">
            <Sparkles className="h-3.5 w-3.5 text-[#0284C7]" />
            AI Assistant Ready
          </Badge>
          <Link
            href="/"
            className="text-xs font-bold text-[#18191D] hover:text-black inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#D5D5C8] bg-[#F3F3E3] hover:bg-[#E8E8DC] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Main Site
          </Link>
        </div>
      </div>
    </header>
  );
}
