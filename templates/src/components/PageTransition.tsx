import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

interface SectionRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: "slide-up" | "slide-left" | "slide-right" | "scale" | "blur";
}

export const SectionReveal = forwardRef<HTMLDivElement, SectionRevealProps>(
  function SectionReveal({ children, className }, forwardedRef) {
    return (
      <div
        ref={forwardedRef}
        className={cn(className)}
      >
        {children}
      </div>
    );
  }
);
