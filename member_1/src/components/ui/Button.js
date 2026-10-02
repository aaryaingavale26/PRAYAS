import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export const Button = React.forwardRef(
  (
    {
      children,
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      type = "button",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-150 select-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

    const variants = {
      primary:
        "bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 shadow-sm border border-slate-900",
      secondary:
        "bg-teal-700 text-white hover:bg-teal-800 active:bg-teal-900 shadow-sm border border-teal-700",
      outline:
        "bg-white text-slate-800 border-2 border-slate-300 hover:bg-slate-50 hover:border-slate-800",
      tealOutline:
        "bg-white text-teal-800 border-2 border-teal-600 hover:bg-teal-50",
      ghost:
        "bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900",
      danger:
        "bg-rose-700 text-white hover:bg-rose-800 active:bg-rose-900 shadow-sm border border-rose-700",
    };

    const sizes = {
      sm: "text-sm py-2 px-3 min-h-[38px] gap-1.5",
      md: "text-base py-2.5 px-5 min-h-[44px] gap-2", // 44px min touch target
      lg: "text-lg py-3.5 px-6 min-h-[50px] font-semibold gap-2.5",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            <span>Loading...</span>
            <span className="sr-only">Please wait, loading</span>
          </>
        ) : (
          <>
            {leftIcon && <span aria-hidden="true">{leftIcon}</span>}
            {children}
            {rightIcon && <span aria-hidden="true">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
