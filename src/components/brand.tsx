import { cn } from "@/lib/utils";

// Four squares in four habit colors: the grid, reduced to a mark.
const MARK_COLORS = ["#14b86e", "#2f6bff", "#ff7a1c", "#ff4fa0"];

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-[0.45em] font-display font-semibold tracking-tight",
        className,
      )}
    >
      <span aria-hidden className="grid shrink-0 grid-cols-2 gap-[0.08em]">
        {MARK_COLORS.map((color) => (
          <span key={color} className="size-[0.4em] rounded-[0.1em]" style={{ background: color }} />
        ))}
      </span>
      habithub
    </span>
  );
}
