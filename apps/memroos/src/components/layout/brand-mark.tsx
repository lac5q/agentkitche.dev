import { cn } from "@/lib/utils";

interface KangarooMarkProps {
  className?: string;
}

export function KangarooMark({ className }: KangarooMarkProps) {
  return (
    <span
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#c9c9c2] bg-[#fafaf7] text-[1.55rem] leading-none shadow-[0_8px_22px_rgba(15,15,14,0.08)]",
        className
      )}
      role="img"
      aria-label="MemroOS kangaroo logo"
    >
      <span aria-hidden="true">🦘</span>
    </span>
  );
}
