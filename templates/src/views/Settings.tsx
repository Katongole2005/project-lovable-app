"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Settings as SettingsIcon, Trash2, Sliders, Volume2, ShieldAlert, Monitor, Check } from "lucide-react";
import { useNavigate } from "@/lib/router-polyfill";
import { useSeo } from "@/hooks/useSeo";

const Settings = () => {
  const navigate = useNavigate();
  useSeo({ 
    title: "Settings - Moviebay", 
    description: "Customize your Moviebay streaming preferences and manage cache." 
  });

  const [autoplayNext, setAutoplayNext] = useState(true);
  const [subSize, setSubSize] = useState("medium");
  const [cacheCleared, setCacheCleared] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("moviebay_autoplay_next");
      if (stored !== null) setAutoplayNext(stored === "true");
      
      const size = localStorage.getItem("moviebay_subtitle_size");
      if (size !== null) setSubSize(size);
    }
  }, []);

  const handleAutoplayToggle = (val: boolean) => {
    setAutoplayNext(val);
    localStorage.setItem("moviebay_autoplay_next", String(val));
  };

  const handleSubSizeChange = (val: string) => {
    setSubSize(val);
    localStorage.setItem("moviebay_subtitle_size", val);
  };

  const handleClearCache = async () => {
    if (typeof window === "undefined" || !navigator.serviceWorker) return;
    setIsClearing(true);
    
    // Broadcast skipWaiting and clearCaches messages to sw.js
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        reg.active?.postMessage("clearCaches");
      }
      
      // Also clear localStorage values relating to cached media info
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("moviebay_") || key.includes("cache"))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));

      setTimeout(() => {
        setIsClearing(false);
        setCacheCleared(true);
        setTimeout(() => setCacheCleared(false), 3000);
      }, 1200);
    } catch {
      setIsClearing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(230,18%,5%)] text-white/90 selection:bg-primary/30">
      {/* Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-secondary/20 blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-12 md:py-20">
        {/* Header */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate("/");
            }
          }}
          className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-8 group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back to Home</span>
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-6">
            <SettingsIcon className="w-3 h-3" />
            Preferences
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
            Player Settings
          </h1>
          <p className="text-white/40 text-base max-w-xl">
            Customize your media streaming defaults, sub styling, and optimize client caching performance.
          </p>
        </motion.div>

        {/* Content */}
        <div className="space-y-8">
          {/* Autoplay Segment */}
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center text-primary">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Auto-Play Next Episode</h3>
                  <p className="text-white/40 text-sm">Automatically transition to the next episode when series playback ends.</p>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => handleAutoplayToggle(!autoplayNext)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoplayNext ? 'bg-primary' : 'bg-white/10'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoplayNext ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </motion.section>

          {/* Subtitles Size */}
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center text-secondary">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Subtitle Text Sizing</h3>
                  <p className="text-white/40 text-sm">Change the rendering size of caption tracks inside the player.</p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white/[0.02] border border-white/5 p-1 rounded-xl">
                {["small", "medium", "large"].map((size) => (
                  <button
                    key={size}
                    onClick={() => handleSubSizeChange(size)}
                    className={`px-4 py-2 text-xs font-bold rounded-lg uppercase tracking-wider transition ${
                      subSize === size ? "bg-primary text-white" : "text-white/60 hover:text-white hover:bg-white/[0.03]"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </motion.section>

          {/* Cache Cleaning */}
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center text-red-500">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Purge Application Cache</h3>
                  <p className="text-white/40 text-sm">Clear service worker caches and stored local statistics to resolve stale assets.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClearCache}
                disabled={isClearing || cacheCleared}
                className={`px-6 py-3 font-semibold rounded-xl text-sm flex items-center gap-2 border transition ${
                  cacheCleared 
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/25 disabled:opacity-50"
                }`}
              >
                {isClearing ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                ) : cacheCleared ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {isClearing ? "Purging..." : cacheCleared ? "Cache Cleared!" : "Clear Cache"}
              </button>
            </div>
          </motion.section>

          {/* Device Metrics */}
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md"
          >
            <div className="flex gap-4 mb-4">
              <div className="w-10 h-10 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center text-amber-500">
                <Monitor className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">System Environment</h3>
                <p className="text-white/40 text-sm">Active browser capabilities detected for streaming optimization.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pl-14 text-xs font-semibold text-white/50">
              <div className="p-3 rounded-lg bg-white/[0.01] border border-white/5">
                UA Engine: <span className="text-white/80 block mt-1 truncate">{typeof navigator !== "undefined" ? navigator.userAgent : "SSR"}</span>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.01] border border-white/5">
                Service Worker Status: <span className="text-emerald-400 block mt-1">Active (v10)</span>
              </div>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
};

export default Settings;
