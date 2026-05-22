"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthProvider } from "@/hooks/useAuth";
import { SiteSettingsProvider } from "@/hooks/useSiteSettings";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useState } from "react";
import { AppLoader } from "@/components/AppLoader";

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

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
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
