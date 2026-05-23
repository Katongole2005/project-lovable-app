"use client";

import { useEffect } from "react";
import { useDeviceProfile } from "@/hooks/useDeviceProfile";

/** Applies document-level perf classes from the live device profile. */
export function GlobalPerformanceTuning() {
  const deviceProfile = useDeviceProfile();

  useEffect(() => {
    const root = document.documentElement;
    const isTouchDevice = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    const classes = {
      "perf-low": deviceProfile.isWeakDevice,
      "perf-touch": deviceProfile.isMobile || isTouchDevice,
      "perf-reduced-motion": deviceProfile.prefersReducedMotion,
      "perf-rich": !deviceProfile.isWeakDevice && !deviceProfile.prefersReducedMotion,
      "perf-lite": deviceProfile.preferLightweightRendering,
    };

    Object.entries(classes).forEach(([className, enabled]) => {
      root.classList.toggle(className, enabled);
    });

    return () => {
      Object.keys(classes).forEach((className) => root.classList.remove(className));
    };
  }, [
    deviceProfile.isMobile,
    deviceProfile.isWeakDevice,
    deviceProfile.prefersReducedMotion,
    deviceProfile.preferLightweightRendering,
  ]);

  return null;
}
