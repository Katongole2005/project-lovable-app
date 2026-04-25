import { useState, useEffect, useCallback, useRef } from "react";
import { useSeo } from "@/hooks/useSeo";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { useAuth } from "@/hooks/useAuth";
import { fetchTrending, getOptimizedBackdropUrl } from "@/lib/api";
import { sendBrandedEmail, getWelcomeEmailHtml } from "@/lib/email";
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
  const { user, loading } = useAuth();
  const { toast } = useToast();
  useSeo({ title: "Sign In", description: "Sign in or create an account to start streaming movies and series on Moviebay." });
  const [view, setView] = useState<AuthView>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [backdropUrl, setBackdropUrl] = useState<string | null>(null);
  const [backdropLoaded, setBackdropLoaded] = useState(false);
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const formRef = useRef<HTMLFormElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const deviceProfile = useDeviceProfile();
  const reducedMotion = deviceProfile.prefersReducedMotion;

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
        const withBackdrop = movies.filter((m) => m.backdrop_url);
        const pool = withBackdrop.length > 0 ? withBackdrop : movies.filter((m) => m.image_url);
        if (pool.length > 0) {
          const random = pool[Math.floor(Math.random() * Math.min(5, pool.length))];
          const rawUrl = random.backdrop_url || random.image_url || null;
          const url = rawUrl ? getOptimizedBackdropUrl(rawUrl) : null;
          if (url) {
            const img = new Image();
            img.onload = () => {
              if (!cancelled) {
                setBackdropUrl(url);
                timeoutId = setTimeout(() => { if (!cancelled) setBackdropLoaded(true); }, 50);
              }
            };
            img.src = url;
          }
        }
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

    const dpr = Math.min(window.devicePixelRatio, 2);
    let animId: number;

    function resize() {
      canvas!.width = window.innerWidth * dpr;
      canvas!.height = window.innerHeight * dpr;
      canvas!.style.width = `${window.innerWidth}px`;
      canvas!.style.height = `${window.innerHeight}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    interface Particle {
      x: number; y: number; r: number;
      dx: number; dy: number;
      opacity: number; maxOpacity: number;
      hue: number; phase: number;
    }

    const particles: Particle[] = Array.from({ length: 30 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 2.5 + 0.5,
      dx: (Math.random() - 0.5) * 0.3,
      dy: -Math.random() * 0.2 - 0.05,
      opacity: 0,
      maxOpacity: Math.random() * 0.35 + 0.1,
      hue: Math.random() > 0.5 ? 210 : 180,
      phase: Math.random() * Math.PI * 2,
    }));

    let t = 0;
    function draw() {
      ctx!.clearRect(0, 0, window.innerWidth, window.innerHeight);
      t += 0.01;

      for (const p of particles) {
        p.x += p.dx;
        p.y += p.dy;

        if (p.y < -10) { p.y = window.innerHeight + 10; p.x = Math.random() * window.innerWidth; }
        if (p.x < -10) p.x = window.innerWidth + 10;
        if (p.x > window.innerWidth + 10) p.x = -10;

        p.opacity = p.maxOpacity * (0.5 + 0.5 * Math.sin(t * 2 + p.phase));

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = `hsla(${p.hue}, 70%, 65%, ${p.opacity})`;
        ctx!.fill();

        if (p.r > 1.5) {
          const grad = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
          grad.addColorStop(0, `hsla(${p.hue}, 70%, 65%, ${p.opacity * 0.3})`);
          grad.addColorStop(1, `hsla(${p.hue}, 70%, 65%, 0)`);
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
          ctx!.fillStyle = grad;
          ctx!.fill();
        }
      }
      animId = requestAnimationFrame(draw);
    }
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
      toast({ title: "Check your email", description: "We sent you a verification link. If you don't see it in your inbox, please check your spam or junk folder." });
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
  }, [email, password, firstName, lastName, toast]);

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

  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  const handleGoogleLogin = useCallback(async () => {
    try {
      setSocialLoading("google");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { 
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({ 
        title: "Google login failed", 
        description: error.message || "Please ensure Google Auth is enabled in your Supabase dashboard.", 
        variant: "destructive" 
      });
      setSocialLoading(null);
    }
  }, [toast]);

  const handleAppleLogin = useCallback(async () => {
    try {
      setSocialLoading("apple");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({ 
        title: "Apple login failed", 
        description: error.message || "Please ensure Apple Auth is enabled in your Supabase dashboard.", 
        variant: "destructive" 
      });
      setSocialLoading(null);
    }
  }, [toast]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (view === "login") handleLogin();
    else if (view === "signup") handleSignup();
    else handleForgotPassword();
  };

  const switchView = useCallback((newView: AuthView) => {
    setView(newView);
    setPassword("");
  }, []);

  if (loading) {
    return (
      <div className="dark min-h-screen flex items-center justify-center bg-[hsl(230,18%,5%)]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="dark" style={{ colorScheme: "dark" }}>
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center" style={{ background: "hsl(230 18% 5%)" }}>

        {/* === CINEMATIC BACKDROP with Ken Burns === */}
        <div className="absolute inset-0">
          <div
            className={cn(
              "absolute inset-0 transition-opacity ease-out bg-center bg-cover",
              backdropLoaded ? "opacity-25" : "opacity-0"
            )}
            style={{
              ...(backdropUrl ? { backgroundImage: `url(${backdropUrl})` } : {}),
              transitionDuration: "2500ms",
              animation: backdropLoaded && !reducedMotion ? "auth-ken-burns 25s ease-in-out infinite alternate" : "none",
            }}
          />
          <div className="absolute inset-0" style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 40%, transparent 0%, hsl(230 18% 5%) 70%)",
          }} />
          <div className="absolute inset-0 bg-gradient-to-t from-[hsl(230,18%,5%)] via-transparent to-[hsl(230,18%,5%)/0.6]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[hsl(230,18%,5%)/0.8] via-transparent to-[hsl(230,18%,5%)/0.8]" />
        </div>

        {/* === FLOATING PARTICLES (canvas) === */}
        {!deviceProfile.isWeakDevice && (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none z-[1]"
            aria-hidden="true"
          />
        )}

        {/* === ANIMATED AMBIENT GLOW ORBS === */}
        {!deviceProfile.isWeakDevice && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <motion.div
              animate={reducedMotion ? {} : { x: [0, 30, -20, 0], y: [0, -25, 15, 0], scale: [1, 1.1, 0.95, 1] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute top-[10%] left-[8%] w-[500px] h-[500px] rounded-full opacity-[0.035]"
              style={{ background: "radial-gradient(circle, hsl(210 100% 60%), transparent 65%)" }}
            />
            <motion.div
              animate={reducedMotion ? {} : { x: [0, -25, 20, 0], y: [0, 20, -30, 0], scale: [1, 0.9, 1.1, 1] }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="absolute bottom-[5%] right-[10%] w-[450px] h-[450px] rounded-full opacity-[0.03]"
              style={{ background: "radial-gradient(circle, hsl(180 70% 50%), transparent 65%)" }}
            />
            <motion.div
              animate={reducedMotion ? {} : { x: [0, 15, -10, 0], y: [0, -15, 25, 0] }}
              transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
              className="absolute top-[50%] right-[30%] w-[300px] h-[300px] rounded-full opacity-[0.02]"
              style={{ background: "radial-gradient(circle, hsl(260 60% 55%), transparent 65%)" }}
            />
          </div>
        )}

        {/* === NOISE TEXTURE === */}
        {!deviceProfile.isWeakDevice && (
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-[2]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              backgroundRepeat: "repeat",
              backgroundSize: "192px 192px",
              mixBlendMode: "overlay",
            }}
          />
        )}

        {/* === MAIN LAYOUT === */}
        <div className="relative z-10 w-full max-w-[1100px] mx-4 md:mx-8 flex items-center min-h-screen py-8 md:py-0">
          <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-16 items-center">

            {/* === LEFT SIDE — Brand & Cinematic Quote (desktop only) === */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="hidden lg:flex flex-col justify-center py-12"
            >
              <motion.div variants={staggerItem} className="mb-10">
                <motion.img
                  src={logoDark}
                  alt="MovieBay"
                  className="h-12 w-auto mb-8"
                  data-testid="img-logo-desktop"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                />
                <motion.div variants={staggerItem} className="flex items-center gap-2 mb-4">
                  <Film className="w-5 h-5 text-primary/70" />
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">Stream. Discover. Enjoy.</span>
                </motion.div>
                <motion.h1
                  variants={staggerItem}
                  className="text-4xl xl:text-5xl font-display font-bold text-white leading-[1.1] mb-4"
                >
                  Your gateway to<br />
                  <span className="auth-gradient-text">
                    Ugandan cinema
                  </span>
                </motion.h1>
                <motion.p variants={staggerItem} className="text-white/40 text-base leading-relaxed max-w-md">
                  Watch the latest Luganda-translated movies and series — all in one place, anytime, anywhere.
                </motion.p>
              </motion.div>

              {/* Cinematic Quote */}
              <motion.div variants={staggerItem} className="relative pl-5 border-l-2 border-primary/30 max-w-md">
                <Sparkles className="absolute -left-[11px] -top-1 w-5 h-5 text-primary/50" />
                <blockquote className="text-white/50 text-sm italic leading-relaxed">
                  "{quote.text}"
                </blockquote>
                <cite className="block mt-2 text-white/30 text-xs not-italic font-medium">
                  — {quote.author}
                </cite>
              </motion.div>

              {/* Stats with counter animation */}
              <motion.div variants={staggerItem} className="flex items-center gap-8 mt-10 pt-8 border-t border-white/[0.06]">
                <AnimatedStat value="1000+" label="Movies & Series" delay={0.5} />
                <div className="w-px h-10 bg-white/[0.06]" />
                <AnimatedStat value="10+" label="Video Jokers" delay={0.7} />
                <div className="w-px h-10 bg-white/[0.06]" />
                <AnimatedStat value="HD" label="Quality Stream" delay={0.9} />
              </motion.div>
            </motion.div>

            {/* === RIGHT SIDE — Auth Card === */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-[440px] mx-auto lg:mx-0"
            >
              {/* Card container with breathing glow */}
              <motion.div
                animate={reducedMotion ? {} : {
                  boxShadow: [
                    "0 24px 80px hsl(230 50% 5% / 0.6), 0 0 1px hsl(0 0% 100% / 0.08), inset 0 1px 0 hsl(0 0% 100% / 0.05), 0 0 60px hsl(210 100% 60% / 0.03)",
                    "0 24px 80px hsl(230 50% 5% / 0.6), 0 0 1px hsl(0 0% 100% / 0.08), inset 0 1px 0 hsl(0 0% 100% / 0.05), 0 0 80px hsl(210 100% 60% / 0.06)",
                    "0 24px 80px hsl(230 50% 5% / 0.6), 0 0 1px hsl(0 0% 100% / 0.08), inset 0 1px 0 hsl(0 0% 100% / 0.05), 0 0 60px hsl(210 100% 60% / 0.03)",
                  ],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="relative rounded-3xl overflow-hidden"
                style={{
                  background: "linear-gradient(145deg, hsl(230 20% 10% / 0.8), hsl(230 20% 7% / 0.9))",
                  backdropFilter: "blur(40px)",
                }}
              >
                {/* Animated border beam */}
                <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                  <div className="absolute inset-0 rounded-3xl auth-border-beam" />
                </div>

                <div className="relative p-8 md:p-10">
                  {/* Mobile logo */}
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="lg:hidden flex justify-center mb-8"
                  >
                    <img
                      src={logoDark}
                      alt="MovieBay"
                      className="h-10 w-auto"
                      data-testid="img-logo-mobile"
                    />
                  </motion.div>

                  {/* Header with animated transition */}
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
                          className="mb-5 p-2 -ml-2 rounded-xl hover:bg-white/[0.05] transition-colors group"
                          whileHover={{ x: -3 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <ArrowLeft className="w-5 h-5 text-white/40 group-hover:text-white transition-colors" />
                        </motion.button>
                      )}

                      <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-1.5 tracking-tight">
                        {view === "login" && "Welcome back"}
                        {view === "signup" && "Create account"}
                        {view === "forgot" && "Reset password"}
                      </h2>
                      <p className="text-white/35 text-sm mb-7">
                        {view === "login" && (
                          <>New to MovieBay?{" "}
                            <button onClick={() => switchView("signup")} data-testid="link-signup" className="text-primary hover:text-primary/80 font-medium transition-colors">
                              Create an account
                            </button>
                          </>
                        )}
                        {view === "signup" && (
                          <>Already have an account?{" "}
                            <button onClick={() => switchView("login")} data-testid="link-login" className="text-primary hover:text-primary/80 font-medium transition-colors">
                              Sign in
                            </button>
                          </>
                        )}
                        {view === "forgot" && "Enter your email to receive a reset link"}
                      </p>
                    </motion.div>
                  </AnimatePresence>

                  {/* Form with staggered field animations */}
                  <form ref={formRef} onSubmit={handleSubmit}>
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
                            <AuthInput
                              icon={<User className="w-4 h-4" />}
                              placeholder="First name"
                              value={firstName}
                              onChange={setFirstName}
                              testId="input-first-name"
                            />
                            <AuthInput
                              icon={<User className="w-4 h-4" />}
                              placeholder="Last name"
                              value={lastName}
                              onChange={setLastName}
                              testId="input-last-name"
                            />
                          </motion.div>
                        )}

                        <motion.div variants={staggerItem}>
                          <AuthInput
                            icon={<Mail className="w-4 h-4" />}
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={setEmail}
                            required
                            testId="input-email"
                          />
                        </motion.div>

                        {view !== "forgot" && (
                          <motion.div variants={staggerItem} className="relative">
                            <AuthInput
                              icon={<Lock className="w-4 h-4" />}
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
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/25 hover:text-white/60 transition-colors z-10"
                            >
                              {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                          </motion.div>
                        )}

                        {view === "login" && (
                          <motion.div variants={staggerItem} className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => switchView("forgot")}
                              data-testid="link-forgot"
                              className="text-xs text-white/30 hover:text-primary transition-colors font-medium"
                            >
                              Forgot password?
                            </button>
                          </motion.div>
                        )}

                        {/* Submit button */}
                        <motion.div variants={staggerItem}>
                          <motion.button
                            type="submit"
                            disabled={submitting}
                            data-testid="button-submit"
                            className={cn(
                              "w-full h-12 rounded-2xl font-semibold text-[15px] transition-all duration-300 relative overflow-hidden group/btn mt-2",
                              "text-white",
                              "disabled:opacity-50 disabled:cursor-not-allowed"
                            )}
                            style={{
                              background: "linear-gradient(135deg, hsl(210 100% 55%), hsl(180 70% 50%))",
                            }}
                            whileHover={{ scale: 1.015, boxShadow: "0 0 40px hsl(210 100% 60% / 0.35)" }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/[0.12] to-white/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700" />
                            <motion.div
                              className="absolute inset-0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500"
                              style={{
                                background: "linear-gradient(135deg, hsl(210 100% 60%), hsl(180 80% 55%))",
                              }}
                            />
                            <span className="relative flex items-center justify-center gap-2">
                              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
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

                  {/* Divider + Social */}
                  {view !== "forgot" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      <div className="flex items-center gap-4 my-6">
                        <motion.div
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ delay: 0.6, duration: 0.5 }}
                          className="flex-1 h-px bg-white/[0.06] origin-left"
                        />
                        <span className="text-[11px] text-white/20 font-medium uppercase tracking-wider">or continue with</span>
                        <motion.div
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ delay: 0.6, duration: 0.5 }}
                          className="flex-1 h-px bg-white/[0.06] origin-right"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <SocialButton
                          onClick={handleGoogleLogin}
                          testId="button-google"
                          loading={socialLoading === "google"}
                          delay={0.65}
                          icon={
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                          }
                          label="Google"
                        />
                        <SocialButton
                          onClick={handleAppleLogin}
                          testId="button-apple"
                          loading={socialLoading === "apple"}
                          delay={0.72}
                          icon={
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                            </svg>
                          }
                          label="Apple"
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* Footer text */}
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="text-center text-[11px] text-white/15 mt-6 leading-relaxed"
                  >
                    By continuing, you agree to our Terms of Service and Privacy Policy
                  </motion.p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Auth-specific animations */}
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
          background: linear-gradient(
            90deg,
            hsl(210 100% 60%) 0%,
            hsl(180 70% 55%) 30%,
            hsl(210 100% 65%) 60%,
            hsl(180 80% 50%) 100%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: auth-gradient-shift 6s ease-in-out infinite;
        }
        .auth-border-beam {
          padding: 1px;
          background: conic-gradient(
            from var(--auth-beam, 0deg) at 50% 50%,
            transparent 0%,
            transparent 60%,
            hsl(210 100% 60% / 0.5) 75%,
            hsl(180 70% 50% / 0.3) 85%,
            transparent 100%
          );
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          animation: auth-beam-spin 5s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .auth-gradient-text { animation: none; }
          .auth-border-beam { animation: none; }
          [style*="auth-ken-burns"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
};

function AnimatedStat({ value, label, delay }: { value: string; label: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className="text-2xl font-bold text-white font-display"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: delay + 0.1, duration: 0.4, type: "spring", stiffness: 200 }}
      >
        {value}
      </motion.div>
      <div className="text-xs text-white/30 mt-0.5">{label}</div>
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
        "relative flex items-center h-12 rounded-2xl border transition-all duration-300",
        focused
          ? "border-primary/40 bg-white/[0.04] shadow-[0_0_0_3px_hsl(210_100%_60%/0.08),0_0_20px_hsl(210_100%_60%/0.05)]"
          : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] hover:bg-white/[0.03]"
      )}
      whileTap={{ scale: 0.995 }}
    >
      <motion.div
        className="absolute left-4 transition-colors duration-300"
        animate={{ color: focused ? "hsl(210 100% 60% / 0.7)" : "hsl(0 0% 100% / 0.2)" }}
      >
        {icon}
      </motion.div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        required={required}
        data-testid={testId}
        className={cn(
          "w-full h-full bg-transparent pl-11 pr-4 text-sm text-white placeholder:text-white/20 outline-none font-medium",
          className
        )}
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
  delay = 0,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  testId: string;
  loading?: boolean;
  delay?: number;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      data-testid={testId}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={loading ? {} : { scale: 1.02, backgroundColor: "hsl(0 0% 100% / 0.06)" }}
      whileTap={loading ? {} : { scale: 0.97 }}
      disabled={loading}
      className={cn(
        "flex items-center justify-center gap-2.5 h-11 rounded-2xl text-sm font-medium transition-colors duration-300",
        "bg-white/[0.03] border border-white/[0.06] text-white/70",
        "hover:border-white/[0.1] hover:text-white",
        loading && "opacity-50 cursor-not-allowed"
      )}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      <span>{loading ? "Connecting..." : label}</span>
    </motion.button>
  );
}

export default Auth;
