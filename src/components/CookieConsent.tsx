import { useState, useEffect, useCallback } from "react";
import { Shield, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const COOKIE_KEY = "cookie_consent";
const EXCLUDED_PATHS = ["/auth", "/login", "/signup", "/register", "/forgot-password", "/maintenance"];
const SHOW_DELAY_MS = 5000;

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_KEY);
    if (consent) return;

    const currentPath = window.location.pathname.toLowerCase();
    if (EXCLUDED_PATHS.some((p) => currentPath.startsWith(p))) return;

    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);

    const handleNav = () => {
      const path = window.location.pathname.toLowerCase();
      if (EXCLUDED_PATHS.some((p) => path.startsWith(p))) {
        setVisible(false);
      }
    };
    window.addEventListener("popstate", handleNav);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("popstate", handleNav);
    };
  }, []);

  const dismiss = useCallback((choice: "accepted" | "declined") => {
    setExiting(true);
    setTimeout(() => {
      localStorage.setItem(COOKIE_KEY, choice);
      setVisible(false);
      setExiting(false);
    }, 300);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
          className={cn(
            "fixed z-[100] pointer-events-auto",
            "bottom-[88px] left-4 right-4 md:bottom-6 md:left-auto md:right-6 md:w-[360px]",
            exiting && "pointer-events-none"
          )}
          data-testid="cookie-consent"
        >
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(145deg, hsl(230 20% 13% / 0.97), hsl(230 18% 8% / 0.98))",
              boxShadow: "0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.05)",
              backdropFilter: "blur(24px) saturate(180%)",
            }}
          >
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)" }}
            />

            <div className="p-4">
              <div className="flex items-start gap-3">
                <div
                  className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mt-0.5"
                  style={{ background: "linear-gradient(135deg, hsl(200 70% 50% / 0.15), hsl(220 60% 40% / 0.1))" }}
                >
                  <Shield className="w-4 h-4 text-blue-400" />
                </div>

                <div className="flex-1 min-w-0 pr-5">
                  <p className="text-[13px] font-semibold text-white/90 leading-tight">Your privacy matters</p>
                  <p className="text-[11px] text-white/40 leading-relaxed mt-1">
                    We use cookies to keep you signed in and improve your experience.
                  </p>
                </div>

                <button
                  onClick={() => dismiss("declined")}
                  className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full flex items-center justify-center text-white/25 hover:text-white/50 hover:bg-white/5 transition-all"
                  aria-label="Dismiss"
                  data-testid="button-cookie-dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex gap-2 mt-3.5">
                <button
                  onClick={() => dismiss("accepted")}
                  data-testid="button-cookie-accept"
                  className="flex-1 h-9 rounded-xl text-[12px] font-semibold text-white transition-all active:scale-[0.97]"
                  style={{
                    background: "linear-gradient(135deg, hsl(200 70% 48%), hsl(220 65% 42%))",
                    boxShadow: "0 2px 12px hsl(210 70% 50% / 0.25)",
                  }}
                >
                  Accept
                </button>
                <button
                  onClick={() => dismiss("declined")}
                  data-testid="button-cookie-decline"
                  className="flex-1 h-9 rounded-xl text-[12px] font-semibold text-white/50 hover:text-white/70 bg-white/5 hover:bg-white/8 border border-white/8 transition-all active:scale-[0.97]"
                >
                  Decline
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
