import { motion } from "framer-motion";

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
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
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
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="relative w-48 h-[3px] rounded-full overflow-hidden bg-white/8"
        >
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              background: "linear-gradient(90deg, hsl(210 80% 60%), hsl(270 60% 60%), hsl(180 50% 55%))",
              boxShadow: "0 0 12px hsl(210 80% 60% / 0.5)",
            }}
            initial={{ width: "0%", x: "0%" }}
            animate={{
              width: ["0%", "40%", "20%", "60%", "30%", "100%"],
              x: ["0%", "30%", "50%", "20%", "40%", "0%"],
            }}
            transition={{
              duration: 2,
              ease: "easeInOut",
              repeat: Infinity,
              repeatType: "loop",
            }}
          />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-xs text-white/40 font-medium tracking-widest uppercase"
        >
          Loading
        </motion.p>
      </div>

      <style>{`
        @keyframes loaderPulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.15; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.25; }
        }
      `}</style>
    </div>
  );
}
