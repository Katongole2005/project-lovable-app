import { useState, useEffect } from "react";
import { X, Megaphone } from "lucide-react";
import { useSiteSettingsContext } from "@/hooks/useSiteSettings";
import { cn } from "@/lib/utils";

export function AnnouncementBanner() {
  const { settings } = useSiteSettingsContext();
  const [dismissed, setDismissed] = useState(false);

  const announcement = settings.site_announcement;

  // Reset dismissed state when announcement changes
  useEffect(() => {
    if (announcement) setDismissed(false);
  }, [announcement]);

  if (!announcement || dismissed) return null;

  return (
    <div className="relative bg-primary/10 border-b border-primary/20 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-2.5 flex items-center gap-3">
        <Megaphone className="w-4 h-4 text-primary flex-shrink-0" />
        <p className="text-xs sm:text-sm text-foreground flex-1 font-medium">
          {announcement}
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded-full hover:bg-primary/10 transition-colors flex-shrink-0"
          aria-label="Dismiss announcement"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
