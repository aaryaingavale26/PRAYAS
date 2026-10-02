"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, Sliders, ShieldCheck, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export function DashboardHeader({ title = "Applicant Dashboard", subtitle = "Manage your accessibility preferences, application docs, and scorecard insights." }) {
  return (
    <header className="bg-white border-b border-slate-200 px-6 py-5 sm:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-600">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="teal" className="px-3 py-1.5 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-teal-700" />
            AI Assistant Ready
          </Badge>
          <Link
            href="/"
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Main Site
          </Link>
        </div>
      </div>
    </header>
  );
}
