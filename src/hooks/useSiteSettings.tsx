import React, { useState, useEffect, useCallback, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SiteSettings {
  download_enabled: boolean;
  maintenance_mode: boolean;
  registration_enabled: boolean;
  hero_carousel_enabled: boolean;
  continue_watching_enabled: boolean;
  top10_enabled: boolean;
  push_notifications_enabled: boolean;
  site_announcement: string;
}

const DEFAULTS: SiteSettings = {
  download_enabled: true,
  maintenance_mode: false,
  registration_enabled: true,
  hero_carousel_enabled: true,
  continue_watching_enabled: true,
  top10_enabled: true,
  push_notifications_enabled: true,
  site_announcement: "",
};

interface SiteSettingsContextType {
  settings: SiteSettings;
  loading: boolean;
  updateSetting: (key: keyof SiteSettings, value: any) => Promise<void>;
  refetch: () => Promise<void>;
}

const SiteSettingsContext = createContext<SiteSettingsContextType>({
  settings: DEFAULTS,
  loading: true,
  updateSetting: async () => {},
  refetch: async () => {},
});

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const value = useSiteSettings();
  return (
    <SiteSettingsContext.Provider value={value}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export const useSiteSettingsContext = () => useContext(SiteSettingsContext);

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value");

      if (error) throw error;

      const parsed = { ...DEFAULTS };
      data?.forEach((row: { key: string; value: any }) => {
        if (row.key in parsed) {
          const val = row.value;
          // Handle jsonb values - they may already be parsed
          if (typeof val === "string") {
            try {
              (parsed as any)[row.key] = JSON.parse(val);
            } catch {
              (parsed as any)[row.key] = val;
            }
          } else {
            (parsed as any)[row.key] = val;
          }
        }
      });
      setSettings(parsed);
    } catch (err) {
      console.error("Failed to load site settings:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSetting = useCallback(async (key: keyof SiteSettings, value: any) => {
    const { error } = await supabase
      .from("site_settings")
      .update({ value: JSON.stringify(value), updated_at: new Date().toISOString() })
      .eq("key", key);

    if (error) throw error;

    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  return { settings, loading, updateSetting, refetch: fetchSettings };
}
