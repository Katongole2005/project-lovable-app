import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Use VITE_BASE to support GitHub Pages subpaths; defaults to root ("/")
  const base = env.VITE_BASE || "/";

  return {
    base,
    server: {
      host: true,
      port: 8080,
      hmr: {
        overlay: false,
      },
      proxy: {
        "/api": "http://127.0.0.1:8000",
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
