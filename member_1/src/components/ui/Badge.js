import React from "react";
import { cn } from "@/lib/utils";

export function Badge({ children, variant = "default", className, ...props }) {
  const variants = {
    default: "bg-[#E8E8DC] text-[#18191D] border-[#D5D5C8] font-bold",
    primary: "bg-[#18191D] text-[#FBFBEF] border-[#18191D] font-bold",
    teal: "bg-[#CEEEFD] text-[#0284C7] border-[#BAE6FD] font-bold",
    blue: "bg-[#CEEEFD] text-[#0284C7] border-[#BAE6FD] font-bold",
    success: "bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0] font-bold",
    warning: "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A] font-bold",
    danger: "bg-[#FEE2E2] text-[#991B1B] border-[#FECACA] font-bold",
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
