"use client";
import { useNavigate } from "@/lib/router-polyfill";
import logoLight from "@/assets/logo.png";
import { Wrench } from "lucide-react";

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
  const navigate = useNavigate();
  return (
    <>
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden bg-[#0a0a0a]"
      >
        {/* Animated background blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/20 blur-3xl animate-pulse" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl animate-pulse [animation-delay:1.5s]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-primary/5 blur-3xl animate-pulse [animation-delay:3s]" />
        </div>

        {/* Glass card */}
        <div
          className="relative z-10 w-full max-w-md rounded-3xl p-8 flex flex-col items-center text-center gap-6 bg-white/5 backdrop-blur-[24px] border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
        >
          {/* Logo */}
          <img src={logoLight.src} alt="Logo" className="h-10 w-auto" />

          {/* Animated gears + screwdriver illustration */}
          <div className="relative flex items-center justify-center w-32 h-32">
            {/* Large gear - clockwise */}
            <div className="absolute left-0 top-2 text-[#ff8a3d] opacity-90">
              <GearIcon size={56} className="gear-cw" />
            </div>
            {/* Medium gear - counter-clockwise (meshing with large) */}
            <div className="absolute right-0.5 top-0.5 text-cyan-400 opacity-80">
              <GearIcon size={42} className="gear-ccw" />
            </div>
            {/* Small gear - clockwise slow */}
            <div className="absolute right-2.5 bottom-1 text-purple-400 opacity-70">
              <GearIcon size={30} className="gear-cw-slow" />
            </div>
            {/* Screwdriver */}
            <div
              className="absolute screwdriver-anim bottom-0 left-1/2 -translate-x-1/2 text-amber-400"
            >
              <Wrench className="w-7 h-7" />

            </div>
          </div>

          {/* Text */}
          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-white">Under Maintenance</h1>
            <p className="text-base font-medium text-amber-400">
              Trying to fix... taking longer than expected 🔧
            </p>
            <p className="text-sm leading-relaxed text-[#6b6b6b]">
              We're working hard behind the scenes. Hang tight — we'll be back online shortly!
            </p>
          </div>

          {/* Animated dots */}
          <div className="flex items-center gap-2 pt-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full animate-bounce bg-[#ff8a3d] ${
                  i === 0 ? '[animation-delay:0s]' : i === 1 ? '[animation-delay:0.2s]' : '[animation-delay:0.4s]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Subtle admin access link */}
        <button
          onClick={() => navigate("/admin")}
          className="absolute bottom-6 text-xs opacity-20 hover:opacity-60 transition-opacity text-[#666]"
        >
          Admin
        </button>
      </div>
    </>
  );
};
export default Maintenance;
