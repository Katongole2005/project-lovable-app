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
        <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center">
          <Icon className="w-9 h-9 text-muted-foreground/60" />
        </div>
        {/* Decorative ring */}
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-muted-foreground/15 animate-spin" style={{ animationDuration: "20s" }} />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs">{message}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
