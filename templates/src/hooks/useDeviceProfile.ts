import { useEffect, useState } from "react";

interface NetworkInformationLike {
  effectiveType?: string;
  saveData?: boolean;
  addEventListener?: (type: "change", listener: EventListener) => void;
  removeEventListener?: (type: "change", listener: EventListener) => void;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformationLike;
  mozConnection?: NetworkInformationLike;
  webkitConnection?: NetworkInformationLike;
  deviceMemory?: number;
}

export interface DeviceProfile {
  isMobile: boolean;
  isCompact: boolean;
  prefersReducedMotion: boolean;
  saveData: boolean;
  lowMemory: boolean;
  lowCpu: boolean;
  isWeakDevice: boolean;
  allowAmbientEffects: boolean;
  allowComplexAnimations: boolean;
  allowHighResImages: boolean;
  autoplayDelayMs: number;
  homeGridItems: number;
  recommendationItems: number;
  isMacChrome: boolean;
  preferLightweightRendering: boolean;
}

const DEFAULT_PROFILE: DeviceProfile = {
  isMobile: false,
  isCompact: false,
  prefersReducedMotion: false,
  saveData: false,
  lowMemory: false,
  lowCpu: false,
  isWeakDevice: false,
  allowAmbientEffects: true,
  allowComplexAnimations: true,
  allowHighResImages: true,
  autoplayDelayMs: 5000,
  homeGridItems: 24,
  recommendationItems: 12,
  isMacChrome: false,
  preferLightweightRendering: false,
};

/** Chrome on macOS often struggles with heavy blur/GPU layers vs Safari on the same machine. */
function isMacChromeBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /Macintosh|Mac OS X/i.test(ua) &&
    /Chrome\//i.test(ua) &&
    !/Edg\//i.test(ua) &&
    !/OPR\//i.test(ua) &&
    !/Brave\//i.test(ua)
  );
}

function getConnection() {
  if (typeof navigator === "undefined") {
    return undefined;
  }

  const typedNavigator = navigator as NavigatorWithConnection;
  return typedNavigator.connection ?? typedNavigator.mozConnection ?? typedNavigator.webkitConnection;
}

function readProfile(): DeviceProfile {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return DEFAULT_PROFILE;
  }

  const typedNavigator = navigator as NavigatorWithConnection;
  const connection = getConnection();
  const isMobile = window.innerWidth < 768;
  const isCompact = window.innerWidth < 1024;
  const isLargeDesktop = window.innerWidth >= 1536;
  const isUltraWideDesktop = window.innerWidth >= 1800;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveData = connection?.saveData === true;
  const lowMemory = typeof typedNavigator.deviceMemory === "number" && typedNavigator.deviceMemory <= 4;
  const lowCpu = typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 4;
  const slowNetwork = connection?.effectiveType === "slow-2g" || connection?.effectiveType === "2g";
  const isMacChrome = isMacChromeBrowser();
  const isWeakDevice =
    prefersReducedMotion || saveData || lowMemory || lowCpu || slowNetwork;
  const allowComplexAnimations = !isWeakDevice && !isMobile;
  const preferLightweightRendering = isWeakDevice;

  return {
    isMobile,
    isCompact,
    prefersReducedMotion,
    saveData,
    lowMemory,
    lowCpu,
    isWeakDevice,
    allowAmbientEffects: !isWeakDevice && !isCompact,
    allowComplexAnimations,
    allowHighResImages: !saveData && !lowMemory && !isMobile,
    autoplayDelayMs: 5000,
    homeGridItems: isMobile ? 8 : isCompact ? 12 : isUltraWideDesktop ? 40 : isLargeDesktop ? 32 : 24,
    recommendationItems: isMobile ? 6 : isCompact ? 8 : isUltraWideDesktop ? 20 : isLargeDesktop ? 16 : 12,
    isMacChrome,
    preferLightweightRendering,
  };
}

export function useDeviceProfile() {
  const [profile, setProfile] = useState<DeviceProfile>(DEFAULT_PROFILE);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = getConnection();

    const applyDocumentPerfFlags = (next: DeviceProfile) => {
      const root = document.documentElement;
      root.classList.toggle("perf-mac-chrome", next.isMacChrome);
      root.classList.toggle("perf-lite", next.preferLightweightRendering);
    };

    const updateProfileAndFlags = () => {
      const next = readProfile();
      setProfile(next);
      applyDocumentPerfFlags(next);
    };

    // RAF-debounced resize: batches resize events to once per animation frame
    let rafId: number | null = null;
    const handleResize = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        updateProfileAndFlags();
      });
    };

    updateProfileAndFlags();
    window.addEventListener("resize", handleResize, { passive: true });
    mediaQuery.addEventListener("change", updateProfileAndFlags);
    connection?.addEventListener?.("change", updateProfileAndFlags);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
      mediaQuery.removeEventListener("change", updateProfileAndFlags);
      connection?.removeEventListener?.("change", updateProfileAndFlags);
    };
  }, []);

  return profile;
}
