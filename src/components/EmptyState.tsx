import { Film, Search, Popcorn } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: "film" | "search" | "popcorn";
  title?: string;
  message?: string;
  className?: string;
  children?: React.ReactNode;
}

const icons = {
  film: Film,
  search: Search,
  popcorn: Popcorn,
};

export function EmptyState({
  icon = "film",
  title = "Nothing here yet",
  message = "No content found",
  className,
  children,
}: EmptyStateProps) {
  const Icon = icons[icon];

  return (
    <div className={cn("flex flex-col items-center justify-center py-16 text-center px-4", className)}>
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/15 to-secondary/10 flex items-center justify-center backdrop-blur-sm border border-border/20">
          <Icon className="w-9 h-9 text-muted-foreground/70" />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-primary/15 animate-spin" style={{ animationDuration: "20s" }} />
        <div className="absolute -inset-2 rounded-full bg-primary/5 blur-xl" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1" data-testid="text-empty-title">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs" data-testid="text-empty-message">{message}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
