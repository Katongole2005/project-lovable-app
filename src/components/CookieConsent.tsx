import { useState, useEffect } from "react";
import { Cookie, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const COOKIE_KEY = "cookie_consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_KEY);
    if (!consent) {
      // Small delay so it doesn't flash on first paint
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(COOKIE_KEY, "accepted");
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(COOKIE_KEY, "declined");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md",
        "animate-in slide-in-from-bottom-4 fade-in duration-500"
      )}
    >
      <div className="relative rounded-2xl bg-card/95 backdrop-blur-xl border border-border/50 shadow-2xl p-4">
        {/* Close button */}
        <button
          onClick={decline}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-accent transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>

        <div className="flex gap-3 pr-6">
          {/* Icon */}
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Cookie className="w-5 h-5 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground mb-0.5">We use cookies 🍪</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We use cookies to improve your experience, remember your preferences, and keep you logged in.
            </p>

            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={accept}
                className="h-8 px-4 text-xs rounded-full flex-1"
              >
                <Check className="w-3.5 h-3.5 mr-1" />
                Accept All
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={decline}
                className="h-8 px-4 text-xs rounded-full flex-1"
              >
                Decline
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
