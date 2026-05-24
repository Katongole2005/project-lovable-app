"use client";

if (typeof window !== "undefined") {
  const originalError = console.error;
  console.error = function(...args: any[]) {
    const msg = args.map(function(x) {
      return x && x.toString ? x.toString() : '';
    }).join(' ');
    if (msg.includes('bis_skin_checked') || msg.includes('hydration') || msg.includes('Hydration') || msg.includes('Mismatched')) {
      return;
    }
    originalError.apply(console, args);
  };
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
