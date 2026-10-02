import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes safely without conflicts
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
