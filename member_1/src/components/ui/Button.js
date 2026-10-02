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
        "bg-[#18191D] text-[#FBFBEF] hover:bg-[#2C2D35] active:bg-[#101114] shadow-sm border border-[#18191D] rounded-xl font-bold",
      secondary:
        "bg-[#2F9BE0] text-white hover:bg-[#1F5FBF] active:bg-[#174ea6] shadow-sm border border-[#2F9BE0] rounded-xl font-bold",
      blue:
        "bg-[#2F9BE0] text-white hover:bg-[#1F5FBF] active:bg-[#174ea6] shadow-sm border border-[#2F9BE0] rounded-xl font-bold",
      deepBlue:
        "bg-[#1F5FBF] text-white hover:bg-[#174ea6] shadow-sm border border-[#1F5FBF] rounded-xl font-bold",
      outline:
        "bg-[#FBFBEF] text-[#18191D] border-2 border-[#D5D5C8] hover:bg-[#F3F3E3] hover:border-[#18191D] rounded-xl font-bold",
      tealOutline:
        "bg-white text-[#1F5FBF] border-2 border-[#2F9BE0] hover:bg-[#D4F1FE] rounded-xl font-bold",
      ghost:
        "bg-transparent text-[#18191D] hover:bg-[#E8E8DC] hover:text-[#18191D] rounded-xl font-bold",
      danger:
        "bg-[#DC2626] text-white hover:bg-[#B91C1C] shadow-sm rounded-xl font-bold",
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
        suppressHydrationWarning
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
