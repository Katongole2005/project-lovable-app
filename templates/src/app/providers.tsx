"use client";

if (typeof window !== "undefined") {
  const originalLog = console.log;
  const originalInfo = console.info;
  const originalWarn = console.warn;
  const originalError = console.error;

  const logQueue: any[] = [];
  let isSendingLogs = false;
  let flushTimeout: any = null;

  const queueLog = (level: "log" | "info" | "warn" | "error", args: any[]) => {
    // 1. Skip if currently sending logs to avoid infinite loop feedback
    if (isSendingLogs) return;

    // 2. Map arguments to string format
    const msg = args.map((x) => {
      if (x instanceof Error) {
        return x.stack || x.message;
      }
      if (x && typeof x === "object") {
        try {
          return JSON.stringify(x);
        } catch {
          return "[Circular Object]";
        }
      }
      return x && x.toString ? x.toString() : "";
    }).join(" ");

    // 3. Skip hydration logs or browser skin checked extensions logs
    if (
      msg.includes("bis_skin_checked") ||
      msg.includes("hydration") ||
      msg.includes("Hydration") ||
      msg.includes("Mismatched") ||
      msg.includes("/api/log") ||
      msg.includes("Log Forwarder Error")
    ) {
      return;
    }

    logQueue.push({
      timestamp: new Date().toISOString(),
      level,
      message: msg,
    });

    // 4. Force immediate flush for errors, warnings, or [MOVIE_BAY_LOG] events
    const isCritical = level === "error" || level === "warn" || msg.includes("[MOVIE_BAY_LOG]");
    if (isCritical || logQueue.length >= 10) {
      flushLogs();
    } else {
      scheduleFlush();
    }
  };

  const scheduleFlush = () => {
    if (!flushTimeout) {
      flushTimeout = setTimeout(flushLogs, 500);
    }
  };

  const flushLogs = async () => {
    if (flushTimeout) {
      clearTimeout(flushTimeout);
      flushTimeout = null;
    }

    if (logQueue.length === 0 || isSendingLogs) return;

    const batch = [...logQueue];
    logQueue.length = 0;

    isSendingLogs = true;
    try {
      await fetch("/api/log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(batch),
        keepalive: true,
      });
    } catch (err) {
      originalError("[Log Forwarder Error] Failed to send logs to server:", err);
    } finally {
      isSendingLogs = false;
    }
  };

  // Override standard console logs to tap in our forwarder
  console.log = function(...args: any[]) {
    queueLog("log", args);
    originalLog.apply(console, args);
  };

  console.info = function(...args: any[]) {
    queueLog("info", args);
    originalInfo.apply(console, args);
  };

  console.warn = function(...args: any[]) {
    queueLog("warn", args);
    originalWarn.apply(console, args);
  };

  console.error = function(...args: any[]) {
    queueLog("error", args);
    originalError.apply(console, args);
  };

  // Intercept global unhandled window errors
  window.onerror = function(message, source, lineno, colno, error) {
    const errorMsg = `Unhandled runtime error: ${message} at ${source}:${lineno}:${colno}`;
    queueLog("error", [errorMsg, error]);
    return false; // let normal browser error reporting continue
  };

  // Intercept global unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    queueLog("error", ["Unhandled Promise Rejection:", reason]);
  });
}

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthProvider } from "@/hooks/useAuth";
import { SiteSettingsProvider } from "@/hooks/useSiteSettings";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useState, useEffect } from "react";
import { AppLoader } from "@/components/AppLoader";
import { GlobalPerformanceTuning } from "@/components/GlobalPerformanceTuning";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        retryDelay: 1000,
        refetchOnWindowFocus: false,
      },
    },
  }));

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("Service worker registration failed", err);
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <GlobalPerformanceTuning />
          <AuthProvider>
            <SiteSettingsProvider>
              {children}
            </SiteSettingsProvider>
          </AuthProvider>
          <Sonner />
        </ThemeProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
