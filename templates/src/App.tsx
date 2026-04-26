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

// Referral Tracker Component (Pro Version)
const ReferralTracker = () => {
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get("ref");
    if (ref) {
      sessionStorage.setItem("moviebay_referral", ref);
      console.log("Referral captured:", ref);
    }
  }, [location]);
  return null;
};

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
            <ReferralTracker />
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

// Global Scroll Restoration (Pro Version)
const ScrollRestoration = () => {
  const { pathname } = useLocation();
  const type = (window as any).navigation?.activation?.navigationType || 'push';

  useEffect(() => {
    // Only scroll to top on major section changes (PUSH)
    // Don't scroll to top on movie/series details or when clicking "Back"
    const isDetailRoute = /^\/(movie|series)\//.test(pathname);
    
    if (type === 'push' && !isDetailRoute) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [pathname]);

  return null;
};

const IndexLayout = () => (
  <ProtectedRoute>
    <PageWrapper>
      <Index />
    </PageWrapper>
  </ProtectedRoute>
);

function AppRoutes() {
  const { settings } = useSiteSettingsContext();
  const location = useLocation();

  // Prevents AnimatePresence from unmounting the page (and losing scroll position) 
  // when navigating to a movie modal over the current background view.
  const getAnimationKey = () => {
    if (location.pathname.startsWith('/movie/') || location.pathname.startsWith('/series/')) {
      const view = location.state?.backgroundView;
      if (view === 'home') return '/';
      if (view) return `/${view}`;
    }
    // Shared key for all Index-related views keeps the component mounted
    if (['/', '/movies', '/series', '/search', '/originals'].includes(location.pathname) || /^\/(movie|series)\//.test(location.pathname)) {
      return 'index-layout';
    }
    return location.pathname;
  };

  if (settings.maintenance_mode) {
    return (
      <Suspense fallback={<AppLoader />}>
        <ScrollRestoration />
        <AnimatePresence mode="wait">
          <Routes location={location} key={getAnimationKey()}>
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
      <ScrollRestoration />
      <AnimatePresence mode="wait">
        <Routes location={location} key={getAnimationKey()}>
          {/* Group Index routes under a single key to prevent remounting and scroll loss */}
          <Route path="/" element={<IndexLayout />} />
          <Route path="/movies" element={<IndexLayout />} />
          <Route path="/series" element={<IndexLayout />} />
          <Route path="/search" element={<IndexLayout />} />
          <Route path="/originals" element={<IndexLayout />} />
          <Route path="/movie/:id" element={<IndexLayout />} />
          <Route path="/series/:id" element={<IndexLayout />} />
          
          <Route path="/auth" element={<PageWrapper><Auth /></PageWrapper>} />
          <Route path="/admin" element={<ProtectedRoute><PageWrapper><Admin /></PageWrapper></ProtectedRoute>} />
          <Route path="/vj/:vjName" element={<ProtectedRoute><PageWrapper><VJPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><PageWrapper><Profile /></PageWrapper></ProtectedRoute>} />
          <Route path="/privacy" element={<PageWrapper><Privacy /></PageWrapper>} />
          <Route path="/terms" element={<PageWrapper><Terms /></PageWrapper>} />
          <Route path="*" element={<ProtectedRoute><PageWrapper><NotFound /></PageWrapper></ProtectedRoute>} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
}

export default App;
