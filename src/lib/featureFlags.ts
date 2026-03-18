/**
 * Feature Flags
 * 
 * Static defaults — overridden at runtime by site_settings from the database.
 * Use useSiteSettings() hook for dynamic values in components.
 */

export const FEATURE_FLAGS = {
  /** Enable/disable the download functionality across the entire app */
  DOWNLOAD_ENABLED: true,
  /** Show maintenance page to all visitors */
  MAINTENANCE_MODE: false,
} as const;
