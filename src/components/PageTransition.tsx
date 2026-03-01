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
        "transition-all duration-500 ease-out",
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
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
}

export const SectionReveal = forwardRef<HTMLDivElement, SectionRevealProps>(
  function SectionReveal({ children, className, delay = 0 }, forwardedRef) {
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

    return (
      <div
        ref={elRef}
        className={cn(
          "transition-all duration-700 ease-out",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
          className
        )}
      >
        {children}
      </div>
    );
  }
);
