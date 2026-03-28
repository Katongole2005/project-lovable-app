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
  allowHighResImages: boolean;
  autoplayDelayMs: number;
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
  allowHighResImages: true,
  autoplayDelayMs: 5000,
};

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
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveData = connection?.saveData === true;
  const lowMemory = typeof typedNavigator.deviceMemory === "number" && typedNavigator.deviceMemory <= 4;
  const lowCpu = typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 4;
  const slowNetwork = connection?.effectiveType === "slow-2g" || connection?.effectiveType === "2g";
  const isWeakDevice = prefersReducedMotion || saveData || lowMemory || lowCpu || slowNetwork;

  return {
    isMobile,
    isCompact,
    prefersReducedMotion,
    saveData,
    lowMemory,
    lowCpu,
    isWeakDevice,
    allowAmbientEffects: !isWeakDevice && !isMobile,
    allowHighResImages: !saveData && !lowMemory,
    autoplayDelayMs: isMobile || isWeakDevice ? 3200 : 5000,
  };
}

export function useDeviceProfile() {
  const [profile, setProfile] = useState<DeviceProfile>(DEFAULT_PROFILE);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateProfile = () => setProfile(readProfile());
    const connection = getConnection();

    updateProfile();
    window.addEventListener("resize", updateProfile, { passive: true });
    mediaQuery.addEventListener("change", updateProfile);
    connection?.addEventListener?.("change", updateProfile);

    return () => {
      window.removeEventListener("resize", updateProfile);
      mediaQuery.removeEventListener("change", updateProfile);
      connection?.removeEventListener?.("change", updateProfile);
    };
  }, []);

  return profile;
}
