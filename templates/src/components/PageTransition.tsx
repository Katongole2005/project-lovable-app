"use client";
import { forwardRef, type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
  viewKey?: string;
}

export function PageTransition({ children, className, viewKey }: PageTransitionProps) {
  return (
    <motion.div
      key={viewKey}
      initial={{ opacity: 0, y: 15, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface SectionRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export const SectionReveal = forwardRef<HTMLDivElement, SectionRevealProps>(
  function SectionReveal({ children, className, delay = 0 }, forwardedRef) {
    return (
      <motion.div
        ref={forwardedRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: delay / 1000 }}
        className={cn(className)}
      >
        {children}
      </motion.div>
    );
  }
);
