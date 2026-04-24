import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Heart, Zap, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StayedAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthClick: () => void;
}

export function StayedAlertModal({ isOpen, onClose, onAuthClick }: StayedAlertModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-0 bg-transparent shadow-none [&>button]:hidden">
        <DialogTitle className="sr-only">Special Welcome</DialogTitle>
        <DialogDescription className="sr-only">
          Thanks for spending time with MovieBay! Explore more features.
        </DialogDescription>
        
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full overflow-hidden rounded-[32px] glass-strong border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]"
            >
              {/* Animated Background Accents */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/20 blur-[80px] rounded-full animate-pulse" />
                <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-secondary/15 blur-[80px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute inset-0 opacity-[0.03] glass-noise-overlay" />
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-6 right-6 z-10 p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all active:scale-90"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="relative z-10 p-8 md:p-10 flex flex-col items-center text-center">
                {/* Icon Header */}
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full scale-150" />
                  <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-primary via-primary/80 to-secondary flex items-center justify-center shadow-xl transform rotate-3">
                    <Sparkles className="w-10 h-10 text-white animate-pulse" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg border-2 border-background animate-bounce" style={{ animationDuration: '3s' }}>
                    <Heart className="w-4 h-4 text-white fill-current" />
                  </div>
                </div>

                <h2 className="text-3xl font-display font-bold text-white tracking-tight leading-tight mb-4">
                  Enjoying the <span className="text-primary">MovieBay</span> Experience?
                </h2>
                
                <p className="text-white/70 text-lg leading-relaxed mb-10 max-w-[280px]">
                  You've been exploring for 5 minutes! Sign in to save your progress and sync across devices.
                </p>

                <div className="w-full space-y-4">
                  <Button
                    onClick={() => {
                      onAuthClick();
                      onClose();
                    }}
                    size="lg"
                    className="w-full h-14 rounded-2xl bg-white text-black hover:bg-white/90 font-bold text-lg group transition-all shadow-[0_20px_40px_-12px_rgba(255,255,255,0.2)]"
                  >
                    Get Started Now
                    <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  
                  <button
                    onClick={onClose}
                    className="w-full py-4 text-white/50 hover:text-white font-semibold transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    Maybe later, I'm busy watching
                  </button>
                </div>

                {/* Benefits List */}
                <div className="mt-10 pt-8 border-t border-white/5 flex justify-center gap-6 text-[11px] font-bold tracking-widest text-white/30 uppercase">
                  <span className="flex items-center gap-1.5"><Zap className="w-3 h-3" /> No Ads</span>
                  <span className="flex items-center gap-1.5">•</span>
                  <span className="flex items-center gap-1.5"><Zap className="w-3 h-3" /> Sync Progress</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
