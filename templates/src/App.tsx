import { lazy, Suspense, useEffect, useState } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SiteSettingsProvider, useSiteSettingsContext } from "@/hooks/useSiteSettings";
import Maintenance from "./pages/Maintenance";
import { AppLoader } from "@/components/AppLoader";
import { Analytics } from "@vercel/analytics/react";

const Toaster = lazy(() => import("@/components/ui/toaster").then(module => ({ default: module.Toaster })));
const CookieConsent = lazy(() => import("@/components/CookieConsent").then(module => ({ default: module.CookieConsent })));
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Profile = lazy(() => import("./pages/Profile"));
const Admin = lazy(() => import("./pages/Admin"));
const VJPage = lazy(() => import("./pages/VJPage"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => {
  const [showDeferredUi, setShowDeferredUi] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setShowDeferredUi(true);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Analytics />
      <ErrorBoundary>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {showDeferredUi && (
            <Suspense fallback={null}>
              <Toaster />
              <CookieConsent />
            </Suspense>
          )}
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthProvider>
              <SiteSettingsProvider>
                <AppRoutes />
              </SiteSettingsProvider>
            </AuthProvider>
          </BrowserRouter>
        </ThemeProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
};

function AppRoutes() {
  const { settings } = useSiteSettingsContext();

  if (settings.maintenance_mode) {
    return (
      <Suspense fallback={<AppLoader />}>
        <Routes>
          <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          <Route path="/auth" element={<Auth />} />
          <Route path="*" element={<Maintenance />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<AppLoader />}>
      <Routes>
        <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/movies" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/series" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/search" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/originals" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/movie/:id" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/series/:id" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
        <Route path="/vj/:vjName" element={<ProtectedRoute><VJPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<ProtectedRoute><NotFound /></ProtectedRoute>} />
      </Routes>
    </Suspense>
  );
}

export default App;
