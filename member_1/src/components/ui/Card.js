import React from "react";
import { cn } from "@/lib/utils";

export function Card({ children, className, as: Component = "div", ...props }) {
  return (
    <Component
      className={cn(
        "bg-[#FFFFFF] rounded-2xl border border-[#E2E2D4] shadow-xs p-6 text-[#18191D] transition-all hover:border-[#2F9BE0]/40",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export function CardHeader({ children, className, ...props }) {
  return (
    <div className={cn("flex flex-col space-y-1.5 pb-4 border-b border-[#F0F0E4] mb-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className, as: Component = "h3", ...props }) {
  return (
    <Component className={cn("font-display text-xl font-bold tracking-tight text-[#18191D]", className)} {...props}>
      {children}
    </Component>
  );
}

export function CardDescription({ children, className, ...props }) {
  return (
    <p className={cn("text-sm text-[#4B4D56] leading-relaxed", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className, ...props }) {
  return (
    <div className={cn("pt-0", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className, ...props }) {
  return (
    <div className={cn("flex items-center pt-4 border-t border-slate-100 mt-4", className)} {...props}>
      {children}
    </div>
  );
}
