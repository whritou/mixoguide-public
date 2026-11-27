import { cn } from "@/lib/utils";

function DecoDivider({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("flex items-center gap-3", className)}
    >
      <span className="h-px flex-1 bg-line-brass" />
      <span className="text-brand">◆</span>
      <span className="h-px flex-1 bg-line-brass" />
    </div>
  );
}

export { DecoDivider };
