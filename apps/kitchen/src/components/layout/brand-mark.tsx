import { cn } from "@/lib/utils";

interface KangarooMarkProps {
  className?: string;
}

export function KangarooMark({ className }: KangarooMarkProps) {
  return (
    <svg
      className={cn("h-10 w-10", className)}
      viewBox="0 0 64 64"
      role="img"
      aria-label="MemroOS kangaroo logo"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="64" height="64" rx="12" fill="currentColor" className="text-[#fafaf7]" />
      <path
        d="M43.8 13.7c1.2-2.1 4.3-1.5 4.6.9l.4 3.5 3.8.8c2.1.4 2.7 3.1 1 4.4l-3.2 2.4c.5 2.8-.2 5.4-2.1 7.6-1.7 2-4 3-6.6 3.1l5.8 12.2 6.9 2.4c1.6.6 1.8 2.8.3 3.6l-1.2.6c-2.9 1.4-6.3 1-8.8-1l-8-6.5-6.5 3.4c-2.3 1.2-5.1 1.1-7.3-.3l-1.3-.8c-1.3-.8-1.1-2.8.3-3.3l8.3-3.1-4-8.3-7.5 4.6c-1.2.8-2.9-.2-2.8-1.7l.1-1.4c.3-3.1 2-5.9 4.7-7.5l8.2-5.1c1.3-.8 2.8-1.1 4.2-.8l4.1.9 4.9-3.7z"
        fill="currentColor"
        className="text-[#0f0f0e]"
      />
      <path
        d="M43.3 21.4c1 .5 2.2.5 3.2 0M35.1 31.2c-4.1 3.7-5.5 7.7-4.2 12.1M25.7 36.7c-2.7-1.7-5.8-1.7-9.4.1"
        stroke="currentColor"
        className="text-[#a8392c]"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="46.8" cy="18.7" r="1.7" fill="currentColor" className="text-[#a8392c]" />
    </svg>
  );
}
