import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

import { useAuth } from "@/hooks/useAuth";
import { fetchTrending } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { sendBrandedEmail, getWelcomeEmailHtml } from "@/lib/email";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import logoLight from "@/assets/logo.png";
import logoDark from "@/assets/logo-dark.png";

type AuthView = "login" | "signup" | "forgot";

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<AuthView>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [backdropUrl, setBackdropUrl] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  // Fetch a random movie backdrop
  useEffect(() => {
    let cancelled = false;
    fetchTrending()
      .then((movies) => {
        if (cancelled) return;
        // Prefer movies with backdrop_url, fall back to image_url (poster)
        const withBackdrop = movies.filter((m) => m.backdrop_url);
        const pool = withBackdrop.length > 0 ? withBackdrop : movies.filter((m) => m.image_url);
        if (pool.length > 0) {
          const random = pool[Math.floor(Math.random() * Math.min(5, pool.length))];
          setBackdropUrl(random.backdrop_url || random.image_url || null);
        }
      })
      .catch(() => {
        // Silently fail — the auth page works fine without a backdrop
      });
    return () => { cancelled = true; };
  }, []);

  const handleLogin = async () => {
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    }
  };

  const handleSignup = async () => {
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { first_name: firstName, last_name: lastName },
      },
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your email", description: "We sent you a verification link." });
      // Send branded welcome email
      try {
        await sendBrandedEmail({
          to: email,
          subject: "Welcome to MovieBay! 🎬",
          html: getWelcomeEmailHtml(firstName || "there"),
        });
      } catch (e) {
        console.error("Welcome email failed:", e);
      }
    }
  };

  const handleForgotPassword = async () => {
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Email sent", description: "Check your inbox for a password reset link." });
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) {
      toast({ title: "Google login failed", description: String(error), variant: "destructive" });
    }
  };

  const handleAppleLogin = async () => {
    const { error } = await lovable.auth.signInWithOAuth("apple", {
      redirect_uri: window.location.origin,
    });
    if (error) {
      toast({ title: "Apple login failed", description: String(error), variant: "destructive" });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (view === "login") handleLogin();
    else if (view === "signup") handleSignup();
    else handleForgotPassword();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="dark" style={{ colorScheme: "dark" }}>
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8 bg-background"
      style={{
        background: backdropUrl
          ? `linear-gradient(135deg, hsl(220 20% 15% / 0.85), hsl(220 20% 10% / 0.9)), url(${backdropUrl}) center/cover no-repeat`
          : undefined,
      }}
    >
      {/* Main card container - split layout on tablet/desktop */}
      <div className="w-full max-w-[900px] bg-background rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[600px]">
        
        {/* Left side - Movie backdrop image (hidden on mobile) */}
        <div className="hidden md:block md:w-[45%] relative overflow-hidden rounded-2xl m-3">
          {backdropUrl ? (
            <img
              src={backdropUrl}
              alt="Featured movie"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-muted animate-pulse" />
          )}
          {/* Logo overlay */}
          <div className="absolute top-6 left-6 z-10">
            <img src={logoLight} alt="Logo" className="h-8 hidden dark:block" />
            <img src={logoLight} alt="Logo" className="h-8 dark:hidden" />
          </div>
          {/* Dark gradient overlay at bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
        </div>

        {/* Right side - Form */}
        <div className="flex-1 flex flex-col justify-center px-6 py-10 md:px-12 md:py-8">
          {/* Back button for sub-views */}
          {view !== "login" && (
            <button
              onClick={() => setView("login")}
              className="mb-4 self-start p-1 hover:bg-accent rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
          )}

          {/* Mobile logo */}
          <div className="md:hidden mb-6 flex justify-center">
            <img src={logoLight} alt="Logo" className="h-8" />
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-1 font-display">
            {view === "login" && "Log in"}
            {view === "signup" && "Create an Account"}
            {view === "forgot" && "Forgot Password"}
          </h1>

          {view === "login" && (
            <p className="text-muted-foreground text-sm mb-6">
              Don't have an account?{" "}
              <button onClick={() => setView("signup")} className="text-foreground font-medium underline underline-offset-2">
                Create an Account
              </button>
            </p>
          )}
          {view === "signup" && (
            <p className="text-muted-foreground text-sm mb-6">
              Already have an account?{" "}
              <button onClick={() => setView("login")} className="text-foreground font-medium underline underline-offset-2">
                Log in
              </button>
            </p>
          )}
          {view === "forgot" && (
            <p className="text-muted-foreground text-sm mb-6">
              We'll send a verification code to your email address
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {view === "signup" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-foreground text-sm font-medium">First Name</Label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First Name"
                    className="rounded-full border-border/60 bg-transparent h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground text-sm font-medium">Last Name</Label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last Name"
                    className="rounded-full border-border/60 bg-transparent h-11"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-foreground text-sm font-medium">Email Address</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                required
                className="rounded-full border-border/60 bg-transparent h-11"
              />
            </div>

            {view !== "forgot" && (
              <div className="space-y-1.5">
                <Label className="text-foreground text-sm font-medium">Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    className="rounded-full border-border/60 bg-transparent h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
                {view === "login" && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setView("forgot")}
                      className="text-sm text-foreground font-medium underline underline-offset-2"
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-full bg-foreground text-background hover:bg-foreground/90 text-base font-semibold mt-2"
            >
              {submitting
                ? "Please wait..."
                : view === "login"
                ? "Log in"
                : view === "signup"
                ? "Create Account"
                : "Send Verification Code"}
            </Button>
          </form>

          {/* Social login divider */}
          {view !== "forgot" && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-border" />
                <span className="text-muted-foreground text-xs">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 h-12 rounded-full border border-border/60 bg-transparent hover:bg-accent/50 transition-colors text-sm font-medium text-foreground"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </button>

              <button
                onClick={handleAppleLogin}
                className="w-full flex items-center justify-center gap-3 h-12 rounded-full border border-border/60 bg-transparent hover:bg-accent/50 transition-colors text-sm font-medium text-foreground mt-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
                Continue with Apple
              </button>
            </>
          )}
        </div>
      </div>
    </div>
    </div>
  );
};

export default Auth;
