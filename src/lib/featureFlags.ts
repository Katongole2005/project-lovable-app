/**
 * Feature Flags
 * 
 * Toggle features on/off easily. 
 * Set to `true` to enable, `false` to disable.
 */

export const FEATURE_FLAGS = {
  /** Enable/disable the download functionality across the entire app */
  DOWNLOAD_ENABLED: true,
  /** Show maintenance page to all visitors */
  MAINTENANCE_MODE: true,
} as const;
