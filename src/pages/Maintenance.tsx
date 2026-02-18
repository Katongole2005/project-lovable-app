import logoLight from "@/assets/logo.png";
import { Wrench } from "lucide-react";

const Maintenance = () => {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden"
      style={{ background: "#0a0a0a" }}
    >
      {/* Animated background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/20 blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-primary/5 blur-3xl animate-pulse" style={{ animationDelay: "3s" }} />
      </div>

      {/* Glass card */}
      <div
        className="relative z-10 w-full max-w-md rounded-3xl p-8 flex flex-col items-center text-center gap-6"
        style={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}
      >
        {/* Logo */}
        <img src={logoLight} alt="Logo" className="h-10 w-auto" />

        {/* Icon */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.2)" }}
        >
          <Wrench className="w-8 h-8" style={{ color: "#4ade80" }} />
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Under Maintenance</h1>
          <p className="text-sm leading-relaxed" style={{ color: "#6b6b6b" }}>
            We're currently working on some improvements to bring you a better experience.
            We'll be back shortly — thank you for your patience!
          </p>
        </div>

        {/* Animated dots */}
        <div className="flex items-center gap-2 pt-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full animate-bounce"
              style={{ background: "#4ade80", animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Maintenance;
