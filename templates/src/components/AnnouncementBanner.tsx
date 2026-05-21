import { useState, useEffect } from "react";
import { X, Megaphone } from "lucide-react";
import { useSiteSettingsContext } from "@/hooks/useSiteSettings";
import { cn } from "@/lib/utils";

interface AnnouncementBannerProps {
  dismissed?: boolean;
  onDismiss?: () => void;
}

export function AnnouncementBanner({ dismissed: externalDismissed, onDismiss }: AnnouncementBannerProps) {
  const { settings } = useSiteSettingsContext();
  const [internalDismissed, setInternalDismissed] = useState(false);

  const announcement = settings.site_announcement;
  const isDismissed = externalDismissed !== undefined ? externalDismissed : internalDismissed;

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    } else {
      setInternalDismissed(true);
    }
  };

  // Reset dismissed state when announcement changes
  useEffect(() => {
    if (announcement) setInternalDismissed(false);
  }, [announcement]);

  if (!announcement || isDismissed) return null;

  return (
    <div className="relative bg-primary/10 border-b border-primary/20 backdrop-blur-sm pointer-events-auto">
      <div className="container mx-auto px-4 py-2.5 flex items-center gap-3">
        <Megaphone className="w-4 h-4 text-primary flex-shrink-0" />
        <p className="text-xs sm:text-sm text-foreground flex-1 font-medium">
          {announcement}
        </p>
        <button
          onClick={handleDismiss}
          className="p-1 rounded-full hover:bg-primary/10 transition-colors flex-shrink-0"
          aria-label="Dismiss announcement"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
