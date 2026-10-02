import React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

export const Input = React.forwardRef(
  (
    {
      id,
      label,
      helperText,
      error,
      className,
      required = false,
      leftIcon,
      rightIcon,
      type = "text",
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const errorId = inputId ? `${inputId}-error` : undefined;
    const helperId = inputId ? `${inputId}-helper` : undefined;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <div className="flex items-center justify-between">
            <label
              htmlFor={inputId}
              className="block text-sm font-semibold text-slate-800"
            >
              {label}
              {required && (
                <span className="text-rose-600 ml-1" aria-hidden="true">
                  *
                </span>
              )}
              {required && <span className="sr-only">(required)</span>}
            </label>
          </div>
        )}

        <div className="relative rounded-md shadow-sm">
          {leftIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={type}
            required={required}
            aria-invalid={Boolean(error)}
            aria-describedby={
              error ? errorId : helperText ? helperId : undefined
            }
            className={cn(
              "block w-full rounded-lg border-2 bg-white px-3.5 py-2.5 text-base text-slate-900 transition-colors placeholder:text-slate-400 min-h-[44px]",
              error
                ? "border-rose-500 focus:border-rose-600 bg-rose-50/20"
                : "border-slate-300 focus:border-teal-600 hover:border-slate-400",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              className
            )}
            {...props}
          />

          {rightIcon && !error && (
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">
              {rightIcon}
            </div>
          )}

          {error && (
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-rose-600">
              <AlertCircle className="h-5 w-5" aria-hidden="true" />
            </div>
          )}
        </div>

        {error && (
          <p id={errorId} className="text-sm font-medium text-rose-600 flex items-center gap-1.5 pt-0.5">
            <span>{error}</span>
          </p>
        )}

        {helperText && !error && (
          <p id={helperId} className="text-sm text-slate-600">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
