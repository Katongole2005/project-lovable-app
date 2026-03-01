import { useEffect, useRef, useState, forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(timer);
  }, []);

  return (
    <div
      className={cn(
        "transition-all duration-700 ease-out",
        mounted
          ? "opacity-100 translate-y-0 blur-0 scale-100"
          : "opacity-0 translate-y-6 blur-[2px] scale-[0.99]",
        className
      )}
    >
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

const variantClasses: Record<string, { hidden: string; visible: string }> = {
  "slide-up": {
    hidden: "opacity-0 translate-y-8",
    visible: "opacity-100 translate-y-0",
  },
  "slide-left": {
    hidden: "opacity-0 -translate-x-8",
    visible: "opacity-100 translate-x-0",
  },
  "slide-right": {
    hidden: "opacity-0 translate-x-8",
    visible: "opacity-100 translate-x-0",
  },
  scale: {
    hidden: "opacity-0 scale-95",
    visible: "opacity-100 scale-100",
  },
  blur: {
    hidden: "opacity-0 blur-md scale-[0.97]",
    visible: "opacity-100 blur-0 scale-100",
  },
};

export const SectionReveal = forwardRef<HTMLDivElement, SectionRevealProps>(
  function SectionReveal({ children, className, delay = 0, variant = "slide-up" }, forwardedRef) {
    const [isVisible, setIsVisible] = useState(false);
    const internalRef = useRef<HTMLDivElement>(null);
    const elRef = (forwardedRef as React.RefObject<HTMLDivElement>) || internalRef;

    useEffect(() => {
      const el = elRef.current;
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setTimeout(() => setIsVisible(true), delay);
            observer.unobserve(el);
          }
        },
        { threshold: 0.08, rootMargin: "0px 0px -50px 0px" }
      );

      observer.observe(el);
      return () => observer.disconnect();
    }, [delay]);

    const v = variantClasses[variant] ?? variantClasses["slide-up"];

    return (
      <div
        ref={elRef}
        className={cn(
          "transition-all duration-700 ease-out",
          isVisible ? v.visible : v.hidden,
          className
        )}
      >
        {children}
      </div>
    );
  }
);
