import { cn } from "@/lib/utils";

/**
 * S-MikroTik mark: a single route shaped like an "S" between two network
 * nodes. Masters live in /branding. The tile uses `currentColor`, so it
 * follows `text-primary` (or any text color) via className.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("text-primary", className)} aria-label="S-MikroTik" role="img">
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <path
        d="M22 9.5H13a3.25 3.25 0 0 0 0 6.5h6a3.25 3.25 0 0 1 0 6.5H10"
        fill="none"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="22.5" cy="9.5" r="2.6" fill="white" />
      <circle cx="9.5" cy="22.5" r="2.6" fill="white" />
    </svg>
  );
}
