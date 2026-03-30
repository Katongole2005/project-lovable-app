export function AppLoader() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[hsl(230,18%,5%)] overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] opacity-20"
          style={{
            background: "radial-gradient(circle, hsl(210 80% 50% / 0.4), hsl(270 60% 40% / 0.2), transparent 70%)",
            animation: "loaderPulse 3s ease-in-out infinite",
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[80px] opacity-15"
          style={{
            background: "radial-gradient(circle, hsl(180 60% 50% / 0.3), transparent 70%)",
            animation: "loaderPulse 3s ease-in-out infinite 1.5s",
          }}
        />
      </div>

      <div className="relative flex flex-col items-center gap-8">
        <div className="relative animate-scale-in">
          <div
            className="text-5xl sm:text-6xl font-display font-extrabold tracking-tight select-none"
            style={{
              background: "linear-gradient(135deg, #ffffff 0%, hsl(210 80% 70%) 40%, hsl(270 60% 70%) 60%, hsl(180 50% 60%) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 30px hsl(210 80% 50% / 0.3))",
            }}
          >
            SJ
          </div>
        </div>

        <div className="relative w-48 h-[3px] rounded-full overflow-hidden bg-white/8 animate-fade-in">
          <div
            className="absolute inset-y-0 left-0 rounded-full animate-loader-bar"
            style={{
              background: "linear-gradient(90deg, hsl(210 80% 60%), hsl(270 60% 60%), hsl(180 50% 55%))",
              boxShadow: "0 0 12px hsl(210 80% 60% / 0.5)",
            }}
          />
        </div>

        <p className="text-xs text-white/40 font-medium tracking-widest uppercase animate-fade-in">
          Loading
        </p>
      </div>

      <style>{`
        @keyframes loaderPulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.15; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.25; }
        }
        @keyframes loaderBar {
          0% { width: 0%; transform: translateX(0%); }
          25% { width: 40%; transform: translateX(20%); }
          50% { width: 20%; transform: translateX(55%); }
          75% { width: 60%; transform: translateX(25%); }
          100% { width: 100%; transform: translateX(0%); }
        }
        .animate-loader-bar { animation: loaderBar 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
