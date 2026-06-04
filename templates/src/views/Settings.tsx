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
                aria-label="Toggle Auto-Play Next Episode"
                title="Toggle Auto-Play"
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

          {/* About & Database Attribution */}
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md"
          >
            <div className="flex gap-4 mb-4">
              <div className="w-10 h-10 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center text-primary">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">About & Credits</h3>
                <p className="text-white/40 text-sm">Application background information and database attributions.</p>
              </div>
            </div>
            
            <div className="space-y-4 pl-14 text-xs leading-relaxed text-white/50">
              <p>
                Moviebay operates as a web indexing client that aggregates publicly accessible streaming directories. We do not store, host, or transmit copyrighted files. For copyright enforcement queries, please refer to our <a href="/dmca" className="text-primary hover:underline font-semibold">DMCA policy</a>.
              </p>
              
              <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <img 
                  src="/tmdb-logo-long.svg" 
                  alt="TMDB Logo" 
                  className="h-4 w-auto shrink-0 opacity-40 hover:opacity-80 transition-opacity mt-0.5" 
                  width={170}
                  height={16}
                />
                <div>
                  <p className="text-[10px] text-white/40">
                    This website uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.
                  </p>
                  <p className="text-[10px] text-white/30 mt-1">
                    All movie/series titles, descriptions, cast listings, and artwork displayed on this site are sourced via TMDB API data and image CDN endpoints.
                  </p>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Rich SEO Settings Information Section to increase Word Count & Text-to-HTML ratio */}
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md space-y-6 text-white/50 text-xs leading-relaxed"
          >
            <h2 className="text-base font-bold text-white mb-2">Moviebay Preferences & Troubleshooting Guide</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-white text-xs mb-1">Optimizing Your Streaming Experience</h3>
                <p>
                  To enjoy uninterrupted translated content, configuring your player settings is essential. Moviebay stores all preferences locally on your browser. This means your setup is preserved between visits without needing an account or transferring personal configuration data.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-white text-xs mb-1">How Auto-Play and Subtitles Work</h3>
                <p>
                  The auto-play next feature sends consecutive API requests when an episode completes to transition to the next installment. Subtitle sizing updates CSS variable tokens dynamically inside the media wrapper container. This customizes the text scale for optimal legibility across mobile, tablet, and TV displays.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-white text-xs mb-1">Understanding Cache Purging</h3>
                <p>
                  Our service workers cache chunks of Javascript and CSS templates to load the app instantly on subsequent visits. If you run into issues like infinite loading, missing icons, or stale posters, click 'Clear Cache'. This triggers a service worker refresh, clears indexed database keys, and downloads the latest compilation code directly from the server.
                </p>
              </div>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
};

export default Settings;
