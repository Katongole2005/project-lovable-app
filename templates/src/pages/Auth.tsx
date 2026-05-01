import { useState, useEffect, useCallback, useRef } from "react";
import { useSeo } from "@/hooks/useSeo";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fetchTrending, getOptimizedBackdropUrl } from "@/lib/api";
import { sendBrandedEmail, getWelcomeEmailHtml } from "@/lib/email";
import { isDisposableEmail } from "@/lib/emailValidation";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Eye, EyeOff, Mail, Lock, User, Loader2, Film, Sparkles } from "lucide-react";
import logoDark from "@/assets/logo-dark.png";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useDeviceProfile } from "@/hooks/useDeviceProfile";

type AuthView = "login" | "signup" | "forgot";

const QUOTES = [
  { text: "Movies are a door to another world.", author: "Martin Scorsese" },
  { text: "Cinema is a matter of what's in the frame and what's out.", author: "Martin Scorsese" },
  { text: "Every great film should seem new every time you see it.", author: "Roger Ebert" },
  { text: "A film is never really good unless the camera is an eye in the head of a poet.", author: "Orson Welles" },
];

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get("ref") || sessionStorage.getItem("moviebay_referral");
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const deviceProfile = useDeviceProfile();
  const reducedMotion = deviceProfile.prefersReducedMotion;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useSeo({
    title: "Sign In",
    description: "Sign in or create an account to start streaming movies and series on Moviebay.",
  });

  const [view, setView] = useState<AuthView>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [backdropUrl, setBackdropUrl] = useState<string | null>(null);
  const [backdropLoaded, setBackdropLoaded] = useState(false);
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (deviceProfile.isWeakDevice) {
      setBackdropUrl(null);
      setBackdropLoaded(false);
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    fetchTrending()
      .then((movies) => {
        if (cancelled) return;
        const withBackdrop = movies.filter((movie) => movie.backdrop_url);
        const pool = withBackdrop.length > 0 ? withBackdrop : movies.filter((movie) => movie.image_url);
        if (pool.length === 0) return;

        const random = pool[Math.floor(Math.random() * Math.min(5, pool.length))];
        const rawUrl = random.backdrop_url || random.image_url || null;
        const url = rawUrl ? getOptimizedBackdropUrl(rawUrl) : null;
        if (!url) return;

        const img = new Image();
        img.onload = () => {
          if (!cancelled) {
            setBackdropUrl(url);
            timeoutId = setTimeout(() => {
              if (!cancelled) setBackdropLoaded(true);
            }, 50);
          }
        };
        img.src = url;
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [deviceProfile.isWeakDevice]);

  useEffect(() => {
    if (reducedMotion || deviceProfile.isWeakDevice) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let animId: number;

    function resize() {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const particles = Array.from({ length: 30 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 2.5 + 0.5,
      dx: (Math.random() - 0.5) * 0.3,
      dy: -Math.random() * 0.2 - 0.05,
      opacity: 0,
      maxOpacity: Math.random() * 0.35 + 0.1,
      hue: Math.random() > 0.5 ? 357 : 15,
      phase: Math.random() * Math.PI * 2,
    }));

    let t = 0;
    function draw() {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      t += 0.01;

      for (const particle of particles) {
        particle.x += particle.dx;
        particle.y += particle.dy;
        if (particle.y < -10) {
          particle.y = window.innerHeight + 10;
          particle.x = Math.random() * window.innerWidth;
        }
        if (particle.x < -10) particle.x = window.innerWidth + 10;
        if (particle.x > window.innerWidth + 10) particle.x = -10;

        particle.opacity = particle.maxOpacity * (0.5 + 0.5 * Math.sin(t * 2 + particle.phase));
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${particle.hue}, 70%, 65%, ${particle.opacity})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [deviceProfile.isWeakDevice, reducedMotion]);

  const handleLogin = useCallback(async () => {
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    }
  }, [email, password, toast]);

  const handleSignup = useCallback(async () => {
    if (isDisposableEmail(email)) {
      toast({
        title: "Use a real email",
        description: "Temporary or disposable email addresses are not allowed on MovieBay.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          first_name: firstName,
          last_name: lastName,
          referral_code: referralCode,
        },
      },
    });
    setSubmitting(false);

    if (error) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
      return;
    }

    toast({
      title: "Check your email",
      description: "We sent you a verification link. If you don't see it in your inbox, please check your spam or junk folder.",
    });

    try {
      await sendBrandedEmail({
        to: email,
        subject: "Welcome to MovieBay",
        html: getWelcomeEmailHtml(firstName || "there"),
      });
    } catch (error) {
      console.error("Welcome email failed:", error);
    }
  }, [email, password, firstName, lastName, referralCode, toast]);

  const handleForgotPassword = useCallback(async () => {
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
  }, [email, toast]);

  const handleGoogleLogin = useCallback(async () => {
    try {
      setSocialLoading("google");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Google login failed",
        description: error.message || "Please ensure Google Auth is enabled in your Supabase dashboard.",
        variant: "destructive",
      });
      setSocialLoading(null);
    }
  }, [toast]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (view === "login") handleLogin();
    else if (view === "signup") handleSignup();
    else handleForgotPassword();
  };

  const switchView = useCallback((nextView: AuthView) => {
    setView(nextView);
    setPassword("");
    setShowPassword(false);
  }, []);

  if (loading) {
    return (
      <div className="dark flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="dark" style={{ colorScheme: "dark" }}>
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black">
        <div className="absolute inset-0">
          <div
            className={cn(
              "absolute inset-0 bg-cover bg-center transition-opacity ease-out",
              backdropLoaded ? "opacity-25" : "opacity-0"
            )}
            style={{
              ...(backdropUrl ? { backgroundImage: `url(${backdropUrl})` } : {}),
              transitionDuration: "2500ms",
              animation: backdropLoaded && !reducedMotion ? "auth-ken-burns 25s ease-in-out infinite alternate" : "none",
            }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,transparent_0%,#000_70%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/80" />
        </div>

        {!deviceProfile.isWeakDevice && (
          <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-[1]" aria-hidden="true" />
        )}

        {!deviceProfile.isWeakDevice && (
          <div
            className="pointer-events-none absolute inset-0 z-[2] opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              backgroundRepeat: "repeat",
              backgroundSize: "192px 192px",
              mixBlendMode: "overlay",
            }}
          />
        )}

        <div className="relative z-10 mx-4 flex min-h-screen w-full max-w-[1100px] items-center py-8 md:mx-8 md:py-0">
          <div className="grid w-full grid-cols-1 items-center gap-0 lg:grid-cols-2 lg:gap-16">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="hidden flex-col justify-center py-12 lg:flex"
            >
              <motion.div variants={staggerItem} className="mb-10">
                <motion.img
                  src={logoDark}
                  alt="MovieBay"
                  className="mb-8 h-12 w-auto"
                  data-testid="img-logo-desktop"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                />
                <motion.div variants={staggerItem} className="mb-4 flex items-center gap-2">
                  <Film className="h-5 w-5 text-primary/70" />
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">
                    Stream. Discover. Enjoy.
                  </span>
                </motion.div>
                <motion.h1 variants={staggerItem} className="mb-4 font-display text-4xl font-bold leading-[1.1] text-white xl:text-5xl">
                  Your gateway to
                  <br />
                  <span className="auth-gradient-text">Ugandan cinema</span>
                </motion.h1>
                <motion.p variants={staggerItem} className="max-w-md text-base leading-relaxed text-white/40">
                  Watch the latest Luganda-translated movies and series, all in one place, anytime, anywhere.
                </motion.p>
              </motion.div>

              <motion.div variants={staggerItem} className="relative max-w-md border-l-2 border-primary/30 pl-5">
                <Sparkles className="absolute -left-[11px] -top-1 h-5 w-5 text-primary/50" />
                <blockquote className="text-sm italic leading-relaxed text-white/50">"{quote.text}"</blockquote>
                <cite className="mt-2 block text-xs font-medium not-italic text-white/30">{quote.author}</cite>
              </motion.div>

              <motion.div variants={staggerItem} className="mt-10 flex items-center gap-8 border-t border-white/[0.06] pt-8">
                <AnimatedStat value="1000+" label="Movies & Series" delay={0.5} />
                <div className="h-10 w-px bg-white/[0.06]" />
                <AnimatedStat value="10+" label="Video Jokers" delay={0.7} />
                <div className="h-10 w-px bg-white/[0.06]" />
                <AnimatedStat value="HD" label="Quality Stream" delay={0.9} />
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto w-full max-w-[440px] lg:mx-0"
            >
              <motion.div
                animate={
                  reducedMotion
                    ? {}
                    : {
                        boxShadow: [
                          "0 24px 80px hsl(230 50% 5% / 0.6), 0 0 1px hsl(0 0% 100% / 0.08), inset 0 1px 0 hsl(0 0% 100% / 0.05)",
                          "0 24px 80px hsl(230 50% 5% / 0.6), 0 0 1px hsl(0 0% 100% / 0.08), inset 0 1px 0 hsl(0 0% 100% / 0.05), 0 0 80px hsl(357 93% 47% / 0.08)",
                          "0 24px 80px hsl(230 50% 5% / 0.6), 0 0 1px hsl(0 0% 100% / 0.08), inset 0 1px 0 hsl(0 0% 100% / 0.05)",
                        ],
                      }
                }
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="relative overflow-hidden rounded-3xl"
                style={{
                  background: "linear-gradient(145deg, rgba(20,20,20,0.8), rgba(0,0,0,0.95))",
                  backdropFilter: "blur(40px)",
                }}
              >
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
                  <div className="auth-border-beam absolute inset-0 rounded-3xl" />
                </div>

                <div className="relative p-8 md:p-10">
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="mb-8 flex justify-center lg:hidden"
                  >
                    <img src={logoDark} alt="MovieBay" className="h-10 w-auto" data-testid="img-logo-mobile" />
                  </motion.div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={view}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {view !== "login" && (
                        <motion.button
                          onClick={() => switchView("login")}
                          data-testid="button-back"
                          aria-label="Go back to sign in"
                          className="-ml-2 mb-5 rounded-xl p-2 transition-colors hover:bg-white/[0.05]"
                          whileHover={{ x: -3 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <ArrowLeft className="h-5 w-5 text-white/40 transition-colors hover:text-white" />
                        </motion.button>
                      )}

                      <h2 className="mb-1.5 font-display text-2xl font-bold tracking-tight text-white md:text-3xl">
                        {view === "login" && "Welcome back"}
                        {view === "signup" && "Create account"}
                        {view === "forgot" && "Reset password"}
                      </h2>
                      <p className="mb-7 text-sm text-white/35">
                        {view === "login" && (
                          <>
                            New to MovieBay?{" "}
                            <button onClick={() => switchView("signup")} data-testid="link-signup" className="font-medium text-primary transition-colors hover:text-primary/80">
                              Create an account
                            </button>
                          </>
                        )}
                        {view === "signup" && (
                          <>
                            Already have an account?{" "}
                            <button onClick={() => switchView("login")} data-testid="link-login" className="font-medium text-primary transition-colors hover:text-primary/80">
                              Sign in
                            </button>
                          </>
                        )}
                        {view === "forgot" && "Enter your email to receive a reset link"}
                      </p>
                    </motion.div>
                  </AnimatePresence>

                  <form onSubmit={handleSubmit}>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={view}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        variants={{
                          hidden: {},
                          visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
                        }}
                        className="space-y-4"
                      >
                        {view === "signup" && (
                          <motion.div variants={staggerItem} className="grid grid-cols-2 gap-3">
                            <AuthInput icon={<User className="h-4 w-4" />} placeholder="First name" value={firstName} onChange={setFirstName} testId="input-first-name" />
                            <AuthInput icon={<User className="h-4 w-4" />} placeholder="Last name" value={lastName} onChange={setLastName} testId="input-last-name" />
                          </motion.div>
                        )}

                        <motion.div variants={staggerItem}>
                          <AuthInput icon={<Mail className="h-4 w-4" />} type="email" placeholder="Email address" value={email} onChange={setEmail} required testId="input-email" />
                        </motion.div>

                        {view !== "forgot" && (
                          <motion.div variants={staggerItem} className="relative">
                            <AuthInput
                              icon={<Lock className="h-4 w-4" />}
                              type={showPassword ? "text" : "password"}
                              placeholder="Password"
                              value={password}
                              onChange={setPassword}
                              required
                              testId="input-password"
                              className="pr-11"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              data-testid="button-toggle-password"
                              aria-label={showPassword ? "Hide password" : "Show password"}
                              className="absolute right-3 top-1/2 z-10 -translate-y-1/2 p-1 text-white/25 transition-colors hover:text-white/60"
                            >
                              {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            </button>
                          </motion.div>
                        )}

                        {view === "login" && (
                          <motion.div variants={staggerItem} className="flex justify-end">
                            <button type="button" onClick={() => switchView("forgot")} data-testid="link-forgot" className="text-xs font-medium text-white/30 transition-colors hover:text-primary">
                              Forgot password?
                            </button>
                          </motion.div>
                        )}

                        <motion.div variants={staggerItem}>
                          <motion.button
                            type="submit"
                            disabled={submitting}
                            data-testid="button-submit"
                            className={cn(
                              "btn-premium-red relative mt-2 h-12 w-full overflow-hidden rounded-2xl text-[15px] font-semibold text-white transition-all duration-300",
                              "disabled:cursor-not-allowed disabled:opacity-50"
                            )}
                            whileHover={{ scale: 1.015 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <span className="relative flex items-center justify-center gap-2">
                              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                              {submitting
                                ? "Please wait..."
                                : view === "login"
                                  ? "Sign in"
                                  : view === "signup"
                                    ? "Create account"
                                    : "Send reset link"}
                            </span>
                          </motion.button>
                        </motion.div>
                      </motion.div>
                    </AnimatePresence>
                  </form>

                  {view !== "forgot" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                      <div className="my-6 flex items-center gap-4">
                        <div className="h-px flex-1 bg-white/[0.06]" />
                        <span className="text-[11px] font-medium uppercase tracking-wider text-white/20">or continue with</span>
                        <div className="h-px flex-1 bg-white/[0.06]" />
                      </div>

                      <SocialButton
                        onClick={handleGoogleLogin}
                        testId="button-google"
                        loading={socialLoading === "google"}
                        icon={
                          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                          </svg>
                        }
                        label="Continue with Google"
                      />
                    </motion.div>
                  )}

                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-6 text-center text-[11px] leading-relaxed text-white/15">
                    By continuing, you agree to our{" "}
                    <Link to="/terms" className="text-white/30 transition-colors hover:text-primary hover:underline">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link to="/privacy" className="text-white/30 transition-colors hover:text-primary hover:underline">
                      Privacy Policy
                    </Link>
                  </motion.p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes auth-ken-burns {
          0% { transform: scale(1.05) translate(0, 0); }
          100% { transform: scale(1.15) translate(-1.5%, -1%); }
        }
        @keyframes auth-gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes auth-beam-spin {
          from { --auth-beam: 0deg; }
          to { --auth-beam: 360deg; }
        }
        @property --auth-beam {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        .auth-gradient-text {
          background: linear-gradient(90deg, hsl(357 93% 47%) 0%, hsl(15 100% 50%) 40%, hsl(350 80% 60%) 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: auth-gradient-shift 6s ease-in-out infinite;
        }
        .auth-border-beam {
          padding: 1px;
          background: conic-gradient(from var(--auth-beam, 0deg) at 50% 50%, transparent 0%, transparent 60%, hsl(357 93% 47% / 0.8) 75%, hsl(15 100% 50% / 0.5) 85%, transparent 100%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          animation: auth-beam-spin 5s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .auth-gradient-text,
          .auth-border-beam { animation: none; }
        }
      `}</style>
    </div>
  );
};

function AnimatedStat({ value, label, delay }: { value: string; label: string; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
      <motion.div
        className="font-display text-2xl font-bold text-white"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: delay + 0.1, duration: 0.4, type: "spring", stiffness: 200 }}
      >
        {value}
      </motion.div>
      <div className="mt-0.5 text-xs text-white/30">{label}</div>
    </motion.div>
  );
}

function AuthInput({
  icon,
  type = "text",
  placeholder,
  value,
  onChange,
  required,
  testId,
  className,
}: {
  icon: React.ReactNode;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
  testId: string;
  className?: string;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <motion.div
      className={cn(
        "relative flex h-12 items-center rounded-2xl border transition-all duration-300",
        focused
          ? "border-primary/40 bg-white/[0.04] shadow-[0_0_0_3px_hsl(357_93%_47%/0.15),0_0_20px_hsl(357_93%_47%/0.1)]"
          : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] hover:bg-white/[0.03]"
      )}
      whileTap={{ scale: 0.995 }}
    >
      <motion.div className="absolute left-4 transition-colors duration-300" animate={{ color: focused ? "hsl(357 93% 47% / 0.75)" : "hsl(0 0% 100% / 0.2)" }}>
        {icon}
      </motion.div>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        required={required}
        data-testid={testId}
        className={cn("h-full w-full bg-transparent pl-11 pr-4 text-sm font-medium text-white outline-none placeholder:text-white/20", className)}
      />
    </motion.div>
  );
}

function SocialButton({
  onClick,
  icon,
  label,
  testId,
  loading = false,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  testId: string;
  loading?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      data-testid={testId}
      whileHover={loading ? {} : { scale: 1.02, backgroundColor: "hsl(0 0% 100% / 0.06)" }}
      whileTap={loading ? {} : { scale: 0.97 }}
      disabled={loading}
      className={cn(
        "flex h-11 w-full items-center justify-center gap-2.5 rounded-2xl border border-white/18 bg-white/[0.92] text-sm font-bold text-[#111318] shadow-[0_10px_28px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-300 hover:border-white/35 hover:bg-white hover:shadow-[0_14px_34px_rgba(0,0,0,0.34)]",
        loading && "cursor-not-allowed opacity-60"
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      <span>{loading ? "Connecting..." : label}</span>
    </motion.button>
  );
}

export default Auth;
