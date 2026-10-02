import React from "react";
import { cn } from "@/lib/utils";

export function Badge({ children, variant = "default", className, ...props }) {
  const variants = {
    default: "bg-slate-100 text-slate-800 border-slate-200",
    primary: "bg-slate-900 text-white border-slate-900",
    teal: "bg-teal-50 text-teal-800 border-teal-300 font-semibold",
    success: "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold",
    warning: "bg-amber-50 text-amber-900 border-amber-300 font-semibold",
    danger: "bg-rose-50 text-rose-800 border-rose-300 font-semibold",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
