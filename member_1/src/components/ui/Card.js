import React from "react";
import { cn } from "@/lib/utils";

export function Card({ children, className, as: Component = "div", ...props }) {
  return (
    <Component
      className={cn(
        "bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 text-slate-800 transition-all hover:border-slate-300",
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
    <div className={cn("flex flex-col space-y-1.5 pb-4 border-b border-slate-100 mb-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className, as: Component = "h3", ...props }) {
  return (
    <Component className={cn("text-xl font-bold tracking-tight text-slate-900", className)} {...props}>
      {children}
    </Component>
  );
}

export function CardDescription({ children, className, ...props }) {
  return (
    <p className={cn("text-sm text-slate-600 leading-relaxed", className)} {...props}>
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
