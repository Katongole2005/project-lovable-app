import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base = env.VITE_BASE || "/";

  return {
    base,
    server: {
      host: "0.0.0.0",
      port: 5000,
      allowedHosts: true,
      hmr: { overlay: false },
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-react": ["react", "react-dom", "react-router-dom"],
            "vendor-query": ["@tanstack/react-query"],
            "vendor-motion": ["framer-motion"],
            "vendor-ui": [
              "@radix-ui/react-dialog",
              "@radix-ui/react-tooltip",
              "@radix-ui/react-select",
              "@radix-ui/react-tabs",
            ],
          },
        },
      },
    },
  };
});
