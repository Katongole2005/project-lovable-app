import { useEffect, useState } from "react";
import { X, Sparkles, Heart, Zap, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface StayedAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthClick: () => void;
}

export function StayedAlertModal({ isOpen, onClose, onAuthClick }: StayedAlertModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Let paint settle before animating in
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Enjoying MovieBay?"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          visible ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Modal Card */}
      <div
        className={cn(
          "relative w-full max-w-md overflow-hidden rounded-[32px] border border-white/10 bg-card/90 backdrop-blur-xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.7)] transition-all duration-300",
          visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-95"
        )}
      >
        {/* Glow accents */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-primary/20 blur-[80px]" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-secondary/15 blur-[80px]" />

        {/* Close */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Close"
          className="absolute right-4 top-4 z-50 rounded-full border border-white/10 bg-white/10 p-3 text-white transition-all hover:bg-white/20 active:scale-90"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative z-10 flex flex-col items-center px-8 py-10 text-center">
          {/* Icon */}
          <div className="relative mb-7">
            <div className="absolute inset-0 scale-150 rounded-full bg-primary/30 blur-2xl" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary via-primary/80 to-secondary shadow-xl">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
            <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-emerald-500 shadow-lg">
              <Heart className="h-4 w-4 fill-white text-white" />
            </div>
          </div>

          <h2 className="mb-3 text-3xl font-display font-bold leading-tight tracking-tight text-white">
            Enjoying <span className="text-primary">MovieBay</span>?
          </h2>

          <p className="mb-8 max-w-[260px] text-lg leading-relaxed text-white/65">
            Sign in to save your progress and sync across all your devices.
          </p>

          <div className="w-full space-y-3">
            <button
              onClick={onAuthClick}
              className="group flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white font-bold text-lg text-black shadow-[0_20px_40px_-12px_rgba(255,255,255,0.2)] transition-all hover:bg-white/90 active:scale-[0.98]"
            >
              Get Started
              <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>

            <button
              onClick={onClose}
              className="flex w-full items-center justify-center gap-2 py-3 text-sm font-semibold text-white/50 transition-colors hover:text-white/80"
            >
              <Zap className="h-4 w-4" />
              Maybe later, I&apos;m busy watching
            </button>
          </div>

          <div className="mt-8 flex items-center justify-center gap-4 border-t border-white/5 pt-6 text-[11px] font-bold uppercase tracking-widest text-white/25">
            <span className="flex items-center gap-1.5"><Zap className="h-3 w-3" />No Ads</span>
            <span>·</span>
            <span className="flex items-center gap-1.5"><Zap className="h-3 w-3" />Sync Progress</span>
          </div>
        </div>
      </div>
    </div>
  );
}
