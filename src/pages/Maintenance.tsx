import logoLight from "@/assets/logo.png";
import { Wrench } from "lucide-react";

/* Inline keyframes for gear spin */
const gearStyleCw = `
  @keyframes spin-cw { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes spin-ccw { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
  .gear-cw { animation: spin-cw 4s linear infinite; transform-origin: center; }
  .gear-ccw { animation: spin-ccw 3s linear infinite; transform-origin: center; }
  .gear-cw-slow { animation: spin-cw 6s linear infinite; transform-origin: center; }
  @keyframes screwdriver-jiggle {
    0%, 100% { transform: rotate(-10deg) translateY(0px); }
    25% { transform: rotate(10deg) translateY(-2px); }
    50% { transform: rotate(-8deg) translateY(1px); }
    75% { transform: rotate(8deg) translateY(-1px); }
  }
  .screwdriver-anim { animation: screwdriver-jiggle 0.8s ease-in-out infinite; transform-origin: bottom center; }
`;

const GearIcon = ({ size = 40, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    />
    <path
      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    />
  </svg>
);

const Maintenance = () => {
  return (
    <>
      <style>{gearStyleCw}</style>
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

          {/* Animated gears + screwdriver illustration */}
          <div className="relative flex items-center justify-center w-32 h-32">
            {/* Large gear - clockwise */}
            <div className="absolute" style={{ left: 0, top: 8, color: "#4ade80", opacity: 0.9 }}>
              <GearIcon size={56} className="gear-cw" />
            </div>
            {/* Medium gear - counter-clockwise (meshing with large) */}
            <div className="absolute" style={{ right: 2, top: 2, color: "#22d3ee", opacity: 0.8 }}>
              <GearIcon size={42} className="gear-ccw" />
            </div>
            {/* Small gear - clockwise slow */}
            <div className="absolute" style={{ right: 10, bottom: 4, color: "#a78bfa", opacity: 0.7 }}>
              <GearIcon size={30} className="gear-cw-slow" />
            </div>
            {/* Screwdriver */}
            <div
              className="absolute screwdriver-anim"
              style={{ bottom: 0, left: "50%", transform: "translateX(-50%)", color: "#fbbf24" }}
            >
              <Wrench className="w-7 h-7" />

            </div>
          </div>

          {/* Text */}
          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-white">Under Maintenance</h1>
            <p className="text-base font-medium" style={{ color: "#fbbf24" }}>
              Trying to fix... taking longer than expected 🔧
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "#6b6b6b" }}>
              We're working hard behind the scenes. Hang tight — we'll be back online shortly!
            </p>
          </div>

          {/* Animated dots */}
          <div className="flex items-center gap-2 pt-1">
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
    </>
  );
};

export default Maintenance;

