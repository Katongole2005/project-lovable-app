import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { CookieConsent } from "@/components/CookieConsent";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SiteSettingsProvider, useSiteSettingsContext } from "@/hooks/useSiteSettings";
import Maintenance from "./pages/Maintenance";
import { AppLoader } from "@/components/AppLoader";

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Profile = lazy(() => import("./pages/Profile"));
const Admin = lazy(() => import("./pages/Admin"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <CookieConsent />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <AuthProvider>
                <SiteSettingsProvider>
                  <AppRoutes />
                </SiteSettingsProvider>
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
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
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<ProtectedRoute><NotFound /></ProtectedRoute>} />
      </Routes>
    </Suspense>
  );
}

export default App;
