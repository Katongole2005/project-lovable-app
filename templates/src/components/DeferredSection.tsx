"use client";
import React, { useState, useEffect, useRef } from "react";

interface DeferredSectionProps {
  id: string;
  className?: string;
  children: React.ReactNode;
  onNearViewport: () => void;
  rootMargin?: string;
}

export function DeferredSection({
  id,
  className,
  children,
  onNearViewport,
  rootMargin = "600px",
}: DeferredSectionProps) {
  const [isNear, setIsNear] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsNear(true);
          onNearViewport();
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [onNearViewport, rootMargin]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        minHeight: !isNear ? "220px" : undefined,
        // Allow browser to skip rendering off-screen sections entirely.
        // This is one of the biggest single wins for TBT and LCP on content-heavy pages.
        contentVisibility: "auto",
        containIntrinsicSize: "0 220px",
      }}
    >
      {isNear ? (
        children
      ) : (
        <div className="animate-pulse h-[220px] bg-card/5 rounded-[18px] border border-white/[0.02]" />
      )}
    </div>
  );
}
