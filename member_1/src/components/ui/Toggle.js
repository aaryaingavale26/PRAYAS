import React from "react";
import { cn } from "@/lib/utils";

export function Toggle({
  id,
  label,
  description,
  checked = false,
  onChange,
  disabled = false,
  className,
}) {
  const toggleId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : "toggle");

  return (
    <div className={cn("flex items-start justify-between gap-4 py-3", className)}>
      <div className="flex flex-col">
        <label
          htmlFor={toggleId}
          className="text-base font-bold text-slate-900 cursor-pointer select-none"
        >
          {label}
        </label>
        {description && (
          <span className="text-sm text-slate-600 leading-relaxed mt-0.5">
            {description}
          </span>
        )}
      </div>

      <button
        type="button"
        id={toggleId}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange && onChange(!checked)}
        className={cn(
          "relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-teal-600 disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-teal-700" : "bg-slate-300"
        )}
      >
        <span className="sr-only">{label}</span>
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
            checked ? "translate-x-6" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}
