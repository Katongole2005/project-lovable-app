import { useEffect, useState } from "react";
import { X, Lock, Download, Play, ChevronRight, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

interface AuthGatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthClick: () => void;
  actionType?: "watch" | "download" | "general";
  title?: string;
}

export function AuthGatedModal({ 
  isOpen, 
  onClose, 
  onAuthClick, 
  actionType = "general",
  title 
}: AuthGatedModalProps) {
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const content = {
    watch: {
      icon: <Play className="h-10 w-10 text-white fill-current" />,
      title: "Ready to Watch?",
      desc: title ? `Sign in to start watching "${title}" and save your progress.` : "Sign in to start watching your favorite movies and series.",
      accent: "bg-primary"
    },
    download: {
      icon: <Download className="h-10 w-10 text-white" />,
      title: "Download for Offline",
      desc: title ? `Sign in to download "${title}" and watch it anytime, anywhere.` : "Sign in to download movies and watch them offline.",
      accent: "bg-amber-500"
    },
    general: {
      icon: <Lock className="h-10 w-10 text-white" />,
      title: "Members Only",
      desc: "Join our community to access unlimited Ugandan cinema and VJ translated content.",
      accent: "bg-primary"
    }
  }[actionType];

  const modalRoot = typeof document !== 'undefined' ? document.body : null;
  if (!modalRoot) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
          {/* Backdrop - simplified */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-md cursor-pointer"
          />

          {/* Card - simplified and hardened */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-[40px] border border-white/10 bg-[#0a0a0f] p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Background Glow */}
            <div className={cn("absolute -top-24 -left-24 h-64 w-64 rounded-full blur-[100px] opacity-20 pointer-events-none", content.accent)} />
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute right-6 top-6 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>

            <div className="relative z-10 flex flex-col items-center text-center py-4">
              {/* Icon Container */}
              <div className="relative mb-8">
                <div className={cn("absolute inset-0 scale-150 rounded-full blur-3xl opacity-30", content.accent)} />
                <div className={cn("relative flex h-24 w-24 items-center justify-center rounded-[32px] shadow-2xl", content.accent)}>
                  {content.icon}
                </div>
                <div className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full border-4 border-[#0a0a0f] bg-emerald-500 shadow-xl">
                  <ShieldCheck className="h-5 w-5 text-white" />
                </div>
              </div>

              <h2 className="mb-4 text-3xl font-display font-bold leading-tight tracking-tight text-white">
                {content.title}
              </h2>

              <p className="mb-10 text-lg leading-relaxed text-white/60">
                {content.desc}
              </p>

              <div className="w-full space-y-4">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onAuthClick();
                  }}
                  className="group relative flex h-16 w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-white font-bold text-xl text-black transition-all hover:bg-white/90 active:scale-[0.98]"
                >
                  Sign In to Continue
                  <ChevronRight className="h-6 w-6 transition-transform group-hover:translate-x-1" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onClose();
                  }}
                  className="w-full py-4 text-base font-semibold text-white/40 transition-colors hover:text-white/80"
                >
                  Maybe later
                </button>
              </div>

              <div className="mt-8 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/20">
                <div className="h-px w-8 bg-white/10" />
                <span>Secure Access</span>
                <div className="h-px w-8 bg-white/10" />
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    modalRoot
  );
}
