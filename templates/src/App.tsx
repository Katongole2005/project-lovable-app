import { lazy, Suspense, useEffect, useState } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
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

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
  >
    {children}
  </motion.div>
);

function AppRoutes() {
  const { settings } = useSiteSettingsContext();
  const location = useLocation();

  if (settings.maintenance_mode) {
    return (
      <Suspense fallback={<AppLoader />}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/admin" element={<ProtectedRoute><PageWrapper><Admin /></PageWrapper></ProtectedRoute>} />
            <Route path="/auth" element={<PageWrapper><Auth /></PageWrapper>} />
            <Route path="*" element={<PageWrapper><Maintenance /></PageWrapper>} />
          </Routes>
        </AnimatePresence>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<AppLoader />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<ProtectedRoute><PageWrapper><Index /></PageWrapper></ProtectedRoute>} />
          <Route path="/movies" element={<ProtectedRoute><PageWrapper><Index /></PageWrapper></ProtectedRoute>} />
          <Route path="/series" element={<ProtectedRoute><PageWrapper><Index /></PageWrapper></ProtectedRoute>} />
          <Route path="/search" element={<ProtectedRoute><PageWrapper><Index /></PageWrapper></ProtectedRoute>} />
          <Route path="/originals" element={<ProtectedRoute><PageWrapper><Index /></PageWrapper></ProtectedRoute>} />
          <Route path="/movie/:id" element={<ProtectedRoute><PageWrapper><Index /></PageWrapper></ProtectedRoute>} />
          <Route path="/series/:id" element={<ProtectedRoute><PageWrapper><Index /></PageWrapper></ProtectedRoute>} />
          <Route path="/auth" element={<PageWrapper><Auth /></PageWrapper>} />
          <Route path="/admin" element={<ProtectedRoute><PageWrapper><Admin /></PageWrapper></ProtectedRoute>} />
          <Route path="/vj/:vjName" element={<ProtectedRoute><PageWrapper><VJPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><PageWrapper><Profile /></PageWrapper></ProtectedRoute>} />
          <Route path="/privacy" element={<PageWrapper><Privacy /></PageWrapper>} />
          <Route path="/terms" element={<PageWrapper><Terms /></PageWrapper>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<ProtectedRoute><PageWrapper><NotFound /></PageWrapper></ProtectedRoute>} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
}

export default App;
